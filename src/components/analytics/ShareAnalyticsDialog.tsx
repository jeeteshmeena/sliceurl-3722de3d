import { useState } from "react";
import { Share2, Copy, Check, Lock, Calendar, Trash2, Eye, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ShareAnalyticsDialogProps {
  linkId: string;
  linkTitle?: string;
  existingShares?: SharedAnalytics[];
  onShareCreated?: () => void;
}

interface SharedAnalytics {
  id: string;
  share_token: string;
  expires_at: string | null;
  is_active: boolean;
  views_count: number;
  created_at: string;
  password_hash: string | null;
}

export function ShareAnalyticsDialog({ 
  linkId, 
  linkTitle, 
  existingShares = [],
  onShareCreated 
}: ShareAnalyticsDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Form state
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [password, setPassword] = useState("");
  const [expiryDays, setExpiryDays] = useState<string>("0");
  
  // Result state
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const handleCreateShare = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to share analytics");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shared-analytics`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            link_id: linkId,
            password: passwordEnabled ? password : null,
            expires_in_days: parseInt(expiryDays) || null
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create share link');
      }

      // Build share URL
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/shared/${data.share_token}`;
      setShareUrl(url);
      
      toast.success("Share link created!");
      onShareCreated?.();
    } catch (error) {
      console.error('Error creating share:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create share link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteShare = async (token: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shared-analytics?token=${token}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      if (response.ok) {
        toast.success("Share link deleted");
        onShareCreated?.();
      }
    } catch (error) {
      console.error('Error deleting share:', error);
      toast.error('Failed to delete share link');
    }
  };

  const resetForm = () => {
    setShareUrl(null);
    setPassword("");
    setPasswordEnabled(false);
    setExpiryDays("0");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 rounded-xl px-2 sm:px-3 min-w-fit">
          <Share2 className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline text-xs">Share</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Analytics
          </DialogTitle>
          <DialogDescription>
            Create a public link to share this analytics dashboard
            {linkTitle && <span className="font-medium"> for "{linkTitle}"</span>}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {!shareUrl ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 pt-2"
            >
              {/* Password Protection */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center gap-3">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Password Protection</p>
                    <p className="text-xs text-muted-foreground">Require password to view</p>
                  </div>
                </div>
                <Switch 
                  checked={passwordEnabled} 
                  onCheckedChange={setPasswordEnabled}
                />
              </div>

              {passwordEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Label htmlFor="password" className="text-xs text-muted-foreground">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1.5"
                  />
                </motion.div>
              )}

              {/* Expiry */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Expiry</p>
                    <p className="text-xs text-muted-foreground">Auto-expire the link</p>
                  </div>
                </div>
                <Select value={expiryDays} onValueChange={setExpiryDays}>
                  <SelectTrigger className="w-28 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Never</SelectItem>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Existing Shares */}
              {existingShares.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Existing share links</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {existingShares.map((share) => (
                      <div 
                        key={share.id} 
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center gap-2">
                          {share.password_hash && <Lock className="h-3 w-3 text-muted-foreground" />}
                          <span className="font-mono">{share.share_token.slice(0, 8)}...</span>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Eye className="h-3 w-3" /> {share.views_count}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-6 w-6"
                          onClick={() => handleDeleteShare(share.share_token)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                onClick={handleCreateShare} 
                disabled={loading || (passwordEnabled && !password.trim())}
                className="w-full gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" />
                    Create Share Link
                  </>
                )}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 pt-2"
            >
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-2">Your share link</p>
                <div className="flex items-center gap-2">
                  <Input 
                    value={shareUrl} 
                    readOnly 
                    className="font-mono text-sm bg-background"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  {passwordEnabled && (
                    <span className="flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Password protected
                    </span>
                  )}
                  {expiryDays !== "0" && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Expires in {expiryDays} days
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={resetForm} className="flex-1">
                  Create Another
                </Button>
                <Button onClick={() => setOpen(false)} className="flex-1">
                  Done
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
