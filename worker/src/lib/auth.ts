import type { MiddlewareHandler } from "hono";
import type { AppEnv, AuthUser, Env } from "../env";
import { randomToken, sha256Hex } from "./crypto";

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days, sliding

type UserRow = {
  id: string;
  email: string;
  password_hash: string | null;
  google_sub: string | null;
  google_email: string | null;
  email_confirmed_at: string | null;
  user_metadata: string;
  last_sign_in_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Reads `Authorization: Bearer <token>` and resolves the session user. */
export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set("user", null);
  c.set("isAdmin", false);
  const header = c.req.header("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (token && token.length > 30) {
    const user = await userFromToken(c.env, token);
    if (user) {
      c.set("user", user);
      c.set("isAdmin", await hasRole(c.env, user.id, "admin"));
    }
  }
  await next();
};

export async function userFromToken(env: Env, token: string): Promise<AuthUser | null> {
  const hash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`,
  )
    .bind(hash)
    .first<{ id: string; email: string; expires_at: string }>();
  if (!row || new Date(row.expires_at) < new Date()) return null;
  return { id: row.id, email: row.email };
}

export async function hasRole(env: Env, userId: string, role: string): Promise<boolean> {
  const r = await env.DB.prepare(`SELECT 1 FROM user_roles WHERE user_id = ? AND role = ?`).bind(userId, role).first();
  return !!r;
}

export async function getUserRow(env: Env, id: string): Promise<UserRow | null> {
  return env.DB.prepare(`SELECT * FROM users WHERE id = ?`).bind(id).first<UserRow>();
}

/** Supabase-shaped user object, so existing frontend code keeps working. */
export function toPublicUser(u: UserRow) {
  const meta = safeJson(u.user_metadata);
  const identities: Record<string, unknown>[] = [];
  if (u.password_hash) {
    identities.push({ id: u.id, identity_id: `${u.id}-email`, user_id: u.id, provider: "email", identity_data: { email: u.email } });
  }
  if (u.google_sub) {
    identities.push({ id: u.google_sub, identity_id: `${u.id}-google`, user_id: u.id, provider: "google", identity_data: { email: u.google_email || u.email } });
  }
  const providers = identities.map((i) => i.provider as string);
  return {
    id: u.id,
    aud: "authenticated",
    role: "authenticated",
    email: u.email,
    email_confirmed_at: u.email_confirmed_at,
    last_sign_in_at: u.last_sign_in_at,
    created_at: u.created_at,
    updated_at: u.updated_at,
    app_metadata: { provider: providers[0] || "email", providers },
    user_metadata: meta,
    identities,
  };
}

function safeJson(s: string | null): Record<string, unknown> {
  try { return s ? JSON.parse(s) : {}; } catch { return {}; }
}

/** Creates a session and returns the Supabase-shaped session payload. */
export async function createSession(env: Env, userId: string, userAgent: string | null) {
  const token = randomToken(32);
  const expires = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO sessions (id, user_id, token_hash, expires_at, user_agent) VALUES (?, ?, ?, ?, ?)`).bind(
      crypto.randomUUID(), userId, await sha256Hex(token), expires.toISOString(), userAgent?.slice(0, 300) ?? null,
    ),
    env.DB.prepare(`UPDATE users SET last_sign_in_at = ? WHERE id = ?`).bind(new Date().toISOString(), userId),
    // opportunistic cleanup of this user's expired sessions
    env.DB.prepare(`DELETE FROM sessions WHERE user_id = ? AND expires_at < ?`).bind(userId, new Date().toISOString()),
  ]);
  const user = await getUserRow(env, userId);
  return {
    access_token: token,
    refresh_token: token,
    token_type: "bearer",
    expires_in: SESSION_TTL_SECONDS,
    expires_at: Math.floor(expires.getTime() / 1000),
    user: user ? toPublicUser(user) : null,
  };
}

/** Mirrors the Postgres handle_new_user() trigger. */
export async function createProfileFor(env: Env, userId: string, meta: Record<string, unknown>, hasPassword: boolean, googleEmail?: string) {
  const name = (meta.full_name || meta.name || meta.display_name || null) as string | null;
  const avatar = (meta.avatar_url || meta.picture || null) as string | null;
  await env.DB.prepare(
    `INSERT OR IGNORE INTO profiles (user_id, display_name, avatar_url, has_password, google_linked, google_email) VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(userId, name, avatar, hasPassword ? 1 : 0, googleEmail ? 1 : 0, googleEmail ?? null)
    .run();
}
