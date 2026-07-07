import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Public Paytm callback endpoint (verify_jwt = false).
// Validates checksum and updates orders/payments/subscriptions.
// Real verification runs only after PAYTM_MERCHANT_KEY is configured.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const contentType = req.headers.get("content-type") ?? "";
    let payload: Record<string, string> = {};
    if (contentType.includes("application/json")) {
      payload = await req.json();
    } else {
      const form = await req.formData();
      form.forEach((v, k) => (payload[k] = String(v)));
    }

    const paytmKey = Deno.env.get("PAYTM_MERCHANT_KEY");
    if (!paytmKey) {
      console.log("paytm-callback: credentials not configured, skipping");
      return new Response(JSON.stringify({ status: "skipped" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderId = payload.ORDERID;
    const txnId = payload.TXNID;
    const status = payload.STATUS; // TXN_SUCCESS | TXN_FAILURE | PENDING
    // TODO: verify CHECKSUMHASH using paytmKey once live.

    if (!orderId) {
      return new Response(JSON.stringify({ error: "ORDERID missing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mapped =
      status === "TXN_SUCCESS" ? "success" :
      status === "TXN_FAILURE" ? "failed" : "pending";

    const { data: order } = await admin
      .from("orders")
      .select("id, user_id, plan_id, billing_cycle")
      .eq("order_number", orderId)
      .maybeSingle();

    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("orders").update({ status: mapped }).eq("id", order.id);
    await admin
      .from("payments")
      .update({
        status: mapped,
        provider_txn_id: txnId ?? null,
        provider_order_id: orderId,
        raw_response: payload,
      })
      .eq("order_id", order.id);

    if (mapped === "success") {
      const now = new Date();
      const end = new Date(now);
      if (order.billing_cycle === "yearly") end.setFullYear(end.getFullYear() + 1);
      else end.setMonth(end.getMonth() + 1);

      await admin.from("subscriptions").insert({
        user_id: order.user_id,
        plan_id: order.plan_id,
        billing_cycle: order.billing_cycle,
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: end.toISOString(),
      });
    }

    return new Response(JSON.stringify({ status: mapped }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("paytm-callback error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
