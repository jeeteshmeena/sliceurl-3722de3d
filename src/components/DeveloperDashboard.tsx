import { useState } from "react";
import { motion } from "framer-motion";
import { Key, Plus, Copy, Trash2, XCircle, AlertTriangle, Clock, Activity, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useApiKeys } from "@/hooks/useApiKeys";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

export function DeveloperDashboard() {
  const { keys, usage, loading, creating, createKey, revokeKey, deleteKey } = useApiKeys();
  const { toast } = useToast();
  const [newKeyName, setNewKeyName] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);

  const handleCreateKey = async () => {
    const result = await createKey(newKeyName || undefined);
    if (result.api_key) {
      setNewApiKey(result.api_key);
      setShowCreateDialog(false);
      setShowNewKeyDialog(true);
      setNewKeyName("");
    } else {
      toast({ title: "Error", description: result.error || "Failed to create API key", variant: "destructive" });
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: "Copied", description: "API key copied to clipboard" });
  };

  const handleRevoke = async (keyId: string) => {
    const success = await revokeKey(keyId);
    toast(success
      ? { title: "Key revoked", description: "API key has been revoked" }
      : { title: "Error", description: "Failed to revoke key", variant: "destructive" });
  };

  const handleDelete = async (keyId: string) => {
    const success = await deleteKey(keyId);
    toast(success
      ? { title: "Key deleted", description: "API key has been deleted" }
      : { title: "Error", description: "Failed to delete key", variant: "destructive" });
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  const formatRelative = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return formatDate(date);
  };

  const getResetTimeString = () => {
    if (!usage?.reset_at) return "—";
    const diff = new Date(usage.reset_at).getTime() - Date.now();
    if (diff <= 0) return "now";
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-24 rounded-[14px] border border-border bg-muted/30" />
        <div className="h-40 rounded-[14px] border border-border bg-muted/30" />
      </div>
    );
  }

  const usagePct = usage ? Math.min(100, (usage.requests_used / Math.max(1, usage.requests_limit)) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Heading row */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Key className="h-[18px] w-[18px] text-foreground" strokeWidth={1.7} />
            Developer Access
          </h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Generate API keys to integrate SliceURL with bots, scripts and backends.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-2 shrink-0">
          <Link to="/developers">
            <BookOpen className="h-4 w-4" strokeWidth={1.7} />
            Docs
          </Link>
        </Button>
      </div>

      {/* Usage card */}
      {usage && (
        <div className="rounded-[14px] border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" strokeWidth={1.7} />
              <span className="text-[13px] font-medium text-muted-foreground">API Usage Today</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" strokeWidth={1.7} />
              Resets in {getResetTimeString()}
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-2xl font-semibold tabular-nums">{usage.requests_used.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">/ {usage.requests_limit.toLocaleString()} requests</span>
          </div>

          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground/80 transition-all duration-300"
              style={{ width: `${usagePct}%` }}
            />
          </div>
        </div>
      )}

      {/* Keys card */}
      <div className="rounded-[14px] border border-border bg-card">
        <div className="flex items-center justify-between p-5 pb-4">
          <div>
            <h3 className="text-[15px] font-semibold">API Keys</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Each key counts toward the daily quota independently.</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" strokeWidth={1.7} />
            New Key
          </Button>
        </div>

        <div className="border-t border-border">
          {keys.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                <Key className="h-5 w-5 text-muted-foreground" strokeWidth={1.7} />
              </div>
              <p className="text-sm font-medium">No API keys yet</p>
              <p className="text-xs text-muted-foreground mt-1">Generate your first key to start using the API.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {keys.map((key) => (
                <motion.div
                  key={key.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 p-4 sm:p-5"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-sm truncate">{key.name || "Unnamed key"}</span>
                      <Badge
                        variant={key.status === "active" ? "secondary" : "outline"}
                        className="text-[10px] px-1.5 py-0 h-5"
                      >
                        {key.status}
                      </Badge>
                    </div>
                    <code className="text-xs text-muted-foreground font-mono">{key.key_prefix}…</code>
                    <div className="flex items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      <span>Created {formatDate(key.created_at)}</span>
                      <span className="tabular-nums">{key.requests_today.toLocaleString()} calls today</span>
                      {key.last_request_at && <span>Last used {formatRelative(key.last_request_at)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {key.status === "active" && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRevoke(key.id)}
                        title="Revoke key"
                        className="h-8 w-8"
                      >
                        <XCircle className="h-4 w-4" strokeWidth={1.7} />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(key.id)}
                      title="Delete key"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.7} />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-[420px] rounded-[18px]">
          <DialogHeader>
            <DialogTitle>Generate API Key</DialogTitle>
            <DialogDescription>Give your key a name to identify where it's used.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="key-name" className="text-[13px]">Key name</Label>
            <Input
              id="key-name"
              placeholder="My Telegram Bot"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Close</Button>
            <Button onClick={handleCreateKey} disabled={creating}>
              {creating ? "Generating…" : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New key dialog */}
      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent className="max-w-[420px] rounded-[18px]">
          <DialogHeader>
            <DialogTitle>API Key Generated</DialogTitle>
            <DialogDescription>Save this key now. You won't be able to view it again.</DialogDescription>
          </DialogHeader>
          <Alert className="border-amber-500/30 bg-amber-500/5">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" strokeWidth={1.7} />
            <AlertDescription className="text-amber-700 dark:text-amber-400 text-xs">
              Treat this like a password — never commit it to source control.
            </AlertDescription>
          </Alert>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-[10px] font-mono text-xs break-all">
            <code className="flex-1">{newApiKey}</code>
            <Button variant="ghost" size="icon-sm" onClick={() => newApiKey && handleCopyKey(newApiKey)} className="h-7 w-7 shrink-0">
              <Copy className="h-3.5 w-3.5" strokeWidth={1.7} />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => { setShowNewKeyDialog(false); setNewApiKey(null); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
