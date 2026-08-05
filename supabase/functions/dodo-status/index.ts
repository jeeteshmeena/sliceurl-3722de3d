import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, requireUser } from "../_shared/dodo.ts";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = adminClient();
  const user = await requireUser(req);
  if (!user) return json({ error: "Unauthorized" }, 401);
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const orderNumber = typeof body.order === "string" ? body.order : null;
  if (!orderNumber) return json({ error: "Order is required" }, 400);
  const { data: order } = await admin.from("orders").select("id, order_number, plan_id, billing_cycle, status, updated_at").eq("order_number", orderNumber).eq("user_id", user.id).maybeSingle();
  if (!order) return json({ error: "Order not found" }, 404);
  const { data: subscription } = await admin.from("subscriptions").select("plan_id, status, current_period_end").eq("user_id", user.id).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle();
  return json({ verified: order.status === "success" && subscription?.status === "active", order_status: order.status, subscription: subscription ?? null, order });
});