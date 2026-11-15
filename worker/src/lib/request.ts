// Visitor info helpers. On Cloudflare the edge already knows the visitor's
// country/city (request.cf), so the 4 external geo-IP APIs the Supabase
// functions used (ip-api, ipwho.is, ipapi.co, geojs) are no longer needed.

export function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function geoFromRequest(req: Request): { country: string; city: string; region: string | null } {
  const cf = (req as unknown as { cf?: IncomingRequestCfProperties }).cf;
  let country = "Unknown";
  if (cf?.country) {
    try {
      country = new Intl.DisplayNames(["en"], { type: "region" }).of(cf.country as string) || (cf.country as string);
    } catch {
      country = cf.country as string;
    }
  }
  return { country, city: (cf?.city as string) || "Unknown", region: (cf?.region as string) || null };
}

export function parseUserAgent(ua: string): { device_type: string; browser: string; os: string } {
  let device_type = "desktop";
  if (/Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    device_type = /iPad|Tablet/i.test(ua) ? "tablet" : "mobile";
  }
  let browser = "unknown";
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("OPR") || ua.includes("Opera")) browser = "Opera";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("MSIE") || ua.includes("Trident")) browser = "IE";
  let os = "unknown";
  if (ua.includes("Windows")) os = "Windows";
  else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  return { device_type, browser, os };
}

/** Referrer -> source bucket. Ported 1:1 from the old track-click function. */
export function referrerSource(referrer: string | null | undefined, userAgent: string): string {
  if (!referrer) {
    if (userAgent.includes("WhatsApp")) return "WhatsApp";
    if (userAgent.includes("Telegram")) return "Telegram";
    if (userAgent.includes("Instagram")) return "Instagram";
    if (userAgent.includes("FBAN") || userAgent.includes("FBAV")) return "Facebook";
    if (userAgent.includes("Twitter") || userAgent.includes("X-Twitter")) return "X/Twitter";
    if (userAgent.includes("LinkedIn")) return "LinkedIn";
    return "Direct";
  }
  const r = referrer.toLowerCase();
  const rules: [string[], string][] = [
    [["whatsapp", "wa.me"], "WhatsApp"], [["telegram", "t.me"], "Telegram"], [["instagram"], "Instagram"],
    [["facebook", "fb.com", "fb.me"], "Facebook"], [["twitter", "t.co", "x.com"], "X/Twitter"],
    [["linkedin"], "LinkedIn"], [["youtube"], "YouTube"], [["tiktok"], "TikTok"], [["reddit"], "Reddit"],
    [["pinterest"], "Pinterest"], [["snapchat"], "Snapchat"], [["google"], "Google"], [["bing"], "Bing"],
    [["yahoo"], "Yahoo"], [["duckduckgo"], "DuckDuckGo"], [["mail", "outlook", "gmail"], "Email"],
  ];
  for (const [needles, name] of rules) if (needles.some((n) => r.includes(n))) return name;
  try {
    return new URL(referrer).hostname.replace("www.", "");
  } catch {
    return "Website";
  }
}
