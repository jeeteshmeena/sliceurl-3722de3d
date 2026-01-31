import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Download, Star, ChevronDown, ChevronUp, ExternalLink, 
  Package, Info, Clock, Shield, ArrowLeft, Loader2, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StarRating } from "@/components/sliceapps/StarRating";
import { ReviewSection } from "@/components/sliceapps/ReviewSection";
import { ScreenshotCarousel } from "@/components/sliceapps/ScreenshotCarousel";
import { AppListing, AppReview } from "@/components/sliceapps/types";
import { formatDistanceToNow } from "date-fns";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDownloads(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1000000).toFixed(1)}M`;
}

export default function AppPreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [app, setApp] = useState<AppListing | null>(null);
  const [reviews, setReviews] = useState<AppReview[]>([]);
  const [fileInfo, setFileInfo] = useState<{ file_size: number; storage_path: string; password_hash: string | null } | null>(null);
  const [expandedAbout, setExpandedAbout] = useState(false);
  const [expandedWhatsNew, setExpandedWhatsNew] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    
    try {
      // Fetch app listing
      const { data: appData, error: appError } = await supabase
        .from("app_listings")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (appError) throw appError;
      if (!appData) {
        navigate("/404");
        return;
      }

      setApp(appData as AppListing);

      // Fetch file info
      const { data: fileData } = await supabase
        .from("slicebox_files")
        .select("file_size, storage_path, password_hash")
        .eq("id", appData.file_id)
        .maybeSingle();

      if (fileData) {
        setFileInfo(fileData);
        setRequiresPassword(!!fileData.password_hash);
      }

      // Fetch reviews
      const { data: reviewsData } = await supabase
        .from("app_reviews")
        .select("*")
        .eq("app_id", id)
        .order("created_at", { ascending: false });

      if (reviewsData) {
        setReviews(reviewsData as AppReview[]);
      }
    } catch (err) {
      console.error("Error fetching app:", err);
      toast.error("Failed to load app");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleDownload = async () => {
    if (!app || !fileInfo) return;

    // Check password if required
    if (requiresPassword && !password) {
      setPasswordError(true);
      return;
    }

    setIsDownloading(true);
    setPasswordError(false);

    try {
      // If password protected, verify first
      if (fileInfo.password_hash) {
        const { data: verified, error: verifyError } = await supabase.functions.invoke("slicebox-verify-password", {
          body: { fileId: app.file_id, password }
        });

        if (verifyError || !verified?.valid) {
          setPasswordError(true);
          setIsDownloading(false);
          return;
        }
      }

      // Get download URL
      const { data: downloadData, error: downloadError } = await supabase.functions.invoke("slicebox-download", {
        body: { fileId: app.file_id }
      });

      if (downloadError || !downloadData?.url) {
        throw new Error("Failed to get download URL");
      }

      // Increment download count
      await supabase
        .from("app_listings")
        .update({ total_downloads: (app.total_downloads || 0) + 1 })
        .eq("id", app.id);

      // Trigger download
      const link = document.createElement("a");
      link.href = downloadData.url;
      link.download = `${app.app_name}.apk`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Download started!");
      
      // Refresh data
      fetchData();
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Download failed");
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-[#0F0F0F] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#7C3AED] animate-spin" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="min-h-dvh bg-[#0F0F0F] flex items-center justify-center">
        <p className="text-[#A0A0A0]">App not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0F0F0F] text-[#F5F5F0]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0F0F0F]/95 backdrop-blur border-b border-[#1A1A1A]">
        <div className="max-w-4xl mx-auto h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-[#A0A0A0] hover:text-[#F5F5F0]"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <span className="text-lg font-bold text-[#7C3AED]">SliceAPPs</span>
              <p className="text-xs text-[#6B6B6B]">by SliceURL</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* App Header */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row gap-5"
        >
          {/* Icon */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[28px] bg-[#1A1A1A] border border-[#2A2A2A] overflow-hidden shrink-0 shadow-lg">
            {app.icon_url ? (
              <img src={app.icon_url} alt={app.app_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-12 w-12 text-[#6B6B6B]" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#F5F5F0] mb-1 truncate">
              {app.app_name}
            </h1>
            {app.developer_name && (
              <p className="text-[#7C3AED] text-sm sm:text-base mb-2">{app.developer_name}</p>
            )}
            {app.short_description && (
              <p className="text-[#A0A0A0] text-sm mb-3 line-clamp-2">{app.short_description}</p>
            )}

            {/* Install Button */}
            <div className="flex flex-col gap-2">
              {requiresPassword && (
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className={`flex-1 bg-[#1A1A1A] border-[#2A2A2A] text-[#F5F5F0] ${passwordError ? 'border-red-500' : ''}`}
                  />
                </div>
              )}
              <Button
                onClick={handleDownload}
                disabled={isDownloading}
                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-12 rounded-xl text-base font-semibold w-full sm:w-auto"
              >
                {isDownloading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : requiresPassword ? (
                  <Lock className="h-5 w-5 mr-2" />
                ) : (
                  <Download className="h-5 w-5 mr-2" />
                )}
                {isDownloading ? "Downloading..." : "Install"}
              </Button>
              {passwordError && (
                <p className="text-red-400 text-xs">Incorrect password</p>
              )}
            </div>
          </div>
        </motion.section>

        {/* Stats Row */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-4 gap-2 sm:gap-4 p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]"
        >
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-[#F5F5F0] font-semibold">
              <Star className="h-4 w-4 fill-[#FFD700] text-[#FFD700]" />
              <span>{app.rating_avg?.toFixed(1) || "0.0"}</span>
            </div>
            <p className="text-xs text-[#6B6B6B]">{app.rating_count || 0} reviews</p>
          </div>
          <div className="text-center">
            <p className="text-[#F5F5F0] font-semibold">{formatDownloads(app.total_downloads || 0)}</p>
            <p className="text-xs text-[#6B6B6B]">Downloads</p>
          </div>
          <div className="text-center">
            <p className="text-[#F5F5F0] font-semibold">{fileInfo ? formatFileSize(fileInfo.file_size) : "--"}</p>
            <p className="text-xs text-[#6B6B6B]">Size</p>
          </div>
          <div className="text-center">
            <p className="text-[#F5F5F0] font-semibold">{app.version_name || "1.0"}</p>
            <p className="text-xs text-[#6B6B6B]">Version</p>
          </div>
        </motion.section>

        {/* Promo Banner */}
        {app.promo_banner_url && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <img
              src={app.promo_banner_url}
              alt="Promo banner"
              className="w-full h-40 sm:h-52 object-cover rounded-xl"
            />
          </motion.section>
        )}

        {/* Screenshots */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ScreenshotCarousel screenshots={app.screenshots || []} />
        </motion.div>

        {/* About This App */}
        {app.full_description && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#F5F5F0]">About this app</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedAbout(!expandedAbout)}
                className="text-[#7C3AED]"
              >
                {expandedAbout ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            <div className={`text-[#A0A0A0] text-sm leading-relaxed ${expandedAbout ? "" : "line-clamp-3"}`}>
              {app.full_description}
            </div>
          </motion.section>
        )}

        {/* What's New */}
        {app.whats_new && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#F5F5F0]">What's new</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedWhatsNew(!expandedWhatsNew)}
                className="text-[#7C3AED]"
              >
                {expandedWhatsNew ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            <div className={`text-[#A0A0A0] text-sm leading-relaxed whitespace-pre-line ${expandedWhatsNew ? "" : "line-clamp-3"}`}>
              {app.whats_new}
            </div>
          </motion.section>
        )}

        {/* Additional Info */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="space-y-3"
        >
          <h3 className="text-lg font-semibold text-[#F5F5F0]">Additional information</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
            <div>
              <p className="text-xs text-[#6B6B6B] mb-1">Category</p>
              <p className="text-sm text-[#F5F5F0]">{app.category || "Other"}</p>
            </div>
            <div>
              <p className="text-xs text-[#6B6B6B] mb-1">Updated</p>
              <p className="text-sm text-[#F5F5F0]">
                {formatDistanceToNow(new Date(app.updated_at), { addSuffix: true })}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6B6B6B] mb-1">Version</p>
              <p className="text-sm text-[#F5F5F0]">{app.version_name} ({app.version_code})</p>
            </div>
            {app.developer_name && (
              <div>
                <p className="text-xs text-[#6B6B6B] mb-1">Developer</p>
                <p className="text-sm text-[#F5F5F0]">{app.developer_name}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-[#6B6B6B] mb-1">Released</p>
              <p className="text-sm text-[#F5F5F0]">
                {new Date(app.release_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </motion.section>

        {/* Ratings & Reviews */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <ReviewSection
            appId={app.id}
            ratingAvg={app.rating_avg || 0}
            ratingCount={app.rating_count || 0}
            reviews={reviews}
            onReviewAdded={fetchData}
          />
        </motion.div>

        {/* Safety Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]"
        >
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-[#7C3AED]" />
            <div>
              <p className="text-sm text-[#F5F5F0] font-medium">Safety</p>
              <p className="text-xs text-[#6B6B6B]">
                Files are served securely via SliceURL. Always verify APKs before installing.
              </p>
            </div>
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1A1A1A] py-8 mt-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm text-[#6B6B6B]">
            <span className="text-[#7C3AED] font-semibold">SliceAPPs</span>
            {" "}powered by{" "}
            <Link to="/" className="text-[#A0A0A0] hover:text-[#F5F5F0] transition-colors">
              SliceURL
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
