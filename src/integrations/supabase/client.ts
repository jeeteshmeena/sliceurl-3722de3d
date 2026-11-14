// SliceURL API client — drop-in replacement for the supabase-js client.
//
// The backend now runs on Cloudflare (Worker + D1 + R2, see /worker). This file
// implements the small subset of the supabase-js API the app actually uses
// (from/select/insert/update/upsert/delete + filters, rpc, auth, storage,
// functions.invoke, realtime channels via polling) so the rest of the code
// keeps importing `supabase` unchanged:
//   import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/** API origin. Empty = same origin (the Worker serves both SPA and API). */
const API = (import.meta.env.VITE_API_URL ?? import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/+$/, "");
const SESSION_KEY = "sliceurl.session";
const SMALL_UPLOAD_MAX = 90 * 1024 * 1024;

type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any
type ApiError = { message: string; code?: string; status?: number; details?: string };
type Result<T = Json> = { data: T | null; error: ApiError | null; count?: number | null; status?: number };
type Session = { access_token: string; refresh_token: string; expires_at: number; expires_in: number; token_type: string; user: Json };
type AuthEvent = "INITIAL_SESSION" | "SIGNED_IN" | "SIGNED_OUT" | "USER_UPDATED" | "PASSWORD_RECOVERY" | "TOKEN_REFRESHED";

// ------------------------------------------------------------------ session store
let session: Session | null = null;
try {
  const raw = localStorage.getItem(SESSION_KEY);
  if (raw) {
    const s = JSON.parse(raw) as Session;
    if (s.expires_at * 1000 > Date.now()) session = s;
  }
} catch { /* storage blocked */ }

const listeners = new Set<(e: AuthEvent, s: Session | null) => void>();
function setSession(s: Session | null, event: AuthEvent) {
  session = s;
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
  for (const l of listeners) setTimeout(() => l(event, s), 0);
}

function authHeaders(): Record<string, string> {
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function api(path: string, init: RequestInit & { json?: unknown } = {}): Promise<{ status: number; body: Json }> {
  const headers: Record<string, string> = { ...authHeaders(), ...(init.headers as Record<string, string>) };
  if (init.json !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${API}${path}`, { ...init, headers, body: init.json !== undefined ? JSON.stringify(init.json) : init.body });
  const text = await res.text();
  let body: Json = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (res.status === 401 && session && path !== "/auth/v1/token") {
    // session revoked/expired server-side
    setSession(null, "SIGNED_OUT");
  }
  return { status: res.status, body };
}

const toError = (status: number, body: Json): ApiError => ({
  message: body?.message || body?.error_description || body?.error || `Request failed (${status})`,
  code: body?.code,
  status,
});

// Older code calls `${VITE_SUPABASE_URL}/functions/v1/...` with fetch() and no
// Authorization header. Attach the session token to our own API calls.
if (typeof window !== "undefined" && !(window as Json).__sliceFetchPatched) {
  (window as Json).__sliceFetchPatched = true;
  const orig = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.origin);
      const ours = (url.origin === location.origin || (API && url.href.startsWith(API))) && /^\/(functions|storage)\/v1\//.test(url.pathname);
      if (ours && session) {
        const h = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
        const cur = h.get("Authorization") || "";
        // old code sent the anon key as a bearer token; replace it with the user's session
        if (!cur || cur.length < 60 || cur.split(".").length === 3) h.set("Authorization", `Bearer ${session.access_token}`);
        h.delete("apikey");
        return orig(input, { ...init, headers: h });
      }
    } catch { /* fall through */ }
    return orig(input, init);
  };
}

// Pick up tokens from OAuth / password-recovery redirects: /path#access_token=...&type=...
let pendingHashEvent: AuthEvent | null = null;
const bootstrap: Promise<void> = (async () => {
  if (typeof window === "undefined") return;
  const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  const token = hash.get("access_token");
  if (!token) return;
  history.replaceState(null, "", location.pathname + location.search);
  const res = await fetch(`${API}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return;
  const user = await res.json();
  const expires_at = Number(hash.get("expires_at")) || Math.floor(Date.now() / 1000) + 2592000;
  pendingHashEvent = hash.get("type") === "recovery" ? "PASSWORD_RECOVERY" : "SIGNED_IN";
  setSession({ access_token: token, refresh_token: token, expires_at, expires_in: expires_at - Math.floor(Date.now() / 1000), token_type: "bearer", user }, pendingHashEvent);
})().catch(() => undefined);

// ------------------------------------------------------------------ query builder
type Filter = { column: string; op: string; value: unknown; negate?: boolean };

class QueryBuilder implements PromiseLike<Result> {
  private q: Json;
  private mode: "many" | "single" | "maybe" = "many";
  constructor(table: string) {
    this.q = { table, action: "select", filters: [] as Filter[], returning: false };
  }
  select(columns = "*", opts?: { count?: "exact" | "planned" | "estimated"; head?: boolean }) {
    if (this.q.action === "select") this.q.columns = columns;
    else { this.q.returning = true; this.q.columns = columns; }
    if (opts?.count) this.q.count = "exact";
    if (opts?.head) this.q.head = true;
    if (this.q.action === "select") this.q.returning = true;
    return this;
  }
  insert(values: Json) { this.q.action = "insert"; this.q.values = values; return this; }
  upsert(values: Json, opts?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.q.action = "upsert"; this.q.values = values;
    this.q.onConflict = opts?.onConflict; this.q.ignoreDuplicates = opts?.ignoreDuplicates;
    return this;
  }
  update(values: Json) { this.q.action = "update"; this.q.values = values; return this; }
  delete() { this.q.action = "delete"; return this; }
  private f(column: string, op: string, value: unknown, negate = false) { this.q.filters.push({ column, op, value, negate }); return this; }
  eq(c: string, v: unknown) { return this.f(c, "eq", v); }
  neq(c: string, v: unknown) { return this.f(c, "neq", v); }
  gt(c: string, v: unknown) { return this.f(c, "gt", v); }
  gte(c: string, v: unknown) { return this.f(c, "gte", v); }
  lt(c: string, v: unknown) { return this.f(c, "lt", v); }
  lte(c: string, v: unknown) { return this.f(c, "lte", v); }
  like(c: string, v: string) { return this.f(c, "like", v); }
  ilike(c: string, v: string) { return this.f(c, "ilike", v); }
  is(c: string, v: unknown) { return this.f(c, "is", v); }
  in(c: string, v: unknown[]) { return this.f(c, "in", v); }
  not(c: string, op: string, v: unknown) { return this.f(c, op, v, true); }
  match(obj: Record<string, unknown>) { for (const [k, v] of Object.entries(obj)) this.eq(k, v); return this; }
  filter(c: string, op: string, v: unknown) { return this.f(c, op, v); }
  or(expr: string) { this.q.or = expr; return this; }
  order(column: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    (this.q.order ||= []).push({ column, ascending: opts?.ascending ?? true, nullsFirst: opts?.nullsFirst });
    return this;
  }
  limit(n: number) { this.q.limit = n; return this; }
  range(from: number, to: number) { this.q.offset = from; this.q.limit = to - from + 1; return this; }
  single() { this.mode = "single"; return this; }
  maybeSingle() { this.mode = "maybe"; return this; }
  abortSignal() { return this; }

  async execute(): Promise<Result> {
    await bootstrap;
    if (this.mode !== "many" && this.q.action === "select" && !this.q.limit) this.q.limit = 2;
    const { status, body } = await api("/rest/v1/query", { method: "POST", json: this.q });
    if (status >= 400) return { data: null, error: toError(status, body?.error ?? body), status };
    let data = body.data;
    if (this.mode !== "many" && Array.isArray(data)) {
      if (data.length > 1) return { data: null, error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" }, status: 406 };
      if (data.length === 0) {
        return this.mode === "single"
          ? { data: null, error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" }, status: 406 }
          : { data: null, error: null, status };
      }
      data = data[0];
    }
    return { data, error: null, count: body.count ?? null, status };
  }
  then<A = Result, B = never>(ok?: ((v: Result) => A | PromiseLike<A>) | null, fail?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return this.execute().then(ok, fail);
  }
}

// ------------------------------------------------------------------ realtime (polling)
// Supabase realtime is replaced by light polling: same callbacks, ~15 s delay.
const ORDER_COL: Record<string, string> = { clicks: "clicked_at", app_reviews: "created_at", slicebox_files: "created_at" };
type Sub = { event: string; table: string; filter?: string; cb: (p: Json) => void };

class Channel {
  private subs: Sub[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private snapshots = new Map<number, Map<string, string>>();
  constructor(public topic: string) {}
  on(_type: string, cfg: { event: string; table: string; filter?: string }, cb: (p: Json) => void) {
    this.subs.push({ event: cfg.event, table: cfg.table, filter: cfg.filter, cb });
    return this;
  }
  subscribe(statusCb?: (s: string) => void) {
    const tick = () => { if (typeof document === "undefined" || !document.hidden) this.poll(); };
    tick();
    this.timer = setInterval(tick, 15000);
    statusCb?.("SUBSCRIBED");
    return this;
  }
  unsubscribe() { if (this.timer) clearInterval(this.timer); this.timer = null; return Promise.resolve("ok"); }
  private async poll() {
    await Promise.all(this.subs.map(async (s, i) => {
      let qb = new QueryBuilder(s.table).select("*").order(ORDER_COL[s.table] || "updated_at", { ascending: false }).limit(100);
      const m = s.filter?.match(/^([a-z_]+)=eq\.(.+)$/);
      if (m) qb = qb.eq(m[1], m[2]);
      const { data, error } = await qb;
      if (error || !Array.isArray(data)) return;
      const prev = this.snapshots.get(i);
      const next = new Map<string, string>(data.map((r: Json) => [String(r.id), JSON.stringify(r)]));
      this.snapshots.set(i, next);
      if (!prev) return; // first poll = baseline
      for (const row of data) {
        const before = prev.get(String(row.id));
        const event = before === undefined ? "INSERT" : before !== JSON.stringify(row) ? "UPDATE" : null;
        if (event && (s.event === "*" || s.event === event)) {
          s.cb({ eventType: event, new: row, old: before ? JSON.parse(before) : {}, table: s.table, schema: "public" });
        }
      }
    }));
  }
}

// ------------------------------------------------------------------ auth
const auth = {
  async getSession() { await bootstrap; return { data: { session }, error: null }; },
  async getUser() {
    await bootstrap;
    if (!session) return { data: { user: null }, error: { message: "Auth session missing!" } };
    const { status, body } = await api("/auth/v1/user");
    if (status >= 400) return { data: { user: null }, error: toError(status, body) };
    setSessionUser(body, false);
    return { data: { user: body }, error: null };
  },
  onAuthStateChange(cb: (e: AuthEvent, s: Session | null) => void) {
    listeners.add(cb);
    bootstrap.then(() => {
      cb("INITIAL_SESSION", session);
      if (pendingHashEvent === "PASSWORD_RECOVERY") cb("PASSWORD_RECOVERY", session);
    });
    return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
  },
  async signUp({ email, password, options }: { email: string; password: string; options?: { data?: Json; emailRedirectTo?: string } }) {
    const { status, body } = await api("/auth/v1/signup", { method: "POST", json: { email, password, data: options?.data } });
    if (status >= 400) return { data: { user: null, session: null }, error: toError(status, body) };
    setSession(body.session, "SIGNED_IN");
    return { data: { user: body.user, session: body.session }, error: null };
  },
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const { status, body } = await api("/auth/v1/token?grant_type=password", { method: "POST", json: { email, password } });
    if (status >= 400) return { data: { user: null, session: null }, error: toError(status, body) };
    setSession(body, "SIGNED_IN");
    return { data: { user: body.user, session: body }, error: null };
  },
  async signInWithOAuth({ provider, options }: { provider: string; options?: { redirectTo?: string } }) {
    const url = `${API}/auth/v1/authorize?provider=${encodeURIComponent(provider)}&redirect_to=${encodeURIComponent(options?.redirectTo || location.origin + "/dashboard")}`;
    location.assign(url);
    return { data: { provider, url }, error: null };
  },
  async linkIdentity({ options }: { provider: string; options?: { redirectTo?: string } }) {
    const { status, body } = await api("/auth/v1/authorize/link", { method: "POST", json: { redirect_to: options?.redirectTo || location.href } });
    if (status >= 400) return { data: null, error: toError(status, body) };
    location.assign(body.url);
    return { data: { url: body.url }, error: null };
  },
  async signOut() {
    await api("/auth/v1/logout", { method: "POST" }).catch(() => undefined);
    setSession(null, "SIGNED_OUT");
    return { error: null };
  },
  async resetPasswordForEmail(email: string, opts?: { redirectTo?: string }) {
    const { status, body } = await api("/auth/v1/recover", { method: "POST", json: { email, redirect_to: opts?.redirectTo } });
    return { data: {}, error: status >= 400 ? toError(status, body) : null };
  },
  async updateUser(attrs: { password?: string; email?: string; data?: Json }) {
    const { status, body } = await api("/auth/v1/user", { method: "PUT", json: attrs });
    if (status >= 400) return { data: { user: null }, error: toError(status, body) };
    setSessionUser(body, true);
    return { data: { user: body }, error: null };
  },
  async getUserIdentities() {
    const { data, error } = await auth.getUser();
    return { data: data.user ? { identities: data.user.identities ?? [] } : null, error };
  },
  async unlinkIdentity(identity: { provider: string }) {
    const { status, body } = await api(`/auth/v1/identities/${encodeURIComponent(identity.provider)}`, { method: "DELETE" });
    if (status >= 400) return { data: null, error: toError(status, body) };
    await auth.getUser();
    return { data: {}, error: null };
  },
  async refreshSession() { return auth.getSession(); },
};

function setSessionUser(user: Json, emit: boolean) {
  if (!session) return;
  session = { ...session, user };
  if (emit) setSession(session, "USER_UPDATED");
  else try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* ignore */ }
}

// ------------------------------------------------------------------ storage
function storageFrom(bucket: string) {
  return {
    async upload(path: string, file: Blob, opts?: { upsert?: boolean; contentType?: string }) {
      const contentType = opts?.contentType || (file as File).type || "application/octet-stream";
      if (file.size > SMALL_UPLOAD_MAX) {
        const signed = await api("/storage/v1/upload-url", { method: "POST", json: { bucket, path, contentType, size: file.size } });
        if (signed.status >= 400) return { data: null, error: toError(signed.status, signed.body) };
        const put = await fetch(signed.body.url, { method: "PUT", body: file, headers: { "Content-Type": contentType } });
        return put.ok ? { data: { path: signed.body.path }, error: null } : { data: null, error: { message: `Upload failed (${put.status})` } };
      }
      const { status, body } = await api(`/storage/v1/object/${bucket}/${path}`, {
        method: "POST", body: file, headers: { "Content-Type": contentType, ...(opts?.upsert ? { "x-upsert": "true" } : {}) },
      });
      return status >= 400 ? { data: null, error: toError(status, body) } : { data: { path: body.path, id: body.id, fullPath: body.Key }, error: null };
    },
    getPublicUrl(path: string) {
      const origin = API || (typeof location !== "undefined" ? location.origin : "");
      return { data: { publicUrl: `${origin}/storage/v1/object/public/${bucket}/${path}` } };
    },
    async remove(paths: string[]) {
      const { status, body } = await api(`/storage/v1/object/${bucket}`, { method: "DELETE", json: { prefixes: paths } });
      return status >= 400 ? { data: null, error: toError(status, body) } : { data: body, error: null };
    },
  };
}

// ------------------------------------------------------------------ client
const client = {
  from: (table: string) => new QueryBuilder(table),
  rpc: (fn: string, args?: Json) => ({
    then<A, B>(ok?: (v: Result) => A, fail?: (e: unknown) => B) {
      return (async (): Promise<Result> => {
        await bootstrap;
        const { status, body } = await api(`/rest/v1/rpc/${fn}`, { method: "POST", json: args ?? {} });
        return status >= 400 ? { data: null, error: toError(status, body) } : { data: body, error: null };
      })().then(ok, fail);
    },
  }),
  auth,
  storage: { from: storageFrom },
  functions: {
    async invoke(name: string, opts: { body?: unknown; headers?: Record<string, string>; method?: string } = {}) {
      await bootstrap;
      const isJson = opts.body !== undefined && !(opts.body instanceof FormData) && !(opts.body instanceof Blob) && typeof opts.body !== "string";
      const { status, body } = await api(`/functions/v1/${name}`, {
        method: opts.method || "POST",
        headers: opts.headers,
        ...(isJson ? { json: opts.body } : { body: opts.body as BodyInit }),
      });
      return status >= 400 ? { data: null, error: { ...toError(status, body), context: { status, body } } } : { data: body, error: null };
    },
  },
  channel: (topic: string) => new Channel(topic),
  removeChannel: (ch: Channel) => ch.unsubscribe(),
  removeAllChannels: () => Promise.resolve([]),
};

export const supabase = client as unknown as SupabaseClient<Database>;
