// Ported edge functions for SliceBox / LittleSlice / app downloads:
//   file-stream, public-file-info, slicebox-download, slicebox-verify-password, slicebox-upload-url
// Files live in R2 under "slicebox/<storage_path>".
import type { Context } from "hono";
import type { AppEnv, Env } from "../../env";
import { b64url, verifyPassword } from "../../lib/crypto";
import { clientIp } from "../../lib/request";

type C = Context<AppEnv>;
type FileRow = {
  id: string; file_id: string; short_code: string | null; storage_path: string; original_name: string;
  file_size: number; mime_type: string; expires_at: string | null; is_deleted: number;
  password_hash: string | null; download_count: number | null; service_type: string | null;
};

const objectKey = (f: Pick<FileRow, "storage_path">) => `slicebox/${f.storage_path}`;
const DOWNLOAD_TOKEN_TTL = 10 * 60; // seconds

async function loadFile(env: Env, by: { fileId?: string | null; shortCode?: string | null }): Promise<FileRow | null> {
  if (by.fileId) return env.DB.prepare(`SELECT * FROM slicebox_files WHERE file_id = ?`).bind(by.fileId).first<FileRow>();
  if (by.shortCode) {
    return env.DB.prepare(`SELECT * FROM slicebox_files WHERE short_code = ? AND is_deleted = 0`).bind(by.shortCode).first<FileRow>();
  }
  return null;
}

/** null = available, otherwise [status, message] */
function unavailable(f: FileRow | null): [404 | 410, string] | null {
  if (!f) return [404, "File not found"];
  if (f.is_deleted) return [404, "This file has been deleted"];
  if (f.expires_at && new Date(f.expires_at) < new Date()) return [410, "This file has expired"];
  return null;
}

// ------------------------------------------------------------------ signed download tokens
// SECURITY FIX: the old file-stream trusted `?verified=true`, so anyone could
// download a password-protected file by adding it to the URL. Now verify-password
// hands out a short-lived HMAC token bound to the file.
async function hmacKey(env: Env) {
  if (!env.DOWNLOAD_TOKEN_SECRET) throw new Error("DOWNLOAD_TOKEN_SECRET is not configured");
  return crypto.subtle.importKey("raw", new TextEncoder().encode(env.DOWNLOAD_TOKEN_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
export async function signDownloadToken(env: Env, fileId: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + DOWNLOAD_TOKEN_TTL;
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(env), new TextEncoder().encode(`${fileId}.${exp}`));
  return `${exp}.${b64url(new Uint8Array(sig))}`;
}
async function checkDownloadToken(env: Env, fileId: string, token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!exp || exp < Date.now() / 1000 || !sig) return false;
  const expected = await crypto.subtle.sign("HMAC", await hmacKey(env), new TextEncoder().encode(`${fileId}.${exp}`));
  const a = b64url(new Uint8Array(expected));
  if (a.length !== sig.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ sig.charCodeAt(i);
  return r === 0;
}

function streamUrl(c: C, fileId: string, token?: string) {
  const u = new URL("/functions/v1/file-stream", c.req.url);
  u.searchParams.set("fileId", fileId);
  if (token) u.searchParams.set("token", token);
  return u.toString();
}

async function countDownload(env: Env, f: FileRow) {
  await env.DB.batch([
    env.DB.prepare(`UPDATE slicebox_files SET download_count = COALESCE(download_count, 0) + 1 WHERE id = ?`).bind(f.id),
    // app_listings.file_id points at slicebox_files.id (same as the old function)
    env.DB.prepare(`UPDATE app_listings SET total_downloads = COALESCE(total_downloads, 0) + 1 WHERE file_id = ?`).bind(f.id),
  ]);
}

// ------------------------------------------------------------------ file-stream (GET/HEAD, supports Range)
export async function fileStream(c: C) {
  const fileId = c.req.query("fileId");
  const shortCode = c.req.query("shortCode");
  if (!fileId && !shortCode) return c.json({ error: "Missing fileId or shortCode parameter" }, 400);

  const f = await loadFile(c.env, { fileId, shortCode });
  const bad = unavailable(f);
  if (bad) return c.json({ error: bad[1] }, bad[0]);
  const file = f!;

  if (file.password_hash && !(await checkDownloadToken(c.env, file.file_id, c.req.query("token")))) {
    return c.json({ error: "This file is password protected", requiresPassword: true }, 403);
  }

  let contentType = file.mime_type || "application/octet-stream";
  const fileName = file.original_name || "download";
  if (fileName.toLowerCase().endsWith(".apk")) contentType = "application/vnd.android.package-archive";
  // never let uploaded HTML/SVG render on our origin
  if (/^(text\/html|image\/svg|application\/xhtml)/i.test(contentType)) contentType = "application/octet-stream";

  const headers = new Headers({
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    "Accept-Ranges": "bytes",
    "Cache-Control": file.password_hash ? "private, no-store" : "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  });

  if (c.req.method === "HEAD") {
    headers.set("Content-Length", String(file.file_size));
    return new Response(null, { status: 200, headers });
  }

  const rangeHeader = c.req.header("range");
  let range: { offset: number; length: number } | undefined;
  if (rangeHeader) {
    const m = rangeHeader.match(/bytes=(\d*)-(\d*)/);
    if (m && (m[1] || m[2])) {
      let start: number, end: number;
      if (m[1]) { start = Number(m[1]); end = m[2] ? Math.min(Number(m[2]), file.file_size - 1) : file.file_size - 1; }
      else { start = Math.max(file.file_size - Number(m[2]), 0); end = file.file_size - 1; } // suffix range: bytes=-500
      if (start > end || start >= file.file_size) {
        return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${file.file_size}` } });
      }
      range = { offset: start, length: end - start + 1 };
    }
  }

  const obj = await c.env.FILES.get(objectKey(file), range ? { range } : undefined);
  if (!obj) return c.json({ error: "This file is temporarily unavailable. Please try again later." }, 500);

  // count once per download, not once per resumed chunk
  if (!range || range.offset === 0) c.executionCtx.waitUntil(countDownload(c.env, file));

  if (range) {
    headers.set("Content-Range", `bytes ${range.offset}-${range.offset + range.length - 1}/${file.file_size}`);
    headers.set("Content-Length", String(range.length));
    return new Response(obj.body, { status: 206, headers });
  }
  headers.set("Content-Length", String(obj.size));
  return new Response(obj.body, { status: 200, headers });
}

// ------------------------------------------------------------------ public-file-info
export async function publicFileInfo(c: C) {
  const shortCode = c.req.query("shortCode");
  const fileId = c.req.query("fileId");
  if (!shortCode && !fileId) return c.json({ error: "Missing shortCode or fileId parameter" }, 400);
  // shortCode lookup here (unlike file-stream) also finds deleted rows, so the page can say "deleted"
  const f = shortCode
    ? await c.env.DB.prepare(`SELECT * FROM slicebox_files WHERE short_code = ?`).bind(shortCode).first<FileRow>()
    : await loadFile(c.env, { fileId });
  const bad = unavailable(f);
  if (bad) return c.json({ error: bad[1] }, bad[0]);
  const file = f!;
  return c.json(
    {
      fileId: file.file_id, shortCode: file.short_code, originalName: file.original_name, fileSize: file.file_size,
      mimeType: file.mime_type, expiresAt: file.expires_at, isPasswordProtected: !!file.password_hash,
      downloadCount: file.download_count || 0, serviceType: file.service_type || "sb",
    },
    200,
    { "Cache-Control": "public, max-age=60" },
  );
}

// ------------------------------------------------------------------ slicebox-download (no-password files)
export async function sliceboxDownload(c: C) {
  const { fileId } = await c.req.json<{ fileId?: string }>().catch(() => ({ fileId: undefined }));
  if (!fileId) return c.json({ success: false, error: "Missing fileId" }, 400);
  const f = await loadFile(c.env, { fileId });
  const bad = unavailable(f);
  if (bad) return c.json({ success: false, error: bad[1] }, bad[0]);
  const file = f!;
  if (file.password_hash) return c.json({ success: false, error: "This file is password protected", requiresPassword: true }, 403);
  // file-stream counts the download when it's actually fetched
  return c.json({ success: true, downloadUrl: streamUrl(c, file.file_id), fileName: file.original_name, fileSize: file.file_size, mimeType: file.mime_type });
}

// ------------------------------------------------------------------ slicebox-verify-password
const attempts = new Map<string, { n: number; reset: number }>();
export async function sliceboxVerifyPassword(c: C) {
  const { fileId, password } = await c.req.json<{ fileId?: string; password?: string }>().catch(() => ({} as Record<string, undefined>));
  if (!fileId || !password) return c.json({ success: false, error: "Missing fileId or password" }, 400);

  // brute-force brake: 10 tries / 10 min per IP+file (per isolate)
  const key = `${clientIp(c.req.raw)}:${fileId}`;
  const now = Date.now();
  const a = attempts.get(key);
  if (a && now < a.reset && a.n >= 10) return c.json({ success: false, error: "Too many attempts. Try again later." }, 429);

  const f = await loadFile(c.env, { fileId });
  const bad = unavailable(f);
  if (bad) return c.json({ success: false, error: bad[1] }, bad[0]);
  const file = f!;
  if (!file.password_hash || !(await verifyPassword(password, file.password_hash))) {
    attempts.set(key, a && now < a.reset ? { n: a.n + 1, reset: a.reset } : { n: 1, reset: now + 600_000 });
    return c.json({ success: false, error: "Incorrect password" }, 401);
  }
  attempts.delete(key);
  const token = await signDownloadToken(c.env, file.file_id);
  return c.json({ success: true, downloadUrl: streamUrl(c, file.file_id, token), fileName: file.original_name, fileSize: file.file_size, mimeType: file.mime_type });
}

// ------------------------------------------------------------------ slicebox-upload-url (import a file from a URL)
const MAX_IMPORT = 2 * 1024 ** 3;
const BUFFER_LIMIT = 90 * 1024 * 1024; // without Content-Length we must buffer, keep it under Worker memory
const BLOCKED_EXT = new Set(["exe", "bat", "cmd", "sh", "scr", "vbs", "msi", "dll", "jar", "ps1", "com", "pif", "gadget", "hta", "cpl", "msc", "reg", "wsf", "wsh"]);
const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif", "image/webp": ".webp", "video/mp4": ".mp4", "video/webm": ".webm",
  "audio/mpeg": ".mp3", "audio/wav": ".wav", "application/pdf": ".pdf", "application/zip": ".zip",
};

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || /\.(localhost|local|internal)$/.test(h)) return true;
  if (h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  return false;
}

export async function sliceboxUploadUrl(c: C) {
  const { url, expiresAt } = await c.req.json<{ url?: string; expiresAt?: string | null }>().catch(() => ({} as Record<string, undefined>));
  let parsed: URL;
  try { parsed = new URL(url || ""); } catch { return c.json({ success: false, error: "Invalid URL format" }, 400); }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return c.json({ success: false, error: "Only http(s) URLs are allowed" }, 400);
  // Cloudflare Workers can't reach private networks anyway; this also blocks obvious internal names.
  if (isPrivateHost(parsed.hostname)) return c.json({ success: false, error: "URL host is not allowed" }, 400);

  const res = await fetch(parsed.toString(), { headers: { "User-Agent": "SliceBox/1.0 (https://sliceurl.app)" }, redirect: "manual" });
  if (res.status >= 300 && res.status < 400) return c.json({ success: false, error: "Redirects are not allowed" }, 400);
  if (!res.ok || !res.body) return c.json({ success: false, error: `Failed to fetch URL: ${res.status}` }, 400);

  const len = Number(res.headers.get("content-length") || 0);
  if (len > MAX_IMPORT) return c.json({ success: false, error: "File exceeds 2GB limit" }, 400);
  const mimeType = (res.headers.get("content-type") || "application/octet-stream").split(";")[0].trim();

  let filename = "file";
  const disp = res.headers.get("content-disposition");
  const dm = disp?.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  if (dm) filename = dm[1].replace(/['"]/g, "");
  if (filename === "file") {
    const last = parsed.pathname.split("/").pop();
    if (last?.includes(".")) filename = decodeURIComponent(last);
  }
  if (!filename.includes(".")) filename += MIME_EXT[mimeType] || "";
  const rawExt = (filename.split(".").pop() || "").toLowerCase();
  if (BLOCKED_EXT.has(rawExt)) return c.json({ success: false, error: "This file type is not allowed" }, 400);
  const safeExt = rawExt ? `.${rawExt.replace(/[^a-z0-9]/gi, "").slice(0, 8)}` : "";
  filename = `file-${Date.now()}${safeExt}`; // opaque name, as before

  const fileId = crypto.randomUUID().split("-")[0] + Date.now().toString(36);
  const deleteToken = crypto.randomUUID();
  const storagePath = `uploads/${fileId}/${filename}`;

  let size: number;
  if (len > 0) {
    // stream straight into R2 without holding it in memory
    const fixed = new FixedLengthStream(len);
    const put = c.env.FILES.put(`slicebox/${storagePath}`, fixed.readable, { httpMetadata: { contentType: mimeType } });
    await Promise.all([res.body.pipeTo(fixed.writable), put]);
    size = len;
  } else {
    const buf = await new Response(res.body).arrayBuffer();
    if (buf.byteLength > BUFFER_LIMIT) return c.json({ success: false, error: "Server did not send a file size; files over 90 MB need one" }, 400);
    await c.env.FILES.put(`slicebox/${storagePath}`, buf, { httpMetadata: { contentType: mimeType } });
    size = buf.byteLength;
  }

  try {
    await c.env.DB.prepare(
      `INSERT INTO slicebox_files (id, file_id, original_name, file_size, mime_type, storage_path, user_id, delete_token, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
    ).bind(crypto.randomUUID(), fileId, filename, size, mimeType, storagePath, deleteToken, expiresAt || null).run();
  } catch {
    await c.env.FILES.delete(`slicebox/${storagePath}`);
    return c.json({ success: false, error: "Failed to save file metadata" }, 500);
  }
  return c.json({ success: true, fileId, originalName: filename, fileSize: size, mimeType, deleteToken });
}
