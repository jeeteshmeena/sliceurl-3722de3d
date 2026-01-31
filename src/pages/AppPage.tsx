import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  Star, Download, ArrowLeft, 
  Package, User, Lock, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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

const SLICEAPPS_COLORS = {
  bg: "#000000",
  card: "#1a1a1a",
  cardHover: "#2a2a2a",
  border: "#333333",
  text: "#ffffff",
  textSecondary: "#888888",
  buttonBg: "#000000",
  buttonBorder: "#444444",
};

interface AppListing {
  id: string;
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
  
  // Review form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  // Screenshot viewer
  const [selectedScreenshot, setSelectedScreenshot] = useState<number | null>(null);

  useEffect(() => {
    loadAppData();
  }, [id]);

  const loadAppData = async () => {
    if (!id) return;

    try {
      // Load app listing
      const { data: appData, error: appError } = await supabase
        .from("app_listings")
        .select("*")
        .eq("id", id)
        .single();

      if (appError) throw appError;
      setApp(appData);

      // Load file info
      const { data: fileData, error: fileError } = await supabase
        .from("slicebox_files")
        .select("file_id, file_size, storage_path, original_name, password_hash, is_deleted, expires_at")
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
        .eq("app_id", id)
        .order("created_at", { ascending: false })
        .limit(10);

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

      // Trigger download with the signed URL
      const a = document.createElement("a");
      a.href = data.downloadUrl;
      a.download = data.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Update local download count
      if (app) {
        setApp(prev => prev ? { ...prev, total_downloads: (prev.total_downloads || 0) + 1 } : null);
      }

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

      // Now download with password verified
      const downloadResponse = await fetch(data.downloadUrl);
      if (!downloadResponse.ok) throw new Error("Download failed");
      
      const blob = await downloadResponse.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileInfo.original_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update local download count
      if (app) {
        setApp(prev => prev ? { ...prev, total_downloads: (prev.total_downloads || 0) + 1 } : null);
      }

      toast.success("Download started!");
    } catch (err) {
      console.error("Password verification failed:", err);
      toast.error("Failed to verify password");
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!app) return;

    // Only require login for reviews with text
    if (reviewText.trim() && !user) {
      toast.error("Please sign in to write a review");
      return;
    }

    setIsSubmittingReview(true);
    try {
      const { error } = await supabase
        .from("app_reviews")
        .insert({
          app_id: app.id,
          rating: reviewRating,
          review_text: reviewText.trim() || null,
          user_id: user?.id || null,
        });

      if (error) throw error;

      toast.success("Review submitted!");
      setReviewText("");
      setReviewRating(5);
      loadAppData(); // Reload to get updated ratings
    } catch (err) {
      console.error("Failed to submit review:", err);
      toast.error("Failed to submit review");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "Unknown";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDownloads = (count: number | null): string => {
    if (!count) return "0";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const getRatingDistribution = (): number[] => {
    const dist = [0, 0, 0, 0, 0];
    reviews.forEach(r => {
      if (r.rating >= 1 && r.rating <= 5) {
        dist[r.rating - 1]++;
      }
    });
    return dist.reverse(); // 5 stars first
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

  const ratingDist = getRatingDistribution();
  const maxRatingCount = Math.max(...ratingDist, 1);

  return (
    <div 
      className="min-h-dvh"
      style={{ backgroundColor: SLICEAPPS_COLORS.bg }}
    >
      {/* Header */}
      <header 
        className="sticky top-0 z-50 border-b"
        style={{ 
          backgroundColor: SLICEAPPS_COLORS.bg,
          borderColor: SLICEAPPS_COLORS.border,
        }}
      >
        <div className="max-w-4xl mx-auto h-12 flex items-center gap-3 px-4">
          <Link to="/" className="p-2 -ml-2">
            <ArrowLeft className="h-5 w-5" style={{ color: SLICEAPPS_COLORS.text }} />
          </Link>
          <span 
            className="text-sm font-medium"
            style={{ color: SLICEAPPS_COLORS.textSecondary }}
          >
            SliceAPPs
          </span>
        </div>
      </header>

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

        {/* App Header */}
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

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 
              className="text-xl sm:text-2xl font-bold truncate"
              style={{ color: SLICEAPPS_COLORS.text }}
            >
              {app.app_name}
            </h1>
            {app.developer_name && (
              <p 
                className="text-sm mt-1"
                style={{ color: SLICEAPPS_COLORS.textSecondary }}
              >
                {app.developer_name}
              </p>
            )}
            {app.category && (
              <p 
                className="text-xs mt-1"
                style={{ color: SLICEAPPS_COLORS.textSecondary }}
              >
                {app.category}
              </p>
            )}
          </div>
        </div>

        {/* File Unavailable Warning */}
        {fileUnavailable && (
          <div 
            className="flex items-center gap-3 p-4 rounded-xl mb-6"
            style={{ 
              backgroundColor: SLICEAPPS_COLORS.card,
              borderColor: SLICEAPPS_COLORS.border,
            }}
          >
            <AlertTriangle className="h-5 w-5 flex-shrink-0" style={{ color: "#ef4444" }} />
            <p className="text-sm" style={{ color: SLICEAPPS_COLORS.textSecondary }}>
              {fileUnavailable}
            </p>
          </div>
        )}

        {/* Download Button */}
        <Button
          onClick={handleDownload}
          disabled={isDownloading || !fileInfo || !!fileUnavailable}
          className="w-full h-14 text-base font-medium border mb-6"
          style={{
            backgroundColor: fileUnavailable ? SLICEAPPS_COLORS.card : SLICEAPPS_COLORS.text,
            color: fileUnavailable ? SLICEAPPS_COLORS.textSecondary : SLICEAPPS_COLORS.bg,
          }}
        >
          {fileInfo?.password_hash && <Lock className="h-5 w-5 mr-2" />}
          <Download className="h-5 w-5 mr-2" />
          {isDownloading ? "Downloading..." : "Download"}
        </Button>

        {/* Stats Row */}
        <div 
          className="grid grid-cols-5 gap-2 p-4 rounded-xl mb-6"
          style={{ backgroundColor: SLICEAPPS_COLORS.card }}
        >
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="h-4 w-4 fill-current" style={{ color: SLICEAPPS_COLORS.text }} />
              <span className="font-semibold" style={{ color: SLICEAPPS_COLORS.text }}>
                {app.rating_avg?.toFixed(1) || "—"}
              </span>
            </div>
            <p className="text-xs" style={{ color: SLICEAPPS_COLORS.textSecondary }}>Rating</p>
          </div>
          <div className="text-center">
            <div className="font-semibold mb-1" style={{ color: SLICEAPPS_COLORS.text }}>
              {app.rating_count || 0}
            </div>
            <p className="text-xs" style={{ color: SLICEAPPS_COLORS.textSecondary }}>Reviews</p>
          </div>
          <div className="text-center">
            <div className="font-semibold mb-1" style={{ color: SLICEAPPS_COLORS.text }}>
              {formatDownloads(app.total_downloads)}
            </div>
            <p className="text-xs" style={{ color: SLICEAPPS_COLORS.textSecondary }}>Downloads</p>
          </div>
          <div className="text-center">
            <div className="font-semibold mb-1" style={{ color: SLICEAPPS_COLORS.text }}>
              {fileInfo ? formatFileSize(fileInfo.file_size) : "—"}
            </div>
            <p className="text-xs" style={{ color: SLICEAPPS_COLORS.textSecondary }}>Size</p>
          </div>
          <div className="text-center">
            <div className="font-semibold mb-1" style={{ color: SLICEAPPS_COLORS.text }}>
              {app.version_name || "1.0"}
            </div>
            <p className="text-xs" style={{ color: SLICEAPPS_COLORS.textSecondary }}>Version</p>
          </div>
        </div>

        {/* Screenshots */}
        {app.screenshots && app.screenshots.length > 0 && (
          <div className="mb-6">
            <h2 
              className="font-semibold mb-3"
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
                  className="w-36 h-64 object-cover rounded-xl flex-shrink-0 cursor-pointer"
                  onClick={() => setSelectedScreenshot(index)}
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        )}

        {/* About */}
        {(app.short_description || app.full_description) && (
          <div 
            className="p-4 rounded-xl mb-6"
            style={{ backgroundColor: SLICEAPPS_COLORS.card }}
          >
            <h2 
              className="font-semibold mb-3"
              style={{ color: SLICEAPPS_COLORS.text }}
            >
              About this app
            </h2>
            {app.short_description && (
              <p 
                className="text-sm mb-3"
                style={{ color: SLICEAPPS_COLORS.text }}
              >
                {app.short_description}
              </p>
            )}
            {app.full_description && (
              <p 
                className="text-sm whitespace-pre-wrap"
                style={{ color: SLICEAPPS_COLORS.textSecondary }}
              >
                {app.full_description}
              </p>
            )}
          </div>
        )}

        {/* What's New */}
        {app.whats_new && (
          <div 
            className="p-4 rounded-xl mb-6"
            style={{ backgroundColor: SLICEAPPS_COLORS.card }}
          >
            <h2 
              className="font-semibold mb-3"
              style={{ color: SLICEAPPS_COLORS.text }}
            >
              What's New
            </h2>
            <p 
              className="text-sm whitespace-pre-wrap"
              style={{ color: SLICEAPPS_COLORS.textSecondary }}
            >
              {app.whats_new}
            </p>
          </div>
        )}

        {/* Additional Info */}
        <div 
          className="p-4 rounded-xl mb-6"
          style={{ backgroundColor: SLICEAPPS_COLORS.card }}
        >
          <h2 
            className="font-semibold mb-4"
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
                Updated
              </p>
              <p className="text-sm" style={{ color: SLICEAPPS_COLORS.text }}>
                {formatDate(app.release_date)}
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
          </div>
        </div>

        {/* Ratings & Reviews */}
        <div 
          className="p-4 rounded-xl mb-6"
          style={{ backgroundColor: SLICEAPPS_COLORS.card }}
        >
          <h2 
            className="font-semibold mb-4"
            style={{ color: SLICEAPPS_COLORS.text }}
          >
            Ratings & Reviews
          </h2>

          {/* Rating Summary */}
          <div className="flex gap-6 mb-6">
            <div className="text-center">
              <div 
                className="text-5xl font-bold"
                style={{ color: SLICEAPPS_COLORS.text }}
              >
                {app.rating_avg?.toFixed(1) || "0.0"}
              </div>
              <div className="flex gap-0.5 justify-center mt-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${star <= Math.round(app.rating_avg || 0) ? "fill-current" : ""}`}
                    style={{ color: SLICEAPPS_COLORS.text }}
                  />
                ))}
              </div>
              <p className="text-xs mt-1" style={{ color: SLICEAPPS_COLORS.textSecondary }}>
                {app.rating_count || 0} reviews
              </p>
            </div>

            {/* Rating Distribution */}
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((star, index) => (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-xs w-3" style={{ color: SLICEAPPS_COLORS.textSecondary }}>
                    {star}
                  </span>
                  <div 
                    className="flex-1 h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: SLICEAPPS_COLORS.border }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ 
                        backgroundColor: SLICEAPPS_COLORS.text,
                        width: `${(ratingDist[index] / maxRatingCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator className="mb-4" style={{ backgroundColor: SLICEAPPS_COLORS.border }} />

          {/* Add Review */}
          <div className="mb-6">
            <h3 
              className="text-sm font-medium mb-3"
              style={{ color: SLICEAPPS_COLORS.text }}
            >
              Write a review
            </h3>
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setReviewRating(star)}
                  className="p-1"
                >
                  <Star
                    className={`h-6 w-6 transition-colors ${star <= reviewRating ? "fill-current" : ""}`}
                    style={{ color: SLICEAPPS_COLORS.text }}
                  />
                </button>
              ))}
            </div>
            <Textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder={user ? "Share your thoughts about this app..." : "Sign in to write a review, or just rate it!"}
              rows={3}
              className="border resize-none mb-3"
              style={{
                backgroundColor: SLICEAPPS_COLORS.bg,
                borderColor: SLICEAPPS_COLORS.border,
                color: SLICEAPPS_COLORS.text,
              }}
            />
            <Button
              onClick={handleSubmitReview}
              disabled={isSubmittingReview}
              className="border"
              style={{
                backgroundColor: SLICEAPPS_COLORS.text,
                color: SLICEAPPS_COLORS.bg,
              }}
            >
              {isSubmittingReview ? "Submitting..." : "Submit Review"}
            </Button>
          </div>

          {/* Reviews List */}
          {reviews.length > 0 && (
            <div className="space-y-4">
              {reviews.map(review => (
                <div 
                  key={review.id}
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: SLICEAPPS_COLORS.bg }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: SLICEAPPS_COLORS.border }}
                    >
                      <User className="h-4 w-4" style={{ color: SLICEAPPS_COLORS.textSecondary }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm" style={{ color: SLICEAPPS_COLORS.text }}>
                        {review.user_id ? "User" : "Guest"}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              className={`h-3 w-3 ${star <= review.rating ? "fill-current" : ""}`}
                              style={{ color: SLICEAPPS_COLORS.text }}
                            />
                          ))}
                        </div>
                        <span className="text-xs" style={{ color: SLICEAPPS_COLORS.textSecondary }}>
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  {review.review_text && (
                    <p className="text-sm" style={{ color: SLICEAPPS_COLORS.textSecondary }}>
                      {review.review_text}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
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
