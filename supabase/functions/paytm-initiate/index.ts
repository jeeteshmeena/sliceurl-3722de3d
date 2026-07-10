import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Paytm Initiate Transaction — generates a txnToken the frontend uses to
// launch Paytm Checkout JS. Requires PAYTM_MERCHANT_ID + PAYTM_MERCHANT_KEY
// (+ optional PAYTM_ENV, PAYTM_WEBSITE).

const PAYTM_IV = "@@@@&&&&####$$$$";

function randomSalt(len = 4): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let s = "";
  for (const b of bytes) s += chars[b % chars.length];
  return s;
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function generateChecksumForString(payload: string, merchantKey: string): Promise<string> {
  const salt = randomSalt(4);
  const hash = await sha256Hex(`${payload}|${salt}`);
  const plain = hash + salt;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(merchantKey),
    { name: "AES-CBC" },
    false,
    ["encrypt"],
  );
  const iv = new TextEncoder().encode(PAYTM_IV);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv },
    key,
    new TextEncoder().encode(plain),
  );
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
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
    const userEmail = userRes.user.email ?? "";

    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, order_number, total, status, user_id")
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
        { onConflict: "order_id", ignoreDuplicates: true },
      );

    const mid = Deno.env.get("PAYTM_MERCHANT_ID");
    const mkey = Deno.env.get("PAYTM_MERCHANT_KEY");
    if (!mid || !mkey) {
      return new Response(
        JSON.stringify({ status: "coming_soon" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const env = (Deno.env.get("PAYTM_ENV") ?? "staging").toLowerCase();
    const isProd = env === "production" || env === "prod" || env === "live";
    const website = Deno.env.get("PAYTM_WEBSITE") ?? (isProd ? "DEFAULT" : "WEBSTAGING");
    const host = isProd ? "https://securegw.paytm.in" : "https://securegw-stage.paytm.in";

    const callbackUrl = `${supabaseUrl}/functions/v1/paytm-callback`;
    const orderIdStr = order.order_number ?? order.id;
    const amountStr = Number(order.total).toFixed(2);

    const body = {
      requestType: "Payment",
      mid,
      websiteName: website,
      orderId: orderIdStr,
      callbackUrl,
      txnAmount: { value: amountStr, currency: "INR" },
      userInfo: { custId: userId, email: userEmail },
    };

    const signature = await generateChecksumForString(JSON.stringify(body), mkey);
    const initReq = { body, head: { signature } };

    const initUrl = `${host}/theia/api/v1/initiateTransaction?mid=${encodeURIComponent(mid)}&orderId=${encodeURIComponent(orderIdStr)}`;
    const resp = await fetch(initUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(initReq),
    });
    const data = await resp.json().catch(() => ({}));

    const txnToken = data?.body?.txnToken;
    const resultCode = data?.body?.resultInfo?.resultCode;
    const resultMsg = data?.body?.resultInfo?.resultMsg;

    if (!txnToken || resultCode !== "0000") {
      console.error("paytm-initiate failed", { resultCode, resultMsg, data });
      return new Response(
        JSON.stringify({ error: "Paytm initiation failed", code: resultCode, message: resultMsg }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await admin.from("orders").update({ status: "pending" }).eq("id", order.id);
    await admin
      .from("payments")
      .update({ status: "pending", provider_order_id: orderIdStr })
      .eq("order_id", order.id);

    return new Response(
      JSON.stringify({
        status: "ok",
        mid,
        orderId: orderIdStr,
        txnToken,
        amount: amountStr,
        env: isProd ? "production" : "staging",
        host,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("paytm-initiate error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
