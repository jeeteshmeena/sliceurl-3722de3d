import type { Env } from "../env";

/** Sends a transactional email through Resend (same provider the old functions used). */
export async function sendEmail(env: Env, to: string, subject: string, html: string): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set; skipping mail to", to);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM || "SliceURL <noreply@sliceurl.app>", to: [to], subject, html }),
  });
  if (!res.ok) console.error("[email] resend failed", res.status, await res.text());
  return res.ok;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}
