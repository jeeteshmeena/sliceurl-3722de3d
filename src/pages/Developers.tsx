import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  ArrowLeft, Code, Copy, Check, Zap, Lock, BarChart3, Trash2, List,
  Terminal, Globe, FileJson, AlertCircle
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
  -d '{"url": "https://example.com"}'`}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">3. Get your short URL</p>
                <CodeBlock
                  language="json"
                  code={`{
  "short_url": "https://sliceurl.app/s/abc123",
  "slug": "abc123",
  "original_url": "https://example.com",
  "created_at": "2024-01-15T12:00:00Z",
  "api_generated": true
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
                All API requests require authentication via Bearer token. Include your API key in the Authorization header:
              </p>
              <CodeBlock code={`Authorization: Bearer slc_your_api_key_here`} />
              
              <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-orange-600 dark:text-orange-400">Security Notice</p>
                  <p className="text-muted-foreground">Never expose your API key in client-side code. Use server-side requests only.</p>
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
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg border border-border">
                  <p className="font-medium">Free Tier</p>
                  <p className="text-2xl font-bold text-primary">100</p>
                  <p className="text-sm text-muted-foreground">requests per day</p>
                </div>
                <div className="p-4 rounded-lg border border-border">
                  <p className="font-medium">Rate Reset</p>
                  <p className="text-2xl font-bold">24h</p>
                  <p className="text-sm text-muted-foreground">rolling window</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                When you exceed the rate limit, the API returns a <code className="px-1 py-0.5 rounded bg-muted">429</code> status with:
              </p>
              <CodeBlock language="json" code={`{"error": "RATE_LIMIT_EXCEEDED"}`} />
            </CardContent>
          </Card>

          {/* Endpoints */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                API Endpoints
              </CardTitle>
              <CardDescription>Base URL: {BASE_URL}</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="shorten" className="w-full">
                <TabsList className="grid grid-cols-4 mb-4">
                  <TabsTrigger value="shorten" className="gap-1">
                    <Zap className="h-3 w-3" />
                    Shorten
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="gap-1">
                    <BarChart3 className="h-3 w-3" />
                    Analytics
                  </TabsTrigger>
                  <TabsTrigger value="list" className="gap-1">
                    <List className="h-3 w-3" />
                    List
                  </TabsTrigger>
                  <TabsTrigger value="delete" className="gap-1">
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </TabsTrigger>
                </TabsList>

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
  "url": "https://example.com/long-url",
  "custom_slug": "my-custom-slug"  // optional
}`}
                    />
                  </div>

                  <Tabs defaultValue="curl" className="w-full">
                    <p className="text-sm font-medium mb-2">Examples</p>
                    <TabsList className="h-8">
                      <TabsTrigger value="curl" className="text-xs">cURL</TabsTrigger>
                      <TabsTrigger value="js" className="text-xs">JavaScript</TabsTrigger>
                      <TabsTrigger value="node" className="text-xs">Node.js</TabsTrigger>
                      <TabsTrigger value="python" className="text-xs">Python</TabsTrigger>
                      <TabsTrigger value="php" className="text-xs">PHP</TabsTrigger>
                    </TabsList>
                    <TabsContent value="curl">
                      <CodeBlock
                        code={`curl -X POST "${BASE_URL}?action=shorten" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com"}'`}
                      />
                    </TabsContent>
                    <TabsContent value="js">
                      <CodeBlock
                        language="javascript"
                        code={`const response = await fetch("${BASE_URL}?action=shorten", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ url: "https://example.com" })
});

const data = await response.json();
console.log(data.short_url);`}
                      />
                    </TabsContent>
                    <TabsContent value="node">
                      <CodeBlock
                        language="javascript"
                        code={`const axios = require('axios');

const response = await axios.post(
  "${BASE_URL}?action=shorten",
  { url: "https://example.com" },
  {
    headers: {
      "Authorization": "Bearer YOUR_API_KEY",
      "Content-Type": "application/json"
    }
  }
);

console.log(response.data.short_url);`}
                      />
                    </TabsContent>
                    <TabsContent value="python">
                      <CodeBlock
                        language="python"
                        code={`import requests

response = requests.post(
    "${BASE_URL}?action=shorten",
    headers={
        "Authorization": "Bearer YOUR_API_KEY",
        "Content-Type": "application/json"
    },
    json={"url": "https://example.com"}
)

data = response.json()
print(data["short_url"])`}
                      />
                    </TabsContent>
                    <TabsContent value="php">
                      <CodeBlock
                        language="php"
                        code={`<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "${BASE_URL}?action=shorten");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer YOUR_API_KEY",
    "Content-Type: application/json"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "url" => "https://example.com"
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$data = json_decode($response, true);
echo $data["short_url"];`}
                      />
                    </TabsContent>
                  </Tabs>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Response</p>
                    <CodeBlock
                      language="json"
                      code={`{
  "short_url": "https://sliceurl.app/s/abc123",
  "slug": "abc123",
  "original_url": "https://example.com",
  "created_at": "2024-01-15T12:00:00Z",
  "api_generated": true
}`}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="analytics" className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">GET</Badge>
                    <code className="text-sm">?action=analytics&slug=YOUR_SLUG</code>
                  </div>
                  <p className="text-sm text-muted-foreground">Get analytics for a specific link.</p>
                  
                  <CodeBlock
                    code={`curl "${BASE_URL}?action=analytics&slug=abc123" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                  />

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Response</p>
                    <CodeBlock
                      language="json"
                      code={`{
  "slug": "abc123",
  "original_url": "https://example.com",
  "total_clicks": 150,
  "unique_clicks": 89,
  "countries": {"India": 45, "United States": 38, "Germany": 12},
  "devices": {"mobile": 85, "desktop": 60, "tablet": 5},
  "browsers": {"Chrome": 90, "Safari": 35, "Firefox": 15},
  "os": {"Android": 50, "iOS": 35, "Windows": 40},
  "referrers": {"Direct": 80, "WhatsApp": 40, "Twitter": 20},
  "last_30_days": [{"date": "2024-01-01", "clicks": 5}, ...]
}`}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="list" className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">GET</Badge>
                    <code className="text-sm">?action=list&limit=50&offset=0</code>
                  </div>
                  <p className="text-sm text-muted-foreground">List all your shortened links with pagination.</p>
                  
                  <CodeBlock
                    code={`curl "${BASE_URL}?action=list&limit=10" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                  />

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Response</p>
                    <CodeBlock
                      language="json"
                      code={`{
  "links": [
    {
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

                <TabsContent value="delete" className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">DELETE</Badge>
                    <code className="text-sm">?action=delete&slug=YOUR_SLUG</code>
                  </div>
                  <p className="text-sm text-muted-foreground">Delete a link you own.</p>
                  
                  <CodeBlock
                    code={`curl -X DELETE "${BASE_URL}?action=delete&slug=abc123" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
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
                  { code: 400, message: "Bad Request", desc: "Invalid request body or parameters" },
                  { code: 401, message: "Unauthorized", desc: "Missing or invalid API key" },
                  { code: 403, message: "Forbidden", desc: "API key revoked or invalid" },
                  { code: 404, message: "Not Found", desc: "Link not found or not owned by you" },
                  { code: 409, message: "Conflict", desc: "Custom slug already taken" },
                  { code: 429, message: "Too Many Requests", desc: "Rate limit exceeded" },
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
