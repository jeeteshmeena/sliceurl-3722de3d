// Replacement for Supabase Auth (GoTrue). Paths mirror /auth/v1/* so the
// frontend client shim can stay close to supabase-js.
import { Hono } from "hono";
import type { AppEnv, Env } from "../env";
import {
  createProfileFor, createSession, getUserRow, toPublicUser,
} from "../lib/auth";
import { hashPassword, needsRehash, randomToken, sha256Hex, verifyPassword } from "../lib/crypto";
import { escapeHtml, sendEmail } from "../lib/email";

export const auth = new Hono<AppEnv>();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const err = (message: string, status = 400) =>
  new Response(JSON.stringify({ error: message, error_description: message, msg: message }), {
    status, headers: { "Content-Type": "application/json" },
  });

/** Only same-site redirects (prevents open-redirect after login). */
function safeRedirect(env: Env, to: string | null | undefined, fallback = "/dashboard", requestUrl?: string): string {
  const site = new URL(env.SITE_URL);
  if (!to) return `${site.origin}${fallback}`;
  try {
    const u = new URL(to, site.origin);
    const allowed = [site.host, requestUrl ? new URL(requestUrl).host : site.host, `www.${site.host}`, "localhost:8080", "localhost:5173", "127.0.0.1:8787", "localhost:8787"];
    if (!allowed.includes(u.host)) return `${site.origin}${fallback}`;
    return u.toString();
  } catch {
    return `${site.origin}${fallback}`;
  }
}

// ---------------------------------------------------------------- email + password
auth.post("/signup", async (c) => {
  const { email, password, data } = await c.req.json<{ email?: string; password?: string; data?: Record<string, unknown> }>();
  const mail = (email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(mail)) return err("Invalid email address");
  if (!password || password.length < 6) return err("Password should be at least 6 characters");

  const exists = await c.env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(mail).first();
  if (exists) return err("User already registered", 422);

  const id = crypto.randomUUID();
  const meta = { ...(data || {}), email: mail };
  await c.env.DB.prepare(
    `INSERT INTO users (id, email, password_hash, user_metadata, email_confirmed_at) VALUES (?, ?, ?, ?, ?)`,
  ).bind(id, mail, await hashPassword(password), JSON.stringify(meta), new Date().toISOString()).run();
  await createProfileFor(c.env, id, meta, true);

  const session = await createSession(c.env, id, c.req.header("user-agent") ?? null);
  return c.json({ ...session, session, user: session.user });
});

auth.post("/token", async (c) => {
  const grant = c.req.query("grant_type");
  if (grant !== "password") return err("Unsupported grant_type");
  const { email, password } = await c.req.json<{ email?: string; password?: string }>();
  const row = await c.env.DB.prepare(`SELECT id, password_hash FROM users WHERE email = ?`)
    .bind((email || "").trim().toLowerCase())
    .first<{ id: string; password_hash: string | null }>();
  if (!row || !(await verifyPassword(password || "", row.password_hash))) return err("Invalid login credentials");
  // upgrade imported bcrypt hashes to PBKDF2 on first successful login
  if (needsRehash(row.password_hash)) {
    await c.env.DB.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).bind(await hashPassword(password!), row.id).run();
  }
  const session = await createSession(c.env, row.id, c.req.header("user-agent") ?? null);
  return c.json(session);
});

auth.post("/logout", async (c) => {
  const h = c.req.header("authorization") || "";
  const token = h.replace(/^bearer\s+/i, "");
  if (token) await c.env.DB.prepare(`DELETE FROM sessions WHERE token_hash = ?`).bind(await sha256Hex(token)).run();
  return c.body(null, 204);
});

auth.get("/user", async (c) => {
  const u = c.get("user");
  if (!u) return err("Not authenticated", 401);
  const row = await getUserRow(c.env, u.id);
  return row ? c.json(toPublicUser(row)) : err("User not found", 404);
});

auth.put("/user", async (c) => {
  const u = c.get("user");
  if (!u) return err("Not authenticated", 401);
  const body = await c.req.json<{ password?: string; email?: string; data?: Record<string, unknown> }>();
  const row = await getUserRow(c.env, u.id);
  if (!row) return err("User not found", 404);
  const stmts: D1PreparedStatement[] = [];
  const now = new Date().toISOString();
  if (body.password) {
    if (body.password.length < 6) return err("Password should be at least 6 characters");
    stmts.push(c.env.DB.prepare(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`).bind(await hashPassword(body.password), now, u.id));
    stmts.push(c.env.DB.prepare(`UPDATE profiles SET has_password = 1, updated_at = ? WHERE user_id = ?`).bind(now, u.id));
  }
  if (body.data) {
    const merged = { ...JSON.parse(row.user_metadata || "{}"), ...body.data };
    stmts.push(c.env.DB.prepare(`UPDATE users SET user_metadata = ?, updated_at = ? WHERE id = ?`).bind(JSON.stringify(merged), now, u.id));
  }
  if (body.email && body.email.toLowerCase() !== row.email) {
    const mail = body.email.trim().toLowerCase();
    if (!EMAIL_RE.test(mail)) return err("Invalid email address");
    const taken = await c.env.DB.prepare(`SELECT 1 FROM users WHERE email = ?`).bind(mail).first();
    if (taken) return err("Email already in use", 422);
    stmts.push(c.env.DB.prepare(`UPDATE users SET email = ?, updated_at = ? WHERE id = ?`).bind(mail, now, u.id));
  }
  if (stmts.length) await c.env.DB.batch(stmts);
  return c.json(toPublicUser((await getUserRow(c.env, u.id))!));
});

// ---------------------------------------------------------------- password recovery
auth.post("/recover", async (c) => {
  const { email, redirect_to } = await c.req.json<{ email?: string; redirect_to?: string }>();
  const row = await c.env.DB.prepare(`SELECT id, email FROM users WHERE email = ?`)
    .bind((email || "").trim().toLowerCase())
    .first<{ id: string; email: string }>();
  // Always answer 200 so the endpoint can't be used to discover accounts.
  if (row) {
    const token = randomToken(32);
    await c.env.DB.prepare(`INSERT INTO auth_tokens (token_hash, kind, user_id, data, expires_at) VALUES (?, 'recovery', ?, ?, ?)`)
      .bind(await sha256Hex(token), row.id, safeRedirect(c.env, redirect_to, "/login", c.req.url), new Date(Date.now() + 3600_000).toISOString())
      .run();
    const link = `${new URL(c.req.url).origin}/auth/v1/verify?type=recovery&token=${token}`;
    await sendEmail(c.env, row.email, "Reset your SliceURL password",
      `<p>Click the link below to reset your SliceURL password. It expires in 1 hour.</p><p><a href="${escapeHtml(link)}">Reset password</a></p><p>If you didn't ask for this, ignore this email.</p>`);
  }
  return c.json({});
});

auth.get("/verify", async (c) => {
  const token = c.req.query("token") || "";
  const row = await c.env.DB.prepare(`SELECT user_id, data, expires_at, used_at FROM auth_tokens WHERE token_hash = ? AND kind = 'recovery'`)
    .bind(await sha256Hex(token))
    .first<{ user_id: string; data: string; expires_at: string; used_at: string | null }>();
  if (!row || row.used_at || new Date(row.expires_at) < new Date()) {
    return c.redirect(`${new URL(c.env.SITE_URL).origin}/login#error=access_denied&error_description=Link+expired`);
  }
  await c.env.DB.prepare(`UPDATE auth_tokens SET used_at = ? WHERE token_hash = ?`).bind(new Date().toISOString(), await sha256Hex(token)).run();
  const s = await createSession(c.env, row.user_id, c.req.header("user-agent") ?? null);
  return c.redirect(`${row.data}#access_token=${s.access_token}&expires_at=${s.expires_at}&type=recovery`);
});

// ---------------------------------------------------------------- Google OAuth
async function googleAuthUrl(c: { env: Env; req: { url: string } }, redirectTo: string, linkUserId: string | null) {
  const state = randomToken(24);
  await c.env.DB.prepare(`INSERT INTO auth_tokens (token_hash, kind, user_id, data, expires_at) VALUES (?, 'oauth_state', ?, ?, ?)`)
    .bind(await sha256Hex(state), linkUserId, redirectTo, new Date(Date.now() + 600_000).toISOString())
    .run();
  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${new URL(c.req.url).origin}/auth/v1/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// Browser navigates here for "Continue with Google".
auth.get("/authorize", async (c) => {
  if (c.req.query("provider") !== "google") return err("Unsupported provider");
  if (!c.env.GOOGLE_CLIENT_ID) return err("Google login is not configured", 500);
  const redirectTo = safeRedirect(c.env, c.req.query("redirect_to"), "/dashboard", c.req.url);
  return c.redirect(await googleAuthUrl(c, redirectTo, null));
});

// Logged-in user linking Google from Settings: returns the URL to navigate to
// (keeps the session token out of URLs).
auth.post("/authorize/link", async (c) => {
  const u = c.get("user");
  if (!u) return err("Not authenticated", 401);
  if (!c.env.GOOGLE_CLIENT_ID) return err("Google login is not configured", 500);
  const { redirect_to } = await c.req.json<{ redirect_to?: string }>().catch(() => ({ redirect_to: undefined }));
  const redirectTo = safeRedirect(c.env, redirect_to, "/settings", c.req.url);
  return c.json({ url: await googleAuthUrl(c, redirectTo, u.id) });
});

auth.get("/callback", async (c) => {
  const site = new URL(c.env.SITE_URL).origin;
  const fail = (why: string) => c.redirect(`${site}/login#error=server_error&error_description=${encodeURIComponent(why)}`);
  const code = c.req.query("code");
  const state = c.req.query("state") || "";
  const st = await c.env.DB.prepare(`SELECT user_id, data, expires_at, used_at FROM auth_tokens WHERE token_hash = ? AND kind = 'oauth_state'`)
    .bind(await sha256Hex(state))
    .first<{ user_id: string | null; data: string; expires_at: string; used_at: string | null }>();
  if (!code || !st || st.used_at || new Date(st.expires_at) < new Date()) return fail("Invalid or expired login attempt");
  await c.env.DB.prepare(`UPDATE auth_tokens SET used_at = ? WHERE token_hash = ?`).bind(new Date().toISOString(), await sha256Hex(state)).run();

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID!,
      client_secret: c.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${new URL(c.req.url).origin}/auth/v1/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return fail("Google token exchange failed");
  const { access_token } = await tokenRes.json<{ access_token: string }>();
  const info = await (await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  })).json<{ sub: string; email: string; email_verified: boolean; name?: string; picture?: string }>();
  if (!info.sub || !info.email || !info.email_verified) return fail("Google account email is not verified");
  const email = info.email.toLowerCase();
  const now = new Date().toISOString();

  let userId: string;
  if (st.user_id) {
    // explicit "link Google" from settings
    userId = st.user_id;
    await c.env.DB.batch([
      c.env.DB.prepare(`UPDATE users SET google_sub = ?, google_email = ?, updated_at = ? WHERE id = ?`).bind(info.sub, email, now, userId),
      c.env.DB.prepare(`UPDATE profiles SET google_linked = 1, google_email = ? WHERE user_id = ?`).bind(email, userId),
    ]);
  } else {
    const existing = await c.env.DB.prepare(`SELECT id FROM users WHERE google_sub = ? OR email = ? ORDER BY (google_sub = ?) DESC LIMIT 1`)
      .bind(info.sub, email, info.sub)
      .first<{ id: string }>();
    if (existing) {
      userId = existing.id;
      await c.env.DB.batch([
        c.env.DB.prepare(`UPDATE users SET google_sub = ?, google_email = ?, email_confirmed_at = COALESCE(email_confirmed_at, ?), updated_at = ? WHERE id = ?`)
          .bind(info.sub, email, now, now, userId),
        c.env.DB.prepare(`UPDATE profiles SET google_linked = 1, google_email = ? WHERE user_id = ?`).bind(email, userId),
      ]);
    } else {
      userId = crypto.randomUUID();
      const meta = { full_name: info.name, name: info.name, avatar_url: info.picture, picture: info.picture, email };
      await c.env.DB.prepare(
        `INSERT INTO users (id, email, google_sub, google_email, user_metadata, email_confirmed_at) VALUES (?, ?, ?, ?, ?, ?)`,
      ).bind(userId, email, info.sub, email, JSON.stringify(meta), now).run();
      await createProfileFor(c.env, userId, meta, false, email);
    }
  }
  const s = await createSession(c.env, userId, c.req.header("user-agent") ?? null);
  return c.redirect(`${st.data}#access_token=${s.access_token}&expires_at=${s.expires_at}&type=oauth`);
});

auth.delete("/identities/google", async (c) => {
  const u = c.get("user");
  if (!u) return err("Not authenticated", 401);
  const row = await getUserRow(c.env, u.id);
  if (!row?.password_hash) return err("Set a password before unlinking Google, otherwise you'd be locked out");
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE users SET google_sub = NULL, google_email = NULL WHERE id = ?`).bind(u.id),
    c.env.DB.prepare(`UPDATE profiles SET google_linked = 0, google_email = NULL WHERE user_id = ?`).bind(u.id),
  ]);
  return c.json({});
});
