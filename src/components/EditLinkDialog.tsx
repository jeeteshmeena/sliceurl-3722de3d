import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/hooks/useLinks";

interface EditLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  link: Link | null;
  onUpdateLink: (id: string, updates: Partial<Link> & { password_hash?: string | null }) => Promise<void>;
}

export function EditLinkDialog({ open, onOpenChange, link, onUpdateLink }: EditLinkDialogProps) {
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxClicks, setMaxClicks] = useState("");

  useEffect(() => {
    if (link) {
      setTitle(link.title || "");
      setIsPasswordProtected(link.is_password_protected);
      setExpiresAt(link.expires_at ? link.expires_at.slice(0, 16) : "");
      setMaxClicks(link.max_clicks?.toString() || "");
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [link]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!link) return;

    // Validate password if setting new one
    if (isPasswordProtected && newPassword) {
      if (newPassword.length < 4) {
        toast.error("Password too short", { description: "Password must be at least 4 characters" });
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("Passwords don't match");
        return;
      }
    }

    setLoading(true);
    try {
      const updates: Partial<Link> & { password_hash?: string | null } = {
        title: title || null,
        is_password_protected: isPasswordProtected,
        expires_at: expiresAt || null,
        max_clicks: maxClicks ? parseInt(maxClicks) : null,
      };

      // Update password if provided
      if (isPasswordProtected && newPassword) {
        updates.password_hash = newPassword;
      } else if (!isPasswordProtected) {
        updates.password_hash = null;
      }

      await onUpdateLink(link.id, updates);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  if (!link) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Link Settings</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              placeholder="Link title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <span className="font-medium">{window.location.origin}/s/{link.short_code}</span>
          </div>

          {/* Password Protection */}
          <div className="space-y-3 rounded-xl border border-border p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="edit-password-toggle" className="cursor-pointer">Password Protection</Label>
              </div>
              <Switch
                id="edit-password-toggle"
                checked={isPasswordProtected}
                onCheckedChange={setIsPasswordProtected}
              />
            </div>
            
            {isPasswordProtected && (
              <div className="space-y-3 pt-2 animate-fade-in">
                <div className="space-y-2">
                  <Label htmlFor="edit-new-password">
                    {link.is_password_protected ? "New Password (leave empty to keep current)" : "Set Password"}
                  </Label>
                  <Input
                    id="edit-new-password"
                    type="password"
                    placeholder={link.is_password_protected ? "Leave empty to keep current" : "Enter password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                {newPassword && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-confirm-password">Confirm Password</Label>
                    <Input
                      id="edit-confirm-password"
                      type="password"
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Expiration & Max Clicks */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-expires">Expires At</Label>
              <Input
                id="edit-expires"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-max-clicks">Max Clicks</Label>
              <Input
                id="edit-max-clicks"
                type="number"
                placeholder="Unlimited"
                min="1"
                value={maxClicks}
                onChange={(e) => setMaxClicks(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}