import { useState } from "react";
import { motion } from "framer-motion";
import { Key, Plus, Copy, Trash2, XCircle, AlertTriangle, Clock, Zap, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useApiKeys, type ApiKey } from "@/hooks/useApiKeys";
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
      toast({
        title: "Error",
        description: result.error || "Failed to create API key",
        variant: "destructive"
      });
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: "Copied!", description: "API key copied to clipboard" });
  };

  const handleRevoke = async (keyId: string) => {
    const success = await revokeKey(keyId);
    if (success) {
      toast({ title: "Key revoked", description: "API key has been revoked" });
    } else {
      toast({ title: "Error", description: "Failed to revoke key", variant: "destructive" });
    }
  };

  const handleDelete = async (keyId: string) => {
    const success = await deleteKey(keyId);
    if (success) {
      toast({ title: "Key deleted", description: "API key has been deleted" });
    } else {
      toast({ title: "Error", description: "Failed to delete key", variant: "destructive" });
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getResetTimeString = () => {
    if (!usage?.reset_at) return "";
    const reset = new Date(usage.reset_at);
    const now = new Date();
    const diff = reset.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-muted rounded-xl" />
        <div className="h-48 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Key className="h-5 w-5" />
            Developer Access
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage API keys for programmatic access to SliceURL
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/developers" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            API Docs
          </Link>
        </Button>
      </div>

      {/* Usage Stats */}
      {usage && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">API Usage Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-2xl font-bold">
                    {usage.requests_used} / {usage.requests_limit}
                  </p>
                  <p className="text-xs text-muted-foreground">requests used</p>
                </div>
              </div>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, (usage.requests_used / usage.requests_limit) * 100)}%` }}
                />
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Resets in {getResetTimeString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Keys List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">API Keys</CardTitle>
            <CardDescription>Generate keys to access SliceURL API</CardDescription>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Generate Key
          </Button>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No API keys yet</p>
              <p className="text-sm">Generate your first key to start using the API</p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <motion.div
                  key={key.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 rounded-xl border border-border bg-card/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm">{key.key_prefix}...</span>
                      <Badge variant={key.status === 'active' ? 'default' : 'secondary'}>
                        {key.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{key.name}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>Created {formatDate(key.created_at)}</span>
                      <span>{key.requests_today} calls today</span>
                      {key.last_request_at && (
                        <span>Last used {formatDate(key.last_request_at)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {key.status === 'active' && (
                      <Button 
                        variant="ghost" 
                        size="icon-sm"
                        onClick={() => handleRevoke(key.id)}
                        title="Revoke key"
                      >
                        <XCircle className="h-4 w-4 text-orange-500" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon-sm"
                      onClick={() => handleDelete(key.id)}
                      title="Delete key"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Key Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate API Key</DialogTitle>
            <DialogDescription>
              Create a new API key to access SliceURL programmatically
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Key Name (optional)</Label>
              <Input
                id="key-name"
                placeholder="My App API Key"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateKey} disabled={creating}>
              {creating ? "Generating..." : "Generate Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Key Display Dialog */}
      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Generated</DialogTitle>
          </DialogHeader>
          <Alert variant="default" className="border-orange-500/50 bg-orange-500/10">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <AlertDescription className="text-orange-600 dark:text-orange-400">
              Copy this key now! You won't be able to see it again.
            </AlertDescription>
          </Alert>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-sm break-all">
            <code className="flex-1">{newApiKey}</code>
            <Button 
              variant="ghost" 
              size="icon-sm"
              onClick={() => newApiKey && handleCopyKey(newApiKey)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              setShowNewKeyDialog(false);
              setNewApiKey(null);
            }}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
