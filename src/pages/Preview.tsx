import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ExternalLink, Loader2, AlertCircle, Ban, ShieldX, ShieldBan, ShieldCheck, AlertTriangle, Bug, Eye, MousePointerClick, Radio, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordModal } from "@/components/PasswordModal";
import { Badge } from "@/components/ui/badge";
import { SliceAnimation } from "@/components/SliceAnimation";
import { SliceLogo as SliceLogoComponent } from "@/components/SliceLogo";

interface LinkInfo {
  id: string;
  original_url: string;
  title?: string | null;
  requires_password: boolean;
  custom_og_title?: string | null;
  custom_og_description?: string | null;
  facebook_pixel?: string | null;
  google_pixel?: string | null;
  link_preview_enabled?: boolean;
  security_mode?: 'warn' | 'strict';
}

interface SafetyResult {
  status: 'safe' | 'unsafe' | 'suspicious' | 'unknown';
  threats: string[];
  message: string;
  riskScore: number;
  riskFactors: string[];
  redirectCount?: number;
  detectedIssues?: string[];
}

type SecurityMode = 'warn' | 'strict';
type PreviewStatus = "loading" | "ready" | "password-required" | "redirecting" | "expired" | "max-clicks" | "not-found" | "error" | "blocked" | "warning" | "instant-redirect";

// Category badge mapping - separate adult from malware
const categoryBadges: Record<string, { label: string; icon: React.ElementType; color: string; isMalware: boolean }> = {
  'Adult Content': { label: '18+ Adult Content', icon: Eye, color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', isMalware: false },
  'Phishing': { label: 'Phishing Risk', icon: AlertTriangle, color: 'bg-red-500/10 text-red-500 border-red-500/20', isMalware: true },
  'Malware': { label: 'Malware Risk', icon: Bug, color: 'bg-red-500/10 text-red-500 border-red-500/20', isMalware: true },
  'Scam': { label: 'Scam Risk', icon: AlertCircle, color: 'bg-red-500/10 text-red-500 border-red-500/20', isMalware: true },
  'Spam': { label: 'Spam Risk', icon: AlertCircle, color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', isMalware: true },
  'Pop-ups': { label: 'Pop-ups', icon: MousePointerClick, color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', isMalware: false },
  'Trackers': { label: 'Trackers', icon: Radio, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', isMalware: false },
};

// Get local link preview preference - checks both localStorage AND Supabase
function getLocalLinkPreviewEnabled(): boolean {
  try {
    const stored = localStorage.getItem('sliceurl-link-preview');
    if (stored !== null) {
      return stored === 'true';
    }
    // Check for legacy 'disable' mode
    const legacyMode = localStorage.getItem('sliceurl-security-mode');
    if (legacyMode === 'disable') {
      return false;
    }
  } catch {
    // localStorage not available
  }
  return true; // Default: preview enabled
}

// Get local security mode preference
function getLocalSecurityMode(): SecurityMode {
  try {
    const stored = localStorage.getItem('sliceurl-security-mode');
    if (stored && ['warn', 'strict'].includes(stored)) {
      return stored as SecurityMode;
    }
  } catch {
    // localStorage not available
  }
  return 'warn';
}

export default function Preview() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<PreviewStatus>("loading");
  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [expirationDate, setExpirationDate] = useState<string | null>(null);
  const [safetyResult, setSafetyResult] = useState<SafetyResult | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showInstantRedirectOverlay, setShowInstantRedirectOverlay] = useState(false);
  const [pendingRedirectUrl, setPendingRedirectUrl] = useState<string | null>(null);
  const redirectTriggered = useRef(false);
  const instantRedirectAttempted = useRef(false);

  // Trigger the redirect check on mount
  useEffect(() => {
    if (shortCode && !instantRedirectAttempted.current) {
      instantRedirectAttempted.current = true;
      
      // Check local preference IMMEDIATELY - no async, no flicker
      const localPreviewEnabled = getLocalLinkPreviewEnabled();
      
      if (!localPreviewEnabled) {
        // Preview OFF: Show Slice Animation IMMEDIATELY - no API wait, no UI
        setStatus("instant-redirect");
        setShowInstantRedirectOverlay(true);
        
        // Fetch link info in background for redirect
        fetchLinkForInstantRedirect();
      } else {
        // Preview is enabled - proceed with normal flow
        fetchLinkInfo();
      }
    }
  }, [shortCode]);

  // Fetch link info asynchronously for instant redirect (runs in background while animation plays)
  const fetchLinkForInstantRedirect = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/redirect?code=${shortCode}&preview=true&skipSafety=true`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const result = await response.json();

      // Handle expired links - ALWAYS show expired screen, even with Preview OFF
      if (!response.ok && result.code === 'EXPIRED') {
        setShowInstantRedirectOverlay(false);
        setExpirationDate(result.expires_at || null);
        setStatus("expired");
        return;
      }

      if (response.ok) {
        const redirectUrl = result.redirect_url || result.original_url;
        
        if (result.requires_password) {
          // Password required - switch to password flow
          setShowInstantRedirectOverlay(false);
          setLinkInfo({
            id: result.link_id || result.id,
            original_url: redirectUrl,
            requires_password: true,
            link_preview_enabled: false,
          });
          setStatus("password-required");
          setShowPasswordModal(true);
          return;
        }
        
        // Store link info for redirect
        setPendingRedirectUrl(redirectUrl);
        setLinkInfo({
          id: result.link_id || result.id,
          original_url: redirectUrl,
          requires_password: false,
          facebook_pixel: result.facebook_pixel,
          google_pixel: result.google_pixel,
          link_preview_enabled: false,
        });
      } else {
        // Error - fall back to normal flow
        setShowInstantRedirectOverlay(false);
        fetchLinkInfo();
      }
    } catch (err) {
      console.error("Error fetching link for instant redirect:", err);
      setShowInstantRedirectOverlay(false);
      fetchLinkInfo();
    }
  };

  const handleInstantRedirectComplete = () => {
    if (pendingRedirectUrl && linkInfo) {
      // Track click in background - don't wait
      fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-click`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            link_id: linkInfo.id,
            referrer: document.referrer,
          }),
        }
      ).catch(err => console.error("Error tracking click:", err));

      // Record redirect time for avg slice time stat
      fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/record-redirect`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ link_id: linkInfo.id }),
        }
      ).catch(err => console.error("Error recording redirect:", err));

      // Inject pixels
      if (linkInfo.facebook_pixel) {
        injectFacebookPixel(linkInfo.facebook_pixel);
      }
      if (linkInfo.google_pixel) {
        injectGooglePixel(linkInfo.google_pixel);
      }

      // Redirect instantly using replace (no browser history entry)
      window.location.replace(pendingRedirectUrl);
    }
  };

  const checkUrlSafety = async (url: string): Promise<SafetyResult> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-url-safety`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        }
      );
      
      if (!response.ok) {
        return { status: 'safe', threats: [], message: 'Safety check unavailable', riskScore: 0, riskFactors: [], detectedIssues: [] };
      }
      
      return await response.json();
    } catch (err) {
      console.error("Safety check error:", err);
      return { status: 'safe', threats: [], message: 'Safety check failed', riskScore: 0, riskFactors: [], detectedIssues: [] };
    }
  };

  // Helper to check if threats contain malware/phishing (blockable)
  const hasMalwareOrPhishing = (threats: string[]): boolean => {
    return threats.some(t => {
      const lower = t.toLowerCase();
      return lower.includes('malware') || 
             lower.includes('phishing') ||
             lower.includes('executable') ||
             lower.includes('scam') ||
             lower.includes('spam');
    });
  };

  const fetchLinkInfo = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/redirect?code=${shortCode}&preview=true`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (result.code === 'NOT_FOUND') {
          setStatus("not-found");
        } else if (result.code === 'EXPIRED') {
          setExpirationDate(result.expires_at || null);
          setStatus("expired");
        } else if (result.code === 'MAX_CLICKS') {
          setStatus("max-clicks");
        } else {
          setStatus("error");
        }
        return;
      }

      // Determine security mode - only 'warn' and 'strict' now
      let securityMode: SecurityMode = 'warn';
      if (result.security_mode === 'strict') {
        securityMode = 'strict';
      }

      // Check if link preview should be shown based on server response or local preference
      const serverPreviewEnabled = result.auto_redirect_enabled !== true && result.security_mode !== 'disable';
      const localPreviewEnabled = getLocalLinkPreviewEnabled();
      const previewEnabled = serverPreviewEnabled && localPreviewEnabled;

      const linkData: LinkInfo = {
        id: result.link_id || result.id,
        original_url: result.redirect_url || result.original_url,
        title: result.title || result.custom_og_title,
        requires_password: result.requires_password || false,
        custom_og_title: result.custom_og_title,
        custom_og_description: result.custom_og_description,
        facebook_pixel: result.facebook_pixel,
        google_pixel: result.google_pixel,
        link_preview_enabled: previewEnabled,
        security_mode: securityMode,
      };

      setLinkInfo(linkData);

      // Password check first
      if (result.requires_password) {
        setStatus("password-required");
        setShowPasswordModal(true);
        return;
      }

      // If preview is disabled, show animation and redirect
      if (!previewEnabled && !redirectTriggered.current) {
        redirectTriggered.current = true;
        setPendingRedirectUrl(linkData.original_url);
        setStatus("instant-redirect");
        setShowInstantRedirectOverlay(true);
        return;
      }

      // MODE: STRICT - Check safety FIRST, block malware before showing anything
      if (securityMode === 'strict') {
        const safety = await checkUrlSafety(linkData.original_url);
        setSafetyResult(safety);
        
        if (hasMalwareOrPhishing(safety.threats)) {
          setStatus("blocked");
          return;
        }
        // If strict mode but no malware, show warning page with threats if any
        if (safety.threats.length > 0) {
          setStatus("warning");
          return;
        }
        // Clean link in strict mode - allow through
        setStatus("ready");
        return;
      }

      // MODE: WARN - Always show warning screen first, run safety check
      const safety = await checkUrlSafety(linkData.original_url);
      setSafetyResult(safety);
      setStatus("warning");
      
    } catch (err) {
      console.error("Error fetching link:", err);
      setStatus("error");
    }
  };

  const handlePasswordSubmit = async (password: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            short_code: shortCode,
            password: password,
          }),
        }
      );

      const result = await response.json();

      if (result.valid && result.original_url) {
        const localPreviewEnabled = getLocalLinkPreviewEnabled();
        
        const updatedLinkInfo: LinkInfo = {
          ...linkInfo!,
          original_url: result.original_url,
          requires_password: false,
          link_preview_enabled: localPreviewEnabled,
        };
        setLinkInfo(updatedLinkInfo);
        
        // If preview is disabled, show animation and redirect
        if (!localPreviewEnabled) {
          setPendingRedirectUrl(result.original_url);
          setStatus("instant-redirect");
          setShowInstantRedirectOverlay(true);
          setShowPasswordModal(false);
          return true;
        }
        
        // Run safety check for warn/strict modes
        const safety = await checkUrlSafety(result.original_url);
        setSafetyResult(safety);
        
        const securityMode = updatedLinkInfo.security_mode || 'warn';
        
        if (securityMode === 'strict' && hasMalwareOrPhishing(safety.threats)) {
          setStatus("blocked");
          setShowPasswordModal(false);
          return true;
        }
        
        setStatus("warning");
        setShowPasswordModal(false);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Password verification error:", err);
      return false;
    }
  };

  const trackClickAndRedirect = async (linkId: string, redirectUrl: string, facebookPixel?: string | null, googlePixel?: string | null) => {
    // Track click in background - don't wait for it
    fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-click`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          link_id: linkId,
          referrer: document.referrer,
        }),
      }
    ).catch(err => console.error("Error tracking click:", err));

    // Record redirect time for avg slice time stat
    fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/record-redirect`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link_id: linkId }),
      }
    ).catch(err => console.error("Error recording redirect:", err));

    // Inject pixels
    if (facebookPixel) {
      injectFacebookPixel(facebookPixel);
    }
    if (googlePixel) {
      injectGooglePixel(googlePixel);
    }

    // Use replace() for instant redirect - no browser history entry
    window.location.replace(redirectUrl);
  };

  const handleOpenLink = async () => {
    if (!linkInfo || isRedirecting) return;

    setIsRedirecting(true);
    setStatus("redirecting");
    
    await trackClickAndRedirect(linkInfo.id, linkInfo.original_url, linkInfo.facebook_pixel, linkInfo.google_pixel);
  };

  // Validation functions to prevent XSS via pixel ID injection
  const validateFacebookPixelId = (id: string): boolean => {
    // Facebook Pixel IDs are 15-16 digits only, with length check
    return typeof id === 'string' && 
           id.length >= 15 && 
           id.length <= 16 && 
           /^\d{15,16}$/.test(id);
  };

  const validateGooglePixelId = (id: string): boolean => {
    // Google Analytics/Tag Manager formats: G-XXXXXXXX, GT-XXXXXXXX, AW-XXXXXXXX, DC-XXXXXXXX, UA-XXXXXXXX-X
    // With maximum length limit to prevent abuse
    return typeof id === 'string' && 
           id.length <= 50 && 
           /^(G|GT|AW|DC|UA)-[A-Z0-9-]+$/i.test(id);
  };

  const injectFacebookPixel = (pixelId: string) => {
    if (!validateFacebookPixelId(pixelId)) {
      console.warn('Invalid Facebook Pixel ID format, skipping injection');
      return;
    }
    
    // Safer injection: Load external script first, then call fbq after load
    const fbScript = document.createElement('script');
    fbScript.src = 'https://connect.facebook.net/en_US/fbevents.js';
    fbScript.async = true;
    document.head.appendChild(fbScript);
    
    // Initialize fbq safely after script loads
    fbScript.onload = () => {
      // Type assertion for window.fbq using a simpler approach
      // deno-lint-ignore no-explicit-any
      const win = window as any;
      if (typeof win.fbq === 'function') {
        win.fbq('init', pixelId);
        win.fbq('track', 'PageView');
      } else {
        // Create fbq function manually with proper typing
        // deno-lint-ignore no-explicit-any
        const queue: any[] = [];
        // deno-lint-ignore no-explicit-any
        const fbq = (...args: any[]) => {
          queue.push(args);
        };
        win.fbq = fbq;
        win._fbq = fbq;
        fbq('init', pixelId);
        fbq('track', 'PageView');
      }
    };
  };

  const injectGooglePixel = (trackingId: string) => {
    if (!validateGooglePixelId(trackingId)) {
      console.warn('Invalid Google Pixel ID format, skipping injection');
      return;
    }
    
    // Safe injection: external script only, no innerHTML
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(trackingId)}`;
    document.head.appendChild(script);
    
    // Initialize gtag safely after script loads
    script.onload = () => {
      // deno-lint-ignore no-explicit-any
      const win = window as any;
      win.dataLayer = win.dataLayer || [];
      // deno-lint-ignore no-explicit-any
      win.gtag = (...args: any[]) => {
        win.dataLayer.push(args);
      };
      win.gtag('js', new Date());
      win.gtag('config', trackingId);
    };
  };

  // Instant redirect state - show Slice Animation fullscreen, then redirect
  if (status === "instant-redirect" && showInstantRedirectOverlay) {
    return (
      <>
        {/* Meta refresh fallback for browsers that block JS */}
        {pendingRedirectUrl && (
          <noscript>
            <meta httpEquiv="refresh" content={`1;url=${pendingRedirectUrl}`} />
          </noscript>
        )}
        <SliceAnimation 
          onComplete={handleInstantRedirectComplete} 
          destinationUrl={pendingRedirectUrl || ''}
        />
      </>
    );
  }

  // Expired state - dedicated branded page
  if (status === "expired") {
    return (
      <div className="min-h-[100dvh] w-full bg-background flex flex-col items-center justify-center p-4 safe-area-inset">
        {/* Main content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center max-w-md w-full px-4"
        >
          {/* Hourglass icon */}
          <div className="text-[4rem] sm:text-[5rem] mb-6">⏳</div>

          <h1 className="text-xl sm:text-2xl font-bold mb-3">This link has expired</h1>

          <p className="text-muted-foreground text-sm sm:text-base mb-2">
            Created using SliceURL
          </p>

          <p className="text-muted-foreground/60 text-xs sm:text-sm mb-8">
            The creator set an expiration date and this link is no longer active.
          </p>

          <Button onClick={() => navigate("/")} size="lg" className="gap-2 w-full sm:w-auto">
            <Home className="h-4 w-4" />
            Back to Home
          </Button>
        </motion.div>

        {/* Footer branding */}
        <p className="absolute bottom-4 sm:bottom-6 text-xs text-muted-foreground/60">
          Powered by{" "}
          <span className="font-medium">
            <span className="text-foreground">Slice</span>
            <span className="text-muted-foreground">URL</span>
          </span>
        </p>
      </div>
    );
  }

  // Other error states
  if (status === "not-found" || status === "max-clicks" || status === "error") {
    return (
      <div className="min-h-[100dvh] w-full bg-background flex items-center justify-center p-4 safe-area-inset">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="text-center max-w-md w-full px-4"
        >
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            {status === "max-clicks" && <Ban className="h-8 w-8 text-destructive" />}
            {(status === "not-found" || status === "error") && <AlertCircle className="h-8 w-8 text-destructive" />}
          </div>

          <h1 className="text-xl font-semibold mb-2">
            {status === "max-clicks" && "Link Limit Reached"}
            {status === "not-found" && "Link Not Found"}
            {status === "error" && "Something Went Wrong"}
          </h1>

          <p className="text-muted-foreground mb-6">
            {status === "max-clicks" && "This link has reached its maximum number of clicks."}
            {status === "not-found" && "The link you're looking for doesn't exist or has been removed."}
            {status === "error" && "We couldn't process this link. Please try again later."}
          </p>

          <Button onClick={() => navigate("/")} variant="outline">
            Go to Homepage
          </Button>

          <p className="text-xs text-muted-foreground mt-8">
            Powered by <span className="font-medium">SliceURL</span>
          </p>
        </motion.div>
      </div>
    );
  }

  // BLOCKED state (strict mode blocked malware/phishing)
  if (status === "blocked") {
    const detectedCategories = safetyResult?.threats || [];
    
    return (
      <div className="min-h-[100dvh] w-full bg-background flex items-center justify-center p-4 safe-area-inset">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="text-center max-w-md w-full px-4"
        >
          <div className="p-6 rounded-2xl bg-destructive/5 border border-destructive/20">
            <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <ShieldBan className="h-7 w-7 text-destructive" />
            </div>
            
            <h1 className="text-lg font-semibold text-destructive mb-2">⚠ Blocked by SliceURL</h1>
            
            <p className="text-sm text-muted-foreground mb-4">
              This link has been blocked for your safety.
            </p>
            
            {detectedCategories.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {detectedCategories.map((category, i) => {
                  const badgeInfo = categoryBadges[category] || { label: category, icon: AlertCircle, color: 'bg-muted text-muted-foreground border-border', isMalware: true };
                  const IconComponent = badgeInfo.icon;
                  return (
                    <Badge 
                      key={i} 
                      variant="outline" 
                      className={`${badgeInfo.color} gap-1 px-2 py-1`}
                    >
                      <IconComponent className="h-3 w-3" />
                      {badgeInfo.label}
                    </Badge>
                  );
                })}
              </div>
            )}

            <Button onClick={() => navigate("/")} variant="outline" size="sm">
              Go to Homepage
            </Button>
          </div>

          <div className="mt-6 space-y-1">
            <p className="text-xs text-muted-foreground">
              Security scan by <span className="font-medium">SliceURL</span>
            </p>
            <p className="text-[10px] text-muted-foreground/60">
              Powered by Google Safe Browsing + Slice AI Risk Engine
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Animated dots component
  const AnimatedDots = () => {
    const [dots, setDots] = useState('');
    
    useEffect(() => {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.');
      }, 400);
      return () => clearInterval(interval);
    }, []);
    
    return <span className="inline-block w-4 text-left">{dots}</span>;
  };

  // Shimmer skeleton component
  const ShimmerSkeleton = ({ className }: { className?: string }) => (
    <div 
      className={`rounded-md bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-shimmer ${className}`}
    />
  );

  // Loading state with shimmer skeleton animations
  if (status === "loading") {
    return (
      <div className="min-h-[100dvh] w-full bg-background flex items-center justify-center p-4 safe-area-inset">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="text-center max-w-md w-full px-4"
        >
          <div className="p-6 rounded-2xl bg-card border border-border space-y-5">
            {/* Logo */}
            <SliceLogo />
            
            {/* Skeleton URL preview */}
            <div className="space-y-3">
              <ShimmerSkeleton className="h-4 w-3/4 mx-auto" />
              <ShimmerSkeleton className="h-3 w-1/2 mx-auto" />
            </div>
            
            {/* Skeleton security badges */}
            <div className="flex justify-center gap-2">
              <ShimmerSkeleton className="h-6 w-20 rounded-full" />
              <ShimmerSkeleton className="h-6 w-16 rounded-full" />
            </div>
            
            {/* Skeleton button */}
            <ShimmerSkeleton className="h-10 w-full rounded-lg" />
            
            {/* Loading indicator */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Checking link safety<AnimatedDots />
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Redirecting state
  if (status === "redirecting") {
    return (
      <div className="min-h-[100dvh] w-full bg-background flex items-center justify-center p-4 safe-area-inset">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="text-center"
        >
          <SliceLogo />
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-3">Redirecting...</p>
        </motion.div>
      </div>
    );
  }

  // WARNING state - The main preview/warning screen
  // Also used for "ready" state (clean links)
  const detectedCategories = safetyResult?.threats || [];
  const hasAdultContent = detectedCategories.some(t => t.toLowerCase().includes('adult'));
  const hasDangerousContent = detectedCategories.some(t => {
    const badgeInfo = categoryBadges[t];
    return badgeInfo?.isMalware;
  });
  const isClean = detectedCategories.length === 0 && safetyResult?.status === 'safe';

  return (
    <div className="min-h-[100dvh] w-full bg-background flex items-center justify-center p-4 safe-area-inset">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md text-center px-4"
      >
        {/* SliceURL Branded Header */}
        <SliceLogo large />

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.2 }}
          className="text-muted-foreground text-base sm:text-lg mb-6"
        >
          Slice it. Share it. Track it.
        </motion.p>

        {/* Risk Status Display */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="mb-6 min-h-[60px]"
        >
          {/* Safe - small green pill */}
          {isClean && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 border border-success/20">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              <span className="text-xs font-medium text-success">Clean</span>
            </div>
          )}
          
          {/* Unknown - small neutral pill */}
          {safetyResult?.status === 'unknown' && detectedCategories.length === 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border">
              <span className="text-xs font-medium text-muted-foreground">Unknown</span>
            </div>
          )}

          {/* Has issues - show category badges with proper labels */}
          {detectedCategories.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <ShieldX className="h-5 w-5 text-warning" />
                <span className="font-medium text-warning">
                  {hasDangerousContent ? 'Suspicious Link' : hasAdultContent ? 'Adult Content Warning' : 'Caution'}
                </span>
              </div>
              
              {/* Category Badges */}
              <div className="flex flex-wrap justify-center gap-2">
                {detectedCategories.map((category, i) => {
                  const badgeInfo = categoryBadges[category] || { label: category, icon: AlertCircle, color: 'bg-muted text-muted-foreground border-border', isMalware: false };
                  const IconComponent = badgeInfo.icon;
                  return (
                    <Badge 
                      key={i} 
                      variant="outline" 
                      className={`${badgeInfo.color} gap-1 px-2 py-1`}
                    >
                      <IconComponent className="h-3 w-3" />
                      {badgeInfo.label}
                    </Badge>
                  );
                })}
              </div>
              
              {/* Risk Score */}
              {safetyResult?.riskScore && safetyResult.riskScore > 0 && (
                <p className="text-sm text-muted-foreground">
                  Risk Score: <span className="font-bold text-warning">{safetyResult.riskScore}%</span>
                </p>
              )}
            </div>
          )}
        </motion.div>

        {/* Open Link Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.2 }}
        >
          <Button
            onClick={handleOpenLink}
            size="lg"
            className="px-8 sm:px-12 h-12 sm:h-14 text-base sm:text-lg font-medium rounded-2xl shadow-premium-lg hover-lift w-full sm:w-auto"
            variant={detectedCategories.length > 0 ? "outline" : "default"}
            disabled={isRedirecting}
          >
            {isRedirecting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Redirecting...
              </>
            ) : (
              <>
                <ExternalLink className="h-5 w-5 mr-2" />
                {detectedCategories.length > 0 ? 'Open Anyway' : 'Open Link'}
              </>
            )}
          </Button>
        </motion.div>

        {/* Footer with SliceURL Branding */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.2 }}
          className="mt-10 space-y-1"
        >
          <p className="text-xs text-muted-foreground">
            Security scan by <span className="font-medium">SliceURL</span>
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            Powered by Google Safe Browsing + Slice AI Risk Engine
          </p>
        </motion.div>
      </motion.div>

      {/* Password Modal */}
      <PasswordModal
        open={showPasswordModal}
        onOpenChange={setShowPasswordModal}
        onSubmit={handlePasswordSubmit}
      />
    </div>
  );
}

// SliceURL Logo using unified SliceLogo component
function SliceLogo({ large = false }: { large?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center ${large ? 'mb-6' : 'mb-4'}`}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="mb-3"
      >
        <SliceLogoComponent size={large ? "xl" : "lg"} showText={false} />
      </motion.div>

      {/* Text with slice effect */}
      <div className="relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.2 }}
          className="flex items-center"
        >
          <span className={`${large ? 'text-xl sm:text-2xl' : 'text-xl'} font-bold tracking-tight`}>
            <span className="text-foreground">Slice</span>
            <span className="text-muted-foreground">URL</span>
          </span>
        </motion.div>
        
        {/* Animated underline slice */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="h-0.5 bg-gradient-to-r from-foreground to-muted-foreground origin-left mt-1"
        />
      </div>
    </div>
  );
}
