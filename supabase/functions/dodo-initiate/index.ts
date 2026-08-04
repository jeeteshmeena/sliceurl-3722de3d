import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Creates a Dodo Payments checkout session for an existing order.
// Credentials come from public.dodo_settings (admin managed) with env fallback.

const APP_URL_DEFAULT = "https://s1liceurl.lovable.app";

type Settings = {
  api_key: string | null;
  env: string;
  product_pro_monthly: string | null;
  product_pro_yearly: string | null;
  product_business_monthly: string | null;
  product_business_yearly: string | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function productFor(s: Settings, planId: string, cycle: string): string | null {
  const key = `product_${planId}_${cycle}` as keyof Settings;
  const value = s[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userRes, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userRes.user) return json({ error: "Unauthorized" }, 401);
    const user = userRes.user;

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

    const { data: settings } = await admin
      .from("dodo_settings")
      .select("api_key, env, product_pro_monthly, product_pro_yearly, product_business_monthly, product_business_yearly")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const apiKey = (settings?.api_key ?? Deno.env.get("DODO_PAYMENTS_API_KEY") ?? "").trim();
    if (!settings || !apiKey) {
      return json({ status: "coming_soon", message: "Dodo Payments is not configured yet." }, 200);
    }

    const productId = productFor(settings as Settings, order.plan_id, order.billing_cycle);
    if (!productId) {
      return json(
        { error: `No Dodo product ID configured for ${order.plan_id} / ${order.billing_cycle}.` },
        400,
      );
    }

    const env = (settings.env ?? "test").toLowerCase();
    const base = env === "live" ? "https://live.dodopayments.com" : "https://test.dodopayments.com";
    const appUrl = Deno.env.get("APP_URL") ?? APP_URL_DEFAULT;
    const returnUrl = `${appUrl}/checkout?plan=${order.plan_id}&cycle=${order.billing_cycle}&order=${encodeURIComponent(order.order_number)}&status=pending`;

    const payload = {
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: {
        email: user.email,
        name: customerName || user.email?.split("@")[0] || "Customer",
      },
      return_url: returnUrl,
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
      return json({ error: "Payment initiation failed", status: res.status, details: text }, res.status);
    }

    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(text); } catch { /* noop */ }
    const checkoutUrl = (parsed.checkout_url ?? parsed.payment_link ?? parsed.url) as string | undefined;
    const sessionId = (parsed.session_id ?? parsed.payment_id ?? parsed.subscription_id) as string | undefined;

    if (!checkoutUrl) {
      return json({ error: "Dodo did not return a checkout URL", details: text }, 502);
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
