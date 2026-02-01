import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SliceAppsHeader, RatingsReviewsSection } from "@/components/sliceapps";

const SLICEAPPS_COLORS = {
  bg: "#000000",
  card: "#1a1a1a",
  cardHover: "#2a2a2a",
  border: "#333333",
  text: "#ffffff",
  textSecondary: "#888888",
  green: "#4ade80",
};

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
  const navigate = useNavigate();
  
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
      // Check if id is a UUID or short_code
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      let query = supabase
        .from("app_listings")
        .select("*");
      
      if (isUuid) {
        query = query.eq("id", id);
      } else {
        query = query.eq("short_code", id);
      }
      
      const { data: appData, error: appError } = await query.single();

      if (appError) throw appError;
      setApp(appData);

      // Load file info
      const { data: fileData, error: fileError } = await supabase
        .from("slicebox_files")
        .select("file_id, file_size, storage_path, original_name, password_hash, is_deleted, expires_at, download_count")
        .eq("id", appData.file_id)
        .single();

      if (fileError) {
        setFileUnavailable("File not found");
      } else if (fileData.is_deleted) {
        setFileUnavailable("This file has been deleted");
      } else if (fileData.expires_at && new Date(fileData.expires_at) < new Date()) {
        setFileUnavailable("This file has expired");
      } else {
        setFileInfo(fileData);
      }

      // Load reviews
      const { data: reviewsData } = await supabase
        .from("app_reviews")
        .select("*")
        .eq("app_id", appData.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (reviewsData) {
        setReviews(reviewsData);
      }
    } catch (err) {
      console.error("Failed to load app:", err);
      toast.error("Failed to load app");
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
      // Use the edge function to get a signed download URL
      const { data, error } = await supabase.functions.invoke("slicebox-download", {
        body: { fileId: fileInfo.file_id },
      });

      if (error) throw error;
      
      if (!data.success) {
        if (data.requiresPassword && !passwordForDownload) {
          setShowPasswordDialog(true);
          setIsDownloading(false);
          return;
        }
        throw new Error(data.error || "Download failed");
      }

      // Trigger streaming download with the signed URL
      const a = document.createElement("a");
      a.href = data.downloadUrl;
      a.download = data.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Update local download count from actual file downloads
      setFileInfo(prev => prev ? { ...prev, download_count: (prev.download_count || 0) + 1 } : null);

      toast.success("Download started!");
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Download failed");
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

      // Password correct - get download URL
      setShowPasswordDialog(false);
      setPassword("");

      // Trigger streaming download with the signed URL
      const a = document.createElement("a");
      a.href = data.downloadUrl;
      a.download = fileInfo.original_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Update local download count
      setFileInfo(prev => prev ? { ...prev, download_count: (prev.download_count || 0) + 1 } : null);

      toast.success("Download started!");
    } catch (err) {
      console.error("Password verification failed:", err);
      toast.error("Failed to verify password");
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
    if (!count) return "0";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M+`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K+`;
    return count.toString();
  };

  if (isLoading) {
    return (
      <div 
        className="min-h-dvh flex items-center justify-center"
        style={{ backgroundColor: SLICEAPPS_COLORS.bg }}
      >
        <div className="animate-pulse" style={{ color: SLICEAPPS_COLORS.textSecondary }}>
          Loading...
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div 
        className="min-h-dvh flex items-center justify-center"
        style={{ backgroundColor: SLICEAPPS_COLORS.bg, color: SLICEAPPS_COLORS.text }}
      >
        <div className="text-center">
          <p className="text-lg mb-4">App not found</p>
          <Link to="/slicebox">
            <Button
              style={{ 
                backgroundColor: SLICEAPPS_COLORS.card,
                borderColor: SLICEAPPS_COLORS.border,
                color: SLICEAPPS_COLORS.text,
              }}
              className="border"
            >
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
    <div 
      className="min-h-dvh"
      style={{ backgroundColor: SLICEAPPS_COLORS.bg }}
    >
      {/* Header - Clean, no back arrow */}
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

        {/* App Header - Clean layout: Icon, Name, Developer only */}
        <div className="flex gap-4 mb-6">
          {/* Icon */}
          <div 
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex-shrink-0 overflow-hidden"
            style={{ backgroundColor: SLICEAPPS_COLORS.card }}
          >
            {app.icon_url ? (
              <img src={app.icon_url} alt={app.app_name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-10 w-10" style={{ color: SLICEAPPS_COLORS.textSecondary }} />
              </div>
            )}
          </div>

          {/* Info - Name and Developer only (no category/version here) */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h1 
              className="text-xl sm:text-2xl font-bold truncate"
              style={{ color: SLICEAPPS_COLORS.text }}
            >
              {app.app_name}
            </h1>
            {app.developer_name && (
              <p 
                className="text-sm mt-1.5"
                style={{ color: SLICEAPPS_COLORS.textSecondary }}
              >
                {app.developer_name}
              </p>
            )}
          </div>
        </div>

        {/* Download Button - Large, rounded, white bg, black text */}
        <Button
          onClick={handleDownload}
          disabled={isDownloading || !fileInfo || !!fileUnavailable}
          className="w-full h-14 text-base font-semibold rounded-2xl mb-5 gap-3"
          style={{
            backgroundColor: fileUnavailable ? SLICEAPPS_COLORS.card : "#ffffff",
            color: fileUnavailable ? SLICEAPPS_COLORS.textSecondary : "#000000",
          }}
        >
          {fileInfo?.password_hash && <Lock className="h-5 w-5" />}
          <Download className="h-5 w-5" />
          {isDownloading ? "Downloading..." : "Download"}
        </Button>

        {/* File Unavailable Warning */}
        {fileUnavailable && (
          <div 
            className="flex items-center gap-3 p-4 rounded-xl mb-5"
            style={{ backgroundColor: SLICEAPPS_COLORS.card }}
          >
            <AlertTriangle className="h-5 w-5 flex-shrink-0" style={{ color: SLICEAPPS_COLORS.textSecondary }} />
            <p className="text-sm" style={{ color: SLICEAPPS_COLORS.textSecondary }}>
              {fileUnavailable}
            </p>
          </div>
        )}

        {/* Stats Row - Rating, Reviews, Downloads, Size (no version) */}
        <div 
          className="flex items-center justify-between p-4 rounded-xl mb-6"
          style={{ backgroundColor: SLICEAPPS_COLORS.card }}
        >
          {/* Rating */}
          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="h-4 w-4 fill-current" style={{ color: SLICEAPPS_COLORS.green }} />
              <span className="font-semibold" style={{ color: SLICEAPPS_COLORS.text }}>
                {app.rating_avg?.toFixed(1) || "—"}
              </span>
            </div>
            <p className="text-xs" style={{ color: SLICEAPPS_COLORS.textSecondary }}>Rating</p>
          </div>
          
          <div className="w-px h-8" style={{ backgroundColor: SLICEAPPS_COLORS.border }} />
          
          {/* Reviews Count */}
          <div className="text-center flex-1">
            <div className="font-semibold mb-1" style={{ color: SLICEAPPS_COLORS.text }}>
              {app.rating_count || 0}
            </div>
            <p className="text-xs" style={{ color: SLICEAPPS_COLORS.textSecondary }}>Reviews</p>
          </div>
          
          <div className="w-px h-8" style={{ backgroundColor: SLICEAPPS_COLORS.border }} />
          
          {/* Downloads Count - Human readable */}
          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Download className="h-3.5 w-3.5" style={{ color: SLICEAPPS_COLORS.text }} />
              <span className="font-semibold" style={{ color: SLICEAPPS_COLORS.text }}>
                {formatDownloads(actualDownloads)}
              </span>
            </div>
            <p className="text-xs" style={{ color: SLICEAPPS_COLORS.textSecondary }}>Downloads</p>
          </div>
          
          <div className="w-px h-8" style={{ backgroundColor: SLICEAPPS_COLORS.border }} />
          
          {/* File Size */}
          <div className="text-center flex-1">
            <div className="font-semibold mb-1" style={{ color: SLICEAPPS_COLORS.text }}>
              {fileInfo ? formatFileSize(fileInfo.file_size) : "—"}
            </div>
            <p className="text-xs" style={{ color: SLICEAPPS_COLORS.textSecondary }}>Size</p>
          </div>
        </div>

        {/* Screenshots - Horizontal scroll gallery */}
        {app.screenshots && app.screenshots.length > 0 && (
          <div className="mb-6">
            <h2 
              className="font-semibold mb-3 text-lg"
              style={{ color: SLICEAPPS_COLORS.text }}
            >
              Screenshots
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {app.screenshots.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Screenshot ${index + 1}`}
                  className="w-36 h-64 object-cover rounded-xl flex-shrink-0 cursor-pointer border"
                  style={{ borderColor: SLICEAPPS_COLORS.border }}
                  onClick={() => setSelectedScreenshot(index)}
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        )}

        {/* About - Expandable section */}
        {app.full_description && (
          <div 
            className="p-5 rounded-xl mb-6"
            style={{ backgroundColor: SLICEAPPS_COLORS.card }}
          >
            <h2 
              className="font-semibold mb-3 text-lg"
              style={{ color: SLICEAPPS_COLORS.text }}
            >
              About this app
            </h2>
            <p 
              className="text-sm whitespace-pre-wrap leading-relaxed"
              style={{ color: SLICEAPPS_COLORS.textSecondary }}
            >
              {app.full_description}
            </p>
          </div>
        )}

        {/* Additional Info */}
        <div 
          className="p-5 rounded-xl mb-6"
          style={{ backgroundColor: SLICEAPPS_COLORS.card }}
        >
          <h2 
            className="font-semibold mb-4 text-lg"
            style={{ color: SLICEAPPS_COLORS.text }}
          >
            Additional Information
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs mb-1" style={{ color: SLICEAPPS_COLORS.textSecondary }}>
                Category
              </p>
              <p className="text-sm" style={{ color: SLICEAPPS_COLORS.text }}>
                {app.category || "Other"}
              </p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: SLICEAPPS_COLORS.textSecondary }}>
                Version
              </p>
              <p className="text-sm" style={{ color: SLICEAPPS_COLORS.text }}>
                {app.version_name || "1.0"} ({app.version_code || "1"})
              </p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: SLICEAPPS_COLORS.textSecondary }}>
                Developer
              </p>
              <p className="text-sm" style={{ color: SLICEAPPS_COLORS.text }}>
                {app.developer_name || "Unknown"}
              </p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: SLICEAPPS_COLORS.textSecondary }}>
                Size
              </p>
              <p className="text-sm" style={{ color: SLICEAPPS_COLORS.text }}>
                {fileInfo ? formatFileSize(fileInfo.file_size) : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Ratings & Reviews - Enhanced component */}
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.9)" }}
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
        <DialogContent
          style={{
            backgroundColor: SLICEAPPS_COLORS.card,
            borderColor: SLICEAPPS_COLORS.border,
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: SLICEAPPS_COLORS.text }}>
              Password Required
            </DialogTitle>
            <DialogDescription style={{ color: SLICEAPPS_COLORS.textSecondary }}>
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
              className="border"
              style={{
                backgroundColor: SLICEAPPS_COLORS.bg,
                borderColor: SLICEAPPS_COLORS.border,
                color: SLICEAPPS_COLORS.text,
              }}
            />
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowPasswordDialog(false);
                  setPassword("");
                }}
                variant="outline"
                className="flex-1 border"
                style={{
                  backgroundColor: "transparent",
                  borderColor: SLICEAPPS_COLORS.border,
                  color: SLICEAPPS_COLORS.text,
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePasswordSubmit}
                disabled={isVerifyingPassword || !password}
                className="flex-1"
                style={{
                  backgroundColor: SLICEAPPS_COLORS.text,
                  color: SLICEAPPS_COLORS.bg,
                }}
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
