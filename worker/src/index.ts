// SliceURL — single Cloudflare Worker: static SPA + full backend.
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv, Env } from "./env";
import { authMiddleware } from "./lib/auth";
import { auth } from "./routes/auth";
import { data } from "./routes/data";
import { storage } from "./routes/storage";
import { globalStats, recordRedirect, redirect, shorten, trackClick } from "./routes/functions/links";
import { bulkShorten, checkLinkHealth, checkUrlSafety, creepyShorten, fetchBranding, utmData, verifyLinkPassword } from "./routes/functions/linkExtras";
import { analyticsTime, calculatePersona, detectGeo, sharedAnalytics, stats } from "./routes/functions/analytics";
import { apiKeys, apiPublic, merchantApi } from "./routes/functions/developer";
import { createOrder, dodoAdmin, dodoInitiate, dodoReconcile, dodoStatus, dodoWebhook, paytmCallback, paytmInitiate, paytmVerify, reconcileDodo } from "./routes/functions/payments";
import { adminLinks, deleteReview, publicAppInfo, sendDeletionEmail, sendWelcomeEmail, submitReview, updateReview } from "./routes/functions/misc";
import { fileStream, publicFileInfo, sliceboxDownload, sliceboxUploadUrl, sliceboxVerifyPassword } from "./routes/functions/files";

const app = new Hono<AppEnv>();

const API_PREFIXES = ["/auth/v1", "/rest/v1", "/functions/v1", "/storage/v1"];
app.use("*", async (c, next) => {
  if (!API_PREFIXES.some((p) => c.req.path.startsWith(p))) return next();
  return cors({
    origin: (o) => o || "*",
    allowHeaders: ["authorization", "x-client-info", "apikey", "content-type", "range", "x-upsert", "x-api-key", "x-share-password"],
    allowMethods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length", "Content-Range", "Accept-Ranges", "Content-Disposition"],
    maxAge: 86400,
  })(c, next);
});
app.use("*", authMiddleware);

app.route("/auth/v1", auth);
app.route("/rest/v1", data);
app.route("/storage/v1", storage);

// ---------------------------------------------------------------- edge functions
const fn = new Hono<AppEnv>();
fn.post("/shorten", shorten);
fn.all("/redirect", redirect);
fn.post("/track-click", trackClick);
fn.post("/record-redirect", recordRedirect);
fn.get("/global-stats", globalStats);
fn.on(["GET", "HEAD"], "/file-stream", fileStream);
fn.get("/public-file-info", publicFileInfo);
fn.post("/slicebox-download", sliceboxDownload);
fn.post("/slicebox-verify-password", sliceboxVerifyPassword);
fn.post("/slicebox-upload-url", sliceboxUploadUrl);
fn.post("/verify-password", verifyLinkPassword);
fn.get("/utm-data", utmData);
fn.post("/creepy-shorten", creepyShorten);
fn.post("/check-url-safety", checkUrlSafety);
fn.post("/check-link-health", checkLinkHealth);
fn.post("/bulk-shorten", bulkShorten);
fn.post("/fetch-branding", fetchBranding);
fn.get("/stats", stats);
fn.get("/analytics-time", analyticsTime);
fn.on(["GET", "POST", "DELETE"], "/shared-analytics", sharedAnalytics);
fn.post("/calculate-persona", calculatePersona);
fn.get("/detect-geo", detectGeo);
fn.on(["GET", "POST"], "/api-keys", apiKeys);
fn.all("/api-public", apiPublic);
fn.all("/merchant-api", merchantApi);
fn.all("/merchant-api/*", merchantApi);
fn.post("/create-order", createOrder);
fn.post("/paytm-initiate", paytmInitiate);
fn.post("/paytm-callback", paytmCallback);
fn.post("/paytm-verify", paytmVerify);
fn.post("/dodo-initiate", dodoInitiate);
fn.post("/dodo-status", dodoStatus);
fn.post("/dodo-webhook", dodoWebhook);
fn.post("/dodo-reconcile", dodoReconcile);
fn.post("/dodo-admin", dodoAdmin);
fn.get("/public-app-info", publicAppInfo);
fn.post("/submit-review", submitReview);
fn.post("/update-review", updateReview);
fn.post("/delete-review", deleteReview);
fn.post("/send-welcome-email", sendWelcomeEmail);
fn.post("/send-deletion-email", sendDeletionEmail);
fn.all("/admin", adminLinks);
// runs daily via cron; admins can also trigger it by hand
fn.post("/slicebox-cleanup", async (c) => {
  if (!c.get("isAdmin")) return c.json({ error: "Admin access required" }, 403);
  return c.json(await cleanupExpiredFiles(c.env));
});

// All 42 Supabase edge functions are ported; anything else is unknown.
fn.all("*", (c) => c.json({ error: "Function not found" }, 404));
app.route("/functions/v1", fn);

// ---------------------------------------------------------------- AryaPremium proxy (was in vercel.json)
app.all("/AryaPremium*", (c) => proxyTo(c.req.raw, "https://aryapremium.store"));
app.all("/aryaPremium*", (c) => proxyTo(c.req.raw, "https://aryapremium.store"));
function proxyTo(req: Request, origin: string) {
  const u = new URL(req.url);
  return fetch(new Request(origin + u.pathname + u.search, req));
}

// ---------------------------------------------------------------- SPA / static assets
app.all("*", async (c) => {
  const res = await c.env.ASSETS.fetch(c.req.raw);
  const headers = new Headers(res.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  return new Response(res.body, { status: res.status, headers });
});

app.onError((err, c) => {
  console.error("[worker] unhandled", err);
  return c.json({ error: "Internal server error" }, 500);
});

// ---------------------------------------------------------------- cron: expired file cleanup (was slicebox-cleanup + pg_cron)
async function cleanupExpiredFiles(env: Env) {
  const now = new Date().toISOString();
  const { results } = await env.DB.prepare(
    `SELECT id, storage_path FROM slicebox_files WHERE is_deleted = 0 AND expires_at IS NOT NULL AND expires_at < ? LIMIT 500`,
  ).bind(now).all<{ id: string; storage_path: string }>();
  for (const f of results) {
    await env.FILES.delete(`slicebox/${f.storage_path}`);
    await env.DB.prepare(`UPDATE slicebox_files SET is_deleted = 1 WHERE id = ?`).bind(f.id).run();
  }
  await env.DB.prepare(`DELETE FROM sessions WHERE expires_at < ?`).bind(now).run();
  await env.DB.prepare(`DELETE FROM auth_tokens WHERE expires_at < ?`).bind(now).run();
  console.log(`[cron] cleaned ${results.length} expired files`);
  return { deleted: results.length };
}

export default {
  fetch: app.fetch,
  scheduled: async (event: ScheduledController, env: Env, ctx: ExecutionContext) => {
    if (event.cron === "*/30 * * * *") ctx.waitUntil(reconcileDodo(env).then((r) => console.log("[cron] dodo reconcile", r)));
    else ctx.waitUntil(cleanupExpiredFiles(env));
  },
} satisfies ExportedHandler<Env>;
