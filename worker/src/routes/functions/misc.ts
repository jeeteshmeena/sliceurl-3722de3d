// Last batch: public-app-info, submit-review, update-review, delete-review,
// send-welcome-email, send-deletion-email (was missing from the repo), admin.
import type { Context } from "hono";
import type { AppEnv, Env } from "../../env";
import { hashPassword } from "../../lib/crypto";
import { sendEmail } from "../../lib/email";
import { deletionEmail, welcomeEmail } from "../../lib/emailTemplates";
import { clientIp } from "../../lib/request";
import { decodeRow, nowIso } from "../../lib/schema";

type C = Context<AppEnv>;
type Row = Record<string, any>;
const site = (env: Env) => new URL(env.SITE_URL).origin;

// ================================================================== SliceAPPs
export async function publicAppInfo(c: C) {
  const id = c.req.query("id");
  if (!id) return c.json({ error: "Missing id parameter" }, 400);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const raw = await c.env.DB.prepare(`SELECT * FROM app_listings WHERE ${isUuid ? "id" : "short_code"} = ?`).bind(id).first<Row>();
  if (!raw) return c.json({ error: "App not found" }, 404);
  const app = decodeRow("app_listings", raw) as Row;
  if (!app.is_published) return c.json({ error: "This app is not available" }, 404);

  let fileInfo: Row | null = null;
  let fileUnavailable: string | null = null;
  const f = await c.env.DB.prepare(`SELECT file_id, file_size, original_name, password_hash, is_deleted, expires_at, download_count FROM slicebox_files WHERE id = ?`)
    .bind(app.file_id).first<Row>();
  if (!f) fileUnavailable = "File not found";
  else if (f.is_deleted) fileUnavailable = "This file has been deleted";
  else if (f.expires_at && new Date(f.expires_at) < new Date()) fileUnavailable = "This file has expired";
  else fileInfo = { file_id: f.file_id, file_size: f.file_size, original_name: f.original_name, is_password_protected: !!f.password_hash, download_count: f.download_count || 0 };

  // public review list: never expose IPs / fingerprints
  const { results: reviews } = await c.env.DB.prepare(
    `SELECT id, rating, review_text, display_name, created_at, user_id FROM app_reviews WHERE app_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 20`,
  ).bind(app.id).all();

  return c.json({
    app: {
      id: app.id, short_code: app.short_code, app_name: app.app_name, developer_name: app.developer_name, developer_url: app.developer_url || null,
      category: app.category, age_rating: app.age_rating || "4+", version_name: app.version_name, version_code: app.version_code,
      short_description: app.short_description, full_description: app.full_description, whats_new: app.whats_new, icon_url: app.icon_url,
      screenshots: app.screenshots, promo_banner_url: app.promo_banner_url, rating_avg: app.rating_avg, rating_count: app.rating_count,
      total_downloads: app.total_downloads, release_date: app.release_date, file_id: app.file_id,
    },
    fileInfo, fileUnavailable, reviews,
  }, 200, { "Cache-Control": "public, max-age=60" });
}

/** Keeps app_listings.rating_avg / rating_count in sync with the reviews. */
const refreshRating = (env: Env, appId: string) =>
  env.DB.prepare(
    `UPDATE app_listings SET
       rating_avg = COALESCE((SELECT ROUND(AVG(rating), 2) FROM app_reviews WHERE app_id = ?1 AND deleted_at IS NULL), 0),
       rating_count = (SELECT COUNT(*) FROM app_reviews WHERE app_id = ?1 AND deleted_at IS NULL)
     WHERE id = ?1`,
  ).bind(appId).run();

/** Review as returned to its author (no IP / fingerprint). */
const publicReview = (r: Row | null) => {
  if (!r) return null;
  const { ip_address: _ip, browser_fingerprint: _fp, ...rest } = r;
  return rest;
};

export async function submitReview(c: C) {
  const { appId, rating, reviewText, browserFingerprint, displayName } = await c.req.json<Row>().catch(() => ({} as Row));
  const stars = Math.round(Number(rating));
  if (!appId || !(stars >= 1 && stars <= 5)) return c.json({ success: false, error: "Invalid rating (1-5 required)" }, 400);
  const app = await c.env.DB.prepare(`SELECT id FROM app_listings WHERE id = ? AND is_published = 1`).bind(appId).first();
  if (!app) return c.json({ success: false, error: "App not found" }, 404);

  const ip = clientIp(c.req.raw);
  const db = c.env.DB;
  const existing = await db.prepare(`SELECT * FROM app_reviews WHERE app_id = ? AND ip_address = ? AND deleted_at IS NULL`).bind(appId, ip).first<Row>();
  if (existing) return c.json({ success: true, action: "existing", review: publicReview(existing), message: "You have already reviewed this app" });

  const id = crypto.randomUUID();
  try {
    await db.prepare(
      `INSERT INTO app_reviews (id, app_id, rating, review_text, user_id, ip_address, browser_fingerprint, display_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, appId, stars, String(reviewText ?? "").trim().slice(0, 2000) || null, c.get("user")?.id ?? null, ip,
      browserFingerprint ? String(browserFingerprint).slice(0, 200) : null, String(displayName ?? "").trim().slice(0, 60) || null).run();
  } catch (e) {
    if (/UNIQUE/i.test(String(e))) {
      const race = await db.prepare(`SELECT * FROM app_reviews WHERE app_id = ? AND ip_address = ? AND deleted_at IS NULL`).bind(appId, ip).first<Row>();
      return c.json({ success: true, action: "existing", review: publicReview(race), message: "You have already reviewed this app" });
    }
    return c.json({ success: false, error: "Failed to submit review" }, 500);
  }
  await refreshRating(c.env, appId);
  const review = await db.prepare(`SELECT * FROM app_reviews WHERE id = ?`).bind(id).first<Row>();
  return c.json({ success: true, action: "created", review: publicReview(review), message: "Review submitted successfully" });
}

export async function updateReview(c: C) {
  const user = c.get("user");
  const { reviewId, rating, reviewText } = await c.req.json<Row>().catch(() => ({} as Row));
  if (!reviewId) return c.json({ success: false, error: "Review ID required" }, 400);
  if (rating && (rating < 1 || rating > 5)) return c.json({ success: false, error: "Invalid rating (1-5 required)" }, 400);
  if (!user) return c.json({ success: false, error: "Authentication required" }, 401);
  const r = await c.env.DB.prepare(`SELECT id, user_id, app_id FROM app_reviews WHERE id = ?`).bind(reviewId).first<Row>();
  if (!r) return c.json({ success: false, error: "Review not found" }, 404);
  if (r.user_id !== user.id) return c.json({ success: false, error: "You can only edit your own reviews" }, 403);

  const sets: string[] = [], vals: unknown[] = [];
  if (rating) { sets.push("rating = ?"); vals.push(Math.round(rating)); }
  if (reviewText !== undefined) { sets.push("review_text = ?"); vals.push(String(reviewText ?? "").trim().slice(0, 2000) || null); }
  sets.push("updated_at = ?"); vals.push(nowIso());
  await c.env.DB.prepare(`UPDATE app_reviews SET ${sets.join(", ")} WHERE id = ?`).bind(...vals, reviewId).run();
  await refreshRating(c.env, r.app_id);
  const updated = await c.env.DB.prepare(`SELECT * FROM app_reviews WHERE id = ?`).bind(reviewId).first<Row>();
  return c.json({ success: true, review: publicReview(updated), message: "Review updated successfully" });
}

export async function deleteReview(c: C) {
  const user = c.get("user");
  const { reviewId } = await c.req.json<Row>().catch(() => ({} as Row));
  if (!reviewId) return c.json({ success: false, error: "Review ID required" }, 400);
  const r = await c.env.DB.prepare(`SELECT id, user_id, app_id FROM app_reviews WHERE id = ?`).bind(reviewId).first<Row>();
  if (!r) return c.json({ success: false, error: "Review not found" }, 404);
  if (!user || r.user_id !== user.id) return c.json({ success: false, error: "You can only delete your own reviews" }, 403);
  await c.env.DB.prepare(`DELETE FROM app_reviews WHERE id = ?`).bind(reviewId).run();
  await refreshRating(c.env, r.app_id);
  return c.json({ success: true, message: "Review deleted successfully" });
}

// ================================================================== emails
// SECURITY FIX: the old send-welcome-email accepted any address and name without
// login — an open relay for spam/phishing under the SliceURL name. Now it only
// mails the signed-in user's own address, once.
export async function sendWelcomeEmail(c: C) {
  const user = c.get("user");
  if (!user) return c.json({ error: "Authentication required" }, 401);
  const u = await c.env.DB.prepare(`SELECT user_metadata FROM users WHERE id = ?`).bind(user.id).first<{ user_metadata: string }>();
  const meta = JSON.parse(u?.user_metadata || "{}");
  if (meta.welcome_email_sent_at) return c.json({ skipped: true, reason: "already_sent" });
  const { name } = await c.req.json<Row>().catch(() => ({} as Row));
  const displayName = String(name || meta.full_name || user.email.split("@")[0]).slice(0, 60);
  const ok = await sendEmail(c.env, user.email, "Welcome to SliceURL! 🎉", welcomeEmail(displayName, site(c.env)));
  if (!ok) return c.json({ error: "Failed to send email" }, 500);
  await c.env.DB.prepare(`UPDATE users SET user_metadata = ? WHERE id = ?`).bind(JSON.stringify({ ...meta, welcome_email_sent_at: nowIso() }), user.id).run();
  return c.json({ success: true });
}

// Was called by Settings but never existed. Mails the signed-in user only,
// and only when their profile really has a deletion date.
export async function sendDeletionEmail(c: C) {
  const user = c.get("user");
  if (!user) return c.json({ error: "Authentication required" }, 401);
  const p = await c.env.DB.prepare(`SELECT scheduled_deletion_at FROM profiles WHERE user_id = ?`).bind(user.id).first<{ scheduled_deletion_at: string | null }>();
  if (!p?.scheduled_deletion_at) return c.json({ error: "No deletion is scheduled" }, 400);
  const ok = await sendEmail(c.env, user.email, "Your SliceURL account is scheduled for deletion", deletionEmail(new Date(p.scheduled_deletion_at), site(c.env)));
  return ok ? c.json({ success: true }) : c.json({ error: "Failed to send email" }, 500);
}

// ================================================================== admin (despite the name: the signed-in user's own links)
export async function adminLinks(c: C) {
  const user = c.get("user");
  if (!user) return c.json({ error: "Authorization required" }, 401);
  const db = c.env.DB;
  switch (c.req.query("action")) {
    case "list": {
      const page = Math.max(parseInt(c.req.query("page") || "1") || 1, 1);
      const limit = Math.min(Math.max(parseInt(c.req.query("limit") || "50") || 50, 1), 100);
      const [{ results }, total] = await Promise.all([
        db.prepare(`SELECT id, short_code, original_url, title, click_count, created_at, is_password_protected, expires_at, is_private FROM links WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`)
          .bind(user.id, limit, (page - 1) * limit).all<Row>(),
        db.prepare(`SELECT COUNT(*) AS n FROM links WHERE user_id = ?`).bind(user.id).first<{ n: number }>(),
      ]);
      const links = results.map((l) => decodeRow("links", l));
      return c.json({ links, pagination: { page, limit, total: total?.n ?? 0, total_pages: Math.ceil((total?.n ?? 0) / limit) } });
    }
    case "delete": {
      const id = c.req.query("id");
      if (!id) return c.json({ error: "Link ID required" }, 400);
      const res = await db.prepare(`DELETE FROM links WHERE id = ? AND user_id = ?`).bind(id, user.id).run(); // clicks cascade
      return res.meta.changes ? c.json({ success: true }) : c.json({ error: "Link not found" }, 404);
    }
    case "update": {
      const b = await c.req.json<Row>().catch(() => ({} as Row));
      if (!b.id) return c.json({ error: "Link ID required" }, 400);
      const sets: string[] = [], vals: unknown[] = [];
      const set = (col: string, v: unknown) => { sets.push(`${col} = ?`); vals.push(v); };
      if (b.original_url !== undefined) {
        if (!/^https?:\/\//i.test(String(b.original_url))) return c.json({ error: "Invalid URL" }, 400);
        set("original_url", b.original_url);
      }
      if (b.title !== undefined) set("title", b.title);
      if (b.expires_at !== undefined) set("expires_at", b.expires_at);
      if (b.is_private !== undefined) set("is_private", b.is_private ? 1 : 0);
      if (b.custom_slug !== undefined) {
        if (!/^[a-zA-Z0-9_-]{1,64}$/.test(String(b.custom_slug))) return c.json({ error: "Invalid slug" }, 400);
        if (await db.prepare(`SELECT 1 FROM links WHERE short_code = ? AND id != ?`).bind(b.custom_slug, b.id).first()) return c.json({ error: "This custom slug is already taken" }, 409);
        set("custom_slug", b.custom_slug); set("short_code", b.custom_slug);
      }
      if (b.password !== undefined) {
        // was unsalted SHA-256 here; now the same PBKDF2 as everywhere else
        if (b.password === null || b.password === "") { set("password_hash", null); set("is_password_protected", 0); }
        else { set("password_hash", await hashPassword(String(b.password))); set("is_password_protected", 1); }
      }
      set("updated_at", nowIso());
      const link = await db.prepare(`UPDATE links SET ${sets.join(", ")} WHERE id = ? AND user_id = ? RETURNING *`).bind(...vals, b.id, user.id).first<Row>();
      if (!link) return c.json({ error: "Failed to update link" }, 404);
      const { password_hash: _, ...safe } = decodeRow("links", link);
      return c.json({ success: true, link: safe });
    }
    default:
      return c.json({ error: "Invalid action. Use: list, delete, or update" }, 400);
  }
}
