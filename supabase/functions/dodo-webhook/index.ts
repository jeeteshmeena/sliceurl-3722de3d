import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Public Dodo Payments webhook (verify_jwt = false).
// Verifies the Standard Webhooks signature, then activates/updates subscriptions.

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifySignature(
  secret: string,
  webhookId: string,
  timestamp: string,
  rawBody: string,
  signatureHeader: string,
): Promise<boolean> {
  try {
    const secretBytes = secret.startsWith("whsec_")
      ? Uint8Array.from(atob(secret.slice(6)), (c) => c.charCodeAt(0))
      : new TextEncoder().encode(secret);

    const key = await crypto.subtle.importKey(
      "raw",
      secretBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signed = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${webhookId}.${timestamp}.${rawBody}`),
    );
    const expected = btoa(String.fromCharCode(...new Uint8Array(signed)));

    // Header format: "v1,<base64> v1,<base64>"
    return signatureHeader
      .split(" ")
      .map((part) => part.split(",").pop() ?? "")
      .some((sig) => sig && timingSafeEqual(sig, expected));
  } catch (e) {
    console.error("signature verify failed", e);
    return false;
  }
}

function mapEvent(type: string): "success" | "failed" | "pending" | "cancelled" | null {
  if (["payment.succeeded", "subscription.active", "subscription.renewed"].includes(type)) return "success";
  if (["payment.failed", "subscription.failed"].includes(type)) return "failed";
  if (["subscription.cancelled", "payment.cancelled"].includes(type)) return "cancelled";
  if (["payment.processing", "subscription.on_hold"].includes(type)) return "pending";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const log = async (row: Record<string, unknown>) => {
    try { await admin.from("dodo_webhook_logs").insert(row); }
    catch (e) { console.error("webhook log insert failed", e); }
  };

  try {
    const rawBody = await req.text();
    const webhookId = req.headers.get("webhook-id") ?? "";
    const timestamp = req.headers.get("webhook-timestamp") ?? "";
    const signature = req.headers.get("webhook-signature") ?? "";

    let payload: Record<string, any> = {};
    try { payload = JSON.parse(rawBody); } catch { /* noop */ }
    const eventType = String(payload.type ?? payload.event_type ?? "unknown");

    const { data: settings } = await admin
      .from("dodo_settings")
      .select("webhook_secret")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const secret = (settings?.webhook_secret ?? Deno.env.get("DODO_PAYMENTS_WEBHOOK_SECRET") ?? "").trim();
    if (!secret) {
      await log({ event_type: eventType, status: "error", verification_error: "webhook_secret_not_configured", raw_payload: payload });
      return json({ error: "Webhook secret not configured" }, 500);
    }

    const valid = await verifySignature(secret, webhookId, timestamp, rawBody, signature);
    if (!valid) {
      await log({ event_type: eventType, status: "error", verification_error: "invalid_signature", raw_payload: payload });
      return json({ error: "Invalid signature" }, 401);
    }

    const data = payload.data ?? {};
    const metadata = data.metadata ?? {};
    const dodoPaymentId = data.payment_id ?? data.id ?? null;
    const dodoSubscriptionId = data.subscription_id ?? null;
    const mapped = mapEvent(eventType);

    if (!mapped) {
      await log({ event_type: eventType, status: "ignored", dodo_payment_id: dodoPaymentId, dodo_subscription_id: dodoSubscriptionId, raw_payload: payload });
      return json({ received: true, ignored: true });
    }

    // Resolve our order via metadata, else via stored session id
    let order: any = null;
    if (metadata.order_id) {
      const { data: o } = await admin
        .from("orders")
        .select("id, user_id, plan_id, billing_cycle, status, order_number")
        .eq("id", metadata.order_id)
        .maybeSingle();
      order = o;
    }
    if (!order && (data.session_id || dodoSubscriptionId || dodoPaymentId)) {
      const ref = data.session_id ?? dodoSubscriptionId ?? dodoPaymentId;
      const { data: o } = await admin
        .from("orders")
        .select("id, user_id, plan_id, billing_cycle, status, order_number")
        .eq("dodo_session_id", ref)
        .maybeSingle();
      order = o;
    }

    if (!order) {
      await log({ event_type: eventType, status: "error", verification_error: "order_not_found", dodo_payment_id: dodoPaymentId, dodo_subscription_id: dodoSubscriptionId, raw_payload: payload });
      return json({ received: true, matched: false });
    }

    const alreadyFinal = ["success", "cancelled"].includes(order.status);

    if (!alreadyFinal || mapped === "cancelled") {
      await admin
        .from("orders")
        .update({ status: mapped, dodo_payment_id: dodoPaymentId })
        .eq("id", order.id);

      const { data: existingPayment } = await admin
        .from("payments")
        .select("id")
        .eq("order_id", order.id)
        .maybeSingle();

      if (existingPayment) {
        await admin
          .from("payments")
          .update({
            provider: "dodo",
            provider_txn_id: dodoPaymentId,
            status: mapped,
            raw_response: payload,
          })
          .eq("id", existingPayment.id);
      }

      if (mapped === "success") {
        const now = new Date();
        const end = new Date(now);
        if (order.billing_cycle === "yearly") end.setFullYear(end.getFullYear() + 1);
        else end.setMonth(end.getMonth() + 1);

        const { data: existingSub } = await admin
          .from("subscriptions")
          .select("id")
          .eq("user_id", order.user_id)
          .eq("plan_id", order.plan_id)
          .in("status", ["active", "pending"])
          .order("created_at", { ascending: false })
          .maybeSingle();

        if (existingSub) {
          await admin
            .from("subscriptions")
            .update({
              status: "active",
              billing_cycle: order.billing_cycle,
              current_period_start: now.toISOString(),
              current_period_end: (data.next_billing_date ? new Date(data.next_billing_date) : end).toISOString(),
              cancel_at_period_end: false,
              dodo_subscription_id: dodoSubscriptionId,
            })
            .eq("id", existingSub.id);
        } else {
          await admin.from("subscriptions").insert({
            user_id: order.user_id,
            plan_id: order.plan_id,
            billing_cycle: order.billing_cycle,
            status: "active",
            current_period_start: now.toISOString(),
            current_period_end: (data.next_billing_date ? new Date(data.next_billing_date) : end).toISOString(),
            dodo_subscription_id: dodoSubscriptionId,
          });
        }
      }

      if (mapped === "cancelled" && dodoSubscriptionId) {
        await admin
          .from("subscriptions")
          .update({ status: "cancelled", cancel_at_period_end: true })
          .eq("dodo_subscription_id", dodoSubscriptionId);
      }
    }

    await log({
      event_type: eventType,
      status: alreadyFinal ? "duplicate" : "processed",
      order_id: order.id,
      dodo_payment_id: dodoPaymentId,
      dodo_subscription_id: dodoSubscriptionId,
      raw_payload: payload,
      http_status: 200,
    });

    return json({ received: true, status: mapped });
  } catch (e) {
    console.error("dodo-webhook error", e);
    await log({ event_type: "error", status: "error", verification_error: String(e) });
    return json({ error: "Internal error" }, 500);
  }
});
