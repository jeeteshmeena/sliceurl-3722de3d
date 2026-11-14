// Ported edge functions: shorten, redirect, track-click, record-redirect, global-stats.
import type { Context } from "hono";
import type { AppEnv, Env } from "../../env";
import { hashPassword, randomCode } from "../../lib/crypto";
import { clientIp, geoFromRequest, parseUserAgent, referrerSource } from "../../lib/request";
import { decodeRow, nowIso } from "../../lib/schema";

type C = Context<AppEnv>;
type LinkRow = Record<string, unknown> & {
  id: string; user_id: string | null; original_url: string; short_code: string; click_count: number | null;
  max_clicks: number | null; expires_at: string | null; utm_enabled: number; final_utm_url: string | null;
  link_preview_enabled: number; is_password_protected: number; api_key_id: string | null;
};

// ------------------------------------------------------------------ helpers
const ALLOWED_SCHEMES = new Set(["http:", "https:", "tel:", "mailto:", "sms:"]);
const DANGEROUS = /^\s*(javascript|data|vbscript|file|blob|about):/i;

export function isValidUrl(url: unknown): url is string {
  if (typeof url !== "string" || !url.trim() || url.length > 4096) return false;
  if (DANGEROUS.test(url)) return false;
  if (/^upi:\/\/pay\?/i.test(url)) {
    const params = new URLSearchParams(url.slice(url.indexOf("?") + 1));
    const pa = params.get("pa"), am = params.get("am");
    return !!(pa?.trim() && am?.trim() && !isNaN(Number(am)) && Number(am) > 0);
  }
  try { return ALLOWED_SCHEMES.has(new URL(url).protocol.toLowerCase()); } catch { return false; }
}

export function buildUtmUrl(base: string, p: Record<string, string | null | undefined>): string {
  const entries = Object.entries(p).filter(([, v]) => v && v.trim());
  try {
    const u = new URL(base);
    for (const [k, v] of entries) u.searchParams.set(k, v!.trim());
    return u.toString();
  } catch {
    if (!entries.length) return base;
    const qs = entries.map(([k, v]) => `${k}=${encodeURIComponent(v!.trim())}`).join("&");
    return `${base}${base.includes("?") ? "&" : "?"}${qs}`;
  }
}

/** Simple per-IP limiter backed by D1-free memory (per isolate, best-effort like the old function). */
const buckets = new Map<string, { n: number; reset: number }>();
function rateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) { buckets.set(key, { n: 1, reset: now + windowMs }); return false; }
  return ++b.n > limit;
}

export async function redirectTarget(env: Env, link: LinkRow): Promise<string> {
  if (link.utm_enabled) {
    const utm = await env.DB.prepare(`SELECT final_url FROM utm_data WHERE link_id = ?`).bind(link.id).first<{ final_url: string }>();
    if (utm?.final_url) return utm.final_url;
    if (link.final_utm_url) return link.final_utm_url;
  }
  return link.original_url;
}

/** Inserts a click + bumps counters in one D1 batch. Geo comes free from Cloudflare. */
async function recordClick(env: Env, req: Request, link: Pick<LinkRow, "id" | "api_key_id">, referrer: string | null) {
  const ip = clientIp(req);
  const ua = req.headers.get("user-agent") || "";
  const { device_type, browser, os } = parseUserAgent(ua);
  const geo = geoFromRequest(req);
  const seen = await env.DB.prepare(`SELECT 1 FROM clicks WHERE link_id = ? AND ip_address = ? LIMIT 1`).bind(link.id, ip).first();
  const now = nowIso();
  const stmts = [
    env.DB.prepare(
      `INSERT INTO clicks (id, link_id, ip_address, user_agent, referrer, country, city, device_type, browser, os, is_unique, clicked_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(crypto.randomUUID(), link.id, ip, ua.slice(0, 500), referrer, geo.country, geo.city, device_type, browser, os, seen ? 0 : 1, now),
    env.DB.prepare(`UPDATE links SET click_count = COALESCE(click_count, 0) + 1, last_clicked_at = ? WHERE id = ?`).bind(now, link.id),
  ];
  if (link.api_key_id) {
    const tomorrow = new Date(Date.now() + 86400_000).toISOString();
    stmts.push(env.DB.prepare(
      `UPDATE api_keys SET
         requests_today = CASE WHEN rate_limit_reset_at <= ? THEN 1 ELSE requests_today + 1 END,
         rate_limit_reset_at = CASE WHEN rate_limit_reset_at <= ? THEN ? ELSE rate_limit_reset_at END,
         last_request_at = ?
       WHERE id = ?`,
    ).bind(now, now, tomorrow, now, link.api_key_id));
  }
  await env.DB.batch(stmts);
  return { is_unique: !seen };
}

// ------------------------------------------------------------------ shorten
export async function shorten(c: C) {
  const ip = clientIp(c.req.raw);
  if (rateLimited(`shorten:${ip}`, 10, 60_000)) return c.json({ error: "Rate limit exceeded. Please try again later." }, 429);

  const body = await c.req.json<Record<string, any>>();
  const { original_url, custom_slug, title, password, expires_at, max_clicks, is_private, folder_id, facebook_pixel,
    google_pixel, custom_og_title, custom_og_description, custom_og_image, custom_favicon, utm_enabled, utm_source,
    utm_medium, utm_campaign, utm_term, utm_content, final_utm_url } = body;

  if (!isValidUrl(original_url)) return c.json({ error: "Invalid URL provided" }, 400);

  // SECURITY FIX: owner comes from the session, never from the request body
  // (the old function trusted body.user_id, so anyone could add links to any account).
  const userId = c.get("user")?.id ?? null;

  const db = c.env.DB;
  let shortCode: string = custom_slug?.trim();
  if (shortCode) {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(shortCode)) {
      return c.json({ error: "Custom slug can only contain letters, numbers, hyphens, and underscores" }, 400);
    }
    if (await db.prepare(`SELECT 1 FROM links WHERE short_code = ?`).bind(shortCode).first()) {
      return c.json({ error: "This custom slug is already taken" }, 409);
    }
  } else {
    do { shortCode = randomCode(6); } while (await db.prepare(`SELECT 1 FROM links WHERE short_code = ?`).bind(shortCode).first());
  }

  if (folder_id && userId) {
    const own = await db.prepare(`SELECT 1 FROM folders WHERE id = ? AND user_id = ?`).bind(folder_id, userId).first();
    if (!own) return c.json({ error: "Folder not found" }, 400);
  }

  const utmParams = { utm_source, utm_medium, utm_campaign, utm_term, utm_content };
  const finalUrl = utm_enabled ? final_utm_url || buildUtmUrl(original_url, utmParams) : null;
  const id = crypto.randomUUID();
  const now = nowIso();

  const stmts = [db.prepare(
    `INSERT INTO links (id, original_url, short_code, custom_slug, title, password_hash, is_password_protected, expires_at, max_clicks,
      is_private, folder_id, facebook_pixel, google_pixel, custom_og_title, custom_og_description, custom_og_image, custom_favicon,
      user_id, click_count, utm_enabled, utm_source, utm_medium, utm_campaign, utm_term, utm_content, final_utm_url, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?,?,?,?,?,?,?)`,
  ).bind(
    id, original_url, shortCode, custom_slug || null, title || null, password ? await hashPassword(password) : null, password ? 1 : 0,
    expires_at || null, max_clicks || null, is_private ? 1 : 0, (userId && folder_id) || null, facebook_pixel || null, google_pixel || null,
    custom_og_title || null, custom_og_description || null, custom_og_image || null, custom_favicon || null, userId,
    utm_enabled ? 1 : 0, utm_source || null, utm_medium || null, utm_campaign || null, utm_term || null, utm_content || null, finalUrl, now, now,
  )];
  if (utm_enabled && userId) {
    stmts.push(db.prepare(
      `INSERT INTO utm_data (id, link_id, user_id, utm_source, utm_medium, utm_campaign, utm_term, utm_content, final_url) VALUES (?,?,?,?,?,?,?,?,?)`,
    ).bind(crypto.randomUUID(), id, userId, utm_source || null, utm_medium || null, utm_campaign || null, utm_term || null, utm_content || null, finalUrl));
  }
  await db.batch(stmts);
  const link = await db.prepare(`SELECT * FROM links WHERE id = ?`).bind(id).first<Record<string, unknown>>();
  const { password_hash: _, ...safe } = decodeRow("links", link!);
  return c.json({ success: true, link: safe }, 201);
}

// ------------------------------------------------------------------ redirect (used by the /s/:code Preview page)
export async function redirect(c: C) {
  const code = c.req.query("code");
  const isPreview = c.req.query("preview") === "true";
  const referrer = c.req.header("referer") || c.req.query("ref") || null;
  if (!code) return c.json({ error: "Short code required" }, 400);

  const db = c.env.DB;
  const link = await db.prepare(`SELECT * FROM links WHERE short_code = ?`).bind(code).first<LinkRow>();
  if (!link) return c.json({ error: "Link not found", code: "NOT_FOUND" }, 404);
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return c.json({ error: "This link has expired", code: "EXPIRED", expires_at: link.expires_at }, 410);
  }
  if (link.max_clicks && (link.click_count ?? 0) >= link.max_clicks) {
    return c.json({ error: "This link has reached its click limit", code: "MAX_CLICKS" }, 410);
  }
  const target = await redirectTarget(c.env, link);

  const doRedirect = async () => {
    await recordClick(c.env, c.req.raw, link, referrer);
    if (/^upi:/i.test(target)) return c.json({ redirect_url: target, is_upi: true });
    return new Response(null, { status: 302, headers: { Location: target, "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } });
  };

  // SECURITY FIX: the old function redirected before checking the password,
  // so /functions/v1/redirect?code=X skipped password protection entirely.
  if (!link.link_preview_enabled && !isPreview && !link.is_password_protected) return doRedirect();

  if (link.is_password_protected) {
    return c.json({
      requires_password: true, link_id: link.id, title: link.title, custom_og_title: link.custom_og_title,
      custom_og_description: link.custom_og_description, custom_og_image: link.custom_og_image, custom_favicon: link.custom_favicon,
    });
  }

  let securityMode = "warn";
  if (link.user_id) {
    const p = await db.prepare(`SELECT security_mode FROM profiles WHERE user_id = ?`).bind(link.user_id).first<{ security_mode: string | null }>();
    securityMode = p?.security_mode || "warn";
  }
  if (securityMode === "disable" && !isPreview) return doRedirect();

  if (isPreview) {
    return c.json({
      link_id: link.id, redirect_url: target, title: link.title, custom_og_title: link.custom_og_title,
      custom_og_description: link.custom_og_description, facebook_pixel: link.facebook_pixel, google_pixel: link.google_pixel,
      requires_password: false, link_preview_enabled: !!link.link_preview_enabled, auto_redirect: securityMode === "disable",
      security_mode: securityMode, utm_enabled: !!link.utm_enabled,
    });
  }

  await recordClick(c.env, c.req.raw, link, referrer);
  return c.json({
    redirect_url: target, facebook_pixel: link.facebook_pixel, google_pixel: link.google_pixel,
    custom_og_title: link.custom_og_title, custom_og_description: link.custom_og_description,
    custom_og_image: link.custom_og_image, custom_favicon: link.custom_favicon,
  });
}

// ------------------------------------------------------------------ track-click
export async function trackClick(c: C) {
  const { link_id, referrer } = await c.req.json<{ link_id?: string; referrer?: string }>();
  if (!link_id) return c.json({ error: "Link ID is required" }, 400);
  const ip = clientIp(c.req.raw);
  if (rateLimited(`click:${ip}:${link_id}`, 30, 60_000)) return c.json({ success: true, skipped: true });
  const link = await c.env.DB.prepare(`SELECT id, expires_at, api_key_id FROM links WHERE id = ?`).bind(link_id)
    .first<{ id: string; expires_at: string | null; api_key_id: string | null }>();
  if (!link) return c.json({ error: "Link not found", skipped: true }, 404);
  if (link.expires_at && new Date(link.expires_at) < new Date()) return c.json({ error: "Link has expired", skipped: true }, 410);
  const ua = c.req.header("user-agent") || "";
  const r = await recordClick(c.env, c.req.raw, link, referrerSource(referrer, ua));
  return c.json({ success: true, ...r });
}

// ------------------------------------------------------------------ record-redirect
export async function recordRedirect(c: C) {
  const { link_id } = await c.req.json<{ link_id?: string }>();
  if (!link_id) return c.json({ error: "link_id is required" }, 400);
  await c.env.DB.prepare(
    `UPDATE clicks SET redirected_at = ? WHERE id = (
       SELECT id FROM clicks WHERE link_id = ? AND redirected_at IS NULL ORDER BY clicked_at DESC LIMIT 1)`,
  ).bind(nowIso(), link_id).run();
  return c.json({ success: true });
}

// ------------------------------------------------------------------ global-stats
export async function globalStats(c: C) {
  const db = c.env.DB;
  const counters = await db.prepare(`SELECT total_links_created, total_clicks FROM global_counters WHERE id = 'main'`)
    .first<{ total_links_created: number; total_clicks: number }>();
  const avg = await db.prepare(
    `SELECT AVG(slice_duration_ms) AS a FROM (SELECT slice_duration_ms FROM links WHERE slice_duration_ms > 0 ORDER BY created_at DESC LIMIT 50)`,
  ).first<{ a: number | null }>();
  return c.json(
    { total_links: counters?.total_links_created ?? 0, total_clicks: counters?.total_clicks ?? 0, avg_slice_time_ms: avg?.a ? Math.round(avg.a) : null },
    200,
    { "Cache-Control": "public, max-age=30" },
  );
}
