import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useParams, Link } from "react-router-dom";
import { Lock, AlertTriangle, Check, Share2, ChevronRight } from "lucide-react";
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
import { SliceAppsHeader, SliceAppsSidebar, RatingsReviewsSection } from "@/components/sliceapps";
import { MetadataStrip } from "@/components/sliceapps/MetadataStrip";

interface AppListing {
  id: string;
  short_code: string | null;
  app_name: string;
  developer_name: string | null;
  category: string | null;
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
  const [fileUnavailable, setFileUnavailable] = useState<string | null>(null);
  
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  
  const [selectedScreenshot, setSelectedScreenshot] = useState<number | null>(null);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [whatsNewExpanded, setWhatsNewExpanded] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

  const handleDownload = async () => {
    if (!fileInfo || !app) return;
    if (fileInfo.password_hash) { setShowPasswordDialog(true); return; }
    await initiateDownload();
  };

  const initiateDownload = async (passwordForDownload?: string) => {
    if (!fileInfo) return;
    setIsDownloading(true);
    try {
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
      setTimeout(() => setDownloadSuccess(false), 1500);
      toast.success("Download started!");
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("This file is temporarily unavailable. Please try again later.");
    } finally {
      setIsDownloading(false);
    }
  };

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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDownloads = (count: number | null): string => {
    if (!count || count === 0) return "0";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M+`;
    if (count >= 100000) return "100K+";
    if (count >= 10000) return "10K+";
    if (count >= 1000) return `${Math.floor(count / 1000)}K+`;
    if (count >= 100) return "100+";
    if (count >= 10) return "10+";
    return count.toString();
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
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
    <div className="min-h-dvh bg-background flex">
      {/* Desktop Sidebar */}
      <SliceAppsSidebar />

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Mobile Sticky Navbar — always visible */}
        <div
          className="sticky top-0 z-[999] lg:relative lg:z-auto bg-[var(--sa-hero-bg)] transition-colors duration-500"
          style={{ borderBottom: '1px solid var(--sa-border)' }}
        >
          <SliceAppsHeader />
        </div>

        {/* Mobile Hero Section — Apple App Store style */}
        <div
          className="lg:hidden"
          style={{
            background: 'linear-gradient(135deg, #6f7a83 0%, #a3aab1 100%)',
            backdropFilter: 'blur(20px)',
            padding: '24px 20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* App Icon — 112px */}
            <div
              className="flex-shrink-0 overflow-hidden"
              style={{
                width: 112,
                height: 112,
                borderRadius: 24,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              }}
            >
              {app.icon_url ? (
                <img src={app.icon_url} alt={app.app_name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold bg-muted text-muted-foreground">
                  {app.app_name.charAt(0)}
                </div>
              )}
            </div>

            {/* Text Block */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, marginLeft: 20 }}>
              <h1
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                  fontWeight: 600,
                  fontSize: 20,
                  lineHeight: '24px',
                  letterSpacing: '-0.01em',
                  color: '#ffffff',
                  margin: 0,
                }}
              >
                {app.app_name}
              </h1>
              <p
                className="line-clamp-2"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                  fontWeight: 400,
                  fontSize: 13,
                  lineHeight: '18px',
                  color: 'rgba(255,255,255,0.85)',
                  marginTop: 6,
                  marginBottom: 0,
                }}
              >
                {app.short_description || `The official app by ${app.developer_name || "Unknown"}`}
              </p>

              {/* Button Row */}
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 10, gap: 12 }}>
                <motion.div
                  animate={downloadSuccess ? { scale: [1, 1.02, 1] } : {}}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading || !fileInfo || !!fileUnavailable}
                    className="disabled:opacity-40"
                    style={{
                      height: 36,
                      padding: '8px 22px',
                      borderRadius: 20,
                      background: '#0A84FF',
                      color: '#ffffff',
                      fontSize: 16,
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease, transform 0.12s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPointerDown={(e) => { e.currentTarget.style.background = '#0077ED'; e.currentTarget.style.transform = 'scale(0.96)'; }}
                    onPointerUp={(e) => { e.currentTarget.style.background = '#0A84FF'; e.currentTarget.style.transform = 'scale(1)'; }}
                    onPointerLeave={(e) => { e.currentTarget.style.background = '#0A84FF'; e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    {downloadSuccess ? (
                      <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center justify-center gap-1.5">
                        <Check style={{ width: 16, height: 16 }} /> Done
                      </motion.span>
                    ) : isDownloading ? "..." : "GET"}
                  </button>
                </motion.div>

                <button
                  onClick={handleShare}
                  aria-label="Share"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Share2 style={{ width: 22, height: 22, color: '#0A84FF' }} strokeWidth={1.8} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Hero (non-collapsing) */}
        <div
          className="hidden lg:block"
          style={{
            background: 'linear-gradient(135deg, #6f7a83 0%, #a3aab1 100%)',
            backdropFilter: 'blur(20px)',
            padding: '32px 40px',
          }}
        >
          <div className="max-w-5xl mx-auto">
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div
                className="flex-shrink-0 overflow-hidden"
                style={{
                  width: 128,
                  height: 128,
                  borderRadius: 28,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                }}
              >
                {app.icon_url ? (
                  <img src={app.icon_url} alt={app.app_name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl font-bold bg-muted text-muted-foreground">
                    {app.app_name.charAt(0)}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <h1
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                    fontWeight: 600,
                    fontSize: 26,
                    lineHeight: '30px',
                    letterSpacing: '-0.01em',
                    color: '#ffffff',
                    margin: 0,
                  }}
                >
                  {app.app_name}
                </h1>
                <p
                  className="line-clamp-2"
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                    fontWeight: 400,
                    fontSize: 15,
                    lineHeight: '22px',
                    color: 'rgba(255,255,255,0.85)',
                    marginTop: 6,
                    marginBottom: 0,
                  }}
                >
                  {app.short_description || `The official app by ${app.developer_name || "Unknown"}`}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: 12, gap: 12 }}>
                  <motion.div
                    animate={downloadSuccess ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 0.25 }}
                  >
                    <button
                      onClick={handleDownload}
                      disabled={isDownloading || !fileInfo || !!fileUnavailable}
                      className="disabled:opacity-40"
                      style={{
                        height: 36,
                        padding: '8px 22px',
                        borderRadius: 20,
                        background: '#0A84FF',
                        color: '#ffffff',
                        fontSize: 16,
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease, transform 0.12s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPointerDown={(e) => { e.currentTarget.style.background = '#0077ED'; e.currentTarget.style.transform = 'scale(0.96)'; }}
                      onPointerUp={(e) => { e.currentTarget.style.background = '#0A84FF'; e.currentTarget.style.transform = 'scale(1)'; }}
                      onPointerLeave={(e) => { e.currentTarget.style.background = '#0A84FF'; e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                      {downloadSuccess ? (
                        <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1">
                          <Check className="h-4 w-4" /> Done
                        </motion.span>
                      ) : isDownloading ? "..." : "GET"}
                    </button>
                  </motion.div>
                  <button
                    onClick={handleShare}
                    aria-label="Share"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Share2 style={{ width: 22, height: 22, color: '#0A84FF' }} strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== METADATA STRIP ===== */}
        <div className="mt-4">
          <MetadataStrip
            ratingAvg={app.rating_avg}
            ratingCount={app.rating_count}
            downloads={formatDownloads(actualDownloads)}
            fileSize={fileInfo ? formatFileSize(fileInfo.file_size) : "--"}
            category={app.category || "Productivity"}
            developer={app.developer_name || "Unknown"}
          />
        </div>

        {/* ===== CONTENT ===== */}
        <main className="max-w-5xl mx-auto">
          {/* File Unavailable Warning */}
          {fileUnavailable && (
            <div className="flex items-center gap-3 mx-5 mt-4 text-muted-foreground">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{fileUnavailable}</p>
            </div>
          )}

          {/* ===== SCREENSHOTS ===== */}
          {app.screenshots && app.screenshots.length > 0 && (
            <div className="py-5 overflow-x-auto scrollbar-hide">
              <div className="flex gap-3 lg:gap-4 px-5 lg:px-10">
                {app.screenshots.map((url, index) => (
                  <div
                    key={index}
                    className="relative min-w-[205px] lg:min-w-[230px] h-[370px] lg:h-[420px] rounded-[20px] overflow-hidden flex-shrink-0 cursor-pointer bg-[#E8F4F8] border border-border/10"
                    onClick={() => setSelectedScreenshot(index)}
                  >
                    <img src={url} alt={`Screenshot ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Desktop: Two-column layout */}
          <div className="lg:flex lg:gap-12 px-5 lg:px-10">
            {/* Left column */}
            <div className="lg:flex-1 lg:min-w-0">

              {/* ===== DESCRIPTION ===== */}
              {app.full_description && (
                <div className="py-5 border-t border-border/30">
                  <div className={`text-[15px] text-foreground leading-[1.6] whitespace-pre-wrap ${!aboutExpanded ? 'line-clamp-3' : ''}`}>
                    {app.full_description}
                  </div>
                  {app.full_description.length > 120 && (
                    <button
                      onClick={() => setAboutExpanded(!aboutExpanded)}
                      className="text-[#007AFF] text-[15px] font-normal mt-1 inline-block"
                    >
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
                    <span className="text-[15px] text-muted-foreground">
                      Version {app.version_name || "1.0"}
                    </span>
                  </div>
                  <div className={`text-[15px] text-foreground leading-[1.6] whitespace-pre-wrap ${!whatsNewExpanded ? 'line-clamp-3' : ''}`}>
                    {app.whats_new}
                  </div>
                  {app.whats_new.length > 120 && (
                    <button
                      onClick={() => setWhatsNewExpanded(!whatsNewExpanded)}
                      className="text-[#007AFF] text-[15px] font-normal mt-1 inline-block"
                    >
                      {whatsNewExpanded ? "less" : "more"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right column - Information */}
            <div className="lg:w-[260px] lg:flex-shrink-0">
              <div className="py-5 border-t border-border/30">
                <h2 className="text-[22px] font-bold text-foreground mb-4">Information</h2>
                <div className="space-y-0">
                  {[
                    { label: "Provider", value: app.developer_name || "Unknown" },
                    { label: "Size", value: fileInfo ? formatFileSize(fileInfo.file_size) : "--" },
                    { label: "Category", value: app.category || "Productivity" },
                    { label: "Compatibility", value: "All Devices" },
                    { label: "Version", value: app.version_name || "1.0" },
                    { label: "Downloads", value: formatDownloads(actualDownloads) },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between items-center py-3 border-b border-border/15">
                      <span className="text-[15px] text-muted-foreground">{row.label}</span>
                      <span className="text-[15px] text-foreground font-normal text-right">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom padding */}
          <div className="h-8" />
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
