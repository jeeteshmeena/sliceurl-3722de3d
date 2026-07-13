import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

type Settings = {
  id?: string;
  merchant_id: string;
  merchant_key: string;
  env: "staging" | "production";
  website: string;
  is_active: boolean;
};

type LogRow = {
  id: string;
  event_type: string;
  paytm_order_id: string | null;
  paytm_txn_id: string | null;
  status: string | null;
  payment_status: string | null;
  verification_error: string | null;
  created_at: string;
  raw_payload: any;
};

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
};

type MerchantOrder = {
  id: string;
  order_number: string;
  external_order_id: string | null;
  amount: number;
  currency: string;
  customer_email: string | null;
  description: string | null;
  status: string;
  paytm_txn_id: string | null;
  verified_at: string | null;
  created_at: string;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

function randomKey(len = 40) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let s = "";
  for (const b of bytes) s += chars[b % chars.length];
  return `sk_${s}`;
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function AdminPaytm() {
  const [settings, setSettings] = useState<Settings>({
    merchant_id: "",
    merchant_key: "",
    env: "staging",
    website: "WEBSTAGING",
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [orders, setOrders] = useState<MerchantOrder[]>([]);
  const [showKey, setShowKey] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [freshKey, setFreshKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: l }, { data: k }, { data: o }] = await Promise.all([
      supabase.from("paytm_settings" as any).select("*").eq("is_active", true).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("paytm_callback_logs" as any).select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("merchant_api_keys" as any).select("id, name, key_prefix, is_active, last_used_at, created_at").order("created_at", { ascending: false }),
      supabase.from("merchant_orders" as any).select("id, order_number, external_order_id, amount, currency, customer_email, description, status, paytm_txn_id, verified_at, created_at").order("created_at", { ascending: false }).limit(50),
    ]);
    if (s) setSettings(s as any);
    if (l) setLogs(l as any);
    if (k) setKeys(k as any);
    if (o) setOrders(o as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const payload = { ...settings, updated_by: userRes.user?.id };
    const q = settings.id
      ? supabase.from("paytm_settings" as any).update(payload).eq("id", settings.id)
      : supabase.from("paytm_settings" as any).insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Paytm settings saved"); load(); }
  };

  const createKey = async () => {
    if (!newKeyName.trim()) return toast.error("Enter a key name");
    const raw = randomKey();
    const hash = await sha256Hex(raw);
    const prefix = raw.slice(0, 12);
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase.from("merchant_api_keys" as any).insert({
      name: newKeyName.trim(),
      key_hash: hash,
      key_prefix: prefix,
      created_by: userRes.user?.id,
    });
    if (error) return toast.error(error.message);
    setFreshKey(raw);
    setNewKeyName("");
    load();
  };

  const toggleKey = async (id: string, active: boolean) => {
    const { error } = await supabase.from("merchant_api_keys" as any).update({ is_active: !active }).eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  const deleteKey = async (id: string) => {
    if (!confirm("Delete this API key? Sites using it will stop working.")) return;
    const { error } = await supabase.from("merchant_api_keys" as any).delete().eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  const statusColor = (s: string | null) => {
    if (!s) return "text-muted-foreground";
    if (["verified", "success"].includes(s)) return "text-green-600";
    if (["pending", "duplicate", "initiate", "created"].includes(s)) return "text-amber-600";
    return "text-red-600";
  };

  const apiBase = `${SUPABASE_URL}/functions/v1/merchant-api`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Paytm Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Credentials, API keys for external sites, and payment logs.</p>
        </div>

        <Tabs defaultValue="creds" className="w-full">
          <TabsList className="rounded-xl">
            <TabsTrigger value="creds" className="rounded-lg">Credentials</TabsTrigger>
            <TabsTrigger value="keys" className="rounded-lg">API Keys</TabsTrigger>
            <TabsTrigger value="orders" className="rounded-lg">Merchant Orders</TabsTrigger>
            <TabsTrigger value="logs" className="rounded-lg">Callback Logs</TabsTrigger>
          </TabsList>

          {/* CREDENTIALS */}
          <TabsContent value="creds" className="mt-4">
            <Card className="p-6 space-y-4 rounded-[14px]">
              {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
                <>
                  <div className="grid gap-2">
                    <Label>Merchant ID (MID)</Label>
                    <Input value={settings.merchant_id ?? ""} onChange={(e) => setSettings({ ...settings, merchant_id: e.target.value })} placeholder="Resell..." />
                  </div>
                  <div className="grid gap-2">
                    <Label>Merchant Key</Label>
                    <div className="flex gap-2">
                      <Input type={showKey ? "text" : "password"} value={settings.merchant_key ?? ""} onChange={(e) => setSettings({ ...settings, merchant_key: e.target.value })} placeholder="KXU..." />
                      <Button type="button" variant="outline" onClick={() => setShowKey(!showKey)}>{showKey ? "Hide" : "Show"}</Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Environment</Label>
                      <select
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={settings.env}
                        onChange={(e) => setSettings({ ...settings, env: e.target.value as any, website: e.target.value === "production" ? "DEFAULT" : "WEBSTAGING" })}
                      >
                        <option value="staging">Staging (Test)</option>
                        <option value="production">Production (Live)</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Website</Label>
                      <Input value={settings.website ?? ""} onChange={(e) => setSettings({ ...settings, website: e.target.value })} placeholder="WEBSTAGING or DEFAULT" />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button onClick={save} disabled={saving} className="rounded-xl">{saving ? "Saving…" : "Save Settings"}</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Paytm callback URL: <code className="text-[11px]">{SUPABASE_URL}/functions/v1/paytm-callback</code>
                  </p>
                </>
              )}
            </Card>
          </TabsContent>

          {/* API KEYS */}
          <TabsContent value="keys" className="mt-4 space-y-4">
            <Card className="p-6 space-y-4 rounded-[14px]">
              <div>
                <h2 className="text-lg font-medium">Create API Key</h2>
                <p className="text-xs text-muted-foreground mt-1">Give external sites a key to create payment orders. The raw key is shown only once.</p>
              </div>
              {freshKey && (
                <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 space-y-2">
                  <div className="text-xs font-medium text-green-700 dark:text-green-400">Copy this key now — you won't see it again.</div>
                  <code className="block text-xs break-all bg-background rounded p-2">{freshKey}</code>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(freshKey); toast.success("Copied"); }}>Copy</Button>
                    <Button size="sm" variant="ghost" onClick={() => setFreshKey(null)}>Dismiss</Button>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="e.g. My Blog Site" />
                <Button onClick={createKey} className="rounded-xl">Generate</Button>
              </div>
            </Card>

            <Card className="p-6 rounded-[14px]">
              <h3 className="text-sm font-medium mb-3">Existing Keys</h3>
              {keys.length === 0 ? <p className="text-sm text-muted-foreground">No keys yet.</p> : (
                <div className="space-y-2">
                  {keys.map((k) => (
                    <div key={k.id} className="border border-border rounded-xl p-3 flex items-center justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <div className="font-medium text-sm">{k.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{k.key_prefix}••••</div>
                        <div className="text-[11px] text-muted-foreground">
                          Last used: {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "never"}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => toggleKey(k.id, k.is_active)}>{k.is_active ? "Disable" : "Enable"}</Button>
                        <Button size="sm" variant="outline" onClick={() => deleteKey(k.id)}>Delete</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6 rounded-[14px] space-y-3">
              <h3 className="text-sm font-medium">Integration Guide</h3>
              <p className="text-xs text-muted-foreground">From your external site, POST to create an order:</p>
              <pre className="text-[11px] bg-muted rounded-lg p-3 overflow-auto">{`curl -X POST ${apiBase}/orders \\
  -H "x-api-key: sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 199,
    "currency": "INR",
    "external_order_id": "your-order-123",
    "customer_email": "user@example.com",
    "customer_name": "Ravi",
    "customer_phone": "9999999999",
    "description": "Order for Widget X",
    "callback_url": "https://your-site.com/api/paytm-webhook",
    "return_url": "https://your-site.com/thank-you"
  }'`}</pre>
              <p className="text-xs text-muted-foreground">Response includes <code className="text-[11px]">checkout_url</code>. Redirect the user there. After payment we POST to your <code className="text-[11px]">callback_url</code> with the final status and redirect to <code className="text-[11px]">return_url</code>.</p>
              <p className="text-xs text-muted-foreground">Check status any time: <code className="text-[11px]">GET {apiBase}/orders/&#123;id&#125;</code> with the same <code className="text-[11px]">x-api-key</code> header.</p>
            </Card>
          </TabsContent>

          {/* MERCHANT ORDERS */}
          <TabsContent value="orders" className="mt-4">
            <Card className="p-6 space-y-3 rounded-[14px]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">External Site Orders</h2>
                <Button variant="outline" size="sm" onClick={load} className="rounded-xl">Refresh</Button>
              </div>
              {orders.length === 0 ? <p className="text-sm text-muted-foreground">No merchant orders yet.</p> : (
                <div className="space-y-2">
                  {orders.map((o) => (
                    <div key={o.id} className="border border-border rounded-xl p-3 text-sm">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs">{o.order_number}</span>
                          <span className={`font-medium ${statusColor(o.status)}`}>{o.status}</span>
                          <span className="text-xs">{o.currency} {Number(o.amount).toFixed(2)}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-4">
                        {o.external_order_id && <span>External: {o.external_order_id}</span>}
                        {o.customer_email && <span>{o.customer_email}</span>}
                        {o.paytm_txn_id && <span>Txn: {o.paytm_txn_id}</span>}
                        {o.verified_at && <span>Verified: {new Date(o.verified_at).toLocaleString()}</span>}
                      </div>
                      {o.description && <div className="mt-1 text-xs">{o.description}</div>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* LOGS */}
          <TabsContent value="logs" className="mt-4">
            <Card className="p-6 space-y-3 rounded-[14px]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">Callback & Initiate Events</h2>
                <Button variant="outline" size="sm" onClick={load} className="rounded-xl">Refresh</Button>
              </div>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events yet.</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="border border-border rounded-xl p-3 text-sm">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-3">
                          <span className="text-xs uppercase text-muted-foreground">{log.event_type}</span>
                          <span className={`font-medium ${statusColor(log.status)}`}>{log.status ?? "—"}</span>
                          {log.payment_status && <span className="text-xs text-muted-foreground">payment: {log.payment_status}</span>}
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-4">
                        {log.paytm_order_id && <span>Order: {log.paytm_order_id}</span>}
                        {log.paytm_txn_id && <span>Txn: {log.paytm_txn_id}</span>}
                      </div>
                      {log.verification_error && (
                        <div className="mt-1 text-xs text-red-600">Error: {log.verification_error}</div>
                      )}
                      <button
                        className="mt-2 text-xs underline text-muted-foreground"
                        onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                      >
                        {expanded === log.id ? "Hide" : "Show"} raw payload
                      </button>
                      {expanded === log.id && (
                        <pre className="mt-2 text-[11px] bg-muted rounded-lg p-2 overflow-auto max-h-64">
                          {JSON.stringify(log.raw_payload, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
