import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Code, Copy, Check, Zap, Lock, BarChart3, Trash2, List,
  Globe, FileJson, AlertCircle, Bot, Layers, Info, Activity, Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-public`;

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast({ title: "Copied", description: "Code copied to clipboard" });
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative group">
      <pre className="p-4 rounded-[12px] bg-muted/40 border border-border overflow-x-auto text-[12.5px] leading-relaxed">
        <code className={`language-${language}`}>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-3.5 w-3.5" strokeWidth={1.7} /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.7} />}
      </Button>
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-[14px] border border-border bg-card p-5 sm:p-6 space-y-4">
      {children}
    </section>
  );
}

function SectionTitle({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; title: string; desc?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-9 w-9 rounded-[10px] bg-muted/60 border border-border flex items-center justify-center shrink-0">
        <Icon className="h-[18px] w-[18px] text-foreground" strokeWidth={1.7} />
      </div>
      <div className="min-w-0 pt-0.5">
        <h2 className="text-[15px] font-semibold leading-tight">{title}</h2>
        {desc && <p className="text-[13px] text-muted-foreground mt-0.5">{desc}</p>}
      </div>
    </div>
  );
}

function EndpointHead({ method, path }: { method: string; path: string }) {
  const variant = method === "GET" ? "secondary" : method === "DELETE" ? "destructive" : "default";
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant={variant} className="font-mono text-[11px] tracking-wide">{method}</Badge>
      <code className="text-[12.5px] font-mono text-foreground/80 break-all">{path}</code>
    </div>
  );
}

const Developers = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 pt-24 pb-12 container max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
          {/* Page header */}
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon-sm" asChild className="h-9 w-9 mt-0.5">
              <Link to="/settings"><ArrowLeft className="h-4 w-4" strokeWidth={1.7} /></Link>
            </Button>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight flex items-center gap-2.5">
                <Code className="h-6 w-6 text-foreground" strokeWidth={1.7} />
                SliceURL Developer API
              </h1>
              <p className="text-[13px] text-muted-foreground mt-1">
                Shorten links, manage UPI payment intents, fetch analytics — all from your bot or backend.
              </p>
            </div>
          </div>

          {/* Quick start */}
          <Section>
            <SectionTitle icon={Zap} title="Quick Start" desc="From zero to your first short link in under a minute." />
            <ol className="space-y-3 pl-1">
              <li className="text-[13px]">
                <span className="font-medium">1.</span> Go to{" "}
                <Link to="/settings" className="underline underline-offset-2 hover:text-foreground">Settings → Developer Access</Link>{" "}
                and generate an API key.
              </li>
              <li className="text-[13px] space-y-2">
                <span className="font-medium">2.</span> Make your first request:
                <CodeBlock code={`curl -X POST "${BASE_URL}?action=shorten" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"long_url": "https://example.com"}'`} />
              </li>
              <li className="text-[13px] space-y-2">
                <span className="font-medium">3.</span> You receive a ready-to-share short URL:
                <CodeBlock language="json" code={`{
  "success": true,
  "short_url": "https://sliceurl.app/s/abc123",
  "slug": "abc123",
  "original_url": "https://example.com",
  "created_at": "2026-04-20T12:00:00Z"
}`} />
              </li>
            </ol>
          </Section>

          {/* Auth */}
          <Section>
            <SectionTitle icon={Lock} title="Authentication" desc="Send your API key with every request." />
            <p className="text-[13px] text-muted-foreground">Both header styles are accepted:</p>
            <CodeBlock code={`X-API-Key: slc_your_api_key_here
# — or —
Authorization: Bearer slc_your_api_key_here`} />
            <div className="flex items-start gap-2.5 p-3 rounded-[10px] bg-amber-500/5 border border-amber-500/20">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" strokeWidth={1.7} />
              <p className="text-[12.5px] text-foreground/80">
                <span className="font-medium">Server-side only.</span> Never expose your API key in browser code or mobile apps.
              </p>
            </div>
          </Section>

          {/* Rate limits */}
          <Section>
            <SectionTitle icon={Activity} title="Rate Limits" desc="Per-key daily quota with rolling 24h window." />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="p-4 rounded-[12px] border border-border">
                <p className="text-xs text-muted-foreground">Daily quota</p>
                <p className="text-xl font-semibold mt-1 tabular-nums">1,000</p>
                <p className="text-[11px] text-muted-foreground">requests / key</p>
              </div>
              <div className="p-4 rounded-[12px] border border-border">
                <p className="text-xs text-muted-foreground">Batch limit</p>
                <p className="text-xl font-semibold mt-1 tabular-nums">25</p>
                <p className="text-[11px] text-muted-foreground">URLs per call</p>
              </div>
              <div className="p-4 rounded-[12px] border border-border">
                <p className="text-xs text-muted-foreground">Window</p>
                <p className="text-xl font-semibold mt-1">24h</p>
                <p className="text-[11px] text-muted-foreground">rolling reset</p>
              </div>
            </div>
            <p className="text-[12.5px] text-muted-foreground">
              Exceeding quota returns <code className="px-1 py-0.5 rounded bg-muted">429 Too Many Requests</code>. Track usage live via{" "}
              <code className="px-1 py-0.5 rounded bg-muted">?action=usage</code>.
            </p>
          </Section>

          {/* Endpoints */}
          <Section>
            <SectionTitle icon={Globe} title="API Endpoints" desc={`Base URL: ${BASE_URL}`} />
            <Tabs defaultValue="shorten" className="w-full">
              <TabsList className="grid grid-cols-3 sm:grid-cols-6 mb-4 h-auto p-1 gap-1">
                <TabsTrigger value="shorten" className="gap-1.5 text-xs h-8"><Zap className="h-3 w-3" strokeWidth={1.7} />Shorten</TabsTrigger>
                <TabsTrigger value="batch" className="gap-1.5 text-xs h-8"><Layers className="h-3 w-3" strokeWidth={1.7} />Batch</TabsTrigger>
                <TabsTrigger value="info" className="gap-1.5 text-xs h-8"><Info className="h-3 w-3" strokeWidth={1.7} />Info</TabsTrigger>
                <TabsTrigger value="analytics" className="gap-1.5 text-xs h-8"><BarChart3 className="h-3 w-3" strokeWidth={1.7} />Analytics</TabsTrigger>
                <TabsTrigger value="list" className="gap-1.5 text-xs h-8"><List className="h-3 w-3" strokeWidth={1.7} />List</TabsTrigger>
                <TabsTrigger value="delete" className="gap-1.5 text-xs h-8"><Trash2 className="h-3 w-3" strokeWidth={1.7} />Delete</TabsTrigger>
              </TabsList>

              {/* Shorten */}
              <TabsContent value="shorten" className="space-y-4">
                <EndpointHead method="POST" path="?action=shorten" />
                <p className="text-[13px] text-muted-foreground">
                  Create a short link. Supports <code>http(s)://</code> and <code>upi://pay?…</code> deep links for in-app payment flows.
                </p>

                <div className="space-y-2">
                  <p className="text-[13px] font-medium">Request body</p>
                  <CodeBlock language="json" code={`{
  "long_url": "https://example.com/very/long/path",
  "custom_alias": "my-brand",       // optional, 2–64 chars [a-zA-Z0-9_-]
  "title": "Spring Sale",           // optional, display title
  "expires_at": "2026-12-31T23:59:59Z", // optional ISO timestamp
  "max_clicks": 100,                // optional click cap
  "password": "secret123"           // optional password protection
}`} />
                  <p className="text-[11.5px] text-muted-foreground">
                    Field aliases accepted: <code>url</code> (= long_url), <code>custom_slug</code> (= custom_alias).
                  </p>
                </div>

                <Tabs defaultValue="curl">
                  <TabsList className="h-8">
                    <TabsTrigger value="curl" className="text-xs h-6">cURL</TabsTrigger>
                    <TabsTrigger value="python" className="text-xs h-6">Python</TabsTrigger>
                    <TabsTrigger value="js" className="text-xs h-6">JavaScript</TabsTrigger>
                    <TabsTrigger value="node" className="text-xs h-6">Node.js</TabsTrigger>
                  </TabsList>
                  <TabsContent value="curl" className="mt-3">
                    <CodeBlock code={`curl -X POST "${BASE_URL}?action=shorten" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"long_url": "https://example.com", "custom_alias": "spring"}'`} />
                  </TabsContent>
                  <TabsContent value="python" className="mt-3">
                    <CodeBlock language="python" code={`import requests

API_KEY = "slc_your_key_here"
API_URL = "${BASE_URL}"

resp = requests.post(
    f"{API_URL}?action=shorten",
    headers={"X-API-Key": API_KEY},
    json={
        "long_url": "https://example.com",
        "custom_alias": "spring",
        "title": "Spring Sale",
    },
    timeout=10,
)
data = resp.json()
print(data["short_url"]) if data["success"] else print(data["error"])`} />
                  </TabsContent>
                  <TabsContent value="js" className="mt-3">
                    <CodeBlock language="javascript" code={`const r = await fetch("${BASE_URL}?action=shorten", {
  method: "POST",
  headers: { "X-API-Key": "YOUR_API_KEY", "Content-Type": "application/json" },
  body: JSON.stringify({ long_url: "https://example.com", custom_alias: "spring" }),
});
const data = await r.json();
console.log(data.short_url);`} />
                  </TabsContent>
                  <TabsContent value="node" className="mt-3">
                    <CodeBlock language="javascript" code={`import axios from "axios";

const { data } = await axios.post(
  "${BASE_URL}?action=shorten",
  { long_url: "https://example.com", custom_alias: "spring" },
  { headers: { "X-API-Key": "YOUR_API_KEY" } }
);
console.log(data.short_url);`} />
                  </TabsContent>
                </Tabs>

                <div className="space-y-2">
                  <p className="text-[13px] font-medium">Response <Badge variant="secondary" className="ml-1 text-[10px]">201</Badge></p>
                  <CodeBlock language="json" code={`{
  "success": true,
  "short_url": "https://sliceurl.app/s/spring",
  "slug": "spring",
  "original_url": "https://example.com",
  "title": "Spring Sale",
  "expires_at": null,
  "max_clicks": null,
  "password_protected": false,
  "created_at": "2026-04-20T12:00:00Z"
}`} />
                </div>
              </TabsContent>

              {/* Batch */}
              <TabsContent value="batch" className="space-y-4">
                <EndpointHead method="POST" path="?action=batch" />
                <p className="text-[13px] text-muted-foreground">Shorten up to 25 URLs in a single request. Per-item <code>custom_alias</code> supported.</p>

                <div className="space-y-2">
                  <p className="text-[13px] font-medium">Request body</p>
                  <CodeBlock language="json" code={`// Simple form — auto-generated slugs
{ "urls": ["https://example.com/a", "https://example.com/b"] }

// Advanced form — per-item custom aliases
{
  "urls": [
    { "long_url": "https://example.com/a", "custom_alias": "promo-a" },
    { "long_url": "https://example.com/b" }
  ]
}`} />
                </div>

                <CodeBlock language="python" code={`resp = requests.post(
    f"{API_URL}?action=batch",
    headers={"X-API-Key": API_KEY},
    json={"urls": [
        {"long_url": "https://example.com/a", "custom_alias": "promo-a"},
        {"long_url": "https://example.com/b"},
    ]},
)
for item in resp.json()["results"]:
    if item["success"]:
        print(item["original_url"], "→", item["short_url"])`} />

                <div className="space-y-2">
                  <p className="text-[13px] font-medium">Response <Badge variant="secondary" className="ml-1 text-[10px]">201</Badge></p>
                  <CodeBlock language="json" code={`{
  "success": true,
  "results": [
    { "success": true, "short_url": "https://sliceurl.app/s/promo-a", "slug": "promo-a", "original_url": "https://example.com/a" },
    { "success": true, "short_url": "https://sliceurl.app/s/x4y9z2", "slug": "x4y9z2", "original_url": "https://example.com/b" }
  ],
  "total": 2,
  "succeeded": 2
}`} />
                </div>
              </TabsContent>

              {/* Info */}
              <TabsContent value="info" className="space-y-4">
                <EndpointHead method="GET" path="?action=info&slug=YOUR_SLUG" />
                <p className="text-[13px] text-muted-foreground">Lightweight metadata about a single link (no per-day click breakdown).</p>
                <CodeBlock code={`curl "${BASE_URL}?action=info&slug=spring" \\
  -H "X-API-Key: YOUR_API_KEY"`} />
                <CodeBlock language="json" code={`{
  "success": true,
  "slug": "spring",
  "short_url": "https://sliceurl.app/s/spring",
  "original_url": "https://example.com",
  "title": "Spring Sale",
  "clicks": 142,
  "expires_at": null,
  "max_clicks": null,
  "password_protected": false,
  "api_generated": true,
  "created_at": "2026-04-20T12:00:00Z"
}`} />
              </TabsContent>

              {/* Analytics */}
              <TabsContent value="analytics" className="space-y-4">
                <EndpointHead method="GET" path="?action=analytics&slug=YOUR_SLUG" />
                <p className="text-[13px] text-muted-foreground">Full breakdown for the last 30 days.</p>
                <CodeBlock code={`curl "${BASE_URL}?action=analytics&slug=spring" \\
  -H "X-API-Key: YOUR_API_KEY"`} />
                <CodeBlock language="json" code={`{
  "success": true,
  "slug": "spring",
  "original_url": "https://example.com",
  "total_clicks": 142,
  "unique_clicks": 89,
  "countries": { "India": 45, "United States": 38 },
  "devices":   { "mobile": 85, "desktop": 60 },
  "browsers":  { "Chrome": 90, "Safari": 35 },
  "os":        { "Android": 50, "iOS": 35, "Windows": 40 },
  "referrers": { "Direct": 80, "WhatsApp": 40 },
  "last_30_days": [{ "date": "2026-04-01", "clicks": 5 }]
}`} />
              </TabsContent>

              {/* List */}
              <TabsContent value="list" className="space-y-4">
                <EndpointHead method="GET" path="?action=list&limit=50&offset=0" />
                <p className="text-[13px] text-muted-foreground">Paginate all links owned by your account (max 100 / page).</p>
                <CodeBlock code={`curl "${BASE_URL}?action=list&limit=10" \\
  -H "X-API-Key: YOUR_API_KEY"`} />
                <CodeBlock language="json" code={`{
  "success": true,
  "links": [
    {
      "short_url": "https://sliceurl.app/s/spring",
      "slug": "spring",
      "original_url": "https://example.com",
      "title": "Spring Sale",
      "clicks": 142,
      "created_at": "2026-04-20T12:00:00Z",
      "api_generated": true
    }
  ],
  "count": 1,
  "limit": 10,
  "offset": 0
}`} />
              </TabsContent>

              {/* Delete */}
              <TabsContent value="delete" className="space-y-4">
                <EndpointHead method="DELETE" path="?action=delete&slug=YOUR_SLUG" />
                <p className="text-[13px] text-muted-foreground">Permanently delete a link you own. Click history is also removed.</p>
                <CodeBlock code={`curl -X DELETE "${BASE_URL}?action=delete&slug=spring" \\
  -H "X-API-Key: YOUR_API_KEY"`} />
                <CodeBlock language="json" code={`{ "success": true, "message": "Link deleted" }`} />
              </TabsContent>
            </Tabs>

            {/* Usage endpoint inline */}
            <div className="space-y-2 pt-2 border-t border-border">
              <EndpointHead method="GET" path="?action=usage" />
              <p className="text-[13px] text-muted-foreground">Check the current API key's daily quota.</p>
              <CodeBlock language="json" code={`{
  "success": true,
  "requests_used": 47,
  "requests_limit": 1000,
  "requests_remaining": 953,
  "reset_at": "2026-04-21T00:00:00Z",
  "last_request_at": "2026-04-20T11:58:12Z"
}`} />
            </div>
          </Section>

          {/* Telegram bot */}
          <Section>
            <SectionTitle
              icon={Bot}
              title="Telegram Bot Integration"
              desc="Production-ready python-telegram-bot example with /shorten, /batch, /stats, and UPI commands."
            />
            <CodeBlock language="python" code={`import requests
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

API = "${BASE_URL}"
KEY = "slc_your_key_here"
HEADERS = {"X-API-Key": KEY}
SESSION = requests.Session()  # reuse TCP connections

# ── Helpers ─────────────────────────────────────────────
def shorten(long_url, alias=None, title=None, password=None):
    body = {"long_url": long_url}
    if alias:    body["custom_alias"] = alias
    if title:    body["title"] = title
    if password: body["password"] = password
    return SESSION.post(f"{API}?action=shorten", headers=HEADERS, json=body, timeout=10).json()

def batch(items):
    return SESSION.post(f"{API}?action=batch", headers=HEADERS, json={"urls": items}, timeout=15).json()

def stats(slug):
    return SESSION.get(f"{API}?action=analytics&slug={slug}", headers=HEADERS, timeout=10).json()

# ── /shorten <url> [alias] ──────────────────────────────
async def cmd_shorten(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args:
        return await update.message.reply_text("Usage: /shorten <url> [custom_alias]")
    url = ctx.args[0]
    alias = ctx.args[1] if len(ctx.args) > 1 else None
    r = shorten(url, alias=alias)
    if r.get("success"):
        await update.message.reply_text(f"Sliced: {r['short_url']}")
    else:
        await update.message.reply_text(f"Error: {r.get('error')}")

# ── /pay <upi_id> <amount> [name] ───────────────────────
# Generates a UPI deep link, wraps it as HTTPS, and sends as inline button.
# Telegram only allows https:// in inline buttons — SliceURL handles the handoff.
async def cmd_pay(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if len(ctx.args) < 2:
        return await update.message.reply_text("Usage: /pay <upi_id> <amount> [name]")
    pa, am = ctx.args[0], ctx.args[1]
    pn = " ".join(ctx.args[2:]) or "Merchant"
    upi_url = f"upi://pay?pa={pa}&pn={pn.replace(' ', '+')}&am={am}&cu=INR"
    r = shorten(upi_url, title=f"Pay ₹{am} to {pn}")
    if not r.get("success"):
        return await update.message.reply_text(f"Error: {r.get('error')}")
    kb = InlineKeyboardMarkup([[InlineKeyboardButton(f"Pay ₹{am}", url=r["short_url"])]])
    await update.message.reply_text(f"Tap to pay ₹{am} to {pn}", reply_markup=kb)

# ── /batch — shorten many URLs at once ──────────────────
async def cmd_batch(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args:
        return await update.message.reply_text("Usage: /batch <url1> <url2> ...")
    r = batch(list(ctx.args))
    lines = [f"{i['original_url']} → {i['short_url']}" if i["success"] else f"{i['original_url']} → ERROR"
             for i in r.get("results", [])]
    await update.message.reply_text("\\n".join(lines))

# ── /stats <slug> ───────────────────────────────────────
async def cmd_stats(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args:
        return await update.message.reply_text("Usage: /stats <slug>")
    r = stats(ctx.args[0])
    if not r.get("success"):
        return await update.message.reply_text(f"Error: {r.get('error')}")
    top_country = max(r.get("countries", {"-": 0}).items(), key=lambda x: x[1])[0]
    await update.message.reply_text(
        f"{r['slug']}\\nTotal: {r['total_clicks']} | Unique: {r['unique_clicks']}\\nTop country: {top_country}"
    )

app = ApplicationBuilder().token("YOUR_BOT_TOKEN").build()
app.add_handler(CommandHandler("shorten", cmd_shorten))
app.add_handler(CommandHandler("pay", cmd_pay))
app.add_handler(CommandHandler("batch", cmd_batch))
app.add_handler(CommandHandler("stats", cmd_stats))
app.run_polling()`} />

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-[10px] border border-border p-3.5">
                <p className="text-[13px] font-medium mb-1">UPI in Telegram</p>
                <p className="text-[12px] text-muted-foreground">
                  Telegram blocks <code>upi://</code> in inline buttons. Wrap UPI deep links via the API to get an HTTPS short URL that hands off to GPay / PhonePe / Paytm / BHIM on tap.
                </p>
              </div>
              <div className="rounded-[10px] border border-border p-3.5">
                <p className="text-[13px] font-medium mb-1">Bursty traffic tip</p>
                <p className="text-[12px] text-muted-foreground">
                  Use <code>?action=batch</code> for groups of URLs and a single <code>requests.Session()</code> to reuse TCP connections — significantly reduces latency.
                </p>
              </div>
            </div>
          </Section>

          {/* Errors */}
          <Section>
            <SectionTitle icon={FileJson} title="Error Codes" desc="All errors share a consistent shape." />
            <div className="space-y-2">
              {[
                { code: 400, label: "Bad Request", desc: "Missing or malformed parameters" },
                { code: 401, label: "Unauthorized", desc: "Missing or invalid API key" },
                { code: 403, label: "Forbidden", desc: "API key has been revoked" },
                { code: 404, label: "Not Found", desc: "Link not found or unknown action" },
                { code: 409, label: "Conflict", desc: "Custom alias is already taken" },
                { code: 429, label: "Rate Limited", desc: "Daily quota exceeded — retry after reset" },
                { code: 500, label: "Server Error", desc: "Unexpected internal error" },
              ].map((e) => (
                <div key={e.code} className="flex items-center gap-3 p-3 rounded-[10px] border border-border">
                  <Badge
                    variant={e.code >= 500 ? "destructive" : e.code >= 400 ? "secondary" : "default"}
                    className="font-mono tabular-nums shrink-0"
                  >
                    {e.code}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">{e.label}</p>
                    <p className="text-[12px] text-muted-foreground">{e.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-[13px] font-medium">Error response shape</p>
              <CodeBlock language="json" code={`{ "success": false, "error": "Custom alias already exists." }`} />
            </div>
          </Section>

          {/* CTA */}
          <Section>
            <div className="text-center py-4">
              <Terminal className="h-7 w-7 mx-auto mb-3 text-foreground" strokeWidth={1.7} />
              <h3 className="text-[15px] font-semibold mb-1">Ready to integrate?</h3>
              <p className="text-[13px] text-muted-foreground mb-4">Generate a key and start shortening from your bot or backend.</p>
              <Button asChild size="sm">
                <Link to="/settings">Get API Key</Link>
              </Button>
            </div>
          </Section>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default Developers;
