import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SlidingToggle } from "@/components/ui/sliding-toggle";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Lock, ChevronDown, Settings2, Eye, BarChart3, Check, X, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { toast } from "sonner";
import { CreateLinkData } from "@/hooks/useLinks";
import { getDisplayDomain } from "@/lib/domain";
import { UtmParams } from "./utm/UtmForm";
import { InlineUtmSection } from "./utm/InlineUtmSection";
import { buildUtmUrl } from "./utm/UtmPreview";
import { useLinkBehavior } from "@/hooks/useLinkBehavior";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSlugValidation } from "@/hooks/useSlugValidation";
import { InfoTooltip } from "./InfoTooltip";

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
   const { t } = useLanguage();
   const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Get global link preview setting
  const { linkPreviewEnabled: globalLinkPreview } = useLinkBehavior();
  
  // Form state
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxClicks, setMaxClicks] = useState("");
  
  // Per-link preview toggle (only used when global is OFF)
  const [linkPreviewForThis, setLinkPreviewForThis] = useState(false);

  // UTM state - now inline toggle
  const [utmEnabled, setUtmEnabled] = useState(false);
  const [utmParams, setUtmParams] = useState<UtmParams>(emptyUtmParams);

  // Slug validation with real backend check
  const { slug: customSlug, status: slugStatus, handleSlugChange, setSlug: setCustomSlug, setStatus: setSlugStatus } = useSlugValidation();

  const handleUtmChange = (params: UtmParams) => {
    setUtmParams(params);
  };

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
    setLinkPreviewForThis(false);
    setSlugStatus('idle');
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
      toast.error("UTM Source is required when UTM tracking is enabled");
      return;
    }

    // Slug validation - reject if taken or invalid
    if (customSlug && (slugStatus === 'taken' || slugStatus === 'invalid')) {
      toast.error(slugStatus === 'taken' ? "Slug already in use" : "Invalid slug");
      return;
    }

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

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  if (!open) return null;

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
              <h2 className="text-base font-semibold">{t("create_new_link")}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground h-8 px-3"
              >
                 {t("close")}
              </Button>
            </div>

            {/* Scrollable Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* 1. Destination URL */}
              <div className="space-y-2">
                 <Label htmlFor="url" className="text-[13px] font-medium">{t("destination_url")}</Label>
                 <Input
                   id="url"
                   placeholder={t("destination_url_placeholder")}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="text-[14px] h-11"
                />
              </div>

              {/* 2. Custom Slug - paa.ge style */}
              <div className="space-y-2">
                <Label htmlFor="slug" className="text-[13px] font-medium">{t("custom_slug_optional")}</Label>
                <div className="flex items-center rounded-[12px] border border-border bg-muted/30 overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0">
                  <span className="px-3 text-[13px] text-muted-foreground whitespace-nowrap bg-muted/50 h-11 flex items-center border-r border-border">
                    {getDisplayDomain()}/s/
                  </span>
                  <Input
                    id="slug"
                    placeholder={t("custom_slug_placeholder")}
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
                  <p className="text-xs text-green-500">{t("slug_available")}</p>
                )}
                {slugStatus === 'taken' && customSlug && (
                  <p className="text-xs text-destructive">{t("slug_already_used")}</p>
                )}
                {slugStatus === 'invalid' && customSlug && (
                  <p className="text-xs text-destructive">{t("slug_invalid")}</p>
                )}
              </div>

              {/* 3. Title (optional) */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-[13px] font-medium">Title (optional)</Label>
                <Input
                  id="title"
                  placeholder="My awesome link"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-[14px] h-11"
                />
              </div>

              {/* 4. Link Preview Toggle - Only visible when global setting is OFF */}
              {!globalLinkPreview && (
                <div className="flex items-center justify-between py-3 px-4 rounded-[12px] border border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="preview-toggle" className="cursor-pointer text-[13px] font-medium">
                        Link Preview
                      </Label>
                      <InfoTooltip content="Show a preview page before redirecting visitors." />
                    </div>
                  </div>
                  <SlidingToggle
                    id="preview-toggle"
                    checked={linkPreviewForThis}
                    onCheckedChange={setLinkPreviewForThis}
                  />
                </div>
              )}

              {/* 5. Password Protection Toggle */}
              <div className="rounded-[12px] border border-border bg-muted/30 overflow-hidden">
                <div className="flex items-center justify-between py-3 px-4">
                  <div className="flex items-center gap-3">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="password-toggle" className="cursor-pointer text-[13px] font-medium">
                        Password Protection
                      </Label>
                      <InfoTooltip content="Require visitors to enter a password before accessing the link." />
                    </div>
                  </div>
                  <SlidingToggle
                    id="password-toggle"
                    checked={isPasswordProtected}
                    onCheckedChange={setIsPasswordProtected}
                  />
                </div>
                
                {isPasswordProtected && (
                  <div className="px-4 pb-4 space-y-3 animate-fade-in border-t border-border pt-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-[13px]">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="confirm-password" className="text-[13px]">Confirm Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-10"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Visitors will need to enter this password to access the link.
                    </p>
                  </div>
                )}
              </div>

              {/* 6. UTM Tracking Toggle - Inline */}
              <div className="rounded-[12px] border border-border bg-muted/30 overflow-hidden">
                <div className="flex items-center justify-between py-3 px-4">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="utm-toggle" className="cursor-pointer text-[13px] font-medium">
                        UTM Tracking
                      </Label>
                      <InfoTooltip content="Add UTM parameters for analytics tracking." />
                    </div>
                  </div>
                  <SlidingToggle
                    id="utm-toggle"
                    checked={utmEnabled}
                    onCheckedChange={setUtmEnabled}
                  />
                </div>
                
                {utmEnabled && (
                  <div className="px-4 pb-4 border-t border-border">
                    <InlineUtmSection params={utmParams} onChange={handleUtmChange} />
                  </div>
                )}
              </div>

              {/* 7. Advanced Options */}
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
                    <Label htmlFor="expires" className="text-[13px]">Expiration Date</Label>
                    <Input
                      id="expires"
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="max-clicks" className="text-[13px]">Max Clicks</Label>
                    <Input
                      id="max-clicks"
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

              {/* 8. Create Button */}
              <Button 
                type="submit" 
                className="w-full h-12 text-[14px] font-medium rounded-[12px]" 
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Link"}
              </Button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
