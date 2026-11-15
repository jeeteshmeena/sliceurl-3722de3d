// Ported payment functions:
//   create-order, paytm-initiate, paytm-callback, paytm-verify,
//   dodo-initiate, dodo-status, dodo-webhook, dodo-reconcile, dodo-admin
import type { Context } from "hono";
import type { AppEnv, Env } from "../../env";
import { activePaytmSettings, paytmChecksum, paytmHost, verifyPaytmChecksum } from "../../lib/paytm";
import { nowIso } from "../../lib/schema";

type C = Context<AppEnv>;
type Row = Record<string, any>;

const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  pro: { monthly: 199, yearly: 1990 },
  business: { monthly: 499, yearly: 4990 },
};
const GST_RATE = 0;
const siteOrigin = (env: Env) => new URL(env.SITE_URL).origin;

function periodEnd(cycle: string, from = new Date()) {
  const end = new Date(from);
  if (cycle === "yearly") end.setUTCFullYear(end.getUTCFullYear() + 1);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  return end;
}

async function activeSubscription(env: Env, userId: string) {
  return env.DB.prepare(
    `SELECT id, plan_id, status, current_period_end FROM subscriptions WHERE user_id = ? AND status = 'active' AND current_period_end >= ? ORDER BY created_at DESC LIMIT 1`,
  ).bind(userId, nowIso()).first<Row>();
}

/** payments has one row per order; insert or update it. */
async function upsertPayment(env: Env, orderId: string, insert: Row, update: Row) {
  const existing = await env.DB.prepare(`SELECT id FROM payments WHERE order_id = ?`).bind(orderId).first<{ id: string }>();
  const now = nowIso();
  if (existing) {
    const keys = Object.keys(update);
    if (!keys.length) return;
    await env.DB.prepare(`UPDATE payments SET ${keys.map((k) => `"${k}" = ?`).join(", ")}, updated_at = ? WHERE id = ?`)
      .bind(...keys.map((k) => (update[k] !== null && typeof update[k] === "object" ? JSON.stringify(update[k]) : update[k])), now, existing.id).run();
  } else {
    const row: Row = { id: crypto.randomUUID(), order_id: orderId, ...insert, ...update };
    const keys = Object.keys(row);
    await env.DB.prepare(`INSERT INTO payments (${keys.map((k) => `"${k}"`).join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`)
      .bind(...keys.map((k) => (row[k] !== null && typeof row[k] === "object" ? JSON.stringify(row[k]) : row[k]))).run();
  }
}

// ================================================================== create-order
export async function createOrder(c: C) {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json<Row>().catch(() => ({} as Row));
  const planId = String(body.plan_id ?? "");
  const cycle = String(body.billing_cycle ?? "");
  if (!PLAN_PRICES[planId]) return c.json({ error: "Invalid plan" }, 400);
  if (cycle !== "monthly" && cycle !== "yearly") return c.json({ error: "Invalid billing cycle" }, 400);

  const active = await activeSubscription(c.env, user.id);
  if (active?.plan_id === planId) return c.json({ error: `Your ${planId} subscription is already active.`, code: "SUBSCRIPTION_ACTIVE" }, 409);

  // reuse an order made in the last 5 minutes (double clicks); must match the cycle too
  const recent = await c.env.DB.prepare(
    `SELECT id FROM orders WHERE user_id = ? AND plan_id = ? AND billing_cycle = ? AND status IN ('created','pending') AND created_at >= ? ORDER BY created_at DESC LIMIT 1`,
  ).bind(user.id, planId, cycle, new Date(Date.now() - 5 * 60_000).toISOString()).first<{ id: string }>();
  if (recent) return c.json({ order_id: recent.id, reused: true });

  const amount = PLAN_PRICES[planId][cycle];
  const tax = Math.round(amount * GST_RATE * 100) / 100;
  const total = Math.round((amount + tax) * 100) / 100;
  const id = crypto.randomUUID();
  const order = await c.env.DB.prepare(
    `INSERT INTO orders (id, user_id, plan_id, billing_cycle, amount, tax, total, currency, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'INR', 'created') RETURNING order_number, total`,
  ).bind(id, user.id, planId, cycle, amount, tax, total).first<{ order_number: string; total: number }>();
  return c.json({ order_id: id, order_number: order!.order_number, total: order!.total });
}

// ================================================================== Paytm
async function paytmLog(env: Env, event: string, row: Row) {
  try {
    const r: Row = { id: crypto.randomUUID(), event_type: event, ...row };
    for (const k of ["raw_payload", "raw_headers"]) if (r[k] && typeof r[k] === "object") r[k] = JSON.stringify(r[k]);
    const keys = Object.keys(r);
    await env.DB.prepare(`INSERT INTO paytm_callback_logs (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`).bind(...keys.map((k) => r[k] ?? null)).run();
  } catch (e) { console.error("[paytm] log failed", e); }
}

export async function paytmInitiate(c: C) {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { order_id } = await c.req.json<Row>().catch(() => ({} as Row));
    if (!order_id) return c.json({ error: "order_id required" }, 400);
    const order = await c.env.DB.prepare(`SELECT id, order_number, total, status FROM orders WHERE id = ? AND user_id = ?`).bind(order_id, user.id).first<Row>();
    if (!order) return c.json({ error: "Order not found" }, 404);
    if (order.status === "success") return c.json({ error: "Order already paid" }, 409);

    await upsertPayment(c.env, order.id, { user_id: user.id, provider: "paytm", amount: order.total, status: "created" }, {});
    const s = await activePaytmSettings(c.env);
    if (!s?.merchant_id || !s.merchant_key) {
      await paytmLog(c.env, "initiate", { paytm_order_id: order.order_number, status: "error", verification_error: "credentials_missing" });
      return c.json({ status: "coming_soon", message: "Paytm credentials not configured" });
    }
    const { isProd, host } = paytmHost(s);
    const website = s.website || (isProd ? "DEFAULT" : "WEBSTAGING");
    const orderIdStr: string = order.order_number;
    const amountStr = Number(order.total).toFixed(2);
    const body = {
      requestType: "Payment", mid: s.merchant_id, websiteName: website, orderId: orderIdStr,
      callbackUrl: `${new URL(c.req.url).origin}/functions/v1/paytm-callback`,
      channelId: "WEB", txnAmount: { value: amountStr, currency: "INR" }, userInfo: { custId: user.id, email: user.email },
    };
    const signature = await paytmChecksum(JSON.stringify(body), s.merchant_key);
    const resp = await fetch(`${host}/theia/api/v1/initiateTransaction?mid=${encodeURIComponent(s.merchant_id)}&orderId=${encodeURIComponent(orderIdStr)}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, head: { signature } }),
    });
    const data = await resp.json<Row>().catch(() => ({} as Row));
    const txnToken = data?.body?.txnToken;
    const resultCode = data?.body?.resultInfo?.resultCode;
    const resultMsg = data?.body?.resultInfo?.resultMsg;
    if (!txnToken || resultCode !== "0000") {
      await paytmLog(c.env, "initiate", { paytm_order_id: orderIdStr, status: "error", verification_error: `paytm_${resultCode}: ${resultMsg}`, http_status: resp.status, raw_payload: data });
      return c.json({ error: "Paytm initiation failed", code: resultCode ?? "unknown", message: resultMsg ?? "Paytm did not return a token. Check MID/Key/Website/Environment in Admin > Paytm." }, 502);
    }
    const now = nowIso();
    await c.env.DB.batch([
      c.env.DB.prepare(`UPDATE orders SET status = 'pending', updated_at = ? WHERE id = ?`).bind(now, order.id),
      c.env.DB.prepare(`UPDATE payments SET status = 'pending', provider_order_id = ?, updated_at = ? WHERE order_id = ?`).bind(orderIdStr, now, order.id),
    ]);
    await paytmLog(c.env, "initiate", { paytm_order_id: orderIdStr, status: "pending", payment_status: "pending", http_status: resp.status, raw_payload: { resultCode, resultMsg, env: isProd ? "production" : "staging" } });
    return c.json({ status: "ok", mid: s.merchant_id, orderId: orderIdStr, txnToken, amount: amountStr, env: isProd ? "production" : "staging", host });
  } catch (e) {
    await paytmLog(c.env, "initiate", { status: "error", verification_error: String(e) });
    return c.json({ error: "Internal error" }, 500);
  }
}

function mapPaytmStatus(s: string): "success" | "failed" | "pending" | "cancelled" {
  if (s === "TXN_SUCCESS") return "success";
  if (s === "TXN_FAILURE") return "failed";
  if (s === "TXN_CANCELLED" || s === "CANCELLED") return "cancelled";
  return "pending";
}
const amountsMatch = (paid: unknown, expected: unknown) => Math.abs(Number(paid) - Number(expected)) < 0.005;

/** Paytm posts the browser here after payment (form POST), then we redirect back to the site. */
export async function paytmCallback(c: C) {
  const site = siteOrigin(c.env);
  const go = (url: string) => c.redirect(url, 303);
  const headersObj: Record<string, string> = {};
  c.req.raw.headers.forEach((v, k) => { if (!/cookie|authorization/i.test(k)) headersObj[k] = v; });
  try {
    let p: Record<string, string> = {};
    if ((c.req.header("content-type") ?? "").includes("application/json")) p = await c.req.json();
    else (await c.req.formData()).forEach((v, k) => { p[k] = String(v); });

    const s = await activePaytmSettings(c.env);
    if (!s?.merchant_key) {
      await paytmLog(c.env, "callback", { status: "error", verification_error: "credentials_missing", raw_payload: p, raw_headers: headersObj });
      return go(`${site}/checkout?status=pending`);
    }
    const orderId = p.ORDERID;
    const txnId = p.TXNID ?? null;
    if (!orderId) {
      await paytmLog(c.env, "callback", { status: "error", verification_error: "missing_order_id", raw_payload: p, raw_headers: headersObj });
      return go(`${site}/checkout?status=failed&reason=missing_order`);
    }
    // Paytm signs all params except CHECKSUMHASH, sorted by key, joined by "|"
    const signed = Object.keys(p).filter((k) => k !== "CHECKSUMHASH").sort().map((k) => p[k] ?? "").join("|");
    if (!p.CHECKSUMHASH || !(await verifyPaytmChecksum(signed, s.merchant_key, p.CHECKSUMHASH))) {
      await paytmLog(c.env, "callback", { paytm_order_id: orderId, paytm_txn_id: txnId, status: "invalid_checksum", verification_error: "checksum_mismatch", raw_payload: p, raw_headers: headersObj });
      return go(`${site}/checkout?status=failed&reason=invalid_checksum&order=${encodeURIComponent(orderId)}`);
    }
    let mapped = mapPaytmStatus(p.STATUS ?? "");
    const db = c.env.DB;
    const now = nowIso();

    const order = await db.prepare(`SELECT id, user_id, plan_id, billing_cycle, total, status FROM orders WHERE order_number = ?`).bind(orderId).first<Row>();
    if (!order) {
      // merchant (hosted checkout) order?
      const m = await db.prepare(`SELECT id, callback_url, return_url, status, amount, currency, external_order_id FROM merchant_orders WHERE order_number = ?`).bind(orderId).first<Row>();
      if (!m) {
        await paytmLog(c.env, "callback", { paytm_order_id: orderId, paytm_txn_id: txnId, status: "error", verification_error: "order_not_found", payment_status: mapped, raw_payload: p });
        return go(`${site}/checkout?status=failed&reason=order_not_found`);
      }
      // SECURITY: a success must be for the full order amount
      if (mapped === "success" && !amountsMatch(p.TXNAMOUNT, m.amount)) mapped = "failed";
      const already = ["success", "failed", "cancelled"].includes(m.status);
      if (!already) {
        await db.prepare(`UPDATE merchant_orders SET status = ?, paytm_txn_id = ?, raw_response = ?, verified_at = ?, updated_at = ? WHERE id = ?`)
          .bind(mapped, txnId, JSON.stringify(p), mapped === "success" ? now : null, now, m.id).run();
        if (m.callback_url) {
          c.executionCtx.waitUntil(fetch(m.callback_url, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: "payment.updated", order_id: m.id, external_order_id: m.external_order_id, order_number: orderId, status: mapped, paytm_txn_id: txnId, amount: m.amount, currency: m.currency }),
            signal: AbortSignal.timeout(10_000),
          }).catch(() => undefined));
        }
      }
      await paytmLog(c.env, "callback", { paytm_order_id: orderId, paytm_txn_id: txnId, status: already ? "duplicate" : "verified", payment_status: mapped, raw_payload: p, raw_headers: headersObj });
      const dest = m.return_url
        ? `${m.return_url}${m.return_url.includes("?") ? "&" : "?"}status=${mapped}&order=${encodeURIComponent(orderId)}`
        : `${site}/pay/${m.id}?status=${mapped}`;
      return go(dest);
    }

    if (mapped === "success" && !amountsMatch(p.TXNAMOUNT, order.total)) {
      await paytmLog(c.env, "callback", { paytm_order_id: orderId, paytm_txn_id: txnId, status: "error", verification_error: `amount_mismatch: paid ${p.TXNAMOUNT}, expected ${order.total}`, raw_payload: p });
      mapped = "failed";
    }

    let already = ["success", "cancelled"].includes(order.status);
    if (txnId) {
      const pay = await db.prepare(`SELECT status FROM payments WHERE provider_txn_id = ?`).bind(txnId).first<{ status: string }>();
      if (pay && ["success", "failed", "cancelled"].includes(pay.status)) already = true;
    }
    if (!already) {
      const stmts = [
        db.prepare(`UPDATE orders SET status = ?, updated_at = ? WHERE id = ?`).bind(mapped, now, order.id),
        db.prepare(`UPDATE payments SET status = ?, provider_txn_id = ?, provider_order_id = ?, raw_response = ?, updated_at = ? WHERE order_id = ?`)
          .bind(mapped, txnId, orderId, JSON.stringify(p), now, order.id),
      ];
      if (mapped === "success" && !(await db.prepare(
        `SELECT 1 FROM subscriptions WHERE user_id = ? AND plan_id = ? AND status = 'active' AND current_period_end >= ?`,
      ).bind(order.user_id, order.plan_id, now).first())) {
        stmts.push(db.prepare(
          `INSERT INTO subscriptions (id, user_id, plan_id, billing_cycle, status, current_period_start, current_period_end) VALUES (?, ?, ?, ?, 'active', ?, ?)`,
        ).bind(crypto.randomUUID(), order.user_id, order.plan_id, order.billing_cycle, now, periodEnd(order.billing_cycle).toISOString()));
      }
      await db.batch(stmts);
    }
    await paytmLog(c.env, "callback", { paytm_order_id: orderId, paytm_txn_id: txnId, status: already ? "duplicate" : "verified", payment_status: mapped, raw_payload: p, raw_headers: headersObj });
    return go(`${site}/checkout?status=${mapped}&order=${encodeURIComponent(orderId)}`);
  } catch (e) {
    await paytmLog(c.env, "callback", { status: "error", verification_error: String(e), raw_headers: headersObj });
    return go(`${site}/checkout?status=failed&reason=internal_error`);
  }
}

export async function paytmVerify(c: C) {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const { order_id } = await c.req.json<Row>().catch(() => ({} as Row));
  const o = await c.env.DB.prepare(`SELECT id, status, total, plan_id, billing_cycle FROM orders WHERE id = ? AND user_id = ?`).bind(order_id ?? "", user.id).first();
  return o ? c.json(o) : c.json({ error: "Order not found" }, 404);
}

// ================================================================== Dodo
type DodoSettings = {
  api_key: string | null; webhook_secret: string | null; env: string; reconciliation_token: string | null;
  product_pro_monthly: string | null; product_pro_yearly: string | null; product_business_monthly: string | null; product_business_yearly: string | null;
};
const dodoBase = (env: string) => (env === "live" ? "https://live.dodopayments.com" : "https://test.dodopayments.com");
const dodoSettings = (env: Env) =>
  env.DB.prepare(`SELECT * FROM dodo_settings WHERE is_active = 1 ORDER BY updated_at DESC LIMIT 1`).first<DodoSettings>();

async function dodoLog(env: Env, row: Row) {
  try {
    const r: Row = { id: crypto.randomUUID(), ...row };
    if (r.raw_payload && typeof r.raw_payload === "object") r.raw_payload = JSON.stringify(r.raw_payload);
    const keys = Object.keys(r);
    await env.DB.prepare(`INSERT INTO dodo_webhook_logs (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`).bind(...keys.map((k) => r[k] ?? null)).run();
  } catch (e) { console.error("[dodo] log failed", e); }
}

const SUCCESS = new Set(["payment.succeeded", "subscription.active", "subscription.renewed"]);
const FAILED = new Set(["payment.failed", "subscription.failed"]);
const CANCELLED = new Set(["subscription.cancelled", "payment.cancelled"]);
const PENDING = new Set(["payment.processing", "subscription.on_hold", "subscription.pending"]);

/** Port of _shared/dodo.ts processDodoEvent. */
export async function processDodoEvent(env: Env, payload: Row): Promise<{ matched: boolean; status: string; orderId?: string }> {
  const type = String(payload.type ?? "unknown");
  const data: Row = payload.data && typeof payload.data === "object" ? payload.data : {};
  const meta: Row = data.metadata && typeof data.metadata === "object" ? data.metadata : {};
  const paymentId = typeof data.payment_id === "string" ? data.payment_id : typeof data.id === "string" && data.payload_type === "Payment" ? data.id : null;
  const subscriptionId = typeof data.subscription_id === "string" ? data.subscription_id : typeof data.id === "string" && data.payload_type === "Subscription" ? data.id : null;
  const mapped = SUCCESS.has(type) ? "success" : FAILED.has(type) ? "failed" : CANCELLED.has(type) ? "cancelled" : PENDING.has(type) ? "pending" : "ignored";
  if (mapped === "ignored") return { matched: false, status: mapped };

  const db = env.DB;
  let order: Row | null = null;
  if (typeof meta.order_id === "string") order = await db.prepare(`SELECT * FROM orders WHERE id = ?`).bind(meta.order_id).first<Row>();
  if (!order) {
    for (const ref of [data.checkout_session_id, data.session_id, subscriptionId, paymentId].filter((v): v is string => typeof v === "string")) {
      order = await db.prepare(`SELECT * FROM orders WHERE dodo_session_id = ? OR dodo_payment_id = ? LIMIT 1`).bind(ref, ref).first<Row>();
      if (order) break;
    }
  }
  if (!order) return { matched: false, status: mapped };

  const now = nowIso();
  await db.prepare(`UPDATE orders SET status = ?, dodo_payment_id = COALESCE(?, dodo_payment_id), updated_at = ? WHERE id = ?`).bind(mapped, paymentId, now, order.id).run();
  await upsertPayment(env, order.id, { user_id: order.user_id, amount: order.total },
    { provider: "dodo", provider_txn_id: paymentId, provider_order_id: subscriptionId, status: mapped, raw_response: payload });

  if (mapped === "success") {
    const end = typeof data.next_billing_date === "string" ? new Date(data.next_billing_date) : periodEnd(order.billing_cycle);
    const current = await db.prepare(`SELECT id FROM subscriptions WHERE user_id = ? AND status IN ('active','pending') ORDER BY created_at DESC LIMIT 1`).bind(order.user_id).first<{ id: string }>();
    if (current) {
      await db.prepare(`UPDATE subscriptions SET plan_id = ?, billing_cycle = ?, status = 'active', current_period_start = ?, current_period_end = ?, cancel_at_period_end = 0, dodo_subscription_id = ?, updated_at = ? WHERE id = ?`)
        .bind(order.plan_id, order.billing_cycle, now, end.toISOString(), subscriptionId, now, current.id).run();
    } else {
      await db.prepare(`INSERT INTO subscriptions (id, user_id, plan_id, billing_cycle, status, current_period_start, current_period_end, cancel_at_period_end, dodo_subscription_id) VALUES (?, ?, ?, ?, 'active', ?, ?, 0, ?)`)
        .bind(crypto.randomUUID(), order.user_id, order.plan_id, order.billing_cycle, now, end.toISOString(), subscriptionId).run();
    }
  } else if (mapped === "cancelled" && subscriptionId) {
    await db.prepare(`UPDATE subscriptions SET status = 'cancelled', cancel_at_period_end = 1, updated_at = ? WHERE dodo_subscription_id = ?`).bind(now, subscriptionId).run();
  }
  return { matched: true, status: mapped, orderId: order.id };
}

export async function dodoInitiate(c: C) {
  const user = c.get("user");
  if (!user) return c.json({ error: "Please sign in again before paying.", code: "UNAUTHORIZED" }, 401);
  try {
    const body = await c.req.json<Row>().catch(() => ({} as Row));
    const orderId = String(body.order_id ?? "");
    const customerName = typeof body.customer_name === "string" ? body.customer_name.slice(0, 120) : "";
    if (!orderId) return c.json({ error: "order_id is required" }, 400);
    const db = c.env.DB;
    const order = await db.prepare(`SELECT * FROM orders WHERE id = ?`).bind(orderId).first<Row>();
    if (!order || order.user_id !== user.id) return c.json({ error: "Order not found" }, 404);
    if (order.status === "success") return c.json({ error: "Order already paid" }, 409);
    const active = await activeSubscription(c.env, user.id);
    if (active?.plan_id === order.plan_id) return c.json({ error: `Your ${order.plan_id} subscription is already active.`, code: "SUBSCRIPTION_ACTIVE" }, 409);

    const s = await dodoSettings(c.env);
    const apiKey = (s?.api_key ?? "").trim();
    if (!s || !apiKey) return c.json({ error: "Payments are temporarily unavailable because the gateway is not configured.", code: "GATEWAY_NOT_CONFIGURED" }, 503);
    const productId = (s[`product_${order.plan_id}_${order.billing_cycle}` as keyof DodoSettings] as string | null)?.trim();
    if (!productId) {
      const reason = `The Dodo product ID for ${order.plan_id} ${order.billing_cycle} is missing.`;
      await dodoLog(c.env, { event_type: "checkout.configuration_failed", order_id: order.id, status: "error", verification_error: reason });
      return c.json({ error: reason, code: "PRODUCT_NOT_CONFIGURED", action: "Ask an administrator to add this product ID in Payments Admin." }, 422);
    }
    const env = (s.env ?? "test").toLowerCase();
    const returnUrl = `${siteOrigin(c.env)}/checkout?plan=${order.plan_id}&cycle=${order.billing_cycle}&order=${encodeURIComponent(order.order_number)}&status=verifying`;
    const res = await fetch(`${dodoBase(env)}/checkouts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `sliceurl-${order.id}-${Date.now()}` },
      body: JSON.stringify({
        product_cart: [{ product_id: productId, quantity: 1 }],
        customer: { email: user.email, name: customerName || user.email.split("@")[0] || "Customer" },
        return_url: returnUrl,
        metadata: { order_id: order.id, order_number: order.order_number, user_id: order.user_id, plan_id: order.plan_id, billing_cycle: order.billing_cycle },
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      await dodoLog(c.env, { event_type: "checkout.create_failed", order_id: order.id, status: "error", http_status: res.status, verification_error: text.slice(0, 2000) });
      let reason = text.slice(0, 1000);
      try { const f = JSON.parse(text); reason = f.message ?? f.error ?? reason; } catch { /* keep text */ }
      return c.json({ error: "Dodo could not start this payment.", reason, code: "DODO_CHECKOUT_FAILED", retryable: res.status >= 500 || res.status === 429 }, res.status as 400);
    }
    let parsed: Row = {};
    try { parsed = JSON.parse(text); } catch { /* noop */ }
    const checkoutUrl = parsed.checkout_url ?? parsed.payment_link ?? parsed.url;
    const sessionId = parsed.session_id ?? parsed.id ?? null;
    if (!checkoutUrl) return c.json({ error: "Dodo returned an incomplete checkout session.", code: "INVALID_DODO_RESPONSE", retryable: true }, 502);

    await db.prepare(`UPDATE orders SET status = 'pending', dodo_session_id = ?, updated_at = ? WHERE id = ?`).bind(sessionId, nowIso(), order.id).run();
    await upsertPayment(c.env, order.id, { user_id: order.user_id, amount: order.total }, { provider: "dodo", provider_order_id: sessionId, status: "pending" });
    await dodoLog(c.env, { event_type: "checkout.created", order_id: order.id, status: "pending", http_status: res.status, raw_payload: parsed });
    return c.json({ checkout_url: checkoutUrl, session_id: sessionId, env });
  } catch (e) {
    console.error("[dodo-initiate]", e);
    return c.json({ error: "Internal error" }, 500);
  }
}

export async function dodoStatus(c: C) {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json<Row>().catch(() => ({} as Row));
  if (typeof body.order !== "string") return c.json({ error: "Order is required" }, 400);
  const order = await c.env.DB.prepare(`SELECT id, order_number, plan_id, billing_cycle, status, updated_at FROM orders WHERE order_number = ? AND user_id = ?`)
    .bind(body.order, user.id).first<Row>();
  if (!order) return c.json({ error: "Order not found" }, 404);
  const sub = await c.env.DB.prepare(`SELECT plan_id, status, current_period_end FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`)
    .bind(user.id).first<Row>();
  return c.json({ verified: order.status === "success" && sub?.status === "active", order_status: order.status, subscription: sub ?? null, order });
}

// Standard Webhooks signature: base64(HMAC-SHA256(secret, `${id}.${timestamp}.${body}`))
async function verifyDodoSignature(secret: string, id: string, ts: string, body: string, header: string): Promise<boolean> {
  try {
    const keyBytes = secret.startsWith("whsec_") ? Uint8Array.from(atob(secret.slice(6)), (ch) => ch.charCodeAt(0)) : new TextEncoder().encode(secret);
    const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const expected = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${body}`)))));
    return header.split(" ").map((p) => p.split(",").pop() ?? "").some((sig) => {
      if (!sig || sig.length !== expected.length) return false;
      let d = 0;
      for (let i = 0; i < sig.length; i++) d |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
      return d === 0;
    });
  } catch { return false; }
}

export async function dodoWebhook(c: C) {
  try {
    const raw = await c.req.text();
    const webhookId = c.req.header("webhook-id") ?? "";
    const ts = c.req.header("webhook-timestamp") ?? "";
    const sig = c.req.header("webhook-signature") ?? "";
    let payload: Row = {};
    try { payload = JSON.parse(raw); } catch { /* noop */ }
    const eventType = String(payload.type ?? payload.event_type ?? "unknown");

    const s = await dodoSettings(c.env);
    const secret = (s?.webhook_secret ?? "").trim();
    if (!secret) {
      await dodoLog(c.env, { event_type: eventType, status: "error", verification_error: "webhook_secret_not_configured", raw_payload: payload });
      return c.json({ error: "Webhook secret not configured" }, 500);
    }
    if (!(await verifyDodoSignature(secret, webhookId, ts, raw, sig))) {
      await dodoLog(c.env, { event_type: eventType, status: "error", verification_error: "invalid_signature", raw_payload: payload });
      return c.json({ error: "Invalid signature" }, 401);
    }
    // SECURITY FIX: reject old (replayed) deliveries, as the Standard Webhooks spec requires
    if (!/^\d+$/.test(ts) || Math.abs(Date.now() / 1000 - Number(ts)) > 5 * 60) {
      await dodoLog(c.env, { event_type: eventType, status: "error", verification_error: "timestamp_out_of_tolerance", raw_payload: payload });
      return c.json({ error: "Webhook timestamp too old" }, 401);
    }

    const dup = webhookId ? await c.env.DB.prepare(`SELECT id, processed_at FROM dodo_webhook_logs WHERE webhook_id = ?`).bind(webhookId).first<Row>() : null;
    if (dup?.processed_at) return c.json({ received: true, duplicate: true });

    const result = await processDodoEvent(c.env, payload);
    const row = {
      webhook_id: webhookId || null, event_type: eventType, status: result.matched ? "processed" : result.status,
      order_id: result.orderId ?? null, raw_payload: JSON.stringify(payload), processed_at: nowIso(), http_status: 200,
      verification_error: result.matched || result.status === "ignored" ? null : "order_not_found",
    };
    if (dup) {
      const keys = Object.keys(row) as (keyof typeof row)[];
      await c.env.DB.prepare(`UPDATE dodo_webhook_logs SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`).bind(...keys.map((k) => row[k]), dup.id).run();
    } else await dodoLog(c.env, row);
    return c.json({ received: true, ...result });
  } catch (e) {
    await dodoLog(c.env, { event_type: "error", status: "error", verification_error: String(e) });
    return c.json({ error: "Internal error" }, 500);
  }
}

/** Polls Dodo for pending checkouts. Called by admins, by token, and by the Worker cron. */
export async function reconcileDodo(env: Env) {
  const s = await dodoSettings(env);
  if (!s?.api_key) return null;
  const { results } = await env.DB.prepare(`SELECT id, dodo_session_id FROM orders WHERE status = 'pending' AND dodo_session_id IS NOT NULL ORDER BY created_at ASC LIMIT 50`).all<Row>();
  let checked = 0, updated = 0, failed = 0;
  for (const order of results) {
    checked++;
    try {
      const res = await fetch(`${dodoBase(s.env)}/checkouts/${encodeURIComponent(order.dodo_session_id)}`, { headers: { Authorization: `Bearer ${s.api_key}` } });
      const text = await res.text();
      if (!res.ok) throw new Error(`[${res.status}] ${text.slice(0, 500)}`);
      const session = JSON.parse(text) as Row;
      const st = String(session.status ?? "pending").toLowerCase();
      const ok = ["succeeded", "success", "completed", "active"].includes(st);
      if (!ok && !["failed", "cancelled", "canceled"].includes(st)) continue;
      const result = await processDodoEvent(env, {
        type: ok ? (session.subscription_id ? "subscription.active" : "payment.succeeded") : st === "failed" ? "payment.failed" : "payment.cancelled",
        data: { ...session, session_id: order.dodo_session_id, metadata: { ...(session.metadata ?? {}), order_id: order.id } },
      });
      if (result.matched) updated++;
      await dodoLog(env, { event_type: "reconciliation", order_id: order.id, status: result.matched ? "processed" : "ignored", raw_payload: session, processed_at: nowIso(), http_status: res.status });
    } catch (e) {
      failed++;
      await dodoLog(env, { event_type: "reconciliation.failed", order_id: order.id, status: "error", verification_error: String(e).slice(0, 2000) });
    }
  }
  return { checked, updated, failed };
}

export async function dodoReconcile(c: C) {
  if (!c.get("isAdmin")) {
    const supplied = c.req.header("x-reconciliation-token");
    const s = await dodoSettings(c.env);
    if (!supplied || !s?.reconciliation_token || supplied !== s.reconciliation_token) return c.json({ error: "Unauthorized" }, 401);
  }
  const r = await reconcileDodo(c.env);
  return r ? c.json(r) : c.json({ error: "Dodo is not configured" }, 503);
}

export async function dodoAdmin(c: C) {
  if (!c.get("isAdmin")) return c.json({ error: "Admin access required" }, 403);
  const body = await c.req.json<Row>().catch(() => ({} as Row));
  if (body.action !== "replay" || typeof body.log_id !== "string") return c.json({ error: "Unsupported action" }, 400);
  const log = await c.env.DB.prepare(`SELECT * FROM dodo_webhook_logs WHERE id = ?`).bind(body.log_id).first<Row>();
  if (!log?.raw_payload) return c.json({ error: "Replay payload not found" }, 404);
  const result = await processDodoEvent(c.env, JSON.parse(log.raw_payload));
  await c.env.DB.prepare(`UPDATE dodo_webhook_logs SET status = ?, verification_error = ?, replay_count = replay_count + 1, last_replayed_at = ?, processed_at = ? WHERE id = ?`)
    .bind(result.matched ? "replayed" : "replay_failed", result.matched ? null : "order_not_found", nowIso(), result.matched ? nowIso() : log.processed_at, body.log_id).run();
  return c.json({ success: result.matched, result });
}
