import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, Link } from "react-router-dom";
import { Lock, AlertTriangle, Check, Share2, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
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

  useEffect(() => {
    loadAppData();
  }, [id]);

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

        {/* Hero Section - App Store style dark banner on desktop, grey on mobile */}
        <div className="bg-gradient-to-b from-muted/60 to-muted/20 lg:from-[hsl(var(--foreground)/0.08)] lg:to-[hsl(var(--foreground)/0.03)] px-4 lg:px-10 py-6 lg:py-10">
          <div className="max-w-5xl mx-auto">
            <div className="flex gap-4 lg:gap-8">
              {/* App Icon */}
              <div className="w-[128px] h-[128px] lg:w-[170px] lg:h-[170px] rounded-[28px] lg:rounded-[36px] flex-shrink-0 overflow-hidden bg-background shadow-lg">
                {app.icon_url ? (
                  <img src={app.icon_url} alt={app.app_name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-4xl lg:text-5xl font-bold bg-muted">
                    {app.app_name.charAt(0)}
                  </div>
                )}
              </div>

              {/* App Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h1 className="text-[22px] lg:text-[32px] font-bold text-foreground leading-tight mb-1">
                  {app.app_name}
                </h1>
                <p className="text-[15px] lg:text-[17px] text-muted-foreground mb-1">
                  {app.short_description || `The official app by ${app.developer_name || "Unknown"}`}
                </p>
                <p className="text-[13px] lg:text-[15px] text-muted-foreground">
                  Free • In-App Purchases
                </p>

                {/* Desktop: Download + Share inline */}
                <div className="hidden lg:flex items-center gap-3 mt-5">
                  <motion.div
                    animate={downloadSuccess ? { scale: [1, 1.02, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <Button
                      onClick={handleDownload}
                      disabled={isDownloading || !fileInfo || !!fileUnavailable}
                      className="h-[40px] px-8 text-[15px] font-semibold rounded-full bg-[#007AFF] hover:bg-[#0066CC] text-white disabled:bg-muted disabled:text-muted-foreground"
                    >
                      {downloadSuccess ? (
                        <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1.5">
                          <Check className="h-4 w-4" /> Downloaded
                        </motion.span>
                      ) : isDownloading ? "Downloading..." : "DOWNLOAD"}
                    </Button>
                  </motion.div>
                  <button
                    onClick={handleShare}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-muted/60 hover:bg-muted text-foreground"
                  >
                    <Share2 className="h-[18px] w-[18px]" />
                  </button>
                </div>

                {/* Mobile: Share button */}
                <button
                  onClick={handleShare}
                  className="mt-3 flex lg:hidden items-center gap-1.5 px-4 py-1.5 rounded-full bg-muted/80 hover:bg-muted w-fit text-[13px] font-medium text-foreground"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <main className="max-w-5xl mx-auto px-4 lg:px-10">
          {/* Metadata Strip */}
          <MetadataStrip
            ratingAvg={app.rating_avg}
            ratingCount={app.rating_count}
            downloads={formatDownloads(actualDownloads)}
            fileSize={fileInfo ? formatFileSize(fileInfo.file_size) : "--"}
            category={app.category || "Productivity"}
            developer={app.developer_name || "Unknown"}
          />

          {/* File Unavailable Warning */}
          {fileUnavailable && (
            <div className="flex items-center gap-3 mt-4 text-muted-foreground">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{fileUnavailable}</p>
            </div>
          )}

          {/* Screenshots */}
          {app.screenshots && app.screenshots.length > 0 && (
            <div className="py-6 -mx-4 lg:mx-0 px-4 lg:px-0 overflow-x-auto scrollbar-hide">
              <div className="flex gap-3 lg:gap-4 pb-2">
                {app.screenshots.map((url, index) => (
                  <div
                    key={index}
                    className="relative min-w-[200px] lg:min-w-[230px] h-[360px] lg:h-[420px] rounded-2xl overflow-hidden flex-shrink-0 cursor-pointer bg-[#E3F4F9]"
                    onClick={() => setSelectedScreenshot(index)}
                  >
                    <img src={url} alt={`Screenshot ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Desktop: Two-column layout for description + info */}
          <div className="lg:flex lg:gap-12">
            {/* Left column - Description content */}
            <div className="lg:flex-1 lg:min-w-0">
              {/* About Section */}
              {app.full_description && (
                <div className="py-5 border-t border-border/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1">
                      <h2 className="text-[22px] font-bold text-foreground">About this app</h2>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                  <div className={`text-[15px] text-foreground leading-relaxed whitespace-pre-wrap ${!aboutExpanded ? 'line-clamp-4' : ''}`}>
                    {app.full_description}
                  </div>
                  {app.full_description.length > 200 && (
                    <button onClick={() => setAboutExpanded(!aboutExpanded)} className="text-[#007AFF] text-[15px] font-medium mt-2">
                      {aboutExpanded ? "Less" : "More"}
                    </button>
                  )}
                </div>
              )}

              {/* Ratings & Reviews */}
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

              {/* What's New */}
              {app.whats_new && (
                <div className="py-5 border-t border-border/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1">
                      <h2 className="text-[22px] font-bold text-foreground">What's New</h2>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] text-muted-foreground">Version</p>
                      <p className="text-[13px] text-foreground">{app.version_name || "1.0"}</p>
                    </div>
                  </div>
                  <p className="text-[15px] text-foreground leading-relaxed">{app.whats_new}</p>
                </div>
              )}
            </div>

            {/* Right column - Information (desktop only sidebar-style) */}
            <div className="lg:w-[260px] lg:flex-shrink-0">
              <div className="py-5 border-t border-border/30">
                <h2 className="text-[22px] font-bold text-foreground mb-4">Information</h2>
                <div className="space-y-4">
                  {[
                    { label: "Size", value: fileInfo ? formatFileSize(fileInfo.file_size) : "--" },
                    { label: "Category", value: app.category || "Productivity" },
                    { label: "Developer", value: app.developer_name || "Unknown" },
                    { label: "Version", value: app.version_name || "1.0" },
                    { label: "Downloads", value: formatDownloads(actualDownloads) },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between py-2 border-b border-border/20">
                      <span className="text-[15px] text-muted-foreground">{row.label}</span>
                      <span className="text-[15px] text-foreground">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Download Button */}
          <div className="py-6 pb-8 lg:hidden">
            <motion.div
              animate={downloadSuccess ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <Button
                onClick={handleDownload}
                disabled={isDownloading || !fileInfo || !!fileUnavailable}
                className="w-full h-[52px] text-[17px] font-semibold rounded-2xl bg-[#34C759] hover:bg-[#2DB84D] text-white disabled:bg-muted disabled:text-muted-foreground shadow-sm"
              >
                {downloadSuccess ? (
                  <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2">
                    <Check className="h-5 w-5" /> Downloaded
                  </motion.span>
                ) : isDownloading ? "Downloading..." : "DOWNLOAD"}
              </Button>
            </motion.div>
          </div>
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
                className="flex-1 h-12 rounded-xl bg-[#34C759] hover:bg-[#2DB84D] text-white"
              >{isVerifyingPassword ? "Verifying..." : "Download"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
