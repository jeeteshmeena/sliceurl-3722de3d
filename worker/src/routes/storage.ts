// Supabase Storage replacement on R2. Object key = "<bucket>/<path>".
//   PUT/POST /storage/v1/object/:bucket/<path>        small uploads proxied through the Worker (<= 95 MB)
//   POST     /storage/v1/upload-url                    presigned direct-to-R2 PUT URL (SliceBox 200 MB / LittleSlice 2 GB)
//   DELETE   /storage/v1/object/:bucket  {prefixes}    remove
//   GET      /storage/v1/object/public/:bucket/<path>  public read
import { Hono } from "hono";
import { AwsClient } from "aws4fetch";
import type { AppEnv, Env } from "../env";

export const storage = new Hono<AppEnv>();

const PROXY_MAX = 95 * 1024 * 1024; // Workers request-body limit is 100 MB on Free/Pro
const BUCKETS: Record<string, { publicRead: boolean; anonUpload: boolean; maxSize: number; pathRe: RegExp }> = {
  slicebox: { publicRead: false, anonUpload: true, maxSize: 2 * 1024 ** 3, pathRe: /^uploads\/[a-zA-Z0-9]+\/[a-zA-Z0-9._-]+$/ },
  "app-assets": { publicRead: true, anonUpload: false, maxSize: 5 * 1024 ** 2, pathRe: /^[a-z]+s\/[a-zA-Z0-9._-]+$/ },
  // TODO(security): was owner/admin-read in Supabase; <img> tags can't send a bearer token, so it's public-by-unguessable-path for now.
  "feedback-screenshots": { publicRead: true, anonUpload: false, maxSize: 5 * 1024 ** 2, pathRe: /^[0-9a-f-]{36}\/[a-zA-Z0-9._-]+$/ },
};

function sanitizePath(p: string): string {
  // allow the same characters Supabase did; reject traversal
  const clean = decodeURIComponent(p).replace(/^\/+/, "");
  if (clean.includes("..") || clean.length > 400) throw new Error("bad path");
  return clean.replace(/[^a-zA-Z0-9._\/-]/g, "_");
}

function bucketFor(name: string) {
  const b = BUCKETS[name];
  if (!b) throw new Error("Bucket not found");
  return b;
}

storage.on(["POST", "PUT"], "/object/:bucket/*", async (c) => {
  try {
    const bucket = c.req.param("bucket");
    const conf = bucketFor(bucket);
    const path = sanitizePath(c.req.path.split(`/object/${bucket}/`)[1] || "");
    const user = c.get("user");
    if (!conf.anonUpload && !user) return c.json({ error: "Unauthorized", message: "Not authenticated" }, 401);
    if (!conf.pathRe.test(path)) return c.json({ error: "Invalid path", message: "Invalid object path" }, 400);
    if (bucket === "feedback-screenshots" && !path.startsWith(`${user!.id}/`)) return c.json({ message: "Forbidden" }, 403);
    const len = Number(c.req.header("content-length") || 0);
    if (len > Math.min(conf.maxSize, PROXY_MAX)) {
      return c.json({ message: "File too large for direct upload; use /storage/v1/upload-url" }, 413);
    }
    const key = `${bucket}/${path}`;
    if (c.req.method === "POST" && c.req.header("x-upsert") !== "true" && (await c.env.FILES.head(key))) {
      return c.json({ message: "The resource already exists", statusCode: "409" }, 409);
    }
    await c.env.FILES.put(key, c.req.raw.body, {
      httpMetadata: { contentType: c.req.header("content-type") || "application/octet-stream" },
      customMetadata: { owner: user?.id ?? "anon" },
    });
    return c.json({ Key: key, path, id: key });
  } catch (e) {
    return c.json({ message: (e as Error).message }, 400);
  }
});

storage.post("/upload-url", async (c) => {
  const { bucket, path, contentType, size } = await c.req.json<{ bucket: string; path: string; contentType?: string; size: number }>();
  try {
    const conf = bucketFor(bucket);
    const clean = sanitizePath(path);
    if (!conf.anonUpload && !c.get("user")) return c.json({ message: "Not authenticated" }, 401);
    if (!conf.pathRe.test(clean)) return c.json({ message: "Invalid object path" }, 400);
    if (!size || size > conf.maxSize) return c.json({ message: "File too large" }, 413);
    if (!c.env.R2_ACCESS_KEY_ID) {
      // No R2 S3 token configured (e.g. local dev): upload through the Worker instead, max ~95 MB.
      if (size > PROXY_MAX) return c.json({ message: "Large uploads need R2 S3 credentials (R2_ACCESS_KEY_ID etc.)" }, 501);
      const proxied = new URL(`/storage/v1/object/${bucket}/${clean}`, c.req.url).toString();
      return c.json({ url: proxied, path: clean, method: "PUT", headers: { "Content-Type": contentType || "application/octet-stream" } });
    }
    const url = await presignPut(c.env, `${bucket}/${clean}`, contentType || "application/octet-stream");
    return c.json({ url, path: clean, method: "PUT", headers: { "Content-Type": contentType || "application/octet-stream" } });
  } catch (e) {
    return c.json({ message: (e as Error).message }, 400);
  }
});

export async function presignPut(env: Env, key: string, contentType: string): Promise<string> {
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) throw new Error("R2 S3 credentials not configured");
  const client = new AwsClient({ accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" });
  const url = new URL(`https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${key.split("/").map(encodeURIComponent).join("/")}`);
  url.searchParams.set("X-Amz-Expires", "3600");
  const signed = await client.sign(new Request(url, { method: "PUT", headers: { "Content-Type": contentType } }), { aws: { signQuery: true } });
  return signed.url;
}

storage.delete("/object/:bucket", async (c) => {
  const bucket = c.req.param("bucket");
  const { prefixes } = await c.req.json<{ prefixes: string[] }>();
  const user = c.get("user");
  const removed: { name: string }[] = [];
  for (const p of (prefixes || []).slice(0, 100)) {
    const path = sanitizePath(p);
    const key = `${bucket}/${path}`;
    const obj = await c.env.FILES.head(key);
    if (!obj) continue;
    const owner = obj.customMetadata?.owner;
    let allowed = c.get("isAdmin") || (!!user && owner === user.id);
    if (!allowed && bucket === "slicebox") {
      // anonymous uploader cleaning up a failed upload: only orphans (no DB row yet)
      const row = await c.env.DB.prepare(`SELECT 1 FROM slicebox_files WHERE storage_path = ?`).bind(path).first();
      allowed = !row;
    }
    if (allowed) { await c.env.FILES.delete(key); removed.push({ name: path }); }
  }
  return c.json(removed);
});

storage.get("/object/public/:bucket/*", async (c) => {
  const bucket = c.req.param("bucket");
  const conf = BUCKETS[bucket];
  if (!conf?.publicRead) return c.json({ message: "Not found" }, 404);
  const path = sanitizePath(c.req.path.split(`/object/public/${bucket}/`)[1] || "");
  const obj = await c.env.FILES.get(`${bucket}/${path}`);
  if (!obj) return c.json({ message: "Object not found" }, 404);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(obj.body, { headers });
});
