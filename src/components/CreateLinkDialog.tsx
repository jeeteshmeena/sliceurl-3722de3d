import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SlidingToggle } from "@/components/ui/sliding-toggle";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Lock, ChevronDown, Settings2, Eye } from "lucide-react";
import { toast } from "sonner";
import { CreateLinkData } from "@/hooks/useLinks";
import { getDisplayDomain } from "@/lib/domain";
import { UtmSection } from "./utm/UtmSection";
import { UtmParams } from "./utm/UtmForm";
import { buildUtmUrl } from "./utm/UtmPreview";
import { useLinkBehavior } from "@/hooks/useLinkBehavior";

interface CreateLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateLink: (data: CreateLinkData) => Promise<any>;
}

const emptyUtmParams: UtmParams = {
  utm_source: "",
  utm_medium: "",
  utm_campaign: "",
  utm_term: "",
  utm_content: "",
};

export function CreateLinkDialog({ open, onOpenChange, onCreateLink }: CreateLinkDialogProps) {
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Get global link preview setting
  const { linkPreviewEnabled: globalLinkPreview } = useLinkBehavior();
  
  // Form state
  const [url, setUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [title, setTitle] = useState("");
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxClicks, setMaxClicks] = useState("");
  
  // Per-link preview toggle (only used when global is OFF)
  const [linkPreviewForThis, setLinkPreviewForThis] = useState(false);

  // UTM state
  const [utmEnabled, setUtmEnabled] = useState(false);
  const [utmParams, setUtmParams] = useState<UtmParams>(emptyUtmParams);
  const [utmError, setUtmError] = useState("");

  const resetForm = () => {
    setUrl("");
    setCustomSlug("");
    setTitle("");
    setIsPasswordProtected(false);
    setPassword("");
    setConfirmPassword("");
    setExpiresAt("");
    setMaxClicks("");
    setShowAdvanced(false);
    setUtmEnabled(false);
    setUtmParams(emptyUtmParams);
    setUtmError("");
    setLinkPreviewForThis(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url) {
      toast.error("URL is required");
      return;
    }

    try {
      new URL(url);
    } catch {
      toast.error("Invalid URL", { description: "Please enter a valid URL" });
      return;
    }

    if (isPasswordProtected) {
      if (!password) {
        toast.error("Password required", { description: "Please enter a password" });
        return;
      }
      if (password.length < 4) {
        toast.error("Password too short", { description: "Password must be at least 4 characters" });
        return;
      }
      if (password !== confirmPassword) {
        toast.error("Passwords don't match");
        return;
      }
    }

    // UTM validation
    if (utmEnabled && !utmParams.utm_source.trim()) {
      setUtmError("utm_source is required when UTM tracking is enabled");
      return;
    }
    setUtmError("");

    setLoading(true);
    try {
      // Build final URL with UTM if enabled
      const finalUtmUrl = utmEnabled ? buildUtmUrl(url, utmParams) : undefined;

      const linkData: CreateLinkData = {
        original_url: url,
        custom_slug: customSlug || undefined,
        title: title || undefined,
        is_password_protected: isPasswordProtected,
        password: isPasswordProtected ? password : undefined,
        expires_at: expiresAt || undefined,
        max_clicks: maxClicks ? parseInt(maxClicks) : undefined,
        // UTM fields
        utm_enabled: utmEnabled,
        utm_source: utmEnabled ? utmParams.utm_source || undefined : undefined,
        utm_medium: utmEnabled ? utmParams.utm_medium || undefined : undefined,
        utm_campaign: utmEnabled ? utmParams.utm_campaign || undefined : undefined,
        utm_term: utmEnabled ? utmParams.utm_term || undefined : undefined,
        utm_content: utmEnabled ? utmParams.utm_content || undefined : undefined,
        final_utm_url: finalUtmUrl,
      };

      const result = await onCreateLink(linkData);
      if (result) {
        resetForm();
        onOpenChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="sm:max-w-[420px] max-h-[calc(100dvh-76px-16px)] overflow-y-auto">
        <DialogHeader className="min-h-[48px]">
          <DialogTitle className="text-base font-semibold">Create New Link</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-[14px]">
          <div className="space-y-2">
            <Label htmlFor="url">Destination URL</Label>
            <Input
              id="url"
              placeholder="https://example.com/very-long-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug" className="text-[13px] font-medium">Custom Slug (optional)</Label>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted-foreground whitespace-nowrap">{getDisplayDomain()}/s/</span>
              <Input
                id="slug"
                placeholder="my-link"
                value={customSlug}
                onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="text-[14px]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-[13px] font-medium">Title (optional)</Label>
            <Input
              id="title"
              placeholder="My awesome link"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-[14px]"
            />
          </div>

          {/* Link Preview Toggle - Only visible when global setting is OFF */}
          {!globalLinkPreview && (
            <div className="space-y-3 rounded-xl border border-border p-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="preview-toggle" className="cursor-pointer">Link Preview</Label>
                    <p className="text-xs text-muted-foreground">
                      Show preview before redirecting
                    </p>
                  </div>
                </div>
                <SlidingToggle
                  id="preview-toggle"
                  checked={linkPreviewForThis}
                  onCheckedChange={setLinkPreviewForThis}
                />
              </div>
            </div>
          )}

          {/* Password Protection */}
          <div className="space-y-3 rounded-xl border border-border p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="password-toggle" className="cursor-pointer">Password Protection</Label>
              </div>
              <SlidingToggle
                id="password-toggle"
                checked={isPasswordProtected}
                onCheckedChange={setIsPasswordProtected}
              />
            </div>
            
            {isPasswordProtected && (
              <div className="space-y-3 pt-2 animate-fade-in">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Visitors will need to enter this password to access the link.
                </p>
              </div>
            )}
          </div>

          {/* Advanced Options */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Advanced Options
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="expires">Expiration Date (optional)</Label>
                <Input
                  id="expires"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-clicks">Max Clicks (optional)</Label>
                <Input
                  id="max-clicks"
                  type="number"
                  placeholder="Unlimited"
                  min="1"
                  value={maxClicks}
                  onChange={(e) => setMaxClicks(e.target.value)}
                />
              </div>
              
              {/* UTM Builder Section */}
              <UtmSection
                baseUrl={url}
                enabled={utmEnabled}
                onEnabledChange={setUtmEnabled}
                params={utmParams}
                onParamsChange={setUtmParams}
                error={utmError}
              />
            </CollapsibleContent>
          </Collapsible>

          <Button type="submit" className="w-full h-12 text-[14px] font-medium" disabled={loading}>
            {loading ? "Creating..." : "Create Link"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
