import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, processDodoEvent, requireAdmin } from "../_shared/dodo.ts";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = adminClient();
  if (!await requireAdmin(req, admin)) return json({ error: "Admin access required" }, 403);
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  if (body.action !== "replay" || typeof body.log_id !== "string") return json({ error: "Unsupported action" }, 400);
  const { data: log } = await admin.from("dodo_webhook_logs").select("*").eq("id", body.log_id).maybeSingle();
  if (!log?.raw_payload) return json({ error: "Replay payload not found" }, 404);
  const result = await processDodoEvent(admin, log.raw_payload);
  await admin.from("dodo_webhook_logs").update({
    status: result.matched ? "replayed" : "replay_failed",
    verification_error: result.matched ? null : "order_not_found",
    replay_count: (log.replay_count ?? 0) + 1,
    last_replayed_at: new Date().toISOString(),
    processed_at: result.matched ? new Date().toISOString() : log.processed_at,
  }).eq("id", body.log_id);
  return json({ success: result.matched, result });
});