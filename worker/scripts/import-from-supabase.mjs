#!/usr/bin/env node
// Converts JSON exports of the old Supabase (Lovable Cloud) tables into one SQL
// file for D1:
//
//   node scripts/import-from-supabase.mjs ./export ./import.sql
//   npx wrangler d1 execute sliceurl-db --remote --file ./import.sql
//
// ./export must contain <table>.json files, each a JSON array of row objects
// (e.g. from `select json_agg(t) from public.links t;`). For auth users export
// auth.users as users.json with columns:
//   id, email, encrypted_password, raw_user_meta_data, email_confirmed_at, created_at, last_sign_in_at
// Google-linked users: also add `google_sub` (auth.identities.provider_id where provider='google').
// bcrypt password hashes are accepted by the Worker and upgraded to PBKDF2 on first login.
import fs from "node:fs";
import path from "node:path";

const [, , dir = "./export", out = "./import.sql"] = process.argv;

// order matters for foreign keys
const ORDER = [
  "users", "profiles", "user_roles", "folders", "api_keys", "links", "clicks", "utm_data", "qr_designs",
  "shared_analytics", "user_personas", "announcements", "global_counters", "ip_geo_cache", "geo_backfill_allowlist",
  "geo_backfill_audit", "slicebox_files", "app_listings", "app_reviews", "feedback_requests", "orders", "payments",
  "subscriptions", "paytm_settings", "paytm_callback_logs", "dodo_settings", "dodo_webhook_logs", "merchant_api_keys",
  "merchant_orders",
];

const sqlValue = (v) => {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "number") return String(v);
  if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

// Postgres timestamps ("2026-01-07 12:19:00.123+00") -> ISO
const fixTs = (v) =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(v) ? new Date(v.replace(" ", "T")).toISOString() : v;

function mapUser(u) {
  return {
    id: u.id,
    email: String(u.email).toLowerCase(),
    password_hash: u.encrypted_password || null,
    google_sub: u.google_sub || null,
    google_email: u.google_sub ? String(u.email).toLowerCase() : null,
    email_confirmed_at: fixTs(u.email_confirmed_at),
    user_metadata: u.raw_user_meta_data ?? {},
    last_sign_in_at: fixTs(u.last_sign_in_at),
    created_at: fixTs(u.created_at),
    updated_at: fixTs(u.updated_at || u.created_at),
  };
}

const lines = ["PRAGMA defer_foreign_keys = ON;", "DELETE FROM global_counters;"];
for (const table of ORDER) {
  const file = path.join(dir, `${table}.json`);
  if (!fs.existsSync(file)) { console.warn(`skip ${table} (no ${table}.json)`); continue; }
  let rows = JSON.parse(fs.readFileSync(file, "utf8")) || [];
  if (table === "users") rows = rows.map(mapUser);
  // slicebox objects live under "slicebox/<storage_path>" in R2; storage_path itself is unchanged
  for (const r of rows) {
    const cols = Object.keys(r);
    const vals = cols.map((c) => sqlValue(c.endsWith("_at") || c === "release_date" ? fixTs(r[c]) : r[c]));
    lines.push(`INSERT OR REPLACE INTO "${table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${vals.join(", ")});`);
  }
  console.log(`${table}: ${rows.length} rows`);
}
fs.writeFileSync(out, lines.join("\n") + "\n");
console.log(`wrote ${out}`);
