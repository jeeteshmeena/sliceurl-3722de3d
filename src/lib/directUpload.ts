// Large SliceBox / LittleSlice uploads go straight from the browser to
// Cloudflare R2 with a presigned PUT URL from the Worker (a Worker can't
// accept request bodies over 100 MB, LittleSlice allows 2 GB).
import { supabase } from "@/integrations/supabase/client";

const API = (import.meta.env.VITE_API_URL ?? import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/+$/, "");

/** Object-key-safe file name (same charset the storage rules accept). */
export function safeObjectName(name: string): string {
  const cleaned = name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_").replace(/^[_.]+/, "");
  return (cleaned || "file").slice(0, 150);
}

export async function getDirectUploadUrl(bucket: string, path: string, file: File): Promise<{ url: string; contentType: string }> {
  const { data } = await supabase.auth.getSession();
  const contentType = file.type || "application/octet-stream";
  const res = await fetch(`${API}/storage/v1/upload-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
    },
    body: JSON.stringify({ bucket, path, contentType, size: file.size }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || `Could not start upload (${res.status})`);
  return { url: body.url, contentType };
}
