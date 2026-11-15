// Row-level security, ported from the 84 Postgres RLS policies.
// Every client query through /rest/v1/query is filtered by these rules.
// Anything not listed here is denied. Server-side routes (functions) use
// the DB directly and are not subject to these rules, like service_role was.
import { hashPassword } from "./crypto";

export type Ctx = { uid: string | null; isAdmin: boolean };
export type Action = "select" | "insert" | "update" | "delete";

/** A rule returns: false = deny, true = allow all rows, or {sql, params} = extra WHERE. */
type Where = { sql: string; params: unknown[] };
type ReadRule = (ctx: Ctx) => boolean | Where;
/** Write rules get the row values; they may mutate them (force owner) or reject (return string error). */
type WriteRule = (ctx: Ctx, values: Record<string, unknown>) => true | string;

export type TablePolicy = {
  select?: ReadRule;
  update?: ReadRule; // which existing rows may be updated
  delete?: ReadRule;
  insert?: WriteRule;
  /** columns a non-admin client may never set (insert or update) */
  readOnlyColumns?: string[];
  /** columns a non-admin client may set on insert but never change afterwards */
  immutableColumns?: string[];
  /** secret columns: clients only ever see "********" (set) or null (unset) */
  hiddenColumns?: string[];
  /** runs on insert/update values before they hit the DB */
  transform?: (values: Record<string, unknown>) => Promise<void>;
};

/** The old frontend sends plaintext link passwords in `password_hash`; hash them here. */
const hashPasswordField = async (v: Record<string, unknown>) => {
  const p = v.password_hash;
  if (typeof p === "string" && p && !p.startsWith("pbkdf2$")) {
    v.password_hash = await hashPassword(p);
    v.is_password_protected = true;
  } else if (p === null && "password_hash" in v) {
    v.is_password_protected = v.is_password_protected ?? false;
  }
};

const admin: ReadRule = (c) => c.isAdmin;
const ownerBy = (col: string): ReadRule => (c) =>
  c.isAdmin ? true : c.uid ? { sql: `"${col}" = ?`, params: [c.uid] } : false;
const ownerOnly = (col: string): ReadRule => (c) => (c.uid ? { sql: `"${col}" = ?`, params: [c.uid] } : false);
const forceOwner = (col: string): WriteRule => (c, v) => {
  if (!c.uid) return "Not authenticated";
  if (v[col] != null && v[col] !== c.uid && !c.isAdmin) return "Cannot write rows for another user";
  v[col] = v[col] ?? c.uid;
  return true;
};
const adminWrite: WriteRule = (c) => (c.isAdmin ? true : "Admin only");
const adminWriteStamp: WriteRule = (c, v) => {
  if (!c.isAdmin) return "Admin only";
  v.updated_by = c.uid;
  return true;
};

export const POLICIES: Record<string, TablePolicy> = {
  links: {
    select: ownerBy("user_id"),
    update: ownerOnly("user_id"),
    delete: ownerOnly("user_id"),
    insert: forceOwner("user_id"),
    readOnlyColumns: ["user_id", "click_count", "last_clicked_at", "api_key_id", "api_source"],
    hiddenColumns: ["password_hash"], // = old links_safe view
    transform: hashPasswordField,
  },
  folders: { select: ownerOnly("user_id"), update: ownerOnly("user_id"), delete: ownerOnly("user_id"), insert: forceOwner("user_id"), readOnlyColumns: ["user_id"] },
  qr_designs: { select: ownerOnly("user_id"), update: ownerOnly("user_id"), delete: ownerOnly("user_id"), insert: forceOwner("user_id"), readOnlyColumns: ["user_id"] },
  utm_data: { select: ownerOnly("user_id"), update: ownerOnly("user_id"), delete: ownerOnly("user_id"), insert: forceOwner("user_id"), readOnlyColumns: ["user_id"] },
  user_personas: { select: ownerOnly("user_id"), update: ownerOnly("user_id"), insert: forceOwner("user_id"), readOnlyColumns: ["user_id"] },
  api_keys: {
    // creation happens in the api-keys function (it generates the secret)
    select: ownerOnly("user_id"), update: ownerOnly("user_id"), delete: ownerOnly("user_id"),
    readOnlyColumns: ["user_id", "key_hash", "key_prefix", "requests_today", "rate_limit_reset_at", "rate_limit_daily"],
    hiddenColumns: ["key_hash"],
  },
  shared_analytics: {
    select: ownerOnly("user_id"), update: ownerOnly("user_id"), delete: ownerOnly("user_id"),
    readOnlyColumns: ["user_id", "password_hash", "share_token", "views_count"],
    hiddenColumns: ["password_hash"],
  },
  profiles: {
    select: ownerBy("user_id"), // admins read all (AdminInbox shows names)
    update: ownerOnly("user_id"),
    insert: forceOwner("user_id"),
    readOnlyColumns: ["user_id", "google_linked", "google_email", "has_password"],
  },
  user_roles: {
    select: (c) => (c.isAdmin ? true : c.uid ? { sql: `user_id = ?`, params: [c.uid] } : false),
    insert: adminWrite,
    delete: admin,
  },
  clicks: {
    // link owners only; inserts go through redirect/track-click functions
    select: (c) =>
      c.isAdmin ? true : c.uid ? { sql: `link_id IN (SELECT id FROM links WHERE user_id = ?)`, params: [c.uid] } : false,
    hiddenColumns: [],
  },
  announcements: {
    select: (c) => (c.isAdmin ? true : { sql: `is_active = 1`, params: [] }),
    insert: adminWrite, update: admin, delete: admin,
  },
  global_counters: { select: () => true },
  subscriptions: { select: ownerBy("user_id") },
  orders: { select: ownerBy("user_id") },
  payments: { select: ownerBy("user_id") },
  feedback_requests: {
    select: ownerBy("user_id"),
    update: admin,
    insert: forceOwner("user_id"),
    readOnlyColumns: ["user_id", "admin_notes", "is_read", "is_important", "status"],
  },
  slicebox_files: {
    select: (c) => (c.uid ? { sql: `is_deleted = 0 AND user_id = ?`, params: [c.uid] } : false),
    update: (c) => (c.uid ? { sql: `user_id = ?`, params: [c.uid] } : false),
    // anonymous uploads are allowed (SliceBox/LittleSlice work without login)
    insert: (c, v) => {
      if (v.user_id != null && v.user_id !== c.uid) return "Cannot upload files for another user";
      v.user_id = c.uid ?? null;
      if (typeof v.storage_path !== "string" || !/^uploads\/[a-zA-Z0-9]+\/[a-zA-Z0-9._-]+$/.test(v.storage_path)) return "Invalid storage path";
      return true;
    },
    readOnlyColumns: ["download_count", "is_deleted"],
    immutableColumns: ["user_id", "file_id", "short_code", "storage_path", "file_size", "delete_token", "password_hash"],
    hiddenColumns: ["password_hash", "delete_token"],
  },
  app_listings: {
    select: (c) =>
      c.isAdmin ? true : { sql: c.uid ? `(is_published = 1 OR owner_id = ?)` : `is_published = 1`, params: c.uid ? [c.uid] : [] },
    update: ownerOnly("owner_id"),
    delete: ownerOnly("owner_id"),
    insert: forceOwner("owner_id"),
    readOnlyColumns: ["owner_id", "rating_avg", "rating_count", "total_downloads"],
  },
  app_reviews: { select: admin }, // public reads via public-app-info function
  // ---- admin-only tables
  paytm_settings: { select: admin, update: admin, delete: admin, insert: adminWriteStamp },
  dodo_settings: { select: admin, update: admin, delete: admin, insert: adminWriteStamp },
  paytm_callback_logs: { select: admin },
  dodo_webhook_logs: { select: admin },
  merchant_api_keys: { select: admin, update: admin, delete: admin, insert: adminWrite, hiddenColumns: ["key_hash"] },
  merchant_orders: { select: admin },
  geo_backfill_allowlist: { select: admin, update: admin, delete: admin, insert: adminWrite },
  geo_backfill_audit: { select: admin },
  ip_geo_cache: { select: admin },
};
