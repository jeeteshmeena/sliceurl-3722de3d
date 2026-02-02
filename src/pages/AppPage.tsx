import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  Star, Download, Package, Lock, AlertTriangle
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
import { supabase } from "@/integrations/supabase/client"; // Used for reviews and password verification
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

// Simplified file info from public endpoint
interface PublicFileInfo {
  file_id: string;
  file_size: number;
  original_name: string;
  is_password_protected: boolean;
  download_count: number;
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
  
  // Password dialog
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  
  // Screenshot viewer
  const [selectedScreenshot, setSelectedScreenshot] = useState<number | null>(null);

  useEffect(() => {
    loadAppData();
  }, [id]);

  const loadAppData = async () => {
    if (!id) return;

    try {
      // Use public endpoint to fetch app info (no auth required)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-app-info?id=${encodeURIComponent(id)}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "omit", // Don't send auth cookies
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
        // Map public file info to our interface
        setFileInfo({
          file_id: data.fileInfo.file_id,
          file_size: data.fileInfo.file_size,
          storage_path: "", // Not needed, streaming endpoint handles it
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

    // Check if password protected
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
      // Use the unified streaming endpoint
      const streamUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/file-stream?fileId=${fileInfo.file_id}${passwordForDownload ? '&verified=true' : ''}`;
      
      // Create a hidden link and trigger download
      const a = document.createElement("a");
      a.href = streamUrl;
      a.download = fileInfo.original_name;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Update local download count from actual file downloads
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
      // Verify password
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

      // Password correct - use streaming endpoint with verified flag
      setShowPasswordDialog(false);
      setPassword("");

      // Use the unified streaming endpoint
      const streamUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/file-stream?fileId=${fileInfo.file_id}&verified=true`;
      
      const a = document.createElement("a");
      a.href = streamUrl;
      a.download = fileInfo.original_name;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Update local download count
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
        <div className="animate-pulse text-gray-500 dark:text-gray-400">
          Loading...
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-white dark:bg-black text-gray-900 dark:text-white">
        <div className="text-center">
          <p className="text-lg mb-4">App not found</p>
          <Link to="/slicebox">
            <Button variant="outline">
              Go to SliceBox
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Use actual file download count for consistency
  const actualDownloads = fileInfo?.download_count || 0;

  return (
    <div className="min-h-dvh bg-white dark:bg-black">
      {/* Header */}
      <SliceAppsHeader showCreateButton />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Promo Banner */}
        {app.promo_banner_url && (
          <div className="mb-6 rounded-xl overflow-hidden">
            <img 
              src={app.promo_banner_url} 
              alt="Promo" 
              className="w-full h-48 object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* App Header - Icon, Name, Developer only */}
        <div className="flex gap-4 mb-6">
          {/* Icon */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex-shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-800">
            {app.icon_url ? (
              <img src={app.icon_url} alt={app.app_name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-10 w-10 text-gray-400" />
              </div>
            )}
          </div>

          {/* Info - Name and Developer only */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h1 className="text-xl sm:text-2xl font-bold truncate text-gray-900 dark:text-white">
              {app.app_name}
            </h1>
            {app.developer_name && (
              <p className="text-sm mt-1.5 text-gray-500 dark:text-gray-400">
                {app.developer_name}
              </p>
            )}
          </div>
        </div>

        {/* Download Button - Large, rounded, green accent */}
        <Button
          onClick={handleDownload}
          disabled={isDownloading || !fileInfo || !!fileUnavailable}
          className="w-full h-14 text-base font-semibold rounded-2xl mb-5 gap-3 bg-green-500 hover:bg-green-600 text-white disabled:bg-gray-300 disabled:text-gray-500"
        >
          {fileInfo?.password_hash && <Lock className="h-5 w-5" />}
          <Download className="h-5 w-5" />
          {isDownloading ? "Downloading..." : "Download"}
        </Button>

        {/* File Unavailable Warning */}
        {fileUnavailable && (
          <div className="flex items-center gap-3 p-4 rounded-xl mb-5 bg-gray-100 dark:bg-gray-800">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-gray-500" />
            <p className="text-sm text-gray-500">
              {fileUnavailable}
            </p>
          </div>
        )}

        {/* Stats Row - Rating (with reviews count), Downloads, Size only */}
        <div className="flex items-center justify-between p-4 rounded-xl mb-6 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          {/* Rating with stars and review count */}
          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span className="font-bold text-lg text-gray-900 dark:text-white">
                {app.rating_avg?.toFixed(1) || "0.0"}
              </span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star 
                    key={star} 
                    className={`h-3.5 w-3.5 ${star <= Math.round(app.rating_avg || 0) ? "fill-current" : ""}`}
                    style={{ color: "#22c55e" }}
                  />
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ({(app.rating_count || 0).toLocaleString()} reviews)
            </p>
          </div>
          
          <div className="w-px h-10 bg-gray-200 dark:bg-gray-700" />
          
          {/* Downloads Count - Human readable */}
          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Download className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              <span className="font-bold text-lg text-gray-900 dark:text-white">
                {formatDownloads(actualDownloads)}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Downloads</p>
          </div>
          
          <div className="w-px h-10 bg-gray-200 dark:bg-gray-700" />
          
          {/* File Size */}
          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Package className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              <span className="font-bold text-lg text-gray-900 dark:text-white">
                {fileInfo ? formatFileSize(fileInfo.file_size) : "--"}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Size</p>
          </div>
        </div>

        {/* Screenshots - Horizontal scroll gallery */}
        {app.screenshots && app.screenshots.length > 0 && (
          <div className="mb-6">
            <h2 className="font-semibold mb-3 text-lg text-gray-900 dark:text-white">
              Screenshots
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {app.screenshots.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Screenshot ${index + 1}`}
                  className="w-36 h-64 object-cover rounded-xl flex-shrink-0 cursor-pointer border border-gray-200 dark:border-gray-700"
                  onClick={() => setSelectedScreenshot(index)}
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        )}

        {/* About section */}
        {app.full_description && (
          <div className="p-5 rounded-xl mb-6 bg-gray-50 dark:bg-gray-900">
            <h2 className="font-semibold mb-3 text-lg text-gray-900 dark:text-white">
              About this app
            </h2>
            <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-600 dark:text-gray-300">
              {app.full_description}
            </p>
          </div>
        )}

        {/* Additional Info - Category, Developer, Version, Size only */}
        <div className="p-5 rounded-xl mb-6 bg-gray-50 dark:bg-gray-900">
          <h2 className="font-semibold mb-4 text-lg text-gray-900 dark:text-white">
            Additional Information
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs mb-1 text-gray-500 dark:text-gray-400">
                Category
              </p>
              <p className="text-sm text-gray-900 dark:text-white">
                {app.category || "Other"}
              </p>
            </div>
            <div>
              <p className="text-xs mb-1 text-gray-500 dark:text-gray-400">
                Developer
              </p>
              <p className="text-sm text-gray-900 dark:text-white">
                {app.developer_name || "Unknown"}
              </p>
            </div>
            <div>
              <p className="text-xs mb-1 text-gray-500 dark:text-gray-400">
                Version
              </p>
              <p className="text-sm text-gray-900 dark:text-white">
                {app.version_name || "1.0"} ({app.version_code || "1"})
              </p>
            </div>
            <div>
              <p className="text-xs mb-1 text-gray-500 dark:text-gray-400">
                Size
              </p>
              <p className="text-sm text-gray-900 dark:text-white">
                {fileInfo ? formatFileSize(fileInfo.file_size) : "--"}
              </p>
            </div>
          </div>
        </div>

        {/* Ratings & Reviews */}
        <div className="mb-6">
          <RatingsReviewsSection
            appId={app.id}
            ratingAvg={app.rating_avg}
            ratingCount={app.rating_count}
            reviews={reviews}
            userId={user?.id || null}
            onReviewSubmit={loadAppData}
          />
        </div>
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
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              Password Required
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              This file is password protected. Please enter the password to download.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
              className="border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
            />
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowPasswordDialog(false);
                  setPassword("");
                }}
                variant="outline"
                className="flex-1 border border-gray-200 dark:border-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePasswordSubmit}
                disabled={isVerifyingPassword || !password}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
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
