import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Public Paytm callback endpoint (verify_jwt = false).
// Production-ready flow:
//  - Parses form-url-encoded or JSON payload from Paytm
//  - Verifies CHECKSUMHASH when PAYTM_MERCHANT_KEY is configured
//  - Idempotent: rejects duplicate processing for the same TXNID/order
//  - Maps Paytm STATUS to our internal payment_status
//  - Updates orders, payments, and activates subscription on success
//
// While PAYTM_MERCHANT_KEY is missing the endpoint short-circuits with
// { status: "skipped" } so the site keeps its Coming Soon behavior.

// -------- Paytm checksum (AES-128-CBC + SHA256) --------
// Ported from Paytm's official reference implementation. Runs on Deno.
async function verifyChecksum(
  params: Record<string, string>,
  checksumhash: string,
  merchantKey: string,
): Promise<boolean> {
  try {
    const keys = Object.keys(params).filter((k) => k !== "CHECKSUMHASH").sort();
    const values = keys.map((k) => (params[k] ?? "")).join("|");

    // Decrypt salt+hash from checksumhash
    const decoded = Uint8Array.from(atob(checksumhash), (c) => c.charCodeAt(0));
    const iv = new TextEncoder().encode("@@@@&&&&####$$$$");
    const keyBytes = new TextEncoder().encode(merchantKey);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "AES-CBC" },
      false,
      ["decrypt"],
    );
    const plain = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv },
      cryptoKey,
      decoded,
    );
    const decoded_text = new TextDecoder().decode(plain);
    const salt = decoded_text.slice(-4);
    const originalHash = decoded_text.slice(0, -4);

    const finalString = `${values}|${salt}`;
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(finalString),
    );
    const hashHex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const generatedHash = hashHex + salt;

    // constant-time comparison
    if (generatedHash.length !== (originalHash + salt).length) return false;
    let diff = 0;
    const a = generatedHash;
    const b = originalHash + salt;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  } catch (e) {
    console.error("checksum verify failed", e);
    return false;
  }
}

function mapStatus(paytmStatus: string): "success" | "failed" | "pending" | "cancelled" {
  switch (paytmStatus) {
    case "TXN_SUCCESS": return "success";
    case "TXN_FAILURE": return "failed";
    case "TXN_CANCELLED":
    case "CANCELLED":
      return "cancelled";
    default: return "pending";
  }
}

const APP_URL_DEFAULT = "https://s1liceurl.lovable.app";

function redirectTo(url: string) {
  return new Response(null, { status: 303, headers: { Location: url } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const appUrl = Deno.env.get("APP_URL") ?? APP_URL_DEFAULT;
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const logEvent = async (row: Record<string, unknown>) => {
    try { await admin.from("paytm_callback_logs").insert({ event_type: "callback", ...row }); }
    catch (e) { console.error("callback log insert failed", e); }
  };

  const headersObj: Record<string, string> = {};
  req.headers.forEach((v, k) => { headersObj[k] = v; });

  try {
    const contentType = req.headers.get("content-type") ?? "";
    let payload: Record<string, string> = {};
    if (contentType.includes("application/json")) {
      payload = await req.json();
    } else {
      const form = await req.formData();
      form.forEach((v, k) => (payload[k] = String(v)));
    }

    // Prefer DB-configured merchant key, fallback to env
    const { data: settings } = await admin
      .from("paytm_settings")
      .select("merchant_key")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const paytmKey = settings?.merchant_key || Deno.env.get("PAYTM_MERCHANT_KEY");

    if (!paytmKey) {
      await logEvent({ status: "error", verification_error: "credentials_missing", raw_payload: payload, raw_headers: headersObj });
      return redirectTo(`${appUrl}/checkout?status=pending`);
    }

    const orderId = payload.ORDERID;
    const txnId = payload.TXNID ?? null;
    const status = payload.STATUS ?? "";
    const checksum = payload.CHECKSUMHASH ?? "";

    if (!orderId) {
      await logEvent({ status: "error", verification_error: "missing_order_id", raw_payload: payload, raw_headers: headersObj });
      return redirectTo(`${appUrl}/checkout?status=failed&reason=missing_order`);
    }

    const checksumOk = checksum ? await verifyChecksum(payload, checksum, paytmKey) : false;
    if (!checksumOk) {
      console.warn("paytm-callback: checksum mismatch for", orderId);
      await logEvent({
        paytm_order_id: orderId,
        paytm_txn_id: txnId,
        status: "invalid_checksum",
        verification_error: "checksum_mismatch",
        raw_payload: payload,
        raw_headers: headersObj,
      });
      return redirectTo(`${appUrl}/checkout?status=failed&reason=invalid_checksum&order=${encodeURIComponent(orderId)}`);
    }

    const mapped = mapStatus(status);

    const { data: order } = await admin
      .from("orders")
      .select("id, user_id, plan_id, billing_cycle, total, status")
      .eq("order_number", orderId)
      .maybeSingle();

    if (!order) {
      // Try merchant order (external site flow)
      const { data: mOrder } = await admin
        .from("merchant_orders")
        .select("id, callback_url, return_url, status, amount, currency, external_order_id, api_key_id")
        .eq("order_number", orderId)
        .maybeSingle();

      if (mOrder) {
        const already = ["success", "failed", "cancelled"].includes(mOrder.status);
        if (!already) {
          await admin
            .from("merchant_orders")
            .update({
              status: mapped,
              paytm_txn_id: txnId,
              raw_response: payload,
              verified_at: mapped === "success" ? new Date().toISOString() : null,
            })
            .eq("id", mOrder.id);

          // Fire-and-forget webhook to client site
          if (mOrder.callback_url) {
            try {
              await fetch(mOrder.callback_url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  event: "payment.updated",
                  order_id: mOrder.id,
                  external_order_id: mOrder.external_order_id,
                  order_number: orderId,
                  status: mapped,
                  paytm_txn_id: txnId,
                  amount: mOrder.amount,
                  currency: mOrder.currency,
                }),
              });
            } catch (e) { console.error("client webhook failed", e); }
          }
        }

        await logEvent({
          paytm_order_id: orderId,
          paytm_txn_id: txnId,
          status: already ? "duplicate" : "verified",
          payment_status: mapped,
          raw_payload: payload,
          raw_headers: headersObj,
        });

        const dest = mOrder.return_url
          ? `${mOrder.return_url}${mOrder.return_url.includes("?") ? "&" : "?"}status=${mapped}&order=${encodeURIComponent(orderId)}`
          : `${appUrl}/pay/${mOrder.id}?status=${mapped}`;
        return redirectTo(dest);
      }

      await logEvent({
        paytm_order_id: orderId,
        paytm_txn_id: txnId,
        status: "error",
        verification_error: "order_not_found",
        payment_status: mapped,
        raw_payload: payload,
      });
      return redirectTo(`${appUrl}/checkout?status=failed&reason=order_not_found`);
    }


    // Idempotency
    let alreadyProcessed = false;
    if (txnId) {
      const { data: existingPayment } = await admin
        .from("payments")
        .select("id, status")
        .eq("provider_txn_id", txnId)
        .maybeSingle();
      if (existingPayment && ["success", "failed", "cancelled"].includes(existingPayment.status)) {
        alreadyProcessed = true;
      }
    }
    if (["success", "cancelled"].includes(order.status)) alreadyProcessed = true;

    if (!alreadyProcessed) {
      await admin.from("orders").update({ status: mapped }).eq("id", order.id);
      await admin
        .from("payments")
        .update({
          status: mapped,
          provider_txn_id: txnId,
          provider_order_id: orderId,
          raw_response: payload,
        })
        .eq("order_id", order.id);

      if (mapped === "success") {
        const { data: existingSub } = await admin
          .from("subscriptions")
          .select("id")
          .eq("user_id", order.user_id)
          .eq("plan_id", order.plan_id)
          .eq("status", "active")
          .gte("current_period_end", new Date().toISOString())
          .maybeSingle();

        if (!existingSub) {
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
      }
    }

    await logEvent({
      paytm_order_id: orderId,
      paytm_txn_id: txnId,
      status: alreadyProcessed ? "duplicate" : "verified",
      payment_status: mapped,
      raw_payload: payload,
      raw_headers: headersObj,
    });

    return redirectTo(`${appUrl}/checkout?status=${mapped}&order=${encodeURIComponent(orderId)}`);
  } catch (e) {
    console.error("paytm-callback error", e);
    await logEvent({ status: "error", verification_error: String(e), raw_headers: headersObj });
    return redirectTo(`${appUrl}/checkout?status=failed&reason=internal_error`);
  }
});


