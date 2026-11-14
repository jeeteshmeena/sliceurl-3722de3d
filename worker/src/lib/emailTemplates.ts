// Transactional email HTML. Every interpolated value must go through escapeHtml.
import { escapeHtml } from "./email";

const shell = (title: string, inner: string, site: string) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f5f5f5;">
  <table role="presentation" style="width:100%;border-collapse:collapse;"><tr><td align="center" style="padding:40px 20px;">
    <table role="presentation" style="max-width:480px;width:100%;border-collapse:collapse;">
      <tr><td align="center" style="padding-bottom:32px;">
        <div style="font-size:28px;font-weight:700;letter-spacing:-0.5px;"><span style="color:#141414;">Slice</span><span style="color:#6b7280;">URL</span></div>
      </td></tr>
      <tr><td style="background-color:#ffffff;border-radius:16px;padding:40px 32px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">${inner}</td></tr>
      <tr><td style="padding-top:32px;text-align:center;">
        <p style="margin:0 0 8px 0;font-size:13px;color:#9ca3af;">Need help? Reply to this email or visit our <a href="${site}/about" style="color:#6b7280;">about page</a>.</p>
        <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} SliceURL. Made with ❤️ by JeetX</p>
      </td></tr>
    </table>
  </td></tr></table>
</body>
</html>`;

const feature = (icon: string, title: string, text: string, last = false) =>
  `<div${last ? "" : ' style="margin-bottom:16px;"'}><span style="font-size:16px;margin-right:12px;">${icon}</span><span style="font-size:14px;color:#374151;font-weight:500;">${title}</span><span style="display:block;font-size:13px;color:#6b7280;margin-left:28px;">${text}</span></div>`;

const button = (href: string, label: string) =>
  `<div style="text-align:center;"><a href="${href}" style="display:inline-block;background-color:#141414;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;">${label}</a></div>`;

export function welcomeEmail(name: string, site: string) {
  return shell("Welcome to SliceURL", `
    <div style="text-align:center;margin-bottom:24px;"><div style="display:inline-block;width:56px;height:56px;background-color:#f5f5f5;border-radius:14px;line-height:56px;font-size:28px;">👋</div></div>
    <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:600;color:#141414;text-align:center;">Welcome, ${escapeHtml(name)}!</h1>
    <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#6b7280;text-align:center;">You're all set to start slicing your URLs. Here's what you can do with SliceURL:</p>
    <div style="background-color:#fafafa;border-radius:12px;padding:20px;margin-bottom:28px;">
      ${feature("🔗", "Shorten URLs", "Create clean, memorable short links")}
      ${feature("📊", "Track Analytics", "See clicks, locations, and devices")}
      ${feature("📱", "Generate QR Codes", "Customize with colors and logos")}
      ${feature("📦", "Share Files", "Upload and share via SliceBox", true)}
    </div>
    ${button(`${site}/dashboard`, "Go to Dashboard →")}`, site);
}

export function deletionEmail(deletionDate: Date, site: string) {
  const when = deletionDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return shell("Your SliceURL account is scheduled for deletion", `
    <div style="text-align:center;margin-bottom:24px;"><div style="display:inline-block;width:56px;height:56px;background-color:#fef2f2;border-radius:14px;line-height:56px;font-size:28px;">🗑️</div></div>
    <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600;color:#141414;text-align:center;">Account deletion scheduled</h1>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#6b7280;text-align:center;">Your SliceURL account and all its links, analytics and files are scheduled to be deleted on <strong style="color:#141414;">${escapeHtml(when)}</strong>.</p>
    <p style="margin:0 0 28px 0;font-size:14px;line-height:1.6;color:#6b7280;text-align:center;">Changed your mind? Sign in and cancel the deletion in Settings before that date.</p>
    ${button(`${site}/settings`, "Open Settings →")}`, site);
}
