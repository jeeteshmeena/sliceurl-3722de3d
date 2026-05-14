import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_ORIGIN = "https://sliceurl.app";

const ROUTE_META: Record<string, { title: string; description: string }> = {
  "/": {
    title: "SliceURL – Smart Link Shortener, QR Codes & Analytics",
    description: "Shorten URLs, generate branded QR codes, and track real-time click analytics with SliceURL — the fast, secure link shortener.",
  },
  "/about": {
    title: "About SliceURL – Our Story & Mission",
    description: "Learn about SliceURL, the team behind it, and our mission to build the smartest link shortener for creators and teams.",
  },
  "/pricing": {
    title: "Pricing – SliceURL Free, Pro & Business Plans",
    description: "Simple, transparent SliceURL pricing. Free plan for individuals, Pro for creators, Business for high-traffic teams.",
  },
  "/contact": {
    title: "Contact SliceURL – Support & Sales",
    description: "Get in touch with the SliceURL team for support, sales, partnerships, or general questions.",
  },
  "/developers": {
    title: "SliceURL Developer API – REST Endpoints & Keys",
    description: "Integrate SliceURL with the REST API: shorten links, fetch analytics, and manage keys programmatically.",
  },
  "/utm-builder": {
    title: "UTM Builder – Create Trackable Campaign URLs",
    description: "Build clean, trackable UTM URLs in seconds. Free UTM parameter builder by SliceURL.",
  },
  "/slicebox": {
    title: "SliceBox – Share Files up to 200 MB Instantly",
    description: "Upload and share files up to 200 MB with a single short link. Fast, secure file sharing by SliceURL.",
  },
  "/littleslice": {
    title: "LittleSlice – Temporary File Sharing up to 2 GB",
    description: "Share large files up to 2 GB with custom expiration. Temporary, secure file sharing by SliceURL.",
  },
  "/creepyurl": {
    title: "CreepyURL – Disguised Short Links for Fun",
    description: "Create disguised short links that look mysterious. A playful SliceURL experiment.",
  },
  "/login": {
    title: "Sign In – SliceURL",
    description: "Sign in to your SliceURL account to manage links, analytics, and QR codes.",
  },
  "/register": {
    title: "Create Account – SliceURL",
    description: "Create a free SliceURL account to start shortening links and tracking clicks.",
  },
  "/privacy": {
    title: "Privacy Policy – SliceURL",
    description: "Learn how SliceURL collects, uses, and protects your data.",
  },
  "/terms": {
    title: "Terms of Service – SliceURL",
    description: "Read the SliceURL Terms of Service.",
  },
  "/refund-policy": {
    title: "Refund Policy – SliceURL",
    description: "SliceURL refund policy, eligibility, and how to request a refund.",
  },
};

function setMeta(selector: string, attr: "content" | "href", value: string) {
  let el = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
  if (!el) {
    if (selector.startsWith("link")) {
      el = document.createElement("link");
      (el as HTMLLinkElement).rel = selector.match(/rel="([^"]+)"/)?.[1] ?? "";
    } else {
      el = document.createElement("meta");
      const name = selector.match(/name="([^"]+)"/)?.[1];
      const prop = selector.match(/property="([^"]+)"/)?.[1];
      if (name) (el as HTMLMetaElement).name = name;
      if (prop) el.setAttribute("property", prop);
    }
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

export function RouteHead() {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = ROUTE_META[pathname];
    const url = `${SITE_ORIGIN}${pathname}`;

    if (meta) {
      document.title = meta.title;
      setMeta('meta[name="description"]', "content", meta.description);
      setMeta('meta[property="og:title"]', "content", meta.title);
      setMeta('meta[property="og:description"]', "content", meta.description);
      setMeta('meta[name="twitter:title"]', "content", meta.title);
      setMeta('meta[name="twitter:description"]', "content", meta.description);
    }
    setMeta('link[rel="canonical"]', "href", url);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[name="twitter:url"]', "content", url);
  }, [pathname]);

  return null;
}
