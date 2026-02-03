import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SlidingToggle } from "@/components/ui/sliding-toggle";
import { Lock, Check, X, Loader2, Settings2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/hooks/useLinks";
import { getDisplayDomain } from "@/lib/domain";
import { useSlugValidation } from "@/hooks/useSlugValidation";
import { InfoTooltip } from "./InfoTooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface EditLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  link: Link | null;
  onUpdateLink: (id: string, updates: Partial<Link> & { password_hash?: string | null }) => Promise<void>;
}

export function EditLinkDialog({ open, onOpenChange, link, onUpdateLink }: EditLinkDialogProps) {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxClicks, setMaxClicks] = useState("");

  // Slug validation with backend check
  const { 
    slug: customSlug, 
    status: slugStatus, 
    handleSlugChange, 
    setSlug: setCustomSlug, 
    setStatus: setSlugStatus 
  } = useSlugValidation("", link?.id);

  useEffect(() => {
    if (link) {
      setTitle(link.title || "");
      setIsPasswordProtected(link.is_password_protected);
      setExpiresAt(link.expires_at ? link.expires_at.slice(0, 16) : "");
      setMaxClicks(link.max_clicks?.toString() || "");
      setCustomSlug(link.custom_slug || link.short_code || "");
      setSlugStatus('idle');
      setNewPassword("");
      setConfirmPassword("");
      setShowAdvanced(false);
    }
  }, [link, setCustomSlug, setSlugStatus]);

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

    // Validate slug
    if (customSlug && slugStatus === 'taken') {
      toast.error("Slug already in use");
      return;
    }
    if (customSlug && slugStatus === 'invalid') {
      toast.error("Invalid slug");
      return;
    }

    setLoading(true);
    try {
      const updates: Partial<Link> & { password_hash?: string | null } = {
        title: title || null,
        is_password_protected: isPasswordProtected,
        expires_at: expiresAt || null,
        max_clicks: maxClicks ? parseInt(maxClicks) : null,
      };

      // Update slug if changed
      if (customSlug && customSlug !== link.short_code && customSlug !== link.custom_slug) {
        updates.custom_slug = customSlug;
        updates.short_code = customSlug;
      }

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

  const handleClose = () => {
    onOpenChange(false);
  };

  if (!link || !open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[400] bg-foreground/60 backdrop-blur-[2px]"
            onClick={handleClose}
          />

          {/* Modal Content */}
          <motion.div
            initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.97 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
            exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={`fixed z-[500] bg-background ${
              isMobile
                ? "inset-x-0 bottom-0 rounded-t-[18px] max-h-[90vh]"
                : "left-1/2 top-[76px] -translate-x-1/2 w-[94%] max-w-[420px] rounded-[18px] max-h-[calc(100dvh-76px-16px)]"
            } shadow-[0_10px_30px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 className="text-base font-semibold">Edit Link Settings</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground h-8 px-3"
              >
                Close
              </Button>
            </div>

            {/* Scrollable Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Original URL (read-only) */}
              <div className="space-y-2">
                <Label className="text-[13px] font-medium text-muted-foreground">Original URL</Label>
                <div className="text-[13px] text-foreground bg-muted/30 rounded-[12px] p-3 break-all">
                  {link.original_url}
                </div>
              </div>

              {/* Custom Slug - editable with validation */}
              <div className="space-y-2">
                <Label htmlFor="edit-slug" className="text-[13px] font-medium">Short Link</Label>
                <div className="flex items-center rounded-[12px] border border-border bg-muted/30 overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0">
                  <span className="px-3 text-[13px] text-muted-foreground whitespace-nowrap bg-muted/50 h-11 flex items-center border-r border-border">
                    {getDisplayDomain()}/s/
                  </span>
                  <Input
                    id="edit-slug"
                    placeholder="my-link"
                    value={customSlug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className="text-[14px] h-11 border-0 focus-visible:ring-0 rounded-none"
                  />
                  {slugStatus !== 'idle' && (
                    <div className="pr-3">
                      {slugStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      {slugStatus === 'available' && <Check className="h-4 w-4 text-green-500" />}
                      {slugStatus === 'taken' && <X className="h-4 w-4 text-destructive" />}
                      {slugStatus === 'invalid' && <X className="h-4 w-4 text-destructive" />}
                    </div>
                  )}
                </div>
                {slugStatus === 'available' && customSlug && (
                  <p className="text-xs text-green-500">Slug available</p>
                )}
                {slugStatus === 'taken' && customSlug && (
                  <p className="text-xs text-destructive">Slug already in use</p>
                )}
                {slugStatus === 'invalid' && customSlug && (
                  <p className="text-xs text-destructive">Invalid (min 2 chars, letters, numbers, dashes only)</p>
                )}
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="edit-title" className="text-[13px] font-medium">Title (optional)</Label>
                <Input
                  id="edit-title"
                  placeholder="Link title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-[14px] h-11"
                />
              </div>

              {/* Password Protection Toggle */}
              <div className="rounded-[12px] border border-border bg-muted/30 overflow-hidden">
                <div className="flex items-center justify-between py-3 px-4">
                  <div className="flex items-center gap-3">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="edit-password-toggle" className="cursor-pointer text-[13px] font-medium">
                        Password Protection
                      </Label>
                      <InfoTooltip content="Require visitors to enter a password before accessing the link." />
                    </div>
                  </div>
                  <SlidingToggle
                    id="edit-password-toggle"
                    checked={isPasswordProtected}
                    onCheckedChange={setIsPasswordProtected}
                  />
                </div>
                
                {isPasswordProtected && (
                  <div className="px-4 pb-4 space-y-3 animate-fade-in border-t border-border pt-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-new-password" className="text-[13px]">
                        {link.is_password_protected ? "New Password (leave empty to keep current)" : "Set Password"}
                      </Label>
                      <Input
                        id="edit-new-password"
                        type="password"
                        placeholder={link.is_password_protected ? "Leave empty to keep current" : "Enter password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-10"
                      />
                    </div>
                    {newPassword && (
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-confirm-password" className="text-[13px]">Confirm Password</Label>
                        <Input
                          id="edit-confirm-password"
                          type="password"
                          placeholder="Confirm password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="h-10"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Advanced Options */}
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="w-full justify-between h-11 px-4 rounded-[12px] border border-border bg-muted/30"
                  >
                    <span className="flex items-center gap-3">
                      <Settings2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-[13px] font-medium">Advanced Options</span>
                    </span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3 animate-fade-in">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-expires" className="text-[13px]">Expiration Date</Label>
                    <Input
                      id="edit-expires"
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-max-clicks" className="text-[13px]">Max Clicks</Label>
                    <Input
                      id="edit-max-clicks"
                      type="number"
                      placeholder="Unlimited"
                      min="1"
                      value={maxClicks}
                      onChange={(e) => setMaxClicks(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Save Button */}
              <Button 
                type="submit" 
                className="w-full h-12 text-[14px] font-medium rounded-[12px]" 
                disabled={loading || slugStatus === 'checking'}
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
