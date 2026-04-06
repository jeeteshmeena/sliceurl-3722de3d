import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  ArrowLeft, Code, Copy, Check, Zap, Lock, BarChart3, Trash2, List,
  Terminal, Globe, FileJson, AlertCircle, Bot, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-public`;

interface CodeBlockProps {
  code: string;
  language?: string;
}

function CodeBlock({ code, language = "bash" }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast({ title: "Copied!", description: "Code copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="p-4 rounded-lg bg-muted/50 border border-border overflow-x-auto text-sm">
        <code className={`language-${language}`}>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

const Developers = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 pt-24 pb-12 container max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon-sm" asChild>
              <Link to="/settings"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Code className="h-8 w-8 text-primary" />
                SliceURL API
              </h1>
              <p className="text-muted-foreground mt-1">
                Shorten links, track analytics, and manage URLs programmatically
              </p>
            </div>
          </div>

          {/* Quick Start */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Quick Start
              </CardTitle>
              <CardDescription>
                Get started with the SliceURL API in under a minute
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">1. Generate an API key</p>
                <p className="text-sm text-muted-foreground">
                  Go to{" "}
                  <Link to="/settings" className="text-primary underline">
                    Settings → Developer Access
                  </Link>{" "}
                  and generate your API key.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">2. Make your first request</p>
                <CodeBlock
                  code={`curl -X POST "${BASE_URL}?action=shorten" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"long_url": "https://example.com"}'`}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">3. Get your short URL</p>
                <CodeBlock
                  language="json"
                  code={`{
  "success": true,
  "short_url": "https://sliceurl.app/s/abc123",
  "original_url": "https://example.com",
  "slug": "abc123",
  "created_at": "2024-01-15T12:00:00Z"
}`}
                />
              </div>
            </CardContent>
          </Card>

          {/* Authentication */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                All API requests require your API key. You can send it in <strong>either</strong> of these headers:
              </p>
              <CodeBlock code={`Authorization: Bearer slc_your_api_key_here
# — OR —
X-API-Key: slc_your_api_key_here`} />
              
              <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-orange-600 dark:text-orange-400">Security Notice</p>
                  <p className="text-muted-foreground">Never expose your API key in client-side code. Use server-side requests only (bots, backends).</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rate Limits */}
          <Card>
            <CardHeader>
              <CardTitle>Rate Limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg border border-border">
                  <p className="font-medium">Daily Quota</p>
                  <p className="text-2xl font-bold text-primary">1000</p>
                  <p className="text-sm text-muted-foreground">requests per key per day</p>
                </div>
                <div className="p-4 rounded-lg border border-border">
                  <p className="font-medium">Batch Limit</p>
                  <p className="text-2xl font-bold text-primary">25</p>
                  <p className="text-sm text-muted-foreground">URLs per batch request</p>
                </div>
                <div className="p-4 rounded-lg border border-border">
                  <p className="font-medium">Rate Reset</p>
                  <p className="text-2xl font-bold">24h</p>
                  <p className="text-sm text-muted-foreground">rolling window</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                When you exceed the rate limit, the API returns a <code className="px-1 py-0.5 rounded bg-muted">429</code> status.
              </p>
            </CardContent>
          </Card>

          {/* Endpoints */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                API Endpoints
              </CardTitle>
              <CardDescription>Base URL: <code className="text-xs">{BASE_URL}</code></CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="shorten" className="w-full">
                <TabsList className="grid grid-cols-5 mb-4">
                  <TabsTrigger value="shorten" className="gap-1 text-xs sm:text-sm">
                    <Zap className="h-3 w-3" />
                    Shorten
                  </TabsTrigger>
                  <TabsTrigger value="batch" className="gap-1 text-xs sm:text-sm">
                    <Layers className="h-3 w-3" />
                    Batch
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="gap-1 text-xs sm:text-sm">
                    <BarChart3 className="h-3 w-3" />
                    Analytics
                  </TabsTrigger>
                  <TabsTrigger value="list" className="gap-1 text-xs sm:text-sm">
                    <List className="h-3 w-3" />
                    List
                  </TabsTrigger>
                  <TabsTrigger value="delete" className="gap-1 text-xs sm:text-sm">
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </TabsTrigger>
                </TabsList>

                {/* ── Shorten ── */}
                <TabsContent value="shorten" className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge>POST</Badge>
                    <code className="text-sm">?action=shorten</code>
                  </div>
                  <p className="text-sm text-muted-foreground">Create a new shortened URL.</p>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Request Body</p>
                    <CodeBlock
                      language="json"
                      code={`{
  "long_url": "https://example.com/very/long/destination",
  "custom_alias": "my-brand"  // optional
}`}
                    />
                    <p className="text-xs text-muted-foreground">
                      Also accepts <code>url</code> and <code>custom_slug</code> as field names for backward compatibility.
                    </p>
                  </div>

                  <Tabs defaultValue="python" className="w-full">
                    <p className="text-sm font-medium mb-2">Examples</p>
                    <TabsList className="h-8">
                      <TabsTrigger value="python" className="text-xs">Python</TabsTrigger>
                      <TabsTrigger value="curl" className="text-xs">cURL</TabsTrigger>
                      <TabsTrigger value="js" className="text-xs">JavaScript</TabsTrigger>
                      <TabsTrigger value="node" className="text-xs">Node.js</TabsTrigger>
                    </TabsList>
                    <TabsContent value="python">
                      <CodeBlock
                        language="python"
                        code={`import requests

API_KEY = "slc_your_key_here"
API_URL = "${BASE_URL}"

response = requests.post(
    f"{API_URL}?action=shorten",
    headers={"X-API-Key": API_KEY},
    json={"long_url": "https://example.com"}
)

data = response.json()
if data["success"]:
    print(data["short_url"])
else:
    print(f"Error: {data['error']}")`}
                      />
                    </TabsContent>
                    <TabsContent value="curl">
                      <CodeBlock
                        code={`curl -X POST "${BASE_URL}?action=shorten" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"long_url": "https://example.com"}'`}
                      />
                    </TabsContent>
                    <TabsContent value="js">
                      <CodeBlock
                        language="javascript"
                        code={`const response = await fetch("${BASE_URL}?action=shorten", {
  method: "POST",
  headers: {
    "X-API-Key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ long_url: "https://example.com" })
});

const data = await response.json();
console.log(data.short_url);`}
                      />
                    </TabsContent>
                    <TabsContent value="node">
                      <CodeBlock
                        language="javascript"
                        code={`const axios = require('axios');

const { data } = await axios.post(
  "${BASE_URL}?action=shorten",
  { long_url: "https://example.com" },
  { headers: { "X-API-Key": "YOUR_API_KEY" } }
);

console.log(data.short_url);`}
                      />
                    </TabsContent>
                  </Tabs>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Response <Badge variant="secondary" className="ml-1">201</Badge></p>
                    <CodeBlock
                      language="json"
                      code={`{
  "success": true,
  "short_url": "https://sliceurl.app/s/abc123",
  "original_url": "https://example.com",
  "slug": "abc123",
  "created_at": "2024-01-15T12:00:00Z"
}`}
                    />
                  </div>
                </TabsContent>

                {/* ── Batch ── */}
                <TabsContent value="batch" className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge>POST</Badge>
                    <code className="text-sm">?action=batch</code>
                  </div>
                  <p className="text-sm text-muted-foreground">Shorten up to 25 URLs in a single request. Perfect for bots and automation.</p>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Request Body</p>
                    <CodeBlock
                      language="json"
                      code={`{
  "urls": [
    "https://example.com/page-1",
    "https://example.com/page-2",
    "https://example.com/page-3"
  ]
}`}
                    />
                  </div>

                  <CodeBlock
                    language="python"
                    code={`import requests

response = requests.post(
    f"{API_URL}?action=batch",
    headers={"X-API-Key": API_KEY},
    json={"urls": [
        "https://example.com/a",
        "https://example.com/b",
    ]}
)

for item in response.json()["results"]:
    if item["success"]:
        print(f'{item["original_url"]} → {item["short_url"]}')`}
                  />

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Response <Badge variant="secondary" className="ml-1">201</Badge></p>
                    <CodeBlock
                      language="json"
                      code={`{
  "success": true,
  "results": [
    { "success": true, "short_url": "https://sliceurl.app/s/x1y2z3", "original_url": "https://example.com/a", "slug": "x1y2z3" },
    { "success": true, "short_url": "https://sliceurl.app/s/a4b5c6", "original_url": "https://example.com/b", "slug": "a4b5c6" }
  ],
  "total": 2,
  "succeeded": 2
}`}
                    />
                  </div>
                </TabsContent>

                {/* ── Analytics ── */}
                <TabsContent value="analytics" className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">GET</Badge>
                    <code className="text-sm">?action=analytics&slug=YOUR_SLUG</code>
                  </div>
                  <p className="text-sm text-muted-foreground">Get analytics for a specific link.</p>
                  
                  <CodeBlock
                    code={`curl "${BASE_URL}?action=analytics&slug=abc123" \\
  -H "X-API-Key: YOUR_API_KEY"`}
                  />

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Response</p>
                    <CodeBlock
                      language="json"
                      code={`{
  "success": true,
  "slug": "abc123",
  "original_url": "https://example.com",
  "total_clicks": 150,
  "unique_clicks": 89,
  "countries": {"India": 45, "United States": 38},
  "devices": {"mobile": 85, "desktop": 60},
  "browsers": {"Chrome": 90, "Safari": 35},
  "os": {"Android": 50, "iOS": 35, "Windows": 40},
  "referrers": {"Direct": 80, "WhatsApp": 40},
  "last_30_days": [{"date": "2024-01-01", "clicks": 5}, ...]
}`}
                    />
                  </div>
                </TabsContent>

                {/* ── List ── */}
                <TabsContent value="list" className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">GET</Badge>
                    <code className="text-sm">?action=list&limit=50&offset=0</code>
                  </div>
                  <p className="text-sm text-muted-foreground">List all your shortened links with pagination (max 100 per page).</p>
                  
                  <CodeBlock
                    code={`curl "${BASE_URL}?action=list&limit=10" \\
  -H "X-API-Key: YOUR_API_KEY"`}
                  />

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Response</p>
                    <CodeBlock
                      language="json"
                      code={`{
  "success": true,
  "links": [
    {
      "short_url": "https://sliceurl.app/s/abc123",
      "slug": "abc123",
      "original_url": "https://example.com",
      "title": "API: example.com",
      "clicks": 150,
      "created_at": "2024-01-15T12:00:00Z",
      "api_generated": true
    }
  ],
  "count": 1,
  "limit": 10,
  "offset": 0
}`}
                    />
                  </div>
                </TabsContent>

                {/* ── Delete ── */}
                <TabsContent value="delete" className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">DELETE</Badge>
                    <code className="text-sm">?action=delete&slug=YOUR_SLUG</code>
                  </div>
                  <p className="text-sm text-muted-foreground">Delete a link you own.</p>
                  
                  <CodeBlock
                    code={`curl -X DELETE "${BASE_URL}?action=delete&slug=abc123" \\
  -H "X-API-Key: YOUR_API_KEY"`}
                  />

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Response</p>
                    <CodeBlock
                      language="json"
                      code={`{
  "success": true,
  "message": "Link deleted"
}`}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Telegram Bot Integration */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                Python Telegram Bot Integration
              </CardTitle>
              <CardDescription>
                Complete example for integrating SliceURL into a python-telegram-bot project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CodeBlock
                language="python"
                code={`import requests
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

SLICEURL_API = "${BASE_URL}"
SLICEURL_KEY = "slc_your_key_here"

def shorten(long_url: str, alias: str = None) -> dict:
    """Shorten a URL via SliceURL API."""
    payload = {"long_url": long_url}
    if alias:
        payload["custom_alias"] = alias

    resp = requests.post(
        f"{SLICEURL_API}?action=shorten",
        headers={"X-API-Key": SLICEURL_KEY},
        json=payload,
        timeout=10,
    )
    return resp.json()

async def slice_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Handle /slice <url> [alias] command."""
    args = ctx.args
    if not args:
        await update.message.reply_text("Usage: /slice <url> [custom_alias]")
        return

    long_url = args[0]
    alias = args[1] if len(args) > 1 else None

    result = shorten(long_url, alias)

    if result.get("success"):
        await update.message.reply_text(
            f"✅ Sliced!\\n{result['short_url']}"
        )
    else:
        await update.message.reply_text(
            f"❌ {result.get('error', 'Unknown error')}"
        )

app = ApplicationBuilder().token("YOUR_BOT_TOKEN").build()
app.add_handler(CommandHandler("slice", slice_cmd))
app.run_polling()`}
              />
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Zap className="h-4 w-4 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Tip for high-traffic bots</p>
                  <p className="text-muted-foreground">
                    Use the <code className="px-1 py-0.5 rounded bg-muted">?action=batch</code> endpoint to shorten
                    multiple URLs in a single request — reducing latency and API calls.
                    Use <code className="px-1 py-0.5 rounded bg-muted">requests.Session()</code> to reuse TCP connections.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Codes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                Error Codes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { code: 400, message: "Bad Request", desc: "Invalid request body, missing long_url, or invalid URL format" },
                  { code: 401, message: "Unauthorized", desc: "Missing or invalid API key" },
                  { code: 403, message: "Forbidden", desc: "API key has been revoked" },
                  { code: 404, message: "Not Found", desc: "Link not found or unknown action" },
                  { code: 409, message: "Conflict", desc: "Custom alias already exists" },
                  { code: 429, message: "Too Many Requests", desc: "Daily rate limit exceeded" },
                  { code: 500, message: "Server Error", desc: "Internal server error" },
                ].map((error) => (
                  <div key={error.code} className="flex items-center gap-4 p-3 rounded-lg border border-border">
                    <Badge variant={error.code >= 500 ? "destructive" : error.code >= 400 ? "secondary" : "default"}>
                      {error.code}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{error.message}</p>
                      <p className="text-xs text-muted-foreground">{error.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">Error response format</p>
                <CodeBlock language="json" code={`{ "success": false, "error": "Custom alias already exists." }`} />
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="py-6 text-center">
              <Terminal className="h-10 w-10 mx-auto mb-3 text-primary" />
              <h3 className="text-lg font-semibold mb-2">Ready to integrate?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Generate your API key and start building
              </p>
              <Button asChild>
                <Link to="/settings">Get API Key</Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default Developers;
