import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Lock, AlertTriangle, Share2, ChevronRight, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { formatFileSize, formatDownloads } from "@/lib/fileUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SliceAppsHeader, RatingsReviewsSection } from "@/components/sliceapps";
import { MetadataStrip } from "@/components/sliceapps/MetadataStrip";

// Detect if device is mobile
const isMobileDevice = (): boolean => {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  // Check for mobile user agents
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;
  if (mobileRegex.test(userAgent.toLowerCase())) return true;
  // Also check screen width as fallback
  if (window.innerWidth <= 768) return true;
  // Check for touch capability on small screens
  if ('ontouchstart' in window && window.innerWidth <= 1024) return true;
  return false;
};

interface AppListing {
  id: string;
  short_code: string | null;
  app_name: string;
  developer_name: string | null;
  developer_url: string | null;
  category: string | null;
  age_rating: string | null;
  version_name: string | null;
  version_code: string | null;
  short_description: string | null;
  full_description: string | null;
  whats_new: string | null;
  icon_url: string | null;
  screenshots: string[] | null;
  promo_banner_url: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  total_downloads: number | null;
  release_date: string | null;
  file_id: string;
}

interface FileInfo {
  file_id: string;
  file_size: number;
  storage_path: string;
  original_name: string;
  password_hash: string | null;
  is_deleted: boolean | null;
  expires_at: string | null;
  download_count: number | null;
}

interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  user_id: string | null;
  display_name: string | null;
}

export default function AppPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  const [app, setApp] = useState<AppListing | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [fileUnavailable, setFileUnavailable] = useState<string | null>(null);
  const downloadControllerRef = useRef<AbortController | null>(null);
  
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  
  const [selectedScreenshot, setSelectedScreenshot] = useState<number | null>(null);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [whatsNewExpanded, setWhatsNewExpanded] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  // Check device type on mount
  useEffect(() => {
    setIsMobile(isMobileDevice());
    
    const handleResize = () => {
      setIsMobile(isMobileDevice());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { loadAppData(); }, [id]);

  const loadAppData = async () => {
    if (!id) return;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-app-info?id=${encodeURIComponent(id)}`,
        { method: "GET", headers: { "Content-Type": "application/json" }, credentials: "omit" }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to load app");
        setIsLoading(false);
        return;
      }
      const data = await response.json();
      setApp(data.app);
      if (data.fileUnavailable) {
        setFileUnavailable(data.fileUnavailable);
      } else if (data.fileInfo) {
        setFileInfo({
          file_id: data.fileInfo.file_id,
          file_size: data.fileInfo.file_size,
          storage_path: "",
          original_name: data.fileInfo.original_name,
          password_hash: data.fileInfo.is_password_protected ? "protected" : null,
          is_deleted: null,
          expires_at: null,
          download_count: data.fileInfo.download_count,
        });
      }
      if (data.reviews) setReviews(data.reviews);
    } catch (err) {
      console.error("Failed to load app:", err);
      toast.error("This page is temporarily unavailable. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const simulateProgress = useCallback(() => {
    return new Promise<void>((resolve) => {
      let progress = 0;
      const start = performance.now();
      const duration = 1800;
      const tick = () => {
        const elapsed = performance.now() - start;
        const t = Math.min(elapsed / duration, 1);
        if (t < 0.5) { progress = t * 2 * 60; }
        else if (t < 0.8) { progress = 60 + ((t - 0.5) / 0.3) * 30; }
        else { progress = 90 + ((t - 0.8) / 0.2) * 10; }
        setDownloadProgress(Math.min(Math.round(progress), 100));
        if (t < 1) { requestAnimationFrame(tick); }
        else { setDownloadProgress(100); resolve(); }
      };
      requestAnimationFrame(tick);
    });
  }, []);

  // Desktop block screen
  if (isMobile === false) {
    const currentUrl = window.location.href;
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-5">
        <div 
          className="text-center bg-card rounded-3xl shadow-lg border border-border/50"
          style={{ maxWidth: 420, padding: 40 }}
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-muted flex items-center justify-center">
            <Smartphone className="w-10 h-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Mobile Only
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed mb-6">
            SliceAPPs app pages are designed to work only on mobile devices.
            <br />
            Scan the QR code below to open this page on your phone.
          </p>
          <div className="mx-auto mb-6 inline-flex p-4 bg-background rounded-2xl border border-border/30">
            <QRCodeSVG
              value={currentUrl}
              size={180}
              level="M"
              bgColor="transparent"
              fgColor="currentColor"
              className="text-foreground"
            />
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              className="rounded-full px-6"
              onClick={() => {
                navigator.clipboard.writeText(currentUrl);
                toast.success("Link copied!");
              }}
            >
              Copy Link
            </Button>
            <Link to="/">
              <Button variant="outline" className="rounded-full px-6">
                Go to SliceURL
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading state for device detection
  if (isMobile === null) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleDownload = async () => {
    if (!fileInfo || !app) return;
    if (fileInfo.password_hash) { setShowPasswordDialog(true); return; }
    await initiateDownload();
  };

  const initiateDownload = async (passwordForDownload?: string) => {
    if (!fileInfo) return;
    const controller = new AbortController();
    downloadControllerRef.current = controller;
    setIsDownloading(true);
    setDownloadProgress(0);
    try {
      await simulateProgress();
      const streamUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/file-stream?fileId=${fileInfo.file_id}${passwordForDownload ? '&verified=true' : ''}`;
      const a = document.createElement("a");
      a.href = streamUrl;
      a.download = fileInfo.original_name;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setFileInfo(prev => prev ? { ...prev, download_count: (prev.download_count || 0) + 1 } : null);
      setApp(prev => prev ? { ...prev, total_downloads: (prev.total_downloads || 0) + 1 } : null);
      setDownloadSuccess(true);
      setTimeout(() => { setDownloadSuccess(false); setDownloadProgress(0); }, 3000);
      toast.success("Download complete!");
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') { toast("Download cancelled"); }
      else { console.error("Download failed:", err); toast.error("This file is temporarily unavailable. Please try again later."); }
      setDownloadProgress(0);
    } finally {
      downloadControllerRef.current = null;
      setIsDownloading(false);
    }
  };

  const cancelDownload = () => { downloadControllerRef.current?.abort(); };

  const handlePasswordSubmit = async () => {
    if (!fileInfo || !password) return;
    setIsVerifyingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke("slicebox-verify-password", {
        body: { fileId: fileInfo.file_id, password },
      });
      if (error) throw error;
      if (!data.success) { toast.error(data.error || "Invalid password"); return; }
      setShowPasswordDialog(false);
      setPassword("");
      const streamUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/file-stream?fileId=${fileInfo.file_id}&verified=true`;
      const a = document.createElement("a");
      a.href = streamUrl;
      a.download = fileInfo.original_name;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setFileInfo(prev => prev ? { ...prev, download_count: (prev.download_count || 0) + 1 } : null);
      toast.success("Download started!");
    } catch (err) {
      console.error("Password verification failed:", err);
      toast.error("This file is temporarily unavailable. Please try again later.");
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: app?.app_name || "SliceAPPs", text: app?.short_description || "Check out this app!", url: shareUrl }); } catch { }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied!");
    }
  };


  const DownloadButton = ({ size = "default" }: { size?: "default" | "large" }) => {
    const isLarge = size === "large";
    return (
      <button
        onClick={isDownloading ? cancelDownload : handleDownload}
        disabled={(!fileInfo || !!fileUnavailable) && !isDownloading}
        className="disabled:opacity-40"
        style={{
          height: isLarge ? 40 : 36,
          minWidth: isLarge ? 120 : 110,
          padding: isLarge ? '0 28px' : '0 22px',
          borderRadius: 20,
          background: '#0A84FF',
          color: '#ffffff',
          fontSize: isLarge ? 17 : 16,
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.12s ease',
        }}
        onPointerDown={(e) => { if (!isDownloading) e.currentTarget.style.transform = 'scale(0.96)'; }}
        onPointerUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        onPointerLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {isDownloading && (
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${downloadProgress}%`,
            background: 'rgba(255,255,255,0.25)',
            borderRadius: 20,
            transition: 'width 0.2s ease',
          }} />
        )}
        <span style={{ position: 'relative', zIndex: 1 }}>
          {downloadSuccess ? "OPEN" : isDownloading ? `${downloadProgress}%` : "DOWNLOAD"}
        </span>
      </button>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background">
        <SliceAppsHeader />
        <div className="max-w-[720px] mx-auto">
          <div style={{ background: 'linear-gradient(135deg, #6f7a83 0%, #a3aab1 100%)', padding: '24px 20px' }}>
            <div className="flex items-center gap-5">
              <div className="w-[112px] h-[112px] rounded-3xl bg-white/20 animate-pulse" />
              <div className="flex-1 space-y-3">
                <div className="h-6 w-40 bg-white/20 rounded animate-pulse" />
                <div className="h-4 w-56 bg-white/15 rounded animate-pulse" />
                <div className="h-9 w-28 bg-white/20 rounded-full animate-pulse mt-2" />
              </div>
            </div>
          </div>
          <div className="border-b border-border/30 py-4">
            <div className="px-5 flex gap-8 overflow-x-auto">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2 min-w-[80px]">
                  <div className="h-5 w-12 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-16 bg-muted/70 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          <div className="px-5 py-6 space-y-6">
            <div className="h-5 w-32 bg-muted rounded animate-pulse" />
            <div className="flex gap-3 overflow-hidden">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-[200px] h-[360px] rounded-2xl bg-muted animate-pulse flex-shrink-0" />
              ))}
            </div>
            <div className="h-5 w-24 bg-muted rounded animate-pulse mt-8" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-muted/70 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-muted/70 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-muted/70 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg mb-4 text-foreground">App not found</p>
          <Link to="/slicebox"><Button variant="outline">Go to SliceBox</Button></Link>
        </div>
      </div>
    );
  }

  const actualDownloads = app?.total_downloads || fileInfo?.download_count || 0;

  return (
    <div className="min-h-dvh bg-background">
      {/* Sticky Navbar */}
      <div
        className="sticky top-0 z-[999] transition-colors duration-500"
        style={{ borderBottom: '1px solid var(--sa-border)' }}
      >
        <SliceAppsHeader />
      </div>

      <div className="max-w-[720px] mx-auto">
        {/* ===== HERO ===== */}
        <div
          style={{
            background: 'linear-gradient(135deg, #6f7a83 0%, #a3aab1 100%)',
            backdropFilter: 'blur(20px)',
            padding: '24px 20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="flex-shrink-0 overflow-hidden" style={{ width: 112, height: 112, borderRadius: 24, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
              {app.icon_url ? (
                <img src={app.icon_url} alt={app.app_name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold bg-muted text-muted-foreground">{app.app_name.charAt(0)}</div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, marginLeft: 20 }}>
              <h1 style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif', fontWeight: 600, fontSize: 20, lineHeight: '24px', letterSpacing: '-0.01em', color: '#ffffff', margin: 0 }}>
                {app.app_name}
              </h1>
              <p className="line-clamp-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif', fontWeight: 400, fontSize: 13, lineHeight: '18px', color: 'rgba(255,255,255,0.85)', marginTop: 6, marginBottom: 0 }}>
                {app.short_description || `The official app by ${app.developer_name || "Unknown"}`}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 10, gap: 12 }}>
                <DownloadButton />
              </div>
            </div>
          </div>
        </div>

        {/* ===== METADATA STRIP ===== */}
        <div className="border-b border-border/30">
          <MetadataStrip
            ratingAvg={app.rating_avg}
            ratingCount={app.rating_count}
            downloads={formatDownloads(actualDownloads)}
            fileSize={fileInfo ? formatFileSize(fileInfo.file_size) : "--"}
            ageRating={app.age_rating || "4+"}
            category={app.category || "Productivity"}
            developer={app.developer_name || "Unknown"}
            developerUrl={app.developer_url}
          />
        </div>

        {/* ===== CONTENT ===== */}
        <main>
          {fileUnavailable && (
            <div className="flex items-center gap-3 mx-5 mt-4 text-muted-foreground">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{fileUnavailable}</p>
            </div>
          )}

          {/* ===== SCREENSHOTS ===== */}
          {app.screenshots && app.screenshots.length > 0 && (
            <div className="py-5 overflow-x-auto scrollbar-hide">
              <div className="flex gap-3 px-5">
                {app.screenshots.map((url, index) => (
                  <div
                    key={index}
                    className="relative min-w-[205px] h-[370px] rounded-[20px] overflow-hidden flex-shrink-0 cursor-pointer bg-[#E8F4F8] border border-border/10"
                    onClick={() => setSelectedScreenshot(index)}
                  >
                    <img src={url} alt={`Screenshot ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All content sections */}
          <div className="px-5">
            {/* ===== DESCRIPTION ===== */}
            {app.full_description && (
              <div className="py-5 border-t border-border/30">
                <div className={`text-[15px] text-foreground leading-[1.6] whitespace-pre-wrap ${!aboutExpanded ? 'line-clamp-3' : ''}`}>
                  {app.full_description}
                </div>
                {app.full_description.length > 120 && (
                  <button onClick={() => setAboutExpanded(!aboutExpanded)} className="text-[#007AFF] text-[15px] font-normal mt-1 inline-block">
                    {aboutExpanded ? "less" : "more"}
                  </button>
                )}
              </div>
            )}

            {/* ===== RATINGS & REVIEWS ===== */}
            <div className="py-5 border-t border-border/30">
              <RatingsReviewsSection
                appId={app.id}
                ratingAvg={app.rating_avg}
                ratingCount={app.rating_count}
                reviews={reviews}
                userId={user?.id || null}
                onReviewSubmit={loadAppData}
              />
            </div>

            {/* ===== WHAT'S NEW ===== */}
            {app.whats_new && (
              <div className="py-5 border-t border-border/30">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[22px] font-bold text-foreground">What's New</h2>
                  <span className="text-[15px] text-muted-foreground">Version {app.version_name || "1.0"}</span>
                </div>
                <div className={`text-[15px] text-foreground leading-[1.6] whitespace-pre-wrap ${!whatsNewExpanded ? 'line-clamp-3' : ''}`}>
                  {app.whats_new}
                </div>
                {app.whats_new.length > 120 && (
                  <button onClick={() => setWhatsNewExpanded(!whatsNewExpanded)} className="text-[#007AFF] text-[15px] font-normal mt-1 inline-block">
                    {whatsNewExpanded ? "less" : "more"}
                  </button>
                )}
              </div>
            )}

            {/* ===== INFORMATION ===== */}
            <div className="py-5 border-t border-border/30">
              <h2 className="text-[22px] font-bold text-foreground mb-5">Information</h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-0">
                {[
                  { label: "Size", value: fileInfo ? formatFileSize(fileInfo.file_size) : "--" },
                  { label: "Category", value: app.category || "Productivity" },
                  { label: "Compatibility", value: "All Devices" },
                  { label: "Age Rating", value: app.age_rating || "4+" },
                  { label: "Version", value: app.version_name || "1.0" },
                  { label: "Downloads", value: formatDownloads(actualDownloads) },
                  { label: "Provider", value: app.developer_name || "Unknown" },
                  ...(app.release_date ? [{ label: "Released", value: new Date(app.release_date).toLocaleDateString() }] : []),
                ].map((row) => (
                  <div key={row.label} className="py-3 border-b border-border/15">
                    <span className="text-[13px] text-muted-foreground block">{row.label}</span>
                    <span className="text-[15px] text-foreground font-normal mt-0.5 block">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Developer links */}
            {app.developer_url && (
              <div className="py-5 border-t border-border/30 flex items-center gap-6">
                <a
                  href={app.developer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#007AFF] text-[15px] font-normal hover:underline flex items-center gap-1"
                >
                  Developer Website
                  <ChevronRight className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </div>

          <div className="h-10" />
        </main>
      </div>

      {/* Screenshot Modal */}
      {selectedScreenshot !== null && app.screenshots && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90" onClick={() => setSelectedScreenshot(null)}>
          <img src={app.screenshots[selectedScreenshot]} alt="Screenshot" className="max-w-full max-h-full object-contain rounded-xl" />
        </div>
      )}

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="bg-background border-border rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground text-lg">Password Required</DialogTitle>
            <DialogDescription className="text-muted-foreground">This file is password protected. Enter the password to download.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
              className="h-12 rounded-xl"
            />
            <div className="flex gap-3">
              <Button onClick={() => { setShowPasswordDialog(false); setPassword(""); }} variant="outline" className="flex-1 h-12 rounded-xl">Cancel</Button>
              <Button
                onClick={handlePasswordSubmit}
                disabled={isVerifyingPassword || !password}
                className="flex-1 h-12 rounded-xl bg-[#007AFF] hover:bg-[#0066CC] text-white"
              >{isVerifyingPassword ? "Verifying..." : "Download"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
