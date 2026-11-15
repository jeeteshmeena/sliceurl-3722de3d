// Generic, policy-checked data API. The frontend shim turns
//   supabase.from("links").select("*").eq("user_id", id).order("created_at")
// into one JSON request here, so existing hooks/pages keep working.
import { Hono } from "hono";
import type { AppEnv } from "../env";
import { POLICIES, type Ctx } from "../lib/policies";
import { TABLES, decodeRow, encodeValue, nowIso } from "../lib/schema";
import { randomCode } from "../lib/crypto";

export const data = new Hono<AppEnv>();

const MAX_ROWS = 1000;
const OPS: Record<string, string> = { eq: "=", neq: "!=", gt: ">", gte: ">=", lt: "<", lte: "<=", like: "LIKE", ilike: "LIKE" };

type Filter = { column: string; op: string; value: unknown; negate?: boolean };
type QueryReq = {
  table: string;
  action: "select" | "insert" | "update" | "upsert" | "delete";
  columns?: string;
  filters?: Filter[];
  or?: string;
  order?: { column: string; ascending?: boolean; nullsFirst?: boolean }[];
  limit?: number;
  offset?: number;
  values?: Record<string, unknown> | Record<string, unknown>[];
  onConflict?: string;
  ignoreDuplicates?: boolean;
  returning?: boolean;
  count?: "exact" | null;
  head?: boolean;
};

class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}

function col(table: string, name: string): string {
  const n = name.trim();
  if (!TABLES[table].columns[n]) throw new HttpError(400, `column ${table}.${n} does not exist`, "42703");
  return `"${n}"`;
}

function selectList(table: string, columns?: string): string[] {
  if (!columns || columns.trim() === "*" || columns.includes("*")) return Object.keys(TABLES[table].columns);
  return columns.split(",").map((c) => c.trim()).filter(Boolean).map((c) => {
    if (c.includes("(") || c.includes(":")) throw new HttpError(400, `Unsupported select expression "${c}" (no joins on D1 API)`);
    col(table, c);
    return c;
  });
}

function filterSql(table: string, f: Filter, params: unknown[]): string {
  const c = col(table, f.column);
  let sql: string;
  if (f.op === "is") {
    if (f.value === null || f.value === "null") sql = `${c} IS NULL`;
    else if (f.value === true || f.value === "true") sql = `${c} = 1`;
    else if (f.value === false || f.value === "false") sql = `${c} = 0`;
    else throw new HttpError(400, `Invalid IS value`);
  } else if (f.op === "in") {
    let arr = f.value as unknown[];
    if (typeof f.value === "string") arr = f.value.replace(/^\(|\)$/g, "").split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
    if (!Array.isArray(arr) || arr.length === 0) return f.negate ? "1=1" : "1=0";
    if (arr.length > 500) throw new HttpError(400, "IN list too long");
    sql = `${c} IN (${arr.map(() => "?").join(",")})`;
    for (const v of arr) params.push(encodeValue(table, f.column, v));
  } else if (OPS[f.op]) {
    sql = `${c} ${OPS[f.op]} ?`;
    params.push(encodeValue(table, f.column, f.value));
  } else {
    throw new HttpError(400, `Unsupported operator ${f.op}`);
  }
  return f.negate ? `NOT (${sql})` : sql;
}

/** PostgREST-style or string: "short_code.eq.abc,custom_slug.eq.abc" */
function parseOr(table: string, expr: string, params: unknown[]): string {
  const parts = expr.split(",").map((p) => p.trim()).filter(Boolean);
  if (!parts.length || parts.length > 20) throw new HttpError(400, "Invalid or() filter");
  return "(" + parts.map((p) => {
    const m = p.match(/^([a-z_]+)\.(not\.)?([a-z]+)\.(.*)$/);
    if (!m) throw new HttpError(400, `Invalid or() part "${p}"`);
    return filterSql(table, { column: m[1], op: m[3], value: m[4], negate: !!m[2] }, params);
  }).join(" OR ") + ")";
}

function policyWhere(rule: ((c: Ctx) => boolean | { sql: string; params: unknown[] }) | undefined, ctx: Ctx, params: unknown[]): string {
  if (!rule) throw new HttpError(403, "permission denied", "42501");
  const r = rule(ctx);
  if (r === false) throw new HttpError(403, "permission denied", "42501");
  if (r === true) return "1=1";
  params.push(...r.params);
  return `(${r.sql})`;
}

function decodeOut(table: string, rows: Record<string, unknown>[], cols?: string[]): Record<string, unknown>[] {
  const hidden = POLICIES[table]?.hiddenColumns ?? [];
  return rows.map((r) => {
    const d = decodeRow(table, r);
    for (const h of hidden) if (h in d) d[h] = d[h] ? "********" : null;
    if (cols) for (const k of Object.keys(d)) if (!cols.includes(k)) delete d[k];
    return d;
  });
}

async function cleanValues(table: string, raw: Record<string, unknown>, ctx: Ctx, forInsert: boolean): Promise<Record<string, unknown>> {
  const pol = POLICIES[table];
  const v: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(raw)) {
    col(table, k);
    if (!ctx.isAdmin && pol.readOnlyColumns?.includes(k)) continue; // silently ignore protected fields
    if (!ctx.isAdmin && !forInsert && pol.immutableColumns?.includes(k)) continue;
    v[k] = val;
  }
  if (forInsert) {
    if (!pol.insert) throw new HttpError(403, "permission denied", "42501");
    const ok = pol.insert(ctx, v);
    if (ok !== true) throw new HttpError(403, ok, "42501");
    if (TABLES[table].columns.id && !v.id) v.id = crypto.randomUUID();
  } else {
    delete v.id;
  }
  if (pol.transform) await pol.transform(v);
  if (TABLES[table].hasUpdatedAt) v.updated_at = nowIso();
  return v;
}

/** Old Postgres views -> base table. Read-only; secret columns are masked by the policies. */
const VIEW_ALIASES: Record<string, string> = {
  links_safe: "links",
  shared_analytics_safe: "shared_analytics",
};

async function run(c: { env: AppEnv["Bindings"] }, ctx: Ctx, q: QueryReq) {
  if (VIEW_ALIASES[q.table]) {
    if (q.action !== "select") throw new HttpError(405, `cannot write to view "${q.table}"`);
    q = { ...q, table: VIEW_ALIASES[q.table] };
  }
  const { table } = q;
  if (!TABLES[table] || !POLICIES[table]) throw new HttpError(404, `relation "${table}" does not exist`, "42P01");
  const pol = POLICIES[table];
  const db = c.env.DB;
  const params: unknown[] = [];
  const where: string[] = [];
  const outCols = q.returning === false ? undefined : selectList(table, q.columns);

  const addFilters = () => {
    for (const f of q.filters ?? []) where.push(filterSql(table, f, params));
    if (q.or) where.push(parseOr(table, q.or, params));
  };

  if (q.action === "select") {
    where.push(policyWhere(pol.select, ctx, params));
    addFilters();
    const w = where.join(" AND ");
    if (q.count === "exact" && q.head) {
      const r = await db.prepare(`SELECT COUNT(*) AS n FROM "${table}" WHERE ${w}`).bind(...params).first<{ n: number }>();
      return { data: null, count: r?.n ?? 0 };
    }
    let sql = `SELECT ${outCols!.map((x) => `"${x}"`).join(", ")} FROM "${table}" WHERE ${w}`;
    if (q.order?.length) {
      sql += " ORDER BY " + q.order.map((o) => `${col(table, o.column)} ${o.ascending === false ? "DESC" : "ASC"}${o.nullsFirst ? " NULLS FIRST" : ""}`).join(", ");
    }
    const limit = Math.min(Math.max(Number(q.limit ?? MAX_ROWS), 0), MAX_ROWS);
    sql += ` LIMIT ${limit} OFFSET ${Math.max(Number(q.offset ?? 0), 0)}`;
    const res = await db.prepare(sql).bind(...params).all<Record<string, unknown>>();
    let count: number | null = null;
    if (q.count === "exact") {
      const cp = params.slice();
      count = (await db.prepare(`SELECT COUNT(*) AS n FROM "${table}" WHERE ${w}`).bind(...cp).first<{ n: number }>())?.n ?? 0;
    }
    return { data: decodeOut(table, res.results), count };
  }

  if (q.action === "insert" || q.action === "upsert") {
    const rows = Array.isArray(q.values) ? q.values : q.values ? [q.values] : [];
    if (!rows.length) throw new HttpError(400, "No values to insert");
    if (rows.length > 500) throw new HttpError(400, "Too many rows in one insert");
    const stmts: D1PreparedStatement[] = [];
    for (const raw of rows) {
      const v = await cleanValues(table, raw, ctx, true);
      const keys = Object.keys(v);
      const p = keys.map((k) => encodeValue(table, k, v[k]));
      let sql = `INSERT INTO "${table}" (${keys.map((k) => `"${k}"`).join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`;
      if (q.action === "upsert") {
        const conflict = (q.onConflict || "id").split(",").map((x) => col(table, x));
        if (q.ignoreDuplicates) sql += ` ON CONFLICT (${conflict.join(", ")}) DO NOTHING`;
        else {
          const upd = keys.filter((k) => k !== "id" && !conflict.includes(`"${k}"`));
          const wp: unknown[] = [];
          const w = policyWhere(pol.update, ctx, wp);
          sql += upd.length
            ? ` ON CONFLICT (${conflict.join(", ")}) DO UPDATE SET ${upd.map((k) => `"${k}" = excluded."${k}"`).join(", ")} WHERE ${w}`
            : ` ON CONFLICT (${conflict.join(", ")}) DO NOTHING`;
          p.push(...wp);
        }
      }
      sql += " RETURNING *";
      stmts.push(db.prepare(sql).bind(...p));
    }
    const results = await db.batch<Record<string, unknown>>(stmts);
    const out = results.flatMap((r) => r.results);
    return { data: q.returning ? decodeOut(table, out, outCols) : null, count: null };
  }

  if (q.action === "update") {
    if (!q.filters?.length && !q.or) throw new HttpError(400, "UPDATE requires a filter");
    const v = await cleanValues(table, (q.values as Record<string, unknown>) ?? {}, ctx, false);
    const keys = Object.keys(v);
    if (!keys.length) return { data: q.returning ? [] : null, count: null };
    const setParams = keys.map((k) => encodeValue(table, k, v[k]));
    where.push(policyWhere(pol.update, ctx, params));
    addFilters();
    const sql = `UPDATE "${table}" SET ${keys.map((k) => `"${k}" = ?`).join(", ")} WHERE ${where.join(" AND ")} RETURNING *`;
    const res = await db.prepare(sql).bind(...setParams, ...params).all<Record<string, unknown>>();
    return { data: q.returning ? decodeOut(table, res.results, outCols) : null, count: null };
  }

  if (q.action === "delete") {
    if (!q.filters?.length && !q.or) throw new HttpError(400, "DELETE requires a filter");
    where.push(policyWhere(pol.delete, ctx, params));
    addFilters();
    const res = await db.prepare(`DELETE FROM "${table}" WHERE ${where.join(" AND ")} RETURNING *`).bind(...params).all<Record<string, unknown>>();
    return { data: q.returning ? decodeOut(table, res.results, outCols) : null, count: null };
  }

  throw new HttpError(400, "Unknown action");
}

function errorBody(e: unknown) {
  if (e instanceof HttpError) return { status: e.status, body: { message: e.message, code: e.code ?? String(e.status) } };
  const msg = e instanceof Error ? e.message : String(e);
  if (/UNIQUE constraint failed/i.test(msg)) return { status: 409, body: { message: "duplicate key value violates unique constraint", code: "23505", details: msg } };
  if (/FOREIGN KEY constraint failed/i.test(msg)) return { status: 409, body: { message: "violates foreign key constraint", code: "23503" } };
  if (/CHECK constraint failed/i.test(msg)) return { status: 400, body: { message: "violates check constraint", code: "23514" } };
  console.error("[data] query failed", msg);
  return { status: 500, body: { message: "Database error", code: "XX000" } };
}

data.post("/query", async (c) => {
  const u = c.get("user");
  const ctx: Ctx = { uid: u?.id ?? null, isAdmin: c.get("isAdmin") };
  try {
    const q = await c.req.json<QueryReq>();
    return c.json(await run(c, ctx, q));
  } catch (e) {
    const { status, body } = errorBody(e);
    return c.json({ data: null, error: body }, status as 400);
  }
});

// ------------------------------------------------------------------ RPC (Postgres functions)
data.post("/rpc/:fn", async (c) => {
  const u = c.get("user");
  const fn = c.req.param("fn");
  const args = await c.req.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>));
  const db = c.env.DB;
  try {
    switch (fn) {
      case "has_role": {
        const uid = (args._user_id as string) || u?.id;
        if (!uid) return c.json(false);
        // users may only ask about themselves unless admin
        if (uid !== u?.id && !c.get("isAdmin")) return c.json(false);
        const r = await db.prepare(`SELECT 1 FROM user_roles WHERE user_id = ? AND role = ?`).bind(uid, args._role).first();
        return c.json(!!r);
      }
      case "increment_global_counter": {
        // counters are maintained by SQLite triggers now; keep the call harmless
        return c.json(null);
      }
      case "bump_api_key_usage": {
        if (!u) return c.json({ message: "Not authenticated" }, 401);
        await db.prepare(`UPDATE api_keys SET last_request_at = ? WHERE id = ? AND user_id = ?`).bind(nowIso(), args._key_id, u.id).run();
        return c.json(null);
      }
      case "touch_merchant_api_key": {
        if (!c.get("isAdmin")) return c.json({ message: "permission denied" }, 403);
        await db.prepare(`UPDATE merchant_api_keys SET last_used_at = ? WHERE id = ?`).bind(nowIso(), args._key_id).run();
        return c.json(null);
      }
      case "generate_slicebox_shortcode": {
        const len = Math.min(Math.max(Number(args.target_length ?? args.length ?? 6), 4), 12);
        for (let i = 0; i < 10; i++) {
          const code = randomCode(len);
          const taken = await db.prepare(`SELECT 1 FROM slicebox_files WHERE short_code = ?`).bind(code).first();
          if (!taken) return c.json(code);
        }
        return c.json({ message: "Could not allocate short code" }, 500);
      }
      default:
        return c.json({ message: `function ${fn} not found`, code: "PGRST202" }, 404);
    }
  } catch (e) {
    const { status, body } = errorBody(e);
    return c.json(body, status as 400);
  }
});
