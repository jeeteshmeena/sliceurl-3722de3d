import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Keep plan config in sync with src/config/plans.ts
const GST_RATE = 0; // No GST
const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  pro: { monthly: 199, yearly: 1990 },
  business: { monthly: 499, yearly: 4990 },
};

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

    const body = await req.json();
    const planId = String(body.plan_id ?? "");
    const cycle = String(body.billing_cycle ?? "");

    if (!PLAN_PRICES[planId]) {
      return new Response(JSON.stringify({ error: "Invalid plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (cycle !== "monthly" && cycle !== "yearly") {
      return new Response(JSON.stringify({ error: "Invalid billing cycle" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Duplicate guard: reject if a pending order for the same plan was created in the last 5 minutes
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: existing } = await admin
      .from("orders")
      .select("id, status, created_at")
      .eq("user_id", userId)
      .eq("plan_id", planId)
      .in("status", ["created", "pending"])
      .gte("created_at", fiveMinAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ order_id: existing.id, reused: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const amount = PLAN_PRICES[planId][cycle as "monthly" | "yearly"];
    const tax = Math.round(amount * GST_RATE * 100) / 100;
    const total = Math.round((amount + tax) * 100) / 100;

    const { data: inserted, error: insertErr } = await admin
      .from("orders")
      .insert({
        user_id: userId,
        plan_id: planId,
        billing_cycle: cycle,
        amount,
        tax,
        total,
        currency: "INR",
        status: "created",
      })
      .select("id, order_number, total")
      .single();

    if (insertErr || !inserted) {
      console.error("Order insert failed", insertErr);
      return new Response(JSON.stringify({ error: "Failed to create order" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        order_id: inserted.id,
        order_number: inserted.order_number,
        total: inserted.total,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("create-order error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
