import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, dodoBaseUrl, getDodoSettings, productFor, requireUser } from "../_shared/dodo.ts";

// Creates a Dodo Payments checkout session for an existing order.
// Credentials come from public.dodo_settings (admin managed) with env fallback.

const APP_URL_DEFAULT = "https://s1liceurl.lovable.app";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = adminClient();
    const user = await requireUser(req);
    if (!user) return json({ error: "Please sign in again before paying.", code: "UNAUTHORIZED" }, 401);

    const body = await req.json().catch(() => ({}));
    const orderId = String(body.order_id ?? "");
    const customerName = typeof body.customer_name === "string" ? body.customer_name.slice(0, 120) : "";
    if (!orderId) return json({ error: "order_id is required" }, 400);

    const { data: order } = await admin
      .from("orders")
      .select("id, order_number, user_id, plan_id, billing_cycle, total, currency, status")
      .eq("id", orderId)
      .maybeSingle();

    if (!order || order.user_id !== user.id) return json({ error: "Order not found" }, 404);
    if (order.status === "success") return json({ error: "Order already paid" }, 409);

    const { data: active } = await admin.from("subscriptions").select("plan_id, status, current_period_end")
      .eq("user_id", user.id).eq("status", "active").gte("current_period_end", new Date().toISOString())
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (active?.plan_id === order.plan_id) return json({ error: `Your ${order.plan_id} subscription is already active.`, code: "SUBSCRIPTION_ACTIVE" }, 409);

    const settings = await getDodoSettings(admin);

    const apiKey = (settings?.api_key ?? Deno.env.get("DODO_PAYMENTS_API_KEY") ?? "").trim();
    if (!settings || !apiKey) {
      return json({ error: "Payments are temporarily unavailable because the gateway is not configured.", code: "GATEWAY_NOT_CONFIGURED" }, 503);
    }

    const productId = productFor(settings, order.plan_id, order.billing_cycle);
    if (!productId) {
      const reason = `The Dodo product ID for ${order.plan_id} ${order.billing_cycle} is missing.`;
      await admin.from("dodo_webhook_logs").insert({ event_type: "checkout.configuration_failed", order_id: order.id, status: "error", verification_error: reason });
      return json({ error: reason, code: "PRODUCT_NOT_CONFIGURED", action: "Ask an administrator to add this product ID in Payments Admin." }, 422);
    }

    const env = (settings.env ?? "test").toLowerCase();
    const base = dodoBaseUrl(env);
    const appUrl = Deno.env.get("APP_URL") ?? APP_URL_DEFAULT;
    const returnUrl = `${appUrl}/checkout?plan=${order.plan_id}&cycle=${order.billing_cycle}&order=${encodeURIComponent(order.order_number)}&status=pending`;

    const payload = {
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: {
        email: user.email,
        name: customerName || user.email?.split("@")[0] || "Customer",
      },
      return_url: returnUrl.replace("status=pending", "status=verifying"),
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        user_id: order.user_id,
        plan_id: order.plan_id,
        billing_cycle: order.billing_cycle,
      },
    };

    const res = await fetch(`${base}/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `sliceurl-${order.id}-${Date.now()}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error(`Dodo checkout failed [${res.status}]: ${text}`);
      await admin.from("dodo_webhook_logs").insert({
        event_type: "checkout.create_failed",
        order_id: order.id,
        status: "error",
        http_status: res.status,
        verification_error: text.slice(0, 2000),
      });
      let providerMessage = text.slice(0, 1000);
      try {
        const failed = JSON.parse(text);
        providerMessage = failed.message ?? failed.error ?? providerMessage;
      } catch { /* retain response text */ }
      return json({ error: "Dodo could not start this payment.", reason: providerMessage, code: "DODO_CHECKOUT_FAILED", retryable: res.status >= 500 || res.status === 429 }, res.status);
    }

    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(text); } catch { /* noop */ }
    const checkoutUrl = (parsed.checkout_url ?? parsed.payment_link ?? parsed.url) as string | undefined;
    const sessionId = (parsed.session_id ?? parsed.id) as string | undefined;

    if (!checkoutUrl) {
      return json({ error: "Dodo returned an incomplete checkout session.", code: "INVALID_DODO_RESPONSE", retryable: true }, 502);
    }

    await admin
      .from("orders")
      .update({ status: "pending", dodo_session_id: sessionId ?? null })
      .eq("id", order.id);

    const { data: existingPayment } = await admin
      .from("payments")
      .select("id")
      .eq("order_id", order.id)
      .maybeSingle();

    if (existingPayment) {
      await admin
        .from("payments")
        .update({ provider: "dodo", provider_order_id: sessionId ?? null, status: "pending" })
        .eq("id", existingPayment.id);
    } else {
      await admin.from("payments").insert({
        order_id: order.id,
        user_id: order.user_id,
        provider: "dodo",
        provider_order_id: sessionId ?? null,
        amount: order.total,
        status: "pending",
      });
    }

    await admin.from("dodo_webhook_logs").insert({
      event_type: "checkout.created",
      order_id: order.id,
      status: "pending",
      http_status: res.status,
      raw_payload: parsed,
    });

    return json({ checkout_url: checkoutUrl, session_id: sessionId ?? null, env });
  } catch (e) {
    console.error("dodo-initiate error", e);
    return json({ error: "Internal error" }, 500);
  }
});
