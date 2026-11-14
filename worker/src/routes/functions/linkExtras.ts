// Ported edge functions: verify-password, utm-data, creepy-shorten,
// check-url-safety, check-link-health, bulk-shorten, fetch-branding.
import type { Context } from "hono";
import type { AppEnv, Env } from "../../env";
import { hashPassword, randomCode, verifyPassword } from "../../lib/crypto";
import { clientIp } from "../../lib/request";
import { decodeRow, nowIso } from "../../lib/schema";
import { redirectTarget } from "./links";

type C = Context<AppEnv>;

/** Best-effort per-isolate limiter (same strength as the old Deno Map limiter). */
const buckets = new Map<string, { n: number; reset: number }>();
function limited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) { buckets.set(key, { n: 1, reset: now + windowMs }); return false; }
  return ++b.n > limit;
}

const isHttpUrl = (u: unknown): u is string => {
  if (typeof u !== "string" || !u.trim() || /^\s*(javascript|data|vbscript|file|blob|about):/i.test(u)) return false;
  try { const p = new URL(u).protocol; return p === "http:" || p === "https:"; } catch { return false; }
};

/** Fetch at most `maxBytes` of a page as text (avoids pulling huge files into memory). */
async function fetchText(url: string, init: RequestInit, timeoutMs: number, maxBytes = 512 * 1024): Promise<{ ok: boolean; status: number; text: string | null }> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok || !res.body) { res.body?.cancel(); return { ok: false, status: res.status, text: null }; }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
  }
  reader.cancel().catch(() => undefined);
  const buf = new Uint8Array(Math.min(total, maxBytes));
  let off = 0;
  for (const ch of chunks) { const n = Math.min(ch.byteLength, buf.length - off); buf.set(ch.subarray(0, n), off); off += n; if (off >= buf.length) break; }
  return { ok: true, status: res.status, text: new TextDecoder().decode(buf) };
}

// ------------------------------------------------------------------ verify-password (password-protected short links)
const pwAttempts = new Map<string, { n: number; reset: number }>();
export async function verifyLinkPassword(c: C) {
  const { short_code, password } = await c.req.json<{ short_code?: string; password?: string }>().catch(() => ({} as Record<string, undefined>));
  if (!short_code || !password) return c.json({ error: "Short code and password are required" }, 400);

  const key = `${clientIp(c.req.raw)}:${short_code}`;
  const now = Date.now();
  const a = pwAttempts.get(key);
  if (a && now < a.reset && a.n >= 10) return c.json({ valid: false, error: "Too many attempts. Try again later." }, 429);

  const link = await c.env.DB.prepare(`SELECT * FROM links WHERE short_code = ?`).bind(short_code).first<Record<string, any>>();
  if (!link) return c.json({ error: "Link not found" }, 404);
  if (!(await verifyPassword(password, link.password_hash))) {
    pwAttempts.set(key, a && now < a.reset ? { n: a.n + 1, reset: a.reset } : { n: 1, reset: now + 600_000 });
    return c.json({ valid: false, error: "Incorrect password" }, 401);
  }
  pwAttempts.delete(key);
  // UTM-enabled links now go to their UTM URL here too (same as the normal redirect)
  return c.json({ valid: true, original_url: await redirectTarget(c.env, link as never) });
}

// ------------------------------------------------------------------ utm-data
export async function utmData(c: C) {
  const user = c.get("user");
  if (!user) return c.json({ error: "Authorization required" }, 401);
  const linkId = c.req.query("link_id");
  if (!linkId) return c.json({ error: "link_id parameter is required" }, 400);
  const link = await c.env.DB.prepare(`SELECT id, user_id, utm_enabled FROM links WHERE id = ?`).bind(linkId)
    .first<{ id: string; user_id: string | null; utm_enabled: number }>();
  if (!link) return c.json({ error: "Link not found" }, 404);
  if (link.user_id !== user.id) return c.json({ error: "Access denied" }, 403);
  const utm = await c.env.DB.prepare(`SELECT * FROM utm_data WHERE link_id = ?`).bind(linkId).first<Record<string, unknown>>();
  return c.json({ success: true, utm_enabled: !!link.utm_enabled, utm_data: utm ? decodeRow("utm_data", utm) : null });
}

// ------------------------------------------------------------------ creepy-shorten
const SUBDOMAINS = ["login", "support", "secure", "account", "service", "verify", "update", "portal", "access", "auth", "signin", "validate", "confirm", "security", "help"];
const PATH_WORDS = ["update_required", "document_review", "security_check", "account_review", "verification_pending", "action_needed", "confirm_identity", "review_activity", "secure_login", "validate_session", "pending_review", "access_request"];
const pick = <T,>(arr: T[]) => arr[crypto.getRandomValues(new Uint32Array(1))[0] % arr.length];

export async function creepyShorten(c: C) {
  if (limited(`creepy:${clientIp(c.req.raw)}`, 5, 60_000)) return c.json({ error: "Rate limit exceeded. Please try again later." }, 429);
  const { url } = await c.req.json<{ url?: string }>().catch(() => ({ url: undefined }));
  if (!url) return c.json({ error: "URL is required" }, 400);
  if (!isHttpUrl(url)) return c.json({ error: "Invalid URL. Only http:// and https:// URLs are allowed." }, 400);

  const db = c.env.DB;
  let shortCode = "";
  for (let i = 0; i < 20; i++) {
    const candidate = `${pick(SUBDOMAINS)}_${randomCode(6, "abcdefghijklmnopqrstuvwxyz0123456789")}_${pick(PATH_WORDS)}`;
    if (!(await db.prepare(`SELECT 1 FROM links WHERE short_code = ?`).bind(candidate).first())) { shortCode = candidate; break; }
  }
  if (!shortCode) return c.json({ error: "Failed to generate unique code" }, 500);

  const id = crypto.randomUUID();
  // counter is bumped by the SQLite trigger (the old code also called an RPC)
  await db.prepare(`INSERT INTO links (id, original_url, short_code, user_id, is_creepy, creepy_style, click_count) VALUES (?, ?, ?, NULL, 1, 'security_simulation', 0)`)
    .bind(id, url, shortCode).run();
  const origin = new URL(c.env.SITE_URL).origin;
  return c.json({ success: true, short_code: shortCode, short_url: `${origin}/s/${shortCode}`, id });
}

// ------------------------------------------------------------------ check-url-safety
const BLACKLISTED_DOMAINS = new Set([
  "bitcoin-generator.online", "crypto-doubler.com", "ethgiveaway.org", "free-bitcoin-now.com", "paypa1.com", "amaz0n-secure.com",
  "app1e-id.com", "microsofft-verify.com", "xnxx.com", "pornhub.com", "xvideos.com", "xhamster.com", "redtube.com", "youporn.com",
  "tube8.com", "spankbang.com", "brazzers.com", "chaturbate.com", "livejasmin.com", "stripchat.com", "cam4.com", "bongacams.com",
  "myfreecams.com", "onlyfans.com",
]);
const PHISHING_PATTERNS = [
  /paypal.*\.(?!paypal\.com)/i, /apple.*\.(?!apple\.com)/i, /microsoft.*\.(?!microsoft\.com)/i,
  /google.*\.(?!google\.com|googleapis\.com|gstatic\.com)/i, /amazon.*\.(?!amazon\.|amazonaws\.com)/i,
  /facebook.*\.(?!facebook\.com|fb\.com)/i, /netflix.*\.(?!netflix\.com)/i, /bank.*login/i, /secure.*update.*account/i,
  /verify.*account.*immediately/i, /password.*reset.*urgent/i, /suspended.*account/i, /confirm.*identity/i,
];
const SCAM_KEYWORDS = ["freebit", "miner", "crack", "hack", "cheat", "keygen", "warez", "pirate", "freemoney", "getrich", "bitcoin-generator", "crypto-doubler", "wallet-verify", "seed-phrase", "private-key", "metamask-verify"];
const ADULT_KEYWORDS = ["porn", "xxx", "sex", "nude", "naked", "adult", "erotic", "nsfw", "hentai", "camgirl", "webcam girl", "live sex", "xxx video", "adult content", "explicit", "hardcore", "milf", "teen porn"];
const SUSPICIOUS_TLDS = [".ru", ".xyz", ".win", ".click", ".top", ".tk", ".ml", ".ga", ".cf", ".gq"];

type SafetyResult = {
  status: "safe" | "unsafe" | "suspicious" | "unknown"; threats: string[]; message: string; riskScore: number;
  riskFactors: string[]; redirectCount?: number; detectedIssues?: string[];
};

function analyzeUrlPatterns(url: string) {
  let score = 0;
  const factors: string[] = [], threats: string[] = [];
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const full = url.toLowerCase();
    const kw = SCAM_KEYWORDS.find((k) => full.includes(k));
    if (kw) { score += 50; factors.push(`Scam keyword detected: ${kw}`); threats.push("Potential Scam"); }
    const tld = SUSPICIOUS_TLDS.find((t) => host.endsWith(t));
    if (tld) { score += 15; factors.push(`Suspicious TLD: ${tld}`); }
    if (PHISHING_PATTERNS.some((p) => p.test(full))) { score += 70; factors.push("Phishing pattern detected"); threats.push("Phishing"); }
    if (/^https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url)) { score += 25; factors.push("IP-based URL (suspicious)"); }
    if (url.length > 500) { score += 10; factors.push("Unusually long URL"); }
  } catch {
    score += 30; factors.push("Invalid URL format");
  }
  return { score, factors, threats };
}

async function testRedirects(url: string) {
  let count = 0;
  let current = url;
  const start = Date.now();
  const seen = new Set<string>();
  while (count < 10) {
    if (seen.has(current)) return { count, finalUrl: current, suspicious: true };
    seen.add(current);
    try {
      const res = await fetch(current, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(3000), headers: { "User-Agent": "SliceURL-SafetyChecker/1.0" } });
      const loc = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && loc) {
        count++;
        try { current = new URL(loc, current).toString(); } catch { current = loc; }
        if (count > 3 && Date.now() - start < 2000) return { count, finalUrl: current, suspicious: true };
      } else break;
    } catch { break; }
  }
  return { count, finalUrl: current, suspicious: count > 3 };
}

async function analyzePageContent(url: string) {
  const factors: string[] = [];
  let isAdult = false, isMalware = false;
  try {
    const { ok, text } = await fetchText(url, { headers: { "User-Agent": "SliceURL-SafetyChecker/1.0" } }, 5000);
    if (!ok || !text) return { isAdult, isMalware, factors };
    const lower = text.toLowerCase();
    const rating = lower.match(/<meta[^>]*name=["']rating["'][^>]*content=["']([^"']+)["']/i);
    if (rating && /adult|mature/.test(rating[1])) { isAdult = true; factors.push("Adult content rating in meta tags"); }
    const title = (text.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || "").toLowerCase();
    const desc = (text.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1] || "").toLowerCase();
    if (ADULT_KEYWORDS.filter((k) => title.includes(k) || desc.includes(k)).length >= 2) {
      isAdult = true; factors.push("Adult content keywords detected in page metadata");
    }
    if (lower.includes("document.write(unescape") || lower.includes("eval(function(p,a,c,k,e,d)") || lower.includes("fromcharcode")) {
      isMalware = true; factors.push("Obfuscated/malicious JavaScript detected");
    }
  } catch { /* unreachable page = no content signal */ }
  return { isAdult, isMalware, factors };
}

async function safeBrowsing(env: Env, urls: string[]) {
  if (!env.GOOGLE_SAFE_BROWSING_API_KEY) return null;
  try {
    const res = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${env.GOOGLE_SAFE_BROWSING_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client: { clientId: "sliceurl", clientVersion: "1.0.0" },
        threatInfo: {
          threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
          platformTypes: ["ANY_PLATFORM"], threatEntryTypes: ["URL"],
          threatEntries: [...new Set(urls)].map((url) => ({ url })),
        },
      }),
    });
    if (!res.ok) return null;
    return ((await res.json()) as { matches?: { threatType: string }[] }).matches ?? [];
  } catch { return null; }
}

export async function checkUrlSafety(c: C) {
  const { url } = await c.req.json<{ url?: string }>().catch(() => ({ url: undefined }));
  if (!url) return c.json({ error: "URL is required" }, 400);
  let hostname: string;
  try { hostname = new URL(url).hostname.toLowerCase(); } catch {
    return c.json({ status: "suspicious", threats: ["Invalid URL"], message: "Invalid URL format", riskScore: 50, riskFactors: ["Invalid URL format"], detectedIssues: ["Invalid URL"] });
  }

  // 24 h result cache (Cloudflare edge cache instead of the old per-instance Map)
  const cacheKey = new Request(`https://cache.sliceurl.internal/url-safety?u=${encodeURIComponent(url)}`);
  const cache = (globalThis as unknown as { caches?: { default: Cache } }).caches?.default;
  const hit = await cache?.match(cacheKey).catch(() => undefined);
  if (hit) return new Response(hit.body, { headers: { "Content-Type": "application/json" } });

  let riskScore = 0;
  const riskFactors: string[] = [], threats: string[] = [], issues: string[] = [];
  if ([...BLACKLISTED_DOMAINS].some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
    riskScore += 80; riskFactors.push("Domain is on security blacklist"); threats.push("Blacklisted Domain"); issues.push("🛑 Blacklisted Domain");
  }
  const pat = analyzeUrlPatterns(url);
  riskScore += pat.score; riskFactors.push(...pat.factors); threats.push(...pat.threats);
  if (pat.threats.includes("Phishing")) issues.push("⚠️ Phishing Risk");
  if (pat.threats.includes("Potential Scam")) issues.push("⚠️ Scam Indicators");

  const redirects = await testRedirects(url);
  if (redirects.suspicious) { riskScore += 30; riskFactors.push(`Excessive redirects: ${redirects.count}`); issues.push("🔄 Suspicious Redirect Chain"); }

  const [matches, content] = await Promise.all([
    safeBrowsing(c.env, [url, redirects.finalUrl]),
    analyzePageContent(redirects.finalUrl || url),
  ]);
  if (matches?.length) {
    riskScore += 90; riskFactors.push("Google Safe Browsing: Threat detected");
    const map: Record<string, [string, string]> = {
      MALWARE: ["Malware", "🛑 Malware Detected"], SOCIAL_ENGINEERING: ["Phishing", "⚠️ Phishing Warning"],
      UNWANTED_SOFTWARE: ["Unwanted Software", "⚠️ Unwanted Software"], POTENTIALLY_HARMFUL_APPLICATION: ["Harmful Application", "⚠️ Harmful Application"],
    };
    for (const m of matches) { const e = map[m.threatType]; if (e) { threats.push(e[0]); issues.push(e[1]); } }
  }
  riskFactors.push(...content.factors);
  if (content.isAdult) { riskScore += 60; threats.push("Adult Content"); issues.push("⚠️ Adult Material"); }
  if (content.isMalware) { riskScore += 80; threats.push("Malware"); issues.push("🛑 Malware Risk"); }

  riskScore = Math.min(riskScore, 100);
  const uThreats = [...new Set(threats)];
  let status: SafetyResult["status"], message: string;
  if (uThreats.includes("Malware") || uThreats.includes("Phishing") || riskScore >= 70) { status = "unsafe"; message = "Unsafe link - threats detected"; }
  else if (uThreats.includes("Adult Content") || riskScore >= 40) { status = "suspicious"; message = "Potentially unsafe content"; }
  else if (riskScore >= 20) { status = "suspicious"; message = "Minor security concerns"; }
  else if (!c.env.GOOGLE_SAFE_BROWSING_API_KEY && riskScore === 0) { status = "unknown"; message = "Limited safety verification"; }
  else { status = "safe"; message = "No threats detected"; }

  const result: SafetyResult = { status, threats: uThreats, message, riskScore, riskFactors, redirectCount: redirects.count, detectedIssues: [...new Set(issues)] };
  const body = JSON.stringify(result);
  if (cache) c.executionCtx.waitUntil(cache.put(cacheKey, new Response(body, { headers: { "Content-Type": "application/json", "Cache-Control": "max-age=86400" } })).catch(() => undefined));
  return c.body(body, 200, { "Content-Type": "application/json" });
}

// ------------------------------------------------------------------ check-link-health
export async function checkLinkHealth(c: C) {
  const user = c.get("user");
  if (!user) return c.json({ error: "Authorization required" }, 401);
  const { link_id, check_url = false } = await c.req.json<{ link_id?: string; check_url?: boolean }>().catch(() => ({} as { link_id?: string; check_url?: boolean }));
  if (!link_id) return c.json({ error: "link_id is required" }, 400);
  const link = await c.env.DB.prepare(`SELECT original_url, last_clicked_at, is_broken, notify_on_broken FROM links WHERE id = ? AND user_id = ?`)
    .bind(link_id, user.id).first<{ original_url: string; last_clicked_at: string | null; is_broken: number | null }>();
  if (!link) return c.json({ error: "Link not found" }, 404);

  let isBroken = !!link.is_broken;
  if (check_url) {
    try {
      const res = await fetch(link.original_url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(10_000) });
      isBroken = !res.ok;
    } catch { isBroken = true; }
  }
  let health: "active" | "low_activity" | "inactive" | "broken" = "active";
  if (isBroken) health = "broken";
  else if (link.last_clicked_at) {
    const days = (Date.now() - new Date(link.last_clicked_at).getTime()) / 86_400_000;
    health = days > 30 ? "inactive" : days > 14 ? "low_activity" : "active";
  }
  await c.env.DB.prepare(`UPDATE links SET health_status = ?, is_broken = ?, last_health_check = ? WHERE id = ?`)
    .bind(health, isBroken ? 1 : 0, nowIso(), link_id).run();
  // NOTE: the old code invoked a `notify-broken-link` function that never existed; broken-link emails are a TODO.
  return c.json({ health_status: health, is_broken: isBroken, last_clicked_at: link.last_clicked_at });
}

// ------------------------------------------------------------------ bulk-shorten
async function aiTitle(env: Env, url: string): Promise<string | null> {
  // Replaces the Lovable AI gateway with Cloudflare Workers AI (no extra API key).
  if (!env.AI) return null;
  try {
    const out = (await env.AI.run("@cf/meta/llama-3.1-8b-instruct" as never, {
      messages: [
        { role: "system", content: "Extract a short, readable title (max 50 chars) from the given URL. Return ONLY the title, nothing else." },
        { role: "user", content: `URL: ${url}` },
      ],
      max_tokens: 60,
    } as never)) as { response?: string };
    const t = out?.response?.trim().replace(/^["']|["']$/g, "");
    return t ? t.slice(0, 100) : null;
  } catch { return null; }
}

function appendBulkUtm(url: string, batchId: string): string {
  try {
    const u = new URL(url);
    if (!u.searchParams.has("utm_source")) u.searchParams.set("utm_source", "sliceurl");
    if (!u.searchParams.has("utm_medium")) u.searchParams.set("utm_medium", "bulk");
    if (!u.searchParams.has("utm_campaign")) u.searchParams.set("utm_campaign", batchId);
    return u.toString();
  } catch {
    return `${url}${url.includes("?") ? "&" : "?"}utm_source=sliceurl&utm_medium=bulk&utm_campaign=${batchId}`;
  }
}

export async function bulkShorten(c: C) {
  const user = c.get("user");
  if (!user) return c.json({ error: "Authorization required" }, 401);
  const { batchName, password, expiry, maxClicks, slugPrefix, autoTitle, urls } = await c.req.json<Record<string, any>>();
  const valid = ((urls || []) as unknown[]).filter(isHttpUrl);
  if (!valid.length) return c.json({ error: "NO_VALID_URLS", message: "No valid URLs provided" }, 400);
  if (valid.length > 100) return c.json({ error: "Maximum 100 URLs allowed per batch" }, 400);

  const prefix = typeof slugPrefix === "string" ? slugPrefix.trim() : "";
  if (prefix && !/^[a-zA-Z0-9_-]{1,40}$/.test(prefix)) return c.json({ error: "Slug prefix can only contain letters, numbers, hyphens, and underscores" }, 400);

  const db = c.env.DB;
  const batchId = `batch_${Date.now()}_${randomCode(9, "abcdefghijklmnopqrstuvwxyz0123456789")}`;
  const passwordHash = password ? await hashPassword(password) : null;

  // Pick slugs, checking only the candidates against the DB (the old code loaded the whole links table).
  const taken = async (codes: string[]) => {
    const out = new Set<string>();
    for (let i = 0; i < codes.length; i += 45) {
      const part = codes.slice(i, i + 45); // D1 allows max 100 bound params
      const q = part.map(() => "?").join(",");
      const { results } = await db.prepare(`SELECT short_code AS c FROM links WHERE short_code IN (${q}) UNION SELECT custom_slug FROM links WHERE custom_slug IN (${q})`)
        .bind(...part, ...part).all<{ c: string }>();
      results.forEach((r) => r.c && out.add(r.c));
    }
    return out;
  };
  const slugs: string[] = valid.map((_, i) => (prefix ? `${prefix}${String(i + 1).padStart(3, "0")}` : randomCode(6)));
  for (let round = 1; round <= 10; round++) {
    const clash = await taken(slugs);
    if (!clash.size) break;
    slugs.forEach((s, i) => {
      if (clash.has(s)) slugs[i] = prefix ? `${prefix}${String(i + 1).padStart(3, "0")}-${round}` : randomCode(6);
    });
  }

  const titles = autoTitle ? await Promise.all(valid.map((u) => aiTitle(c.env, u))) : valid.map(() => null);
  const now = nowIso();
  const rows = valid.map((url, i) => ({ id: crypto.randomUUID(), url, slug: slugs[i], title: titles[i] }));
  const results: { index: number; url: string; success: boolean; error?: string; link?: Record<string, unknown> }[] = [];

  // insert one by one inside a batch so a single failure doesn't sink the rest
  const stmts = rows.map((r, i) => db.prepare(
    `INSERT OR IGNORE INTO links (id, original_url, final_utm_url, short_code, custom_slug, title, user_id, batch_id, order_index, password_hash,
       is_password_protected, expires_at, max_clicks, utm_enabled, utm_source, utm_medium, utm_campaign, click_count, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1,'sliceurl','bulk',?,0,?,?)`,
  ).bind(r.id, r.url, appendBulkUtm(r.url, batchId), r.slug, prefix ? r.slug : null, r.title, user.id, batchId, i, passwordHash,
    passwordHash ? 1 : 0, expiry || null, maxClicks || null, batchId, now, now));
  const res = await db.batch(stmts);
  res.forEach((r, i) => {
    const row = rows[i];
    if ((r.meta.changes ?? 0) > 0) { // D1 also counts the global-counter trigger write
      results.push({ index: i, url: row.url, success: true, link: { id: row.id, short_code: row.slug, custom_slug: prefix ? row.slug : null, title: row.title, original_url: row.url } });
    } else {
      results.push({ index: i, url: row.url, success: false, error: "Database error" });
    }
  });
  const successCount = results.filter((r) => r.success).length;
  return c.json({ batchId, batchName: batchName || null, totalUrls: valid.length, successCount, failCount: results.length - successCount, results });
}

// ------------------------------------------------------------------ fetch-branding
const parseColor = (color: string): string | null => {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(color)) { const [, r, g, b] = color; return `#${r}${r}${g}${g}${b}${b}`.toUpperCase(); }
  const m = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  return m ? `#${[m[1], m[2], m[3]].map((x) => Math.min(255, Number(x)).toString(16).padStart(2, "0")).join("")}`.toUpperCase() : null;
};
const contrast = (hex: string) => (0.299 * parseInt(hex.slice(1, 3), 16) + 0.587 * parseInt(hex.slice(3, 5), 16) + 0.114 * parseInt(hex.slice(5, 7), 16)) / 255 > 0.5 ? "#000000" : "#FFFFFF";
const adjust = (hex: string, amt: number) =>
  `#${[1, 3, 5].map((i) => Math.max(0, Math.min(255, parseInt(hex.slice(i, i + 2), 16) + amt)).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
function domainPalette(url: string) {
  const u = new URL(url);
  const domain = u.hostname.replace("www.", "");
  let hash = 0;
  for (let i = 0; i < domain.length; i++) hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);
  const hsl = (h: number, s: number, l: number) => {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => { const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1))).toString(16).padStart(2, "0"); };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
  };
  const primary = hsl(hue, 70, 50), secondary = hsl((hue + 30) % 360, 60, 40);
  return { colors: [primary, secondary], palette: { primary, secondary, background: "#FFFFFF", foreground: primary, gradientStart: primary, gradientEnd: secondary }, faviconUrl: `${u.origin}/favicon.ico` };
}

export async function fetchBranding(c: C) {
  const { url } = await c.req.json<{ url?: string }>().catch(() => ({ url: undefined }));
  if (!url) return c.json({ error: "URL is required" }, 400);
  if (!isHttpUrl(url)) return c.json({ error: "Invalid URL" }, 400);
  let html: string | null = null, fetchError: string | null = null;
  try {
    const r = await fetchText(url, { headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.5",
    } }, 8000);
    if (r.ok) html = r.text; else fetchError = `HTTP ${r.status}`;
  } catch (e) { fetchError = e instanceof Error ? e.message : "Network error"; }

  if (!html) return c.json({ success: true, ...domainPalette(url), ogImage: null, fallback: true, fallbackReason: fetchError });

  const origin = new URL(url).origin;
  const colors: string[] = [];
  const theme = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["']/i);
  if (theme) { const col = parseColor(theme[1]); if (col) colors.push(col); }
  const og = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  const fav = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']+)["']/i);
  let faviconUrl = `${origin}/favicon.ico`;
  if (fav) {
    const f = fav[1];
    faviconUrl = f.startsWith("http") ? f : f.startsWith("//") ? `https:${f}` : f.startsWith("/") ? `${origin}${f}` : `${origin}/${f}`;
  }
  for (const m of html.matchAll(/(?:background-color|color|border-color):\s*([^;}"']+)/gi)) {
    const col = parseColor(m[1].trim());
    if (col && !colors.includes(col)) colors.push(col);
    if (colors.length >= 5) break;
  }
  if (!colors.length) {
    const fb = domainPalette(url);
    return c.json({ success: true, colors: fb.colors, palette: fb.palette, faviconUrl, ogImage: og ? og[1] : null });
  }
  const primary = colors[0];
  return c.json({
    success: true, colors, faviconUrl, ogImage: og ? og[1] : null,
    palette: { primary, secondary: colors[1] || adjust(primary, -40), background: contrast(primary), foreground: primary, gradientStart: primary, gradientEnd: colors[1] || adjust(primary, -60) },
  });
}
