import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Lock,
  AlertTriangle,
  Check,
  Share2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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
import { SliceAppsLayout, RatingsReviewsSection } from "@/components/sliceapps";
import { MetadataStrip } from "@/components/sliceapps/MetadataStrip";

/* ── Types ── */
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

/* ── Helpers ── */
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

/* ── Page ── */
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
    if (fileInfo.password_hash) {
      setShowPasswordDialog(true);
      return;
    }
    await initiateDownload();
  };

  const initiateDownload = async (passwordForDownload?: string) => {
    if (!fileInfo) return;
    setIsDownloading(true);
    try {
      const streamUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/file-stream?fileId=${fileInfo.file_id}${passwordForDownload ? "&verified=true" : ""}`;
      const a = document.createElement("a");
      a.href = streamUrl;
      a.download = fileInfo.original_name;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setFileInfo((prev) => prev ? { ...prev, download_count: (prev.download_count || 0) + 1 } : null);
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
      if (!data.success) {
        toast.error(data.error || "Invalid password");
        return;
      }
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
      setFileInfo((prev) => prev ? { ...prev, download_count: (prev.download_count || 0) + 1 } : null);
      toast.success("Download started!");
    } catch (err) {
      console.error("Password verification failed:", err);
      toast.error("This file is temporarily unavailable. Please try again later.");
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const handleShare = async () => {
    if (!app) return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: app.app_name, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  };

  /* ── Loading / Not Found ── */
  if (isLoading) {
    return (
      <SliceAppsLayout>
        <div className="flex items-center justify-center py-32">
          <div className="text-muted-foreground text-sm">Loading...</div>
        </div>
      </SliceAppsLayout>
    );
  }

  if (!app) {
    return (
      <SliceAppsLayout>
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <p className="text-lg text-foreground font-medium">App not found</p>
          <Link to="/slicebox">
            <Button variant="outline" className="rounded-full">Go to SliceBox</Button>
          </Link>
        </div>
      </SliceAppsLayout>
    );
  }

  const actualDownloads = fileInfo?.download_count || 0;
  const descriptionIsLong = (app.full_description?.length || 0) > 200;

  return (
    <SliceAppsLayout>
      {/* ── Hero Section ── */}
      <section className="bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 pt-6 pb-5 lg:pt-10 lg:pb-8">
          <div className="flex items-start gap-4 lg:gap-6">
            {/* App Icon */}
            <div className="w-[96px] h-[96px] lg:w-[128px] lg:h-[128px] rounded-[22px] lg:rounded-[28px] flex-shrink-0 overflow-hidden bg-muted shadow-sm">
              {app.icon_url ? (
                <img src={app.icon_url} alt={app.app_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-4xl font-bold bg-muted">
                  {app.app_name.charAt(0)}
                </div>
              )}
            </div>

            {/* Title / Subtitle / Buttons */}
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <h1 className="text-[22px] lg:text-[28px] font-bold text-foreground leading-tight tracking-tight">
                {app.app_name}
              </h1>
              {app.short_description && (
                <p className="text-[14px] lg:text-[15px] text-muted-foreground leading-snug">
                  {app.short_description}
                </p>
              )}
              <p className="text-[13px] text-muted-foreground/60">
                Free{app.developer_name ? ` · ${app.developer_name}` : ""}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 mt-2">
                <Button
                  onClick={handleDownload}
                  disabled={isDownloading || !fileInfo || !!fileUnavailable}
                  className="h-[32px] px-6 text-[14px] font-bold rounded-full bg-accent hover:bg-accent/90 text-accent-foreground disabled:opacity-40 uppercase tracking-wide"
                >
                  {downloadSuccess ? (
                    <span className="flex items-center gap-1.5">
                      <Check className="h-4 w-4" />
                      Done
                    </span>
                  ) : isDownloading ? (
                    "..."
                  ) : (
                    "Download"
                  )}
                </Button>
                <button
                  onClick={handleShare}
                  className="h-8 w-8 flex items-center justify-center text-accent hover:text-accent/80 transition-colors"
                  aria-label="Share"
                >
                  <Share2 className="h-[18px] w-[18px]" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Metadata Strip ── */}
      <div className="max-w-3xl mx-auto">
        <MetadataStrip
          ratingAvg={app.rating_avg}
          ratingCount={app.rating_count}
          downloads={formatDownloads(actualDownloads)}
          fileSize={fileInfo ? formatFileSize(fileInfo.file_size) : "--"}
          category={app.category || "Other"}
          developer={app.developer_name || "Unknown"}
        />
      </div>

      {/* ── File Unavailable Warning ── */}
      {fileUnavailable && (
        <div className="max-w-3xl mx-auto px-4 mt-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm">{fileUnavailable}</p>
          </div>
        </div>
      )}

      {/* ── Screenshots Carousel ── */}
      {app.screenshots && app.screenshots.length > 0 && (
        <section className="max-w-3xl mx-auto mt-6">
          <div className="overflow-x-auto scrollbar-hide px-4">
            <div className="flex gap-3 snap-x snap-mandatory pb-1">
              {app.screenshots.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Screenshot ${index + 1}`}
                  className="w-[200px] lg:w-[230px] h-[356px] lg:h-[410px] object-cover rounded-2xl flex-shrink-0 cursor-pointer snap-start shadow-sm border border-border/20"
                  onClick={() => setSelectedScreenshot(index)}
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── About Section ── */}
      {app.full_description && (
        <section className="max-w-3xl mx-auto px-4 mt-8">
          <div className="border-t border-border/40 pt-6">
            <h2 className="text-[20px] font-bold text-foreground mb-3 tracking-tight">
              About this app
            </h2>
            <div className="relative">
              <p
                className={`text-[15px] text-muted-foreground leading-relaxed whitespace-pre-wrap ${
                  !aboutExpanded && descriptionIsLong ? "line-clamp-4" : ""
                }`}
              >
                {app.full_description}
              </p>
              {descriptionIsLong && (
                <button
                  onClick={() => setAboutExpanded(!aboutExpanded)}
                  className="mt-2 text-accent text-[14px] font-medium flex items-center gap-1 hover:underline"
                >
                  {aboutExpanded ? (
                    <>Less <ChevronUp className="h-4 w-4" /></>
                  ) : (
                    <>More <ChevronDown className="h-4 w-4" /></>
                  )}
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── What's New ── */}
      {app.whats_new && (
        <section className="max-w-3xl mx-auto px-4 mt-8">
          <div className="border-t border-border/40 pt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[20px] font-bold text-foreground tracking-tight">
                What's New
              </h2>
              {app.version_name && (
                <span className="text-[13px] text-muted-foreground">
                  Version {app.version_name}
                </span>
              )}
            </div>
            <p className="text-[15px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {app.whats_new}
            </p>
          </div>
        </section>
      )}

      {/* ── Ratings & Reviews ── */}
      <section className="max-w-3xl mx-auto px-4 mt-8">
        <div className="border-t border-border/40 pt-6">
          <RatingsReviewsSection
            appId={app.id}
            ratingAvg={app.rating_avg}
            ratingCount={app.rating_count}
            reviews={reviews}
            userId={user?.id || null}
            onReviewSubmit={loadAppData}
          />
        </div>
      </section>

      {/* ── Information ── */}
      <section className="max-w-3xl mx-auto px-4 mt-8 pb-12">
        <div className="border-t border-border/40 pt-6">
          <h2 className="text-[20px] font-bold text-foreground mb-5 tracking-tight">
            Information
          </h2>
          <div className="space-y-4">
            {[
              { label: "Provider", value: app.developer_name || "Unknown" },
              { label: "Size", value: fileInfo ? formatFileSize(fileInfo.file_size) : "--" },
              { label: "Category", value: app.category || "Other" },
              { label: "Version", value: app.version_name || "1.0" },
              { label: "Downloads", value: formatDownloads(actualDownloads) },
              ...(app.release_date
                ? [{ label: "Released", value: new Date(app.release_date).toLocaleDateString() }]
                : []),
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between py-1 border-b border-border/20 last:border-0"
              >
                <span className="text-[14px] text-muted-foreground">{row.label}</span>
                <span className="text-[14px] text-foreground font-medium">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Screenshot Lightbox ── */}
      {selectedScreenshot !== null && app.screenshots && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
          onClick={() => setSelectedScreenshot(null)}
        >
          <img
            src={app.screenshots[selectedScreenshot]}
            alt="Screenshot"
            className="max-w-full max-h-full object-contain rounded-xl"
          />
        </div>
      )}

      {/* ── Password Dialog ── */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Password Required</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This file is password protected. Enter the password to download.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
              className="h-11"
            />
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowPasswordDialog(false);
                  setPassword("");
                }}
                variant="outline"
                className="flex-1 h-11 rounded-full"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePasswordSubmit}
                disabled={isVerifyingPassword || !password}
                className="flex-1 h-11 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {isVerifyingPassword ? "Verifying..." : "Download"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SliceAppsLayout>
  );
}
