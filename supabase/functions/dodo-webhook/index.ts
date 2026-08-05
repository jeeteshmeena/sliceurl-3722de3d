import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, getDodoSettings, processDodoEvent } from "../_shared/dodo.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = adminClient();

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

    const settings = await getDodoSettings(admin);

    const secret = (settings?.webhook_secret ?? "").trim();
    if (!secret) {
      await log({ event_type: eventType, status: "error", verification_error: "webhook_secret_not_configured", raw_payload: payload });
      return json({ error: "Webhook secret not configured" }, 500);
    }

    const valid = await verifySignature(secret, webhookId, timestamp, rawBody, signature);
    if (!valid) {
      await log({ event_type: eventType, status: "error", verification_error: "invalid_signature", raw_payload: payload });
      return json({ error: "Invalid signature" }, 401);
    }

    const { data: duplicate } = webhookId
      ? await admin.from("dodo_webhook_logs").select("id, processed_at").eq("webhook_id", webhookId).maybeSingle()
      : { data: null };
    if (duplicate?.processed_at) return json({ received: true, duplicate: true });

    const result = await processDodoEvent(admin, payload);
    const row = {
      webhook_id: webhookId || null,
      event_type: eventType,
      status: result.matched ? "processed" : result.status,
      order_id: result.orderId ?? null,
      raw_payload: payload,
      processed_at: new Date().toISOString(),
      http_status: 200,
      verification_error: result.matched || result.status === "ignored" ? null : "order_not_found",
    };
    if (duplicate) await admin.from("dodo_webhook_logs").update(row).eq("id", duplicate.id);
    else await admin.from("dodo_webhook_logs").insert(row);
    return json({ received: true, ...result });
  } catch (e) {
    console.error("dodo-webhook error", e);
    await log({ event_type: "error", status: "error", verification_error: String(e) });
    return json({ error: "Internal error" }, 500);
  }
});
