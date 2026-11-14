# SliceURL → Cloudflare (Workers + D1 + R2)

Lovable Cloud (Supabase) ko poori tarah hata kar SliceURL ko Cloudflare par chalane ka plan aur status.

**Status: code migration complete.** All 41 Supabase edge functions (+ the missing `send-deletion-email`) run in the Worker and were tested locally. Nothing is deployed yet; see the go-live checklist.

## Architecture

```
Browser ──► Cloudflare Worker "sliceurl"  (worker/)
             ├─ static SPA (Vite build in dist/)         ← Workers Static Assets
             ├─ /auth/v1/*      login, signup, Google, reset   (replaces Supabase Auth)
             ├─ /rest/v1/query  policy-checked data API          (replaces PostgREST + RLS)
             ├─ /rest/v1/rpc/*  old Postgres functions
             ├─ /functions/v1/* ported edge functions
             ├─ /storage/v1/*   files on R2                      (replaces Supabase Storage)
             └─ cron            daily file cleanup + Dodo reconcile every 30 min (replaces pg_cron)
            D1  = database (SQLite)   R2 = files   request.cf = visitor country/city
```

The frontend keeps importing `supabase` from `src/integrations/supabase/client.ts`, but that
file is now a small client for the Worker (same API surface the app uses). Realtime is
replaced by 15-second polling with the same callbacks.

## Status

| Area | Status |
|---|---|
| D1 schema (28 tables, triggers, counters) — `worker/migrations/0001_init.sql` | ✅ done |
| Auth: email/password, Google, password reset, sessions, identities | ✅ done (Google/reset need secrets) |
| Row-level security (84 RLS policies) — `worker/src/lib/policies.ts` | ✅ ported |
| Data API + RPCs (`has_role`, `generate_slicebox_shortcode`, …) | ✅ done |
| `shorten`, `redirect`, `track-click`, `record-redirect`, `global-stats` | ✅ done, tested |
| Storage on R2 (small uploads, public read, delete, presigned 2 GB uploads) | ✅ done |
| SliceBox/LittleSlice upload → direct-to-R2 | ✅ frontend switched |
| Realtime → polling | ✅ in client shim |
| Cron cleanup (expired files, sessions) | ✅ done |
| Lovable code removed (tagger, preview auth storage, lovable.app URLs) | ✅ done |
| Data import script — `worker/scripts/import-from-supabase.mjs` | ✅ written, needs real export |
| Files: `file-stream` (Range/resume), `public-file-info`, `slicebox-download`, `slicebox-verify-password`, `slicebox-upload-url` | ✅ done, tested |
| Link extras: `verify-password`, `utm-data`, `creepy-shorten`, `check-url-safety`, `check-link-health`, `bulk-shorten`, `fetch-branding` | ✅ done, tested |
| Analytics: `stats`, `analytics-time`, `shared-analytics`, `calculate-persona`, `detect-geo` | ✅ done, tested (shared page also in browser) |
| Developer API: `api-keys`, `api-public`, `merchant-api` | ✅ done, tested (Paytm order creation needs real Paytm keys to test) |
| Payments: `create-order`, `paytm-initiate`, `paytm-callback`, `paytm-verify`, `dodo-initiate`, `dodo-status`, `dodo-webhook`, `dodo-reconcile`, `dodo-admin` | ✅ done, tested with real Paytm checksums and Dodo signatures (live gateway calls need your real keys) |
| Apps & reviews: `public-app-info`, `submit-review`, `update-review`, `delete-review` | ✅ done, tested |
| Mail & admin: `send-welcome-email`, `send-deletion-email` (new), `admin`, `slicebox-cleanup` (cron + admin trigger) | ✅ done, tested (real mail needs `RESEND_API_KEY`) |
| Old Postgres views (`links_safe`, `shared_analytics_safe`) | ✅ read-only aliases in the data API |

### Security fixes made while porting
- `shorten` trusted `user_id` from the request body → anyone could add links to any account. Owner now comes from the session.
- `redirect` skipped password protection when called without `preview=true`. Fixed.
- Edit-link dialog stored the new link password in **plaintext** in `password_hash`. The data API now hashes it.
- `file-stream` trusted `?verified=true`, so any password-protected file could be downloaded without the password. Now `slicebox-verify-password` returns a 10-minute HMAC-signed link (needs the `DOWNLOAD_TOKEN_SECRET` secret).
- `slicebox-verify-password` now has a brute-force brake (10 wrong tries / 10 min per IP+file).
- Uploaded HTML/SVG are served as downloads, never rendered on the sliceurl.app origin.
- `verify-password` (link passwords) now has the same brute-force brake, and returns the UTM URL for UTM links.
- `bulk-shorten` no longer downloads the entire `links` table on every call; it only checks the new slugs.
- `check-url-safety` / `fetch-branding` read at most 512 KB of a page, and safety results are cached at the edge for 24 h.
- Analytics are counted in SQL. The old functions read click rows through PostgREST, which stops at 1000 rows, so links with more than 1000 clicks showed wrong stats.
- Shared-analytics passwords now go in an `X-Share-Password` header instead of the URL, with a brute-force brake. `share_url` now points to the site (it used to use the Supabase host).
- `SharedAnalytics.tsx` crashed on `new URL()` with a same-origin API; fixed.
- API keys: max 10 active keys per user (there was no cap). `api-keys?action=usage` no longer counts requests from an expired 24 h window.
- `merchant-api` sent Paytm a callback URL on the Supabase host and a checkout URL on `s1liceurl.lovable.app`; both now use the Worker / site origin.
- `paytm-callback` now rejects a "success" whose `TXNAMOUNT` differs from the order total (it trusted any signed success).
- `dodo-webhook` now rejects deliveries older than 5 minutes (Standard Webhooks replay protection); before, a captured webhook could be replayed forever.
- `create-order` only reuses a recent order with the same billing cycle (it could reuse a monthly order for a yearly purchase).
- Paytm/Dodo redirect and return URLs used `s1liceurl.lovable.app` / the Supabase host; they now use the site and Worker origin.
- Dodo reconcile now also runs automatically every 30 minutes (Worker cron).
- `send-welcome-email` was an open relay: anyone could make SliceURL email any address with any name injected into the HTML. It now mails only the signed-in user, once, with escaped content.
- `send-deletion-email` was called by Settings but did not exist; implemented (signed-in user only, only when a deletion is scheduled).
- Review responses and the public review list no longer expose reviewers' IP addresses / browser fingerprints. `rating_avg` / `rating_count` are now kept in sync on every review change.
- `admin` hashed link passwords with unsalted SHA-256 and let `custom_slug` collide; it now uses PBKDF2 and checks the slug.
- Geo lookups no longer send visitor IPs to 4 third-party APIs (Cloudflare provides country/city).

## Adding or changing a function

Each one is a Hono handler in `worker/src/routes/functions/` registered in `worker/src/index.ts`.
The old Deno code is kept in `supabase/functions/` for reference only (nothing deploys it).

## Go-live checklist

1. Cloudflare account → **Workers Paid plan ($5/mo) recommended** (free plan's 10 ms CPU limit is too low for password hashing, D1/R2 have generous free tiers).
2. In `worker/`:
   ```bash
   npm install
   npx wrangler login
   npx wrangler d1 create sliceurl-db        # paste database_id into wrangler.toml
   npx wrangler r2 bucket create sliceurl-files
   npm run db:migrate:remote
   ```
3. R2 → *Manage API tokens* → create an S3 token (Object Read & Write on `sliceurl-files`), then
   `wrangler secret put R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.
   Add a CORS rule on the bucket allowing `PUT` from `https://sliceurl.app`.
4. Google Cloud Console → OAuth client → redirect URI `https://sliceurl.app/auth/v1/callback`;
   `wrangler secret put GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
5. `wrangler secret put RESEND_API_KEY` (+ optional `EMAIL_FROM`).
   `wrangler secret put DOWNLOAD_TOKEN_SECRET` (any long random string, e.g. `openssl rand -base64 48`).
6. **Data**: export every table + `auth.users` (with `encrypted_password`) + Google identities from
   Lovable Cloud as JSON, run the import script, and copy storage buckets (`slicebox`, `app-assets`,
   `feedback-screenshots`) into R2 under `<bucket>/<path>`.
7. Build and deploy: `npm run build` (repo root) then `cd worker && npm run deploy`.
8. Dodo dashboard → webhook URL `https://sliceurl.app/functions/v1/dodo-webhook` (Paytm gets its callback URL per transaction).
9. Add `sliceurl.app` as a Custom Domain on the Worker. Make yourself admin:
   `wrangler d1 execute sliceurl-db --remote --command "INSERT INTO user_roles (user_id, role) SELECT id, 'admin' FROM users WHERE email='YOUR_EMAIL'"`.

## Local development

```bash
# `npm run dev` uses [env.local] in wrangler.toml (no Workers AI, so no Cloudflare login needed)
# worker/.dev.vars: SITE_URL="http://127.0.0.1:8787" and DOWNLOAD_TOKEN_SECRET="anything-long"
cd worker && npm install && npm run db:migrate:local && npm run dev   # API + built SPA on :8787
npm run dev                                                            # (repo root) Vite on :8080, proxies the API to :8787
```

## Known gaps
- **Account deletion is never carried out.** Settings sets `profiles.scheduled_deletion_at` and emails the user, but nothing (old or new) deletes the account after 30 days. Deciding to auto-delete is a product call; it would be a few lines in the daily cron.
- PWA service worker registration could not be verified in the local test browser (it served `sw.js` fine); check it once on the real HTTPS domain.
- `check-link-health` used to call a `notify-broken-link` function that never existed, so broken-link emails were never sent. Still a TODO.
- `feedback-screenshots` are public-by-path (Supabase had owner/admin-only reads; `<img>` can't send a token). Fix with signed URLs.
- Realtime is polling (15 s), not push. Use Durable Objects later if instant updates matter.
- `/admin/*` used to be proxied to aryapremium.store in `vercel.json`; it conflicts with the SPA's `/admin/inbox`, so only `/AryaPremium*` is proxied now.
