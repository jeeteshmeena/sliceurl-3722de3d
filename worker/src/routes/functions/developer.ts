// Ported edge functions: api-keys (dashboard key management), api-public
// (the public REST API used with `slc_` keys) and merchant-api (Paytm orders).
import type { Context } from "hono";
import type { AppEnv, Env } from "../../env";
import { hashPassword, randomCode, sha256Hex } from "../../lib/crypto";
import { activePaytmSettings, paytmChecksum, paytmHost, randomSalt } from "../../lib/paytm";
import { nowIso } from "../../lib/schema";

type C = Context<AppEnv>;
const NANOID = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
const DAY = 86_400_000;

// ================================================================== api-keys
export async function apiKeys(c: C) {
  const user = c.get("user");
  if (!user) return c.json({ error: "Authorization required" }, 401);
  const body = c.req.method === "POST" ? await c.req.json<Record<string, any>>().catch(() => ({} as Record<string, any>)) : {};
  const action = c.req.query("action") || body.action;
  const db = c.env.DB;

  switch (action) {
    case "create": {
      const count = await db.prepare(`SELECT COUNT(*) AS n FROM api_keys WHERE user_id = ? AND status = 'active'`).bind(user.id).first<{ n: number }>();
      if ((count?.n ?? 0) >= 10) return c.json({ error: "You can have at most 10 active API keys" }, 400);
      const raw = `slc_${[...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
      const prefix = raw.substring(0, 12);
      const id = crypto.randomUUID();
      await db.prepare(
        `INSERT INTO api_keys (id, user_id, key_prefix, key_hash, name, status, rate_limit_daily, requests_today, rate_limit_reset_at)
         VALUES (?, ?, ?, ?, ?, 'active', 1000, 0, ?)`,
      ).bind(id, user.id, prefix, await sha256Hex(raw), String(body.name || "API Key").slice(0, 100), new Date(Date.now() + DAY).toISOString()).run();
      return c.json({ success: true, api_key: raw, key_id: id, prefix, warning: "Copy this key now. You will not be able to see it again!" });
    }
    case "list": {
      const { results } = await db.prepare(
        `SELECT id, key_prefix, name, status, rate_limit_daily, requests_today, rate_limit_reset_at, created_at, revoked_at, last_request_at
         FROM api_keys WHERE user_id = ? ORDER BY created_at DESC`,
      ).bind(user.id).all();
      return c.json({ keys: results });
    }
    case "revoke":
    case "delete": {
      if (!body.key_id) return c.json({ error: "key_id is required" }, 400);
      const stmt = action === "revoke"
        ? db.prepare(`UPDATE api_keys SET status = 'revoked', revoked_at = ?, updated_at = ? WHERE id = ? AND user_id = ?`).bind(nowIso(), nowIso(), body.key_id, user.id)
        : db.prepare(`DELETE FROM api_keys WHERE id = ? AND user_id = ?`).bind(body.key_id, user.id);
      await stmt.run();
      return c.json({ success: true });
    }
    case "usage": {
      const { results } = await db.prepare(
        `SELECT requests_today, rate_limit_daily, rate_limit_reset_at FROM api_keys WHERE user_id = ? AND status = 'active'`,
      ).bind(user.id).all<{ requests_today: number; rate_limit_daily: number; rate_limit_reset_at: string }>();
      const now = Date.now();
      // a key whose window has passed has really used 0 today
      const used = results.reduce((s, k) => s + (new Date(k.rate_limit_reset_at).getTime() <= now ? 0 : k.requests_today), 0);
      const limit = results.reduce((s, k) => s + k.rate_limit_daily, 0);
      return c.json({ requests_used: used, requests_limit: limit, requests_remaining: Math.max(0, limit - used), reset_at: results[0]?.rate_limit_reset_at || new Date(now + DAY).toISOString() });
    }
    default:
      return c.json({ error: "Invalid action" }, 400);
  }
}

// ================================================================== api-public
type KeyRow = { id: string; user_id: string; status: string; rate_limit_daily: number; requests_today: number; rate_limit_reset_at: string };

const fail = (c: C, error: string, status: number) => c.json({ success: false, error }, status as 400);

function checkShortenUrl(url: string): string | null {
  if (/^upi:/i.test(url)) {
    if (url.length > 4096) return "UPI URL exceeds maximum length (4KB)";
    if (!/^upi:\/\/pay\?/i.test(url)) return "UPI URL must start with upi://pay?";
    const p = new URLSearchParams(url.slice(url.indexOf("?") + 1));
    if (!p.get("pa")?.trim()) return "UPI URL must include pa= (payee VPA)";
    const am = p.get("am")?.trim();
    if (!am) return "UPI URL must include am= (amount)";
    if (isNaN(Number(am)) || Number(am) <= 0) return "UPI amount (am) must be a positive number";
    return null;
  }
  if (typeof url === "string" && url.trim() && !/^\s*(javascript|data|vbscript|file|blob|about):/i.test(url)) {
    try { const pr = new URL(url).protocol; if (pr === "http:" || pr === "https:") return null; } catch { /* fallthrough */ }
  }
  return "Invalid URL. Only http://, https://, and upi://pay? URLs are accepted.";
}
const titleFor = (url: string) => {
  if (/^upi:/i.test(url)) return "API: UPI Payment";
  try { return `API: ${new URL(url).hostname}`; } catch { return "API: Link"; }
};

/** Same as the Postgres bump_api_key_usage(): +1, or restart the 24 h window. */
const bump = (env: Env, keyId: string) => {
  const now = nowIso();
  return env.DB.prepare(
    `UPDATE api_keys SET
       requests_today = CASE WHEN ? >= rate_limit_reset_at THEN 1 ELSE requests_today + 1 END,
       rate_limit_reset_at = CASE WHEN ? >= rate_limit_reset_at THEN ? ELSE rate_limit_reset_at END,
       last_request_at = ?, updated_at = ?
     WHERE id = ?`,
  ).bind(now, now, new Date(Date.now() + DAY).toISOString(), now, now, keyId).run();
};

async function authApiKey(c: C): Promise<KeyRow | Response> {
  const auth = c.req.header("authorization");
  const key = c.req.header("x-api-key") || (auth?.startsWith("Bearer ") ? auth.slice(7) : null);
  if (!key) return fail(c, 'Missing API key. Send it via "Authorization: Bearer <key>" or "X-API-Key: <key>" header.', 401);
  if (!key.startsWith("slc_")) return fail(c, "Invalid API key format. Keys start with slc_", 401);
  const row = await c.env.DB.prepare(`SELECT id, user_id, status, rate_limit_daily, requests_today, rate_limit_reset_at FROM api_keys WHERE key_hash = ?`)
    .bind(await sha256Hex(key)).first<KeyRow>();
  if (!row) return fail(c, "Invalid API key", 401);
  if (row.status === "revoked") return fail(c, "API key has been revoked", 403);
  if (new Date() >= new Date(row.rate_limit_reset_at)) row.requests_today = 0; // window over; bump() resets it
  if (row.requests_today >= row.rate_limit_daily) return fail(c, "Rate limit exceeded. Try again after your daily quota resets.", 429);
  return row;
}

async function insertApiLink(env: Env, key: KeyRow, url: string, code: string, extra: { title?: string; expires_at?: string; max_clicks?: number; password_hash?: string | null } = {}) {
  const id = crypto.randomUUID();
  const now = nowIso();
  await env.DB.prepare(
    `INSERT INTO links (id, original_url, short_code, user_id, api_source, api_key_id, title, expires_at, max_clicks, is_password_protected, password_hash, click_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
  ).bind(id, url, code, key.user_id, key.id, extra.title || titleFor(url), extra.expires_at || null, extra.max_clicks || null,
    extra.password_hash ? 1 : 0, extra.password_hash ?? null, now, now).run();
  return { id, created_at: now };
}

const codeTaken = async (env: Env, code: string) => !!(await env.DB.prepare(`SELECT 1 FROM links WHERE short_code = ?`).bind(code).first());
async function freshCode(env: Env) {
  let code: string;
  do code = randomCode(7, NANOID); while (await codeTaken(env, code));
  return code;
}

export async function apiPublic(c: C) {
  const key = await authApiKey(c);
  if (key instanceof Response) return key;
  const action = c.req.query("action");
  const site = new URL(c.env.SITE_URL).origin;
  const db = c.env.DB;
  const m = c.req.method;

  if (action === "shorten" && m === "POST") {
    const b = await c.req.json<Record<string, any>>().catch(() => ({} as Record<string, any>));
    const url: string | undefined = b.long_url || b.url;
    if (!url) return fail(c, "long_url is required", 400);
    const bad = checkShortenUrl(url);
    if (bad) return fail(c, bad, 400);
    let code: string = (b.custom_alias || b.custom_slug || "").trim();
    if (code) {
      if (!/^[a-zA-Z0-9_-]{2,64}$/.test(code)) return fail(c, "custom_alias must be 2-64 characters containing only letters, numbers, hyphens, underscores.", 400);
      if (await codeTaken(c.env, code)) return fail(c, "Custom alias already exists.", 409);
    } else code = await freshCode(c.env);
    const pw = typeof b.password === "string" && b.password ? await hashPassword(b.password) : null;
    let created: { created_at: string };
    try {
      created = await insertApiLink(c.env, key, url, code, { title: b.title, expires_at: b.expires_at, max_clicks: b.max_clicks, password_hash: pw });
    } catch { return fail(c, "Failed to create short link", 500); }
    await bump(c.env, key.id);
    return c.json({
      success: true, short_url: `${site}/s/${code}`, original_url: url, slug: code, title: b.title || titleFor(url),
      expires_at: b.expires_at || null, max_clicks: b.max_clicks || null, password_protected: !!pw, created_at: created.created_at,
    }, 201);
  }

  if (action === "batch" && m === "POST") {
    const b = await c.req.json<Record<string, any>>().catch(() => ({} as Record<string, any>));
    const items: any[] = b.urls || b.items;
    if (!Array.isArray(items) || !items.length) return fail(c, "urls (or items) must be a non-empty array", 400);
    if (items.length > 25) return fail(c, "Maximum 25 URLs per batch request", 400);
    const results: Record<string, unknown>[] = [];
    for (const item of items) {
      const url: string = typeof item === "string" ? item : item?.long_url || item?.url || "";
      const alias: string | undefined = typeof item === "string" ? undefined : item?.custom_alias || item?.custom_slug;
      const bad = checkShortenUrl(url);
      if (bad) { results.push({ success: false, original_url: url, error: bad }); continue; }
      let code: string;
      if (alias?.trim()) {
        code = alias.trim();
        if (!/^[a-zA-Z0-9_-]{2,64}$/.test(code)) { results.push({ success: false, original_url: url, error: "Invalid custom_alias format" }); continue; }
        if (await codeTaken(c.env, code)) { results.push({ success: false, original_url: url, error: "Custom alias already exists" }); continue; }
      } else code = await freshCode(c.env);
      try {
        await insertApiLink(c.env, key, url, code);
        results.push({ success: true, short_url: `${site}/s/${code}`, original_url: url, slug: code });
      } catch { results.push({ success: false, original_url: url, error: "Insert failed" }); }
    }
    await bump(c.env, key.id);
    return c.json({ success: true, results, total: items.length, succeeded: results.filter((r) => r.success).length }, 201);
  }

  if (action === "info" && m === "GET") {
    const slug = c.req.query("slug");
    if (!slug) return fail(c, "slug query parameter is required", 400);
    const l = await db.prepare(`SELECT short_code, original_url, title, click_count, created_at, expires_at, max_clicks, is_password_protected, api_source FROM links WHERE short_code = ? AND user_id = ?`)
      .bind(slug, key.user_id).first<Record<string, any>>();
    if (!l) return fail(c, "Link not found or not owned by you", 404);
    await bump(c.env, key.id);
    return c.json({
      success: true, slug: l.short_code, short_url: `${site}/s/${l.short_code}`, original_url: l.original_url, title: l.title,
      clicks: l.click_count || 0, expires_at: l.expires_at, max_clicks: l.max_clicks, password_protected: !!l.is_password_protected,
      api_generated: !!l.api_source, created_at: l.created_at,
    });
  }

  if (action === "analytics" && m === "GET") {
    const slug = c.req.query("slug");
    if (!slug) return fail(c, "slug query parameter is required", 400);
    const l = await db.prepare(`SELECT id, short_code, original_url, click_count, created_at FROM links WHERE short_code = ? AND user_id = ?`)
      .bind(slug, key.user_id).first<Record<string, any>>();
    if (!l) return fail(c, "Link not found or not owned by you", 404);
    const since = new Date(Date.now() - 30 * DAY).toISOString();
    const group = async (col: string) => {
      const { results } = await db.prepare(`SELECT ${col} AS k, COUNT(*) AS n FROM clicks WHERE link_id = ? AND clicked_at >= ? AND ${col} IS NOT NULL AND ${col} != '' GROUP BY k`)
        .bind(l.id, since).all<{ k: string; n: number }>();
      return Object.fromEntries(results.map((r) => [r.k, r.n]));
    };
    const [uniq, countries, devices, browsers, os, referrers, days] = await Promise.all([
      db.prepare(`SELECT COALESCE(SUM(is_unique), 0) AS n FROM clicks WHERE link_id = ? AND clicked_at >= ?`).bind(l.id, since).first<{ n: number }>(),
      group("country"), group("device_type"), group("browser"), group("os"), group("referrer"),
      db.prepare(`SELECT substr(clicked_at, 1, 10) AS d, COUNT(*) AS n FROM clicks WHERE link_id = ? AND clicked_at >= ? GROUP BY d`).bind(l.id, since).all<{ d: string; n: number }>(),
    ]);
    const dayMap: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) dayMap[new Date(Date.now() - i * DAY).toISOString().split("T")[0]] = 0;
    for (const r of days.results) if (dayMap[r.d] !== undefined) dayMap[r.d] = r.n;
    await bump(c.env, key.id);
    return c.json({
      success: true, slug: l.short_code, original_url: l.original_url, created_at: l.created_at,
      total_clicks: l.click_count || 0, unique_clicks: uniq?.n ?? 0, countries, devices, browsers, os, referrers,
      last_30_days: Object.entries(dayMap).map(([date, clicks]) => ({ date, clicks })),
    });
  }

  if (action === "delete" && m === "DELETE") {
    const slug = c.req.query("slug");
    if (!slug) return fail(c, "slug query parameter is required", 400);
    await db.prepare(`DELETE FROM links WHERE short_code = ? AND user_id = ?`).bind(slug, key.user_id).run();
    await bump(c.env, key.id);
    return c.json({ success: true, message: "Link deleted" });
  }

  if (action === "list" && m === "GET") {
    const limit = Math.min(Math.max(parseInt(c.req.query("limit") || "50") || 50, 1), 100);
    const offset = Math.max(parseInt(c.req.query("offset") || "0") || 0, 0);
    const { results } = await db.prepare(
      `SELECT short_code, original_url, title, click_count, created_at, api_source FROM links WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    ).bind(key.user_id, limit, offset).all<Record<string, any>>();
    await bump(c.env, key.id);
    return c.json({
      success: true,
      links: results.map((l) => ({ short_url: `${site}/s/${l.short_code}`, slug: l.short_code, original_url: l.original_url, title: l.title, clicks: l.click_count || 0, created_at: l.created_at, api_generated: !!l.api_source })),
      count: results.length, limit, offset,
    });
  }

  if (action === "usage" && m === "GET") {
    const f = await db.prepare(`SELECT requests_today, rate_limit_daily, rate_limit_reset_at, last_request_at FROM api_keys WHERE id = ?`).bind(key.id).first<Record<string, any>>();
    const used = new Date() >= new Date(f!.rate_limit_reset_at) ? 0 : f!.requests_today;
    return c.json({ success: true, requests_used: used, requests_limit: f!.rate_limit_daily, requests_remaining: Math.max(0, f!.rate_limit_daily - used), reset_at: f!.rate_limit_reset_at, last_request_at: f!.last_request_at ?? null });
  }

  return fail(c, "Unknown action. Use action=shorten|batch|info|analytics|delete|list|usage", 404);
}

// ================================================================== merchant-api
// /functions/v1/merchant-api/orders (POST), /orders/:id (GET), /public/orders/:id (GET, used by the hosted /pay page)
export async function merchantApi(c: C) {
  const path = c.req.path.replace(/^.*\/merchant-api/, "") || "/";
  const db = c.env.DB;
  const site = new URL(c.env.SITE_URL).origin;

  if (c.req.method === "GET" && path.startsWith("/public/orders/")) {
    const id = path.split("/").pop()!;
    const o = await db.prepare(`SELECT id, order_number, amount, currency, description, customer_email, customer_name, status, txn_token, paytm_order_id FROM merchant_orders WHERE id = ?`)
      .bind(id).first<Record<string, any>>();
    if (!o) return c.json({ error: "not_found" }, 404);
    const s = await activePaytmSettings(c.env);
    return c.json({ ...o, mid: s?.merchant_id ?? null, env: s?.env ?? "staging" });
  }

  const apiKey = c.req.header("x-api-key") ?? "";
  if (!apiKey) return c.json({ error: "missing_api_key" }, 401);
  const keyRow = await db.prepare(`SELECT id, is_active FROM merchant_api_keys WHERE key_hash = ?`).bind(await sha256Hex(apiKey)).first<{ id: string; is_active: number }>();
  if (!keyRow || !keyRow.is_active) return c.json({ error: "invalid_api_key" }, 401);
  await db.prepare(`UPDATE merchant_api_keys SET last_used_at = ? WHERE id = ?`).bind(nowIso(), keyRow.id).run();

  if (c.req.method === "GET" && path.startsWith("/orders/")) {
    const o = await db.prepare(
      `SELECT id, order_number, external_order_id, amount, currency, status, paytm_order_id, paytm_txn_id, verified_at, created_at FROM merchant_orders WHERE id = ? AND api_key_id = ?`,
    ).bind(path.split("/").pop(), keyRow.id).first();
    return o ? c.json(o) : c.json({ error: "not_found" }, 404);
  }

  if (c.req.method === "POST" && (path === "/orders" || path === "/orders/")) {
    const b = await c.req.json<Record<string, any>>().catch(() => ({} as Record<string, any>));
    const amount = Number(b.amount);
    if (!amount || amount <= 0 || amount > 500000) return c.json({ error: "invalid_amount", message: "amount must be > 0 and <= 500000" }, 400);
    const s = await activePaytmSettings(c.env);
    if (!s?.merchant_id || !s.merchant_key) return c.json({ error: "paytm_not_configured" }, 503);
    const { isProd, host } = paytmHost(s);
    const website = s.website || (isProd ? "DEFAULT" : "WEBSTAGING");
    const currency = b.currency || "INR";
    const id = crypto.randomUUID();
    const orderNumber = `MRC-${Date.now().toString(36).toUpperCase()}-${randomSalt(4)}`;
    try {
      await db.prepare(
        `INSERT INTO merchant_orders (id, api_key_id, external_order_id, order_number, amount, currency, customer_email, customer_name, customer_phone,
           description, callback_url, return_url, metadata, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'created')`,
      ).bind(id, keyRow.id, b.external_order_id ?? null, orderNumber, amount, currency, b.customer_email ?? null, b.customer_name ?? null,
        b.customer_phone ?? null, b.description ?? null, b.callback_url ?? null, b.return_url ?? null, b.metadata ? JSON.stringify(b.metadata) : null).run();
    } catch (e) {
      return c.json({ error: "insert_failed", message: String(e) }, 500);
    }

    const initBody = {
      requestType: "Payment", mid: s.merchant_id, websiteName: website, orderId: orderNumber,
      // NOTE: paytm-callback is ported in the payments batch; until then Paytm's callback gets a 501.
      callbackUrl: `${new URL(c.req.url).origin}/functions/v1/paytm-callback`,
      channelId: "WEB",
      txnAmount: { value: amount.toFixed(2), currency },
      userInfo: { custId: id, email: b.customer_email ?? "", firstName: b.customer_name ?? "", mobile: b.customer_phone ?? "" },
    };
    const signature = await paytmChecksum(JSON.stringify(initBody), s.merchant_key);
    const res = await fetch(`${host}/theia/api/v1/initiateTransaction?mid=${encodeURIComponent(s.merchant_id)}&orderId=${encodeURIComponent(orderNumber)}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: initBody, head: { signature } }),
    });
    const data = await res.json<any>().catch(() => ({}));
    const txnToken = data?.body?.txnToken;
    const code = data?.body?.resultInfo?.resultCode;
    if (!txnToken || code !== "0000") {
      await db.prepare(`UPDATE merchant_orders SET status = 'failed', raw_response = ?, updated_at = ? WHERE id = ?`).bind(JSON.stringify(data), nowIso(), id).run();
      return c.json({ error: "paytm_initiation_failed", code: code ?? "unknown", message: data?.body?.resultInfo?.resultMsg ?? "Paytm did not return a token" }, 502);
    }
    await db.prepare(`UPDATE merchant_orders SET status = 'pending', paytm_order_id = ?, txn_token = ?, raw_response = ?, updated_at = ? WHERE id = ?`)
      .bind(orderNumber, txnToken, JSON.stringify(data), nowIso(), id).run();
    return c.json({ id, order_number: orderNumber, status: "pending", checkout_url: `${site}/pay/${id}`, amount, currency, env: isProd ? "production" : "staging" });
  }
  return c.json({ error: "not_found" }, 404);
}
