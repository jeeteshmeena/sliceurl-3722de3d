// Ported edge functions: stats, analytics-time, shared-analytics, calculate-persona, detect-geo.
// Aggregation now happens in SQL. The old functions loaded click rows through
// PostgREST, which caps at 1000 rows, so busy links showed wrong totals.
import type { Context } from "hono";
import type { AppEnv, Env } from "../../env";
import { hashPassword, verifyPassword } from "../../lib/crypto";
import { clientIp } from "../../lib/request";
import { nowIso } from "../../lib/schema";

type C = Context<AppEnv>;
type NameCount = { name: string; count: number };

const dayKey = (d: Date) => d.toISOString().split("T")[0];

async function groupCount(env: Env, col: string, fallback: string, linkId: string, since: string | null, limit?: number): Promise<NameCount[]> {
  // `col` is always one of our hard-coded column names, never user input
  const { results } = await env.DB.prepare(
    `SELECT COALESCE(NULLIF(${col}, ''), ?) AS name, COUNT(*) AS count FROM clicks
     WHERE link_id = ? ${since ? "AND clicked_at >= ?" : ""}
     GROUP BY 1 ORDER BY count DESC ${limit ? `LIMIT ${limit}` : ""}`,
  ).bind(...(since ? [fallback, linkId, since] : [fallback, linkId])).all<NameCount>();
  return results;
}

async function totals(env: Env, linkId: string, since: string | null) {
  const r = await env.DB.prepare(
    `SELECT COUNT(*) AS total, COALESCE(SUM(is_unique), 0) AS uniq FROM clicks WHERE link_id = ? ${since ? "AND clicked_at >= ?" : ""}`,
  ).bind(...(since ? [linkId, since] : [linkId])).first<{ total: number; uniq: number }>();
  return { total: r?.total ?? 0, unique: r?.uniq ?? 0 };
}

async function dailyTimeline(env: Env, linkId: string, days: number) {
  const timeline: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) timeline[dayKey(new Date(Date.now() - i * 86_400_000))] = 0;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { results } = await env.DB.prepare(
    `SELECT substr(clicked_at, 1, 10) AS d, COUNT(*) AS n FROM clicks WHERE link_id = ? AND clicked_at >= ? GROUP BY d`,
  ).bind(linkId, since).all<{ d: string; n: number }>();
  for (const r of results) if (timeline[r.d] !== undefined) timeline[r.d] = r.n;
  return Object.entries(timeline).map(([date, clicks]) => ({ date, clicks })).sort((a, b) => a.date.localeCompare(b.date));
}

// ------------------------------------------------------------------ stats
export async function stats(c: C) {
  const user = c.get("user");
  if (!user) return c.json({ error: "Authorization required" }, 401);
  const shortCode = c.req.query("short_code");
  const linkId = c.req.query("link_id");
  const days = Math.min(Math.max(parseInt(c.req.query("days") || "30") || 30, 1), 365);
  if (!shortCode && !linkId) return c.json({ error: "Short code or link ID is required" }, 400);

  const link = await c.env.DB.prepare(`SELECT * FROM links WHERE user_id = ? AND ${shortCode ? "short_code" : "id"} = ?`)
    .bind(user.id, shortCode || linkId).first<Record<string, any>>();
  if (!link) return c.json({ error: "Link not found" }, 404);

  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const [t, devices, browsers, oses, countries, referrers, timeline, hm] = await Promise.all([
    totals(c.env, link.id, since),
    groupCount(c.env, "device_type", "unknown", link.id, since),
    groupCount(c.env, "browser", "unknown", link.id, since),
    groupCount(c.env, "os", "unknown", link.id, since),
    groupCount(c.env, "country", "Unknown", link.id, since),
    groupCount(c.env, "referrer", "Direct", link.id, since),
    dailyTimeline(c.env, link.id, days),
    c.env.DB.prepare(
      `SELECT CAST(strftime('%w', clicked_at) AS INTEGER) AS dow, CAST(strftime('%H', clicked_at) AS INTEGER) AS hr, COUNT(*) AS n
       FROM clicks WHERE link_id = ? AND clicked_at >= ? GROUP BY dow, hr`,
    ).bind(link.id, since).all<{ dow: number; hr: number; n: number }>(),
  ]);
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const r of hm.results) heatmap[r.dow][r.hr] = r.n; // UTC, same as the old server

  return c.json({
    link: { id: link.id, short_code: link.short_code, original_url: link.original_url, title: link.title, created_at: link.created_at, click_count: link.click_count, last_clicked_at: link.last_clicked_at },
    summary: { total_clicks: t.total, unique_clicks: t.unique, period_days: days },
    devices, browsers, operating_systems: oses, countries, referrers, timeline, heatmap,
  });
}

// ------------------------------------------------------------------ analytics-time
export async function analyticsTime(c: C) {
  const user = c.get("user");
  if (!user) return c.json({ error: "Authorization required" }, 401);
  const linkId = c.req.query("link_id");
  const type = c.req.query("type") === "daily" ? "daily" : "hourly";
  if (!linkId) return c.json({ error: "link_id is required" }, 400);
  const owned = await c.env.DB.prepare(`SELECT 1 FROM links WHERE id = ? AND user_id = ?`).bind(linkId, user.id).first();
  if (!owned) return c.json({ error: "Link not found" }, 404);

  const since = new Date(Date.now() - (type === "hourly" ? 1 : 7) * 86_400_000).toISOString();
  const bucket = type === "hourly" ? `CAST(strftime('%H', clicked_at) AS INTEGER)` : `CAST(strftime('%w', clicked_at) AS INTEGER)`;
  const { results } = await c.env.DB.prepare(
    `SELECT ${bucket} AS b, COUNT(*) AS n FROM clicks WHERE link_id = ? AND clicked_at >= ? GROUP BY b`,
  ).bind(linkId, since).all<{ b: number; n: number }>();
  const counts = new Map(results.map((r) => [r.b, r.n]));
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const data = type === "hourly"
    ? Array.from({ length: 24 }, (_, h) => ({ label: `${String(h).padStart(2, "0")}:00`, clicks: counts.get(h) ?? 0 }))
    : dayNames.map((label, d) => ({ label, clicks: counts.get(d) ?? 0 }));
  return c.json({ type, data, total: results.reduce((s, r) => s + r.n, 0) });
}

// ------------------------------------------------------------------ shared-analytics
type SharedRow = {
  id: string; link_id: string; user_id: string; share_token: string; password_hash: string | null;
  expires_at: string | null; is_active: number; views_count: number; created_at: string;
};

/** Shared-analytics passwords also had a legacy salted SHA-256 format. */
async function verifySharePassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith("pbkdf2$")) return verifyPassword(password, stored);
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password + "sliceurl_salt_2024")));
  return [...d].map((b) => b.toString(16).padStart(2, "0")).join("") === stored;
}

const shareAttempts = new Map<string, { n: number; reset: number }>();

async function sharedGet(c: C) {
  const token = c.req.query("token");
  // header preferred (keeps the password out of URLs/logs); ?password= still accepted for old clients
  const password = c.req.header("x-share-password") || c.req.query("password");
  if (!token) return c.json({ error: "Token is required" }, 400);

  const shared = await c.env.DB.prepare(`SELECT * FROM shared_analytics WHERE share_token = ? AND is_active = 1`).bind(token).first<SharedRow>();
  const link = shared && await c.env.DB.prepare(`SELECT id, short_code, title, original_url, created_at, click_count FROM links WHERE id = ?`)
    .bind(shared.link_id).first<Record<string, any>>();
  if (!shared || !link) return c.json({ error: "Shared analytics not found or has been disabled" }, 404);
  if (shared.expires_at && new Date(shared.expires_at) < new Date()) return c.json({ error: "This shared link has expired" }, 410);

  if (shared.password_hash) {
    if (!password) return c.json({ error: "Password required", requires_password: true, link_title: link.title || link.short_code }, 401);
    const key = `${clientIp(c.req.raw)}:${token}`;
    const now = Date.now();
    const a = shareAttempts.get(key);
    if (a && now < a.reset && a.n >= 10) return c.json({ error: "Too many attempts. Try again later.", requires_password: true }, 429);
    if (!(await verifySharePassword(password, shared.password_hash))) {
      shareAttempts.set(key, a && now < a.reset ? { n: a.n + 1, reset: a.reset } : { n: 1, reset: now + 600_000 });
      return c.json({ error: "Invalid password", requires_password: true }, 401);
    }
    shareAttempts.delete(key);
  }

  await c.env.DB.prepare(`UPDATE shared_analytics SET views_count = views_count + 1 WHERE id = ?`).bind(shared.id).run();
  const [t, devices, countries, referrers, timeline] = await Promise.all([
    totals(c.env, link.id, null),
    groupCount(c.env, "device_type", "unknown", link.id, null),
    groupCount(c.env, "country", "Unknown", link.id, null, 10),
    groupCount(c.env, "referrer", "Direct", link.id, null, 10),
    dailyTimeline(c.env, link.id, 30),
  ]);
  return c.json({
    link: { id: link.id, short_code: link.short_code, title: link.title, original_url: link.original_url, created_at: link.created_at, click_count: link.click_count },
    summary: { total_clicks: t.total, unique_clicks: t.unique, devices, countries, referrers, timeline },
    shared_at: shared.created_at,
    views_count: shared.views_count + 1,
  });
}

async function sharedCreate(c: C) {
  const user = c.get("user");
  if (!user) return c.json({ error: "Authorization required" }, 401);
  const { link_id, password, expires_in_days } = await c.req.json<{ link_id?: string; password?: string; expires_in_days?: number }>();
  if (!link_id) return c.json({ error: "link_id is required" }, 400);
  const owned = await c.env.DB.prepare(`SELECT 1 FROM links WHERE id = ? AND user_id = ?`).bind(link_id, user.id).first();
  if (!owned) return c.json({ error: "Link not found or you do not own it" }, 403);

  const shareToken = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const passwordHash = password?.trim() ? await hashPassword(password) : null;
  const expiresAt = expires_in_days && expires_in_days > 0 ? new Date(Date.now() + expires_in_days * 86_400_000).toISOString() : null;
  try {
    await c.env.DB.prepare(`INSERT INTO shared_analytics (id, link_id, user_id, share_token, password_hash, expires_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), link_id, user.id, shareToken, passwordHash, expiresAt).run();
  } catch {
    return c.json({ error: "Failed to create shared link" }, 500);
  }
  // old code built this from the Supabase function URL (wrong host); use the site origin
  return c.json({ success: true, share_token: shareToken, share_url: `${new URL(c.env.SITE_URL).origin}/shared/${shareToken}`, expires_at: expiresAt, has_password: !!passwordHash }, 201);
}

async function sharedDelete(c: C) {
  const user = c.get("user");
  if (!user) return c.json({ error: "Authorization required" }, 401);
  const token = c.req.query("token");
  if (!token) return c.json({ error: "Token is required" }, 400);
  await c.env.DB.prepare(`DELETE FROM shared_analytics WHERE share_token = ? AND user_id = ?`).bind(token, user.id).run();
  return c.json({ success: true });
}

export async function sharedAnalytics(c: C) {
  if (c.req.method === "GET") return sharedGet(c);
  if (c.req.method === "POST") return sharedCreate(c);
  if (c.req.method === "DELETE") return sharedDelete(c);
  return c.json({ error: "Method not allowed" }, 405);
}

// ------------------------------------------------------------------ calculate-persona
export async function calculatePersona(c: C) {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const s = await c.env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM links WHERE user_id = ?1) AS totalLinks,
       (SELECT COALESCE(SUM(click_count), 0) FROM links WHERE user_id = ?1) AS totalClicks,
       (SELECT COUNT(*) FROM folders WHERE user_id = ?1) AS folderCount,
       (SELECT COUNT(*) FROM links WHERE user_id = ?1 AND created_at >= ?2) AS linksThisWeek,
       (SELECT COUNT(*) FROM links WHERE user_id = ?1 AND (original_url LIKE '%utm\\_%' ESCAPE '\\' OR original_url LIKE '%ref=%' OR original_url LIKE '%source=%')) AS utmUsageCount`,
  ).bind(user.id, weekAgo).first<{ totalLinks: number; totalClicks: number; folderCount: number; linksThisWeek: number; utmUsageCount: number }>();
  const st = s!;
  let persona: "influencer" | "marketer" | "agency" | "casual" = "casual";
  if (st.totalLinks > 50 && st.totalClicks > 1000) persona = "influencer";
  else if (st.folderCount >= 3 && st.linksThisWeek > 10) persona = "agency";
  else if (st.totalLinks > 10 && st.utmUsageCount > st.totalLinks * 0.5) persona = "marketer";

  const now = nowIso();
  await c.env.DB.prepare(
    `INSERT INTO user_personas (id, user_id, persona, total_links, total_clicks, utm_usage_count, folder_count, links_this_week, last_calculated_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id) DO UPDATE SET persona = excluded.persona, total_links = excluded.total_links, total_clicks = excluded.total_clicks,
       utm_usage_count = excluded.utm_usage_count, folder_count = excluded.folder_count, links_this_week = excluded.links_this_week,
       last_calculated_at = excluded.last_calculated_at, updated_at = excluded.updated_at`,
  ).bind(crypto.randomUUID(), user.id, persona, st.totalLinks, st.totalClicks, st.utmUsageCount, st.folderCount, st.linksThisWeek, now, now).run();
  return c.json({ persona, stats: st });
}

// ------------------------------------------------------------------ detect-geo (language suggestion)
const COUNTRY_LANG: Record<string, string> = {
  US: "en", GB: "en", AU: "en", CA: "en", NZ: "en", IE: "en", IN: "hi", CN: "zh", TW: "zh", HK: "zh", SG: "zh",
  FR: "fr", BE: "fr", CH: "fr", LU: "fr", MC: "fr", DE: "de", AT: "de", LI: "de",
  ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es", PT: "pt", BR: "pt", AO: "pt", MZ: "pt",
  SA: "ar", AE: "ar", EG: "ar", MA: "ar", DZ: "ar", IQ: "ar", SY: "ar", JO: "ar", LB: "ar", KW: "ar", QA: "ar", BH: "ar", OM: "ar", YE: "ar", LY: "ar", TN: "ar", SD: "ar",
  RU: "ru", BY: "ru", KZ: "ru", KG: "ru", TJ: "ru", JP: "ja", KR: "ko", KP: "ko", IT: "it", SM: "it", VA: "it", ID: "id", TR: "tr", CY: "tr", LK: "ta",
};

export async function detectGeo(c: C) {
  const cf = (c.req.raw as unknown as { cf?: IncomingRequestCfProperties }).cf;
  const raw = (cf?.country as string | undefined) || c.req.header("cf-ipcountry") || null;
  const country = raw && raw !== "XX" && raw !== "T1" ? raw.toUpperCase() : null;
  return c.json(
    {
      country,
      city: (cf?.city as string) || null,
      region: (cf?.region as string) || null,
      language: country ? COUNTRY_LANG[country] || null : null,
      source: country ? "cf-ipcountry" : "none",
      confidence: country ? 85 : 0,
    },
    200,
    { "Cache-Control": "private, max-age=3600" },
  );
}
