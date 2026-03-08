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

  const actualDownloads = fileInfo?.download_count || 0;

  return (
    <div className="min-h-dvh bg-background flex">
      {/* Desktop Sidebar */}
      <SliceAppsSidebar />

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Mobile Header */}
        <SliceAppsHeader />

        {/* ===== HERO SECTION ===== */}
        {/* Mobile: white bg, compact. Desktop: subtle grey banner */}
        <div className="px-4 lg:px-10 pt-6 pb-4 mt-2 lg:mt-0 lg:py-10 lg:bg-gradient-to-b lg:from-muted/40 lg:to-transparent">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-start gap-4 lg:gap-8">
              {/* App Icon */}
              <div className="w-[92px] h-[92px] lg:w-[170px] lg:h-[170px] rounded-[20px] lg:rounded-[36px] flex-shrink-0 overflow-hidden bg-muted shadow-sm border border-border/10">
                {app.icon_url ? (
                  <img src={app.icon_url} alt={app.app_name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-4xl lg:text-5xl font-bold bg-muted">
                    {app.app_name.charAt(0)}
                  </div>
                )}
              </div>

              {/* App Info + GET button */}
              <div className="flex-1 min-w-0 flex flex-col">
                <h1 className="text-[22px] lg:text-[32px] font-bold text-foreground leading-[1.2]">
                  {app.app_name}
                </h1>
                <p className="text-[14px] lg:text-[17px] text-[#6e6e73] mt-1 lg:mt-0.5 mb-3 line-clamp-2">
                  {app.short_description || `The official app by ${app.developer_name || "Unknown"}`}
                </p>

                {/* GET button + share */}
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={downloadSuccess ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 0.25 }}
                  >
                    <button
                      onClick={handleDownload}
                      disabled={isDownloading || !fileInfo || !!fileUnavailable}
                      className="h-9 lg:h-[38px] px-[18px] lg:px-8 text-[15px] lg:text-[16px] font-semibold rounded-full bg-[#007AFF] text-white disabled:opacity-40 active:opacity-80 transition-opacity"
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
                    className="w-9 h-9 lg:w-10 lg:h-10 flex items-center justify-center rounded-full text-[#007AFF]"
                    aria-label="Share"
                  >
                    <Share2 className="h-5 w-5 lg:h-[22px] lg:w-[22px]" strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== METADATA STRIP ===== */}
        <MetadataStrip
          ratingAvg={app.rating_avg}
          ratingCount={app.rating_count}
          downloads={formatDownloads(actualDownloads)}
          fileSize={fileInfo ? formatFileSize(fileInfo.file_size) : "--"}
          category={app.category || "Productivity"}
          developer={app.developer_name || "Unknown"}
        />

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
