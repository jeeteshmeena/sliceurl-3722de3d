import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, Link } from "react-router-dom";
import { Lock, AlertTriangle, Check, Share, ChevronRight } from "lucide-react";
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
  const [descExpanded, setDescExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "details" | "reviews">("overview");

  useEffect(() => {
    loadAppData();
  }, [id]);

  const loadAppData = async () => {
    if (!id) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-app-info?id=${encodeURIComponent(id)}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
        }
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

      if (data.reviews) {
        setReviews(data.reviews);
      }
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

      setFileInfo((prev) =>
        prev ? { ...prev, download_count: (prev.download_count || 0) + 1 } : null
      );

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
        body: {
          fileId: fileInfo.file_id,
          password,
        },
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

      setFileInfo((prev) =>
        prev ? { ...prev, download_count: (prev.download_count || 0) + 1 } : null
      );

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
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg mb-4 text-foreground">App not found</p>
          <Link to="/slicebox">
            <Button variant="outline">Go to SliceBox</Button>
          </Link>
        </div>
      </div>
    );
  }

  const actualDownloads = fileInfo?.download_count || 0;

  // Truncate description for collapsed view
  const descriptionLines = app.full_description?.split("\n") || [];
  const isLongDescription = (app.full_description?.length || 0) > 180;

  const tabs = [
    { key: "overview" as const, label: "Overview" },
    { key: "details" as const, label: "Details" },
    { key: "reviews" as const, label: "Reviews" },
  ];

  return (
    <div className="min-h-dvh bg-background">
      <SliceAppsHeader />

      <main className="max-w-2xl mx-auto px-4 pt-6 pb-12">
        {/* ====== HERO SECTION ====== */}
        <div className="flex gap-4 items-start">
          {/* App Icon */}
          <div className="w-[96px] h-[96px] sm:w-[112px] sm:h-[112px] rounded-[24px] flex-shrink-0 overflow-hidden bg-muted shadow-md">
            {app.icon_url ? (
              <img
                src={app.icon_url}
                alt={app.app_name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-3xl font-bold">
                {app.app_name.charAt(0)}
              </div>
            )}
          </div>

          {/* Title + Developer + Action */}
          <div className="flex-1 min-w-0 flex flex-col justify-between h-[96px] sm:h-[112px]">
            <div>
              <h1 className="text-xl sm:text-[22px] font-bold text-foreground leading-tight tracking-tight">
                {app.app_name}
              </h1>
              <p className="text-[13px] text-primary/80 mt-0.5 truncate">
                {app.developer_name || "Unknown Developer"}
              </p>
              {app.short_description && (
                <p className="text-[13px] text-muted-foreground mt-0.5 line-clamp-1">
                  {app.short_description}
                </p>
              )}
            </div>

            {/* GET button + Share */}
            <div className="flex items-center gap-3 mt-auto">
              <motion.div
                animate={downloadSuccess ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="flex-shrink-0"
              >
                <Button
                  onClick={handleDownload}
                  disabled={isDownloading || !fileInfo || !!fileUnavailable}
                  className="h-[32px] px-7 text-[15px] font-bold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground shadow-none tracking-wide"
                >
                  {downloadSuccess ? (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-1.5"
                    >
                      <Check className="h-4 w-4" />
                    </motion.span>
                  ) : isDownloading ? (
                    "..."
                  ) : (
                    "GET"
                  )}
                </Button>
              </motion.div>

              <button
                onClick={handleShare}
                className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
                aria-label="Share"
              >
                <Share className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </div>

        {/* File Unavailable Warning */}
        {fileUnavailable && (
          <div className="flex items-center gap-3 mt-3 text-muted-foreground">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <p className="text-[13px]">{fileUnavailable}</p>
          </div>
        )}

        {/* ====== METADATA STRIP ====== */}
        <MetadataStrip
          ratingAvg={app.rating_avg}
          ratingCount={app.rating_count}
          downloads={formatDownloads(actualDownloads)}
          fileSize={fileInfo ? formatFileSize(fileInfo.file_size) : "--"}
          category={app.category || "Other"}
          developer={app.developer_name || "Unknown"}
        />

        {/* ====== TABS ====== */}
        <div className="mt-6 border-b border-border/50">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-4 py-2.5 text-[14px] font-medium transition-colors ${
                  activeTab === tab.key
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground/70"
                }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="apppage-tab-indicator"
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-foreground"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ====== TAB CONTENT ====== */}
        {activeTab === "overview" && (
          <div className="mt-6">
            {/* Screenshots */}
            {app.screenshots && app.screenshots.length > 0 && (
              <div className="-mx-4 px-4 mb-8">
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
                  {app.screenshots.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="w-[200px] h-[356px] object-cover rounded-2xl flex-shrink-0 cursor-pointer snap-center shadow-sm"
                      onClick={() => setSelectedScreenshot(index)}
                      loading="lazy"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {app.full_description && (
              <section className="mb-6">
                <div className="relative">
                  <p
                    className={`text-[14px] text-muted-foreground leading-relaxed whitespace-pre-wrap ${
                      !descExpanded && isLongDescription ? "line-clamp-3" : ""
                    }`}
                  >
                    {app.full_description}
                  </p>
                  {isLongDescription && !descExpanded && (
                    <button
                      onClick={() => setDescExpanded(true)}
                      className="text-primary text-[14px] font-medium mt-1"
                    >
                      more
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* What's New */}
            {app.whats_new && (
              <section className="mb-6">
                <h2 className="text-[20px] font-bold text-foreground mb-2 tracking-tight">
                  What's New
                </h2>
                <p className="text-[13px] text-muted-foreground/70 mb-2">
                  Version {app.version_name || "1.0"}
                </p>
                <p className="text-[14px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {app.whats_new}
                </p>
              </section>
            )}
          </div>
        )}

        {activeTab === "details" && (
          <div className="mt-6">
            <h2 className="text-[20px] font-bold text-foreground mb-4 tracking-tight">
              Information
            </h2>
            <div className="divide-y divide-border/40">
              {[
                { label: "Developer", value: app.developer_name || "Unknown" },
                { label: "Category", value: app.category || "Other" },
                { label: "Version", value: app.version_name || "1.0" },
                { label: "Size", value: fileInfo ? formatFileSize(fileInfo.file_size) : "--" },
                {
                  label: "Released",
                  value: app.release_date
                    ? new Date(app.release_date).toLocaleDateString()
                    : "--",
                },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-3">
                  <span className="text-[14px] text-muted-foreground">{row.label}</span>
                  <span className="text-[14px] text-foreground font-medium">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="mt-6">
            <RatingsReviewsSection
              appId={app.id}
              ratingAvg={app.rating_avg}
              ratingCount={app.rating_count}
              reviews={reviews}
              userId={user?.id || null}
              onReviewSubmit={loadAppData}
            />
          </div>
        )}
      </main>

      {/* Screenshot Modal */}
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

      {/* Password Dialog */}
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
                className="flex-1 h-11"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePasswordSubmit}
                disabled={isVerifyingPassword || !password}
                className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isVerifyingPassword ? "Verifying..." : "Download"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
