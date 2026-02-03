import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Star, Lock, AlertTriangle } from "lucide-react";
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
  const [fileUnavailable, setFileUnavailable] = useState<string | null>(null);
  
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  
  const [selectedScreenshot, setSelectedScreenshot] = useState<number | null>(null);

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
      const streamUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/file-stream?fileId=${fileInfo.file_id}${passwordForDownload ? '&verified=true' : ''}`;
      
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

      setFileInfo(prev => prev ? { ...prev, download_count: (prev.download_count || 0) + 1 } : null);

      toast.success("Download started!");
    } catch (err) {
      console.error("Password verification failed:", err);
      toast.error("This file is temporarily unavailable. Please try again later.");
    } finally {
      setIsVerifyingPassword(false);
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
      <div className="min-h-dvh flex items-center justify-center bg-white dark:bg-black">
        <div className="text-gray-400 dark:text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-white dark:bg-black">
        <div className="text-center">
          <p className="text-lg mb-4 text-gray-900 dark:text-white">App not found</p>
          <Link to="/slicebox">
            <Button variant="outline">Go to SliceBox</Button>
          </Link>
        </div>
      </div>
    );
  }

  const actualDownloads = fileInfo?.download_count || 0;

  return (
    <div className="min-h-dvh bg-white dark:bg-black">
      <SliceAppsHeader showCreateButton />

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Top Section: Icon + Name + Developer + Download Button */}
        <div className="flex gap-4 mb-6">
          {/* Large App Icon */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex-shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-900">
            {app.icon_url ? (
              <img src={app.icon_url} alt={app.app_name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600 text-2xl font-bold">
                {app.app_name.charAt(0)}
              </div>
            )}
          </div>

          {/* Name + Developer */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
              {app.app_name}
            </h1>
            {app.developer_name && (
              <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                {app.developer_name}
              </p>
            )}
          </div>
        </div>

        {/* Download Button */}
        <Button
          onClick={handleDownload}
          disabled={isDownloading || !fileInfo || !!fileUnavailable}
          className="w-full h-12 text-base font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
        >
          {fileInfo?.password_hash && <Lock className="h-4 w-4 mr-2" />}
          {isDownloading ? "Downloading..." : "Download"}
        </Button>

        {/* File Unavailable Warning */}
        {fileUnavailable && (
          <div className="flex items-center gap-3 mt-4 text-gray-500 dark:text-gray-400">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm">{fileUnavailable}</p>
          </div>
        )}

        {/* Stats Row - Clean text only */}
        <div className="flex items-center justify-around py-5 mt-4">
          {/* Rating */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="text-base font-medium text-gray-900 dark:text-white">
                {app.rating_avg?.toFixed(1) || "0.0"}
              </span>
              <Star className="h-4 w-4 fill-current text-gray-900 dark:text-white" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {(app.rating_count || 0).toLocaleString()} reviews
            </p>
          </div>

          {/* Downloads */}
          <div className="text-center">
            <p className="text-base font-medium text-gray-900 dark:text-white">
              {formatDownloads(actualDownloads)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Downloads
            </p>
          </div>

          {/* Size */}
          <div className="text-center">
            <p className="text-base font-medium text-gray-900 dark:text-white">
              {fileInfo ? formatFileSize(fileInfo.file_size) : "--"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Size
            </p>
          </div>
        </div>

        {/* Screenshots */}
        {app.screenshots && app.screenshots.length > 0 && (
          <section className="mt-6">
            <h2 className="text-base font-medium text-gray-900 dark:text-white mb-3">
              Screenshots
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {app.screenshots.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Screenshot ${index + 1}`}
                  className="w-32 h-56 object-cover rounded-lg flex-shrink-0 cursor-pointer"
                  onClick={() => setSelectedScreenshot(index)}
                  loading="lazy"
                />
              ))}
            </div>
          </section>
        )}

        {/* About this app */}
        {app.full_description && (
          <section className="mt-8">
            <h2 className="text-base font-medium text-gray-900 dark:text-white mb-3">
              About this app
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {app.full_description}
            </p>
          </section>
        )}

        {/* What's New */}
        {app.whats_new && (
          <section className="mt-8">
            <h2 className="text-base font-medium text-gray-900 dark:text-white mb-3">
              What's new
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {app.whats_new}
            </p>
          </section>
        )}

        {/* Additional Info */}
        <section className="mt-8">
          <h2 className="text-base font-medium text-gray-900 dark:text-white mb-4">
            Additional information
          </h2>
          <div className="grid grid-cols-2 gap-y-4 gap-x-8">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Version</p>
              <p className="text-sm text-gray-900 dark:text-white">
                {app.version_name || "1.0"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Category</p>
              <p className="text-sm text-gray-900 dark:text-white">
                {app.category || "Other"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Developer</p>
              <p className="text-sm text-gray-900 dark:text-white">
                {app.developer_name || "Unknown"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Size</p>
              <p className="text-sm text-gray-900 dark:text-white">
                {fileInfo ? formatFileSize(fileInfo.file_size) : "--"}
              </p>
            </div>
          </div>
        </section>

        {/* Ratings & Reviews */}
        <section className="mt-8">
          <RatingsReviewsSection
            appId={app.id}
            ratingAvg={app.rating_avg}
            ratingCount={app.rating_count}
            reviews={reviews}
            userId={user?.id || null}
            onReviewSubmit={loadAppData}
          />
        </section>
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
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="bg-white dark:bg-gray-900 border-0">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              Password Required
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
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
              className="h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
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
                className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white"
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
