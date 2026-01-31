import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Upload, Plus, X, Image as ImageIcon, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getBaseUrl } from "@/lib/domain";

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

const CATEGORIES = [
  "Games",
  "Social",
  "Productivity",
  "Entertainment",
  "Tools",
  "Education",
  "Finance",
  "Health & Fitness",
  "Music",
  "Photography",
  "Shopping",
  "Travel",
  "Weather",
  "News",
  "Other",
];

interface PublishedAppData {
  id: string;
  appName: string;
  appUrl: string;
}

export default function CreateAppListing() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Get file info from navigation state
  const fileData = location.state as {
    fileId: string;
    fileName: string;
    fileSize: number;
    serviceType?: string;
  } | null;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [publishedApp, setPublishedApp] = useState<PublishedAppData | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  
  const iconInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    appName: fileData?.fileName.replace(/\.apk$/i, "") || "",
    developerName: "",
    category: "Other",
    versionName: "1.0",
    versionCode: "1",
    shortDescription: "",
    fullDescription: "",
    whatsNew: "",
  });

  if (!fileData) {
    return (
      <div 
        className="min-h-dvh flex items-center justify-center"
        style={{ backgroundColor: SLICEAPPS_COLORS.bg, color: SLICEAPPS_COLORS.text }}
      >
        <div className="text-center">
          <p className="text-lg mb-4">No APK file selected</p>
          <Button
            onClick={() => navigate("/slicebox")}
            style={{ 
              backgroundColor: SLICEAPPS_COLORS.card,
              borderColor: SLICEAPPS_COLORS.border,
              color: SLICEAPPS_COLORS.text,
            }}
            className="border"
          >
            Go to SliceBox
          </Button>
        </div>
      </div>
    );
  }

  const handleImageUpload = async (
    file: File,
    type: "icon" | "screenshot" | "banner"
  ): Promise<string | null> => {
    const maxSize = type === "screenshot" ? 5 * 1024 * 1024 : 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`Image too large. Max ${type === "screenshot" ? "5MB" : "2MB"}`);
      return null;
    }

    const path = `${type}s/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage
      .from("app-assets")
      .upload(path, file);

    if (error) {
      toast.error("Failed to upload image");
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("app-assets")
      .getPublicUrl(path);

    return publicUrl;
  };

  const handleIconChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await handleImageUpload(file, "icon");
    if (url) setIconPreview(url);
  };

  const handleScreenshotAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (screenshots.length + files.length > 8) {
      toast.error("Maximum 8 screenshots allowed");
      return;
    }

    for (const file of files) {
      const url = await handleImageUpload(file, "screenshot");
      if (url) setScreenshots(prev => [...prev, url]);
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await handleImageUpload(file, "banner");
    if (url) setBannerPreview(url);
  };

  const removeScreenshot = (index: number) => {
    setScreenshots(prev => prev.filter((_, i) => i !== index));
  };

  const handleCopyLink = async () => {
    if (!publishedApp) return;
    
    try {
      await navigator.clipboard.writeText(publishedApp.appUrl);
      setCopiedLink(true);
      toast.success("Link copied!");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleOpenPage = () => {
    if (publishedApp) {
      window.open(publishedApp.appUrl, "_blank");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Please sign in to create an app page");
      return;
    }

    if (!formData.appName.trim()) {
      toast.error("App name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      // First, get the slicebox_files record to get the UUID
      const { data: fileRecord, error: fileError } = await supabase
        .from("slicebox_files")
        .select("id, service_type")
        .eq("file_id", fileData.fileId)
        .single();

      if (fileError || !fileRecord) {
        throw new Error("File not found");
      }

      // Create the app listing
      const { data: listing, error: listingError } = await supabase
        .from("app_listings")
        .insert({
          file_id: fileRecord.id,
          owner_id: user.id,
          app_name: formData.appName.trim(),
          developer_name: formData.developerName.trim() || null,
          category: formData.category,
          version_name: formData.versionName || "1.0",
          version_code: formData.versionCode || "1",
          short_description: formData.shortDescription.trim() || null,
          full_description: formData.fullDescription.trim() || null,
          whats_new: formData.whatsNew.trim() || null,
          icon_url: iconPreview,
          screenshots: screenshots,
          promo_banner_url: bannerPreview,
        })
        .select("id")
        .single();

      if (listingError) throw listingError;

      // If this is a LittleSlice file, remove expiry (make it permanent)
      if (fileRecord.service_type === "ls") {
        await supabase
          .from("slicebox_files")
          .update({ expires_at: null })
          .eq("id", fileRecord.id);
      }

      const appUrl = `${getBaseUrl()}/app/${listing.id}`;
      
      // Set published state instead of navigating
      setPublishedApp({
        id: listing.id,
        appName: formData.appName.trim(),
        appUrl,
      });

      toast.success("App page published successfully!");
    } catch (err) {
      console.error("Failed to create app listing:", err);
      toast.error("Failed to create app page");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Show success state after publish
  if (publishedApp) {
    return (
      <div 
        className="min-h-dvh flex items-center justify-center p-4"
        style={{ backgroundColor: SLICEAPPS_COLORS.bg }}
      >
        <div 
          className="w-full max-w-md p-6 rounded-2xl border text-center"
          style={{ 
            backgroundColor: SLICEAPPS_COLORS.card,
            borderColor: SLICEAPPS_COLORS.border,
          }}
        >
          <div 
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: SLICEAPPS_COLORS.border }}
          >
            <Check className="h-8 w-8" style={{ color: SLICEAPPS_COLORS.text }} />
          </div>
          
          <h2 
            className="text-xl font-bold mb-2"
            style={{ color: SLICEAPPS_COLORS.text }}
          >
            App Page Published!
          </h2>
          
          <p 
            className="text-sm mb-6"
            style={{ color: SLICEAPPS_COLORS.textSecondary }}
          >
            Your app page for "{publishedApp.appName}" is now live.
          </p>

          <div className="mb-6">
            <p 
              className="text-xs mb-2"
              style={{ color: SLICEAPPS_COLORS.textSecondary }}
            >
              App Page Link:
            </p>
            <div 
              className="p-3 rounded-lg font-mono text-sm break-all"
              style={{ 
                backgroundColor: SLICEAPPS_COLORS.bg,
                color: SLICEAPPS_COLORS.text,
              }}
            >
              {publishedApp.appUrl}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleCopyLink}
              className="flex-1 border"
              style={{
                backgroundColor: SLICEAPPS_COLORS.text,
                color: SLICEAPPS_COLORS.bg,
              }}
            >
              {copiedLink ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </>
              )}
            </Button>
            
            <Button
              onClick={handleOpenPage}
              variant="outline"
              className="flex-1 border"
              style={{
                backgroundColor: "transparent",
                borderColor: SLICEAPPS_COLORS.border,
                color: SLICEAPPS_COLORS.text,
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Page
            </Button>
          </div>

          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            className="w-full mt-4"
            style={{ color: SLICEAPPS_COLORS.textSecondary }}
          >
            Done
          </Button>
        </div>
      </div>
    );
  }

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
        <div className="max-w-3xl mx-auto h-14 flex items-center gap-4 px-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: SLICEAPPS_COLORS.text }}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 
              className="font-semibold"
              style={{ color: SLICEAPPS_COLORS.text }}
            >
              Create App Store Page
            </h1>
            <p 
              className="text-xs"
              style={{ color: SLICEAPPS_COLORS.textSecondary }}
            >
              {fileData.fileName} · {formatFileSize(fileData.fileSize)}
            </p>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* App Icon */}
          <div className="space-y-3">
            <Label style={{ color: SLICEAPPS_COLORS.text }}>App Icon</Label>
            <div className="flex items-center gap-4">
              <div
                onClick={() => iconInputRef.current?.click()}
                className="w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors overflow-hidden"
                style={{ 
                  borderColor: SLICEAPPS_COLORS.border,
                  backgroundColor: SLICEAPPS_COLORS.card,
                }}
              >
                {iconPreview ? (
                  <img src={iconPreview} alt="Icon" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8" style={{ color: SLICEAPPS_COLORS.textSecondary }} />
                )}
              </div>
              <div>
                <p className="text-sm" style={{ color: SLICEAPPS_COLORS.textSecondary }}>
                  512x512 PNG or JPG
                </p>
                <p className="text-xs mt-1" style={{ color: SLICEAPPS_COLORS.textSecondary }}>
                  Max 2MB
                </p>
              </div>
            </div>
            <input
              ref={iconInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handleIconChange}
            />
          </div>

          {/* App Name */}
          <div className="space-y-2">
            <Label style={{ color: SLICEAPPS_COLORS.text }}>App Name *</Label>
            <Input
              value={formData.appName}
              onChange={(e) => setFormData(prev => ({ ...prev, appName: e.target.value }))}
              placeholder="My Awesome App"
              required
              className="border"
              style={{
                backgroundColor: SLICEAPPS_COLORS.card,
                borderColor: SLICEAPPS_COLORS.border,
                color: SLICEAPPS_COLORS.text,
              }}
            />
          </div>

          {/* Developer Name */}
          <div className="space-y-2">
            <Label style={{ color: SLICEAPPS_COLORS.text }}>Developer Name</Label>
            <Input
              value={formData.developerName}
              onChange={(e) => setFormData(prev => ({ ...prev, developerName: e.target.value }))}
              placeholder="Your name or company"
              className="border"
              style={{
                backgroundColor: SLICEAPPS_COLORS.card,
                borderColor: SLICEAPPS_COLORS.border,
                color: SLICEAPPS_COLORS.text,
              }}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label style={{ color: SLICEAPPS_COLORS.text }}>Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger
                className="border"
                style={{
                  backgroundColor: SLICEAPPS_COLORS.card,
                  borderColor: SLICEAPPS_COLORS.border,
                  color: SLICEAPPS_COLORS.text,
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                style={{
                  backgroundColor: SLICEAPPS_COLORS.card,
                  borderColor: SLICEAPPS_COLORS.border,
                }}
              >
                {CATEGORIES.map(cat => (
                  <SelectItem 
                    key={cat} 
                    value={cat}
                    style={{ color: SLICEAPPS_COLORS.text }}
                  >
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Version */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label style={{ color: SLICEAPPS_COLORS.text }}>Version Name</Label>
              <Input
                value={formData.versionName}
                onChange={(e) => setFormData(prev => ({ ...prev, versionName: e.target.value }))}
                placeholder="1.0"
                className="border"
                style={{
                  backgroundColor: SLICEAPPS_COLORS.card,
                  borderColor: SLICEAPPS_COLORS.border,
                  color: SLICEAPPS_COLORS.text,
                }}
              />
            </div>
            <div className="space-y-2">
              <Label style={{ color: SLICEAPPS_COLORS.text }}>Version Code</Label>
              <Input
                value={formData.versionCode}
                onChange={(e) => setFormData(prev => ({ ...prev, versionCode: e.target.value }))}
                placeholder="1"
                className="border"
                style={{
                  backgroundColor: SLICEAPPS_COLORS.card,
                  borderColor: SLICEAPPS_COLORS.border,
                  color: SLICEAPPS_COLORS.text,
                }}
              />
            </div>
          </div>

          {/* Short Description */}
          <div className="space-y-2">
            <Label style={{ color: SLICEAPPS_COLORS.text }}>Short Description</Label>
            <Input
              value={formData.shortDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, shortDescription: e.target.value }))}
              placeholder="A brief tagline for your app"
              maxLength={80}
              className="border"
              style={{
                backgroundColor: SLICEAPPS_COLORS.card,
                borderColor: SLICEAPPS_COLORS.border,
                color: SLICEAPPS_COLORS.text,
              }}
            />
            <p className="text-xs" style={{ color: SLICEAPPS_COLORS.textSecondary }}>
              {formData.shortDescription.length}/80
            </p>
          </div>

          {/* Full Description */}
          <div className="space-y-2">
            <Label style={{ color: SLICEAPPS_COLORS.text }}>Full Description</Label>
            <Textarea
              value={formData.fullDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, fullDescription: e.target.value }))}
              placeholder="Describe your app in detail..."
              rows={5}
              className="border resize-none"
              style={{
                backgroundColor: SLICEAPPS_COLORS.card,
                borderColor: SLICEAPPS_COLORS.border,
                color: SLICEAPPS_COLORS.text,
              }}
            />
          </div>

          {/* What's New */}
          <div className="space-y-2">
            <Label style={{ color: SLICEAPPS_COLORS.text }}>What's New</Label>
            <Textarea
              value={formData.whatsNew}
              onChange={(e) => setFormData(prev => ({ ...prev, whatsNew: e.target.value }))}
              placeholder="Changelog for this version..."
              rows={3}
              className="border resize-none"
              style={{
                backgroundColor: SLICEAPPS_COLORS.card,
                borderColor: SLICEAPPS_COLORS.border,
                color: SLICEAPPS_COLORS.text,
              }}
            />
          </div>

          {/* Screenshots */}
          <div className="space-y-3">
            <Label style={{ color: SLICEAPPS_COLORS.text }}>Screenshots</Label>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {screenshots.map((url, index) => (
                <div key={index} className="relative flex-shrink-0">
                  <img
                    src={url}
                    alt={`Screenshot ${index + 1}`}
                    className="w-32 h-56 object-cover rounded-lg"
                    loading="lazy"
                  />
                  <button
                    type="button"
                    onClick={() => removeScreenshot(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ 
                      backgroundColor: SLICEAPPS_COLORS.text,
                      color: SLICEAPPS_COLORS.bg,
                    }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {screenshots.length < 8 && (
                <div
                  onClick={() => screenshotInputRef.current?.click()}
                  className="w-32 h-56 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer flex-shrink-0"
                  style={{ 
                    borderColor: SLICEAPPS_COLORS.border,
                    backgroundColor: SLICEAPPS_COLORS.card,
                  }}
                >
                  <Plus className="h-8 w-8 mb-2" style={{ color: SLICEAPPS_COLORS.textSecondary }} />
                  <span className="text-xs" style={{ color: SLICEAPPS_COLORS.textSecondary }}>
                    Add
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs" style={{ color: SLICEAPPS_COLORS.textSecondary }}>
              Up to 8 screenshots, max 5MB each
            </p>
            <input
              ref={screenshotInputRef}
              type="file"
              accept="image/png,image/jpeg"
              multiple
              className="hidden"
              onChange={handleScreenshotAdd}
            />
          </div>

          {/* Promo Banner */}
          <div className="space-y-3">
            <Label style={{ color: SLICEAPPS_COLORS.text }}>Promo Banner (Optional)</Label>
            <div
              onClick={() => bannerInputRef.current?.click()}
              className="h-40 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden"
              style={{ 
                borderColor: SLICEAPPS_COLORS.border,
                backgroundColor: SLICEAPPS_COLORS.card,
              }}
            >
              {bannerPreview ? (
                <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2" style={{ color: SLICEAPPS_COLORS.textSecondary }} />
                  <p className="text-sm" style={{ color: SLICEAPPS_COLORS.textSecondary }}>
                    1024x500 recommended
                  </p>
                </div>
              )}
            </div>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handleBannerChange}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 text-base font-medium border"
            style={{
              backgroundColor: SLICEAPPS_COLORS.text,
              color: SLICEAPPS_COLORS.bg,
            }}
          >
            {isSubmitting ? "Publishing..." : "Publish App Page"}
          </Button>
        </form>
      </main>
    </div>
  );
}
