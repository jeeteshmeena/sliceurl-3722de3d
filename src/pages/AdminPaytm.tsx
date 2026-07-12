import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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
  const [showKey, setShowKey] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: l }] = await Promise.all([
      supabase.from("paytm_settings" as any).select("*").eq("is_active", true).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("paytm_callback_logs" as any).select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    if (s) setSettings(s as any);
    if (l) setLogs(l as any);
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

  const statusColor = (s: string | null) => {
    if (!s) return "text-muted-foreground";
    if (["verified", "success"].includes(s)) return "text-green-600";
    if (["pending", "duplicate", "initiate"].includes(s)) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">Paytm Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage credentials and inspect callback verification results.</p>
        </div>

        <Card className="p-6 space-y-4 rounded-[14px]">
          <h2 className="text-lg font-medium">Credentials</h2>
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
                Callback URL to configure in Paytm dashboard:{" "}
                <code className="text-[11px]">https://tmradwktewgxfxtdnotd.supabase.co/functions/v1/paytm-callback</code>
              </p>
            </>
          )}
        </Card>

        <Card className="p-6 space-y-3 rounded-[14px]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Recent Callback & Initiate Events</h2>
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
      </main>
      <Footer />
    </div>
  );
}
