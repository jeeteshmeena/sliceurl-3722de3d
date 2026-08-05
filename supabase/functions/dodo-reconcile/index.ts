import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, dodoBaseUrl, getDodoSettings, processDodoEvent, requireAdmin } from "../_shared/dodo.ts";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = adminClient();
  const settings = await getDodoSettings(admin);
  if (!settings?.api_key) return json({ error: "Dodo is not configured" }, 503);
  const adminUser = await requireAdmin(req, admin);
  if (!adminUser) {
    const supplied = req.headers.get("x-reconciliation-token");
    const { data } = await admin.from("dodo_settings").select("reconciliation_token").eq("is_active", true).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (!supplied || !data?.reconciliation_token || supplied !== data.reconciliation_token) return json({ error: "Unauthorized" }, 401);
  }
  const { data: orders } = await admin.from("orders").select("id, dodo_session_id").eq("status", "pending").not("dodo_session_id", "is", null).order("created_at", { ascending: true }).limit(50);
  let checked = 0, updated = 0, failed = 0;
  for (const order of orders ?? []) {
    checked += 1;
    try {
      const response = await fetch(`${dodoBaseUrl(settings.env)}/checkouts/${encodeURIComponent(order.dodo_session_id)}`, { headers: { Authorization: `Bearer ${settings.api_key}` } });
      const text = await response.text();
      if (!response.ok) throw new Error(`[${response.status}] ${text.slice(0, 500)}`);
      const session = JSON.parse(text) as Record<string, unknown>;
      const status = String(session.status ?? "pending").toLowerCase();
      if (!["succeeded", "success", "completed", "active", "failed", "cancelled", "canceled"].includes(status)) continue;
      const success = ["succeeded", "success", "completed", "active"].includes(status);
      const event = {
        type: success ? (session.subscription_id ? "subscription.active" : "payment.succeeded") : status === "failed" ? "payment.failed" : "payment.cancelled",
        data: { ...session, session_id: order.dodo_session_id, metadata: { ...((session.metadata as Record<string, unknown> | undefined) ?? {}), order_id: order.id } },
      };
      const result = await processDodoEvent(admin, event);
      if (result.matched) updated += 1;
      await admin.from("dodo_webhook_logs").insert({ event_type: "reconciliation", order_id: order.id, status: result.matched ? "processed" : "ignored", raw_payload: session, processed_at: new Date().toISOString(), http_status: response.status });
    } catch (error) {
      failed += 1;
      await admin.from("dodo_webhook_logs").insert({ event_type: "reconciliation.failed", order_id: order.id, status: "error", verification_error: String(error).slice(0, 2000) });
    }
  }
  return json({ checked, updated, failed });
});