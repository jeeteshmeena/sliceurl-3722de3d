// Merchant API — external sites can create payment orders via SliceURL/Paytm.
// Public function (verify_jwt = false). Auth via `x-api-key` header.
//
// Routes:
//   POST /orders                — create a new payment order
//   GET  /orders/:id            — fetch order status (requires API key)
//   GET  /public/orders/:id     — public read for hosted checkout page
//
// External flow:
//   1. Client site calls POST /orders with API key + amount + customer info
//   2. Response returns { checkout_url }. Redirect the user there.
//   3. After payment, Paytm calls our paytm-callback which updates status
//      and POSTs to the client's callback_url with a signed payload.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const PAYTM_IV = "@@@@&&&&####$$$$";
const APP_URL_DEFAULT = "https://s1liceurl.lovable.app";

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomSalt(len = 4): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let s = "";
  for (const b of bytes) s += chars[b % chars.length];
  return s;
}

async function paytmChecksum(payload: string, merchantKey: string): Promise<string> {
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const appUrl = Deno.env.get("APP_URL") ?? APP_URL_DEFAULT;

  const url = new URL(req.url);
  // Strip the `/merchant-api` prefix from the pathname
  const path = url.pathname.replace(/^\/merchant-api/, "") || "/";

  try {
    // ---------- Public: hosted checkout metadata ----------
    if (req.method === "GET" && path.startsWith("/public/orders/")) {
      const id = path.split("/").pop()!;
      const { data: order } = await admin
        .from("merchant_orders")
        .select("id, order_number, amount, currency, description, customer_email, customer_name, status, txn_token, paytm_order_id, metadata")
        .eq("id", id)
        .maybeSingle();
      if (!order) return json({ error: "not_found" }, 404);

      const { data: settings } = await admin
        .from("paytm_settings")
        .select("merchant_id, env")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return json({
        id: order.id,
        order_number: order.order_number,
        amount: order.amount,
        currency: order.currency,
        description: order.description,
        customer_email: order.customer_email,
        customer_name: order.customer_name,
        status: order.status,
        txn_token: order.txn_token,
        paytm_order_id: order.paytm_order_id,
        mid: settings?.merchant_id ?? null,
        env: settings?.env ?? "staging",
      });
    }

    // ---------- Everything else requires x-api-key ----------
    const apiKey = req.headers.get("x-api-key") ?? "";
    if (!apiKey) return json({ error: "missing_api_key" }, 401);

    const keyHash = await sha256Hex(apiKey);
    const { data: keyRow } = await admin
      .from("merchant_api_keys")
      .select("id, is_active")
      .eq("key_hash", keyHash)
      .maybeSingle();

    if (!keyRow || !keyRow.is_active) return json({ error: "invalid_api_key" }, 401);
    await admin.rpc("touch_merchant_api_key", { _key_id: keyRow.id });

    // ---------- GET /orders/:id ----------
    if (req.method === "GET" && path.startsWith("/orders/")) {
      const id = path.split("/").pop()!;
      const { data: order } = await admin
        .from("merchant_orders")
        .select("id, order_number, external_order_id, amount, currency, status, paytm_order_id, paytm_txn_id, verified_at, created_at")
        .eq("id", id)
        .eq("api_key_id", keyRow.id)
        .maybeSingle();
      if (!order) return json({ error: "not_found" }, 404);
      return json(order);
    }

    // ---------- POST /orders ----------
    if (req.method === "POST" && (path === "/orders" || path === "/orders/")) {
      const body = await req.json().catch(() => ({}));
      const amount = Number(body.amount);
      if (!amount || amount <= 0 || amount > 500000) {
        return json({ error: "invalid_amount", message: "amount must be > 0 and <= 500000" }, 400);
      }

      // Load Paytm creds
      const { data: settings } = await admin
        .from("paytm_settings")
        .select("merchant_id, merchant_key, env, website, is_active")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const mid = settings?.merchant_id;
      const mkey = settings?.merchant_key;
      if (!mid || !mkey) return json({ error: "paytm_not_configured" }, 503);
      const isProd = (settings?.env || "staging").toLowerCase().startsWith("prod");
      const website = settings?.website || (isProd ? "DEFAULT" : "WEBSTAGING");
      const host = isProd ? "https://securegw.paytm.in" : "https://securegw-stage.paytm.in";

      // Create order
      const orderNumber = `MRC-${Date.now().toString(36).toUpperCase()}-${randomSalt(4)}`;
      const { data: inserted, error: insErr } = await admin
        .from("merchant_orders")
        .insert({
          api_key_id: keyRow.id,
          external_order_id: body.external_order_id ?? null,
          order_number: orderNumber,
          amount,
          currency: body.currency || "INR",
          customer_email: body.customer_email ?? null,
          customer_name: body.customer_name ?? null,
          customer_phone: body.customer_phone ?? null,
          description: body.description ?? null,
          callback_url: body.callback_url ?? null,
          return_url: body.return_url ?? null,
          metadata: body.metadata ?? null,
          status: "created",
        })
        .select("id, order_number")
        .single();
      if (insErr || !inserted) return json({ error: "insert_failed", message: insErr?.message }, 500);

      // Initiate Paytm txn to obtain txnToken
      const callbackUrl = `${supabaseUrl}/functions/v1/paytm-callback`;
      const initBody = {
        requestType: "Payment",
        mid,
        websiteName: website,
        orderId: inserted.order_number,
        callbackUrl,
        channelId: "WEB",
        txnAmount: { value: Number(amount).toFixed(2), currency: body.currency || "INR" },
        userInfo: {
          custId: inserted.id,
          email: body.customer_email ?? "",
          firstName: body.customer_name ?? "",
          mobile: body.customer_phone ?? "",
        },
      };
      const signature = await paytmChecksum(JSON.stringify(initBody), mkey);
      const initUrl = `${host}/theia/api/v1/initiateTransaction?mid=${encodeURIComponent(mid)}&orderId=${encodeURIComponent(inserted.order_number)}`;
      const paytmResp = await fetch(initUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: initBody, head: { signature } }),
      });
      const data = await paytmResp.json().catch(() => ({}));
      const txnToken = data?.body?.txnToken;
      const resultCode = data?.body?.resultInfo?.resultCode;
      const resultMsg = data?.body?.resultInfo?.resultMsg;

      if (!txnToken || resultCode !== "0000") {
        await admin
          .from("merchant_orders")
          .update({ status: "failed", raw_response: data })
          .eq("id", inserted.id);
        return json({
          error: "paytm_initiation_failed",
          code: resultCode ?? "unknown",
          message: resultMsg ?? "Paytm did not return a token",
        }, 502);
      }

      await admin
        .from("merchant_orders")
        .update({ status: "pending", paytm_order_id: inserted.order_number, txn_token: txnToken, raw_response: data })
        .eq("id", inserted.id);

      return json({
        id: inserted.id,
        order_number: inserted.order_number,
        status: "pending",
        checkout_url: `${appUrl}/pay/${inserted.id}`,
        amount,
        currency: body.currency || "INR",
        env: isProd ? "production" : "staging",
      });
    }

    return json({ error: "not_found" }, 404);
  } catch (e) {
    console.error("merchant-api error", e);
    return json({ error: "internal_error", message: String(e) }, 500);
  }
});
