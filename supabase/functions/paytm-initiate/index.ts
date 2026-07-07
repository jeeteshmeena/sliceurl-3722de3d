import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Paytm gateway scaffold.
// Activates automatically once PAYTM_MERCHANT_ID + PAYTM_MERCHANT_KEY are set as secrets.
// Until then, returns { status: 'coming_soon' } so the UI can show the Coming Soon modal.

function isConfigured() {
  return Boolean(
    Deno.env.get("PAYTM_MERCHANT_ID") &&
    Deno.env.get("PAYTM_MERCHANT_KEY"),
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userRes, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userRes.user.id;

    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure a payment row exists (idempotent)
    await admin
      .from("payments")
      .upsert(
        {
          order_id: order.id,
          user_id: userId,
          provider: "paytm",
          amount: order.total,
          status: "created",
        },
        { onConflict: "order_id" as unknown as string, ignoreDuplicates: true },
      );

    if (!isConfigured()) {
      // Coming Soon mode — do not attempt real payment.
      return new Response(
        JSON.stringify({ status: "coming_soon" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Live mode scaffold — future Paytm initiateTransaction call goes here.
    // Once implemented, mark order as pending and return the txnToken.
    await admin.from("orders").update({ status: "pending" }).eq("id", order.id);

    return new Response(
      JSON.stringify({
        status: "not_implemented",
        message: "Paytm credentials found but live initiation is not implemented in this build.",
      }),
      { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("paytm-initiate error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
