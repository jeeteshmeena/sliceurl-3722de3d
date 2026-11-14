// Paytm helpers shared by merchant-api and (later) paytm-initiate / paytm-callback / paytm-verify.
import type { Env } from "../env";
import { sha256Hex } from "./crypto";

const PAYTM_IV = "@@@@&&&&####$$$$";
const ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function randomSalt(len = 4): string {
  let s = "";
  for (const b of crypto.getRandomValues(new Uint8Array(len))) s += ALNUM[b % ALNUM.length];
  return s;
}

/** Paytm checksum v2: AES-128-CBC(sha256(payload|salt) + salt) with the merchant key. */
export async function paytmChecksum(payload: string, merchantKey: string): Promise<string> {
  const salt = randomSalt(4);
  const plain = (await sha256Hex(`${payload}|${salt}`)) + salt;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(merchantKey), { name: "AES-CBC" }, false, ["encrypt"]);
  const enc = await crypto.subtle.encrypt({ name: "AES-CBC", iv: new TextEncoder().encode(PAYTM_IV) }, key, new TextEncoder().encode(plain));
  return btoa(String.fromCharCode(...new Uint8Array(enc)));
}

/** Verifies a checksum Paytm sent us (used by paytm-callback). */
export async function verifyPaytmChecksum(payload: string, merchantKey: string, checksum: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(merchantKey), { name: "AES-CBC" }, false, ["decrypt"]);
    const bytes = Uint8Array.from(atob(checksum), (ch) => ch.charCodeAt(0));
    const plain = new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-CBC", iv: new TextEncoder().encode(PAYTM_IV) }, key, bytes));
    const salt = plain.slice(-4);
    return (await sha256Hex(`${payload}|${salt}`)) === plain.slice(0, -4);
  } catch {
    return false;
  }
}

export type PaytmSettings = { merchant_id: string | null; merchant_key: string | null; env: string; website: string | null };

export async function activePaytmSettings(env: Env): Promise<PaytmSettings | null> {
  return env.DB.prepare(
    `SELECT merchant_id, merchant_key, env, website FROM paytm_settings WHERE is_active = 1 ORDER BY updated_at DESC LIMIT 1`,
  ).first<PaytmSettings>();
}

export function paytmHost(settings: Pick<PaytmSettings, "env"> | null) {
  const isProd = (settings?.env || "staging").toLowerCase().startsWith("prod");
  return { isProd, host: isProd ? "https://securegw.paytm.in" : "https://securegw-stage.paytm.in" };
}
