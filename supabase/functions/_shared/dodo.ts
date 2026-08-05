import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type DodoSettings = {
  api_key: string | null; webhook_secret: string | null; env: string;
  product_pro_monthly: string | null; product_pro_yearly: string | null;
  product_business_monthly: string | null; product_business_yearly: string | null;
};

export const adminClient = () => createClient(
  Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);
export const dodoBaseUrl = (env: string) => env === "live" ? "https://live.dodopayments.com" : "https://test.dodopayments.com";

export async function getDodoSettings(admin: SupabaseClient): Promise<DodoSettings | null> {
  const { data, error } = await admin.from("dodo_settings")
    .select("api_key, webhook_secret, env, product_pro_monthly, product_pro_yearly, product_business_monthly, product_business_yearly")
    .eq("is_active", true).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data as DodoSettings | null;
}

export function productFor(settings: DodoSettings, planId: string, cycle: string): string | null {
  const value = settings[`product_${planId}_${cycle}` as keyof DodoSettings];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

const successEvents = new Set(["payment.succeeded", "subscription.active", "subscription.renewed"]);
const failedEvents = new Set(["payment.failed", "subscription.failed"]);
const cancelledEvents = new Set(["subscription.cancelled", "payment.cancelled"]);
const pendingEvents = new Set(["payment.processing", "subscription.on_hold", "subscription.pending"]);

export async function processDodoEvent(admin: SupabaseClient, payload: Record<string, unknown>) {
  const eventType = String(payload.type ?? "unknown");
  const data = (payload.data && typeof payload.data === "object" ? payload.data : {}) as Record<string, unknown>;
  const metadata = (data.metadata && typeof data.metadata === "object" ? data.metadata : {}) as Record<string, unknown>;
  const paymentId = typeof data.payment_id === "string" ? data.payment_id : typeof data.id === "string" && data.payload_type === "Payment" ? data.id : null;
  const subscriptionId = typeof data.subscription_id === "string" ? data.subscription_id : typeof data.id === "string" && data.payload_type === "Subscription" ? data.id : null;
  const mapped = successEvents.has(eventType) ? "success" : failedEvents.has(eventType) ? "failed" : cancelledEvents.has(eventType) ? "cancelled" : pendingEvents.has(eventType) ? "pending" : "ignored";
  if (mapped === "ignored") return { matched: false, status: mapped };

  let order: Record<string, unknown> | null = null;
  if (typeof metadata.order_id === "string") {
    const { data: row } = await admin.from("orders").select("*").eq("id", metadata.order_id).maybeSingle(); order = row;
  }
  if (!order) {
    const refs = [data.checkout_session_id, data.session_id, subscriptionId, paymentId].filter((v): v is string => typeof v === "string");
    for (const ref of refs) {
      const { data: row } = await admin.from("orders").select("*").or(`dodo_session_id.eq.${ref},dodo_payment_id.eq.${ref}`).maybeSingle();
      if (row) { order = row; break; }
    }
  }
  if (!order || typeof order.id !== "string") return { matched: false, status: mapped };
  const orderId = order.id, userId = String(order.user_id);
  await admin.from("orders").update({ status: mapped, dodo_payment_id: paymentId }).eq("id", orderId);
  const { data: payment } = await admin.from("payments").select("id").eq("order_id", orderId).maybeSingle();
  const paymentRow = { provider: "dodo", provider_txn_id: paymentId, provider_order_id: subscriptionId, status: mapped, raw_response: payload };
  if (payment) await admin.from("payments").update(paymentRow).eq("id", payment.id);
  else await admin.from("payments").insert({ ...paymentRow, order_id: orderId, user_id: userId, amount: order.total });

  if (mapped === "success") {
    const start = new Date(), end = new Date();
    if (order.billing_cycle === "yearly") end.setFullYear(end.getFullYear() + 1); else end.setMonth(end.getMonth() + 1);
    const providerEnd = typeof data.next_billing_date === "string" ? new Date(data.next_billing_date) : end;
    const { data: current } = await admin.from("subscriptions").select("id").eq("user_id", userId).in("status", ["active", "pending"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const subscription = { user_id: userId, plan_id: order.plan_id, billing_cycle: order.billing_cycle, status: "active", current_period_start: start.toISOString(), current_period_end: providerEnd.toISOString(), cancel_at_period_end: false, dodo_subscription_id: subscriptionId };
    if (current) await admin.from("subscriptions").update(subscription).eq("id", current.id); else await admin.from("subscriptions").insert(subscription);
  } else if (mapped === "cancelled" && subscriptionId) {
    await admin.from("subscriptions").update({ status: "cancelled", cancel_at_period_end: true }).eq("dodo_subscription_id", subscriptionId);
  }
  return { matched: true, status: mapped, orderId };
}

export async function requireUser(req: Request) {
  const auth = req.headers.get("Authorization"); if (!auth) return null;
  const client = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(); return error ? null : data.user;
}
export async function requireAdmin(req: Request, admin: SupabaseClient) {
  const user = await requireUser(req); if (!user) return null;
  const { data } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" }); return data === true ? user : null;
}