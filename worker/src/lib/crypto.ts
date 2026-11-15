import bcrypt from "bcryptjs";

// Same format the Supabase edge functions used for link/file passwords:
//   pbkdf2$<salt b64>$<hash b64>   (PBKDF2-SHA256, 100k iterations, 256 bit)
// so passwords already stored in links/slicebox_files keep working after import.
const PBKDF2_ITERATIONS = 100_000;

export function b64(bytes: ArrayBuffer | Uint8Array): string {
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
}
function unb64(s: string): Uint8Array {
  const bin = atob(s);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}
export function b64url(bytes: Uint8Array): string {
  return b64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${b64(salt)}$${b64(await pbkdf2(password, salt, PBKDF2_ITERATIONS))}`;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}

/** Verifies pbkdf2$… hashes and bcrypt hashes imported from Supabase auth. */
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  if (stored.startsWith("pbkdf2$")) {
    const [, saltB64, hashB64] = stored.split("$");
    const expected = unb64(hashB64);
    return timingSafeEqual(await pbkdf2(password, unb64(saltB64), PBKDF2_ITERATIONS), expected);
  }
  if (/^\$2[aby]\$/.test(stored)) return bcrypt.compare(password, stored);
  // legacy unsalted SHA-256 hex (very old SliceBox files)
  if (/^[0-9a-f]{64}$/.test(stored)) {
    const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password)));
    return timingSafeEqual(new TextEncoder().encode([...d].map((b) => b.toString(16).padStart(2, "0")).join("")), new TextEncoder().encode(stored));
  }
  return false;
}

export function needsRehash(stored: string | null | undefined): boolean {
  return !!stored && !stored.startsWith("pbkdf2$");
}

export async function sha256Hex(input: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomToken(bytes = 32): string {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

const ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
export function randomCode(length = 6, alphabet = ALNUM): string {
  const out: string[] = [];
  const max = 256 - (256 % alphabet.length);
  while (out.length < length) {
    for (const b of crypto.getRandomValues(new Uint8Array(length * 2))) {
      if (b < max && out.length < length) out.push(alphabet[b % alphabet.length]);
    }
  }
  return out.join("");
}
