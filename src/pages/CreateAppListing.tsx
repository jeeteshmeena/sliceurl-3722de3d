import { useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Upload, X, Image as ImageIcon, Copy, Check, ExternalLink, GripVertical } from "lucide-react";
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
import sliceAppsLogo from "@/assets/sliceurl-logo-new.png";

const SLICEAPPS_COLORS = {
  bg: "#000000",
  card: "#1a1a1a",
  cardHover: "#2a2a2a",
  border: "#333333",
  borderSoft: "#2a2a2a",
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
  shortCode: string;
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
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const iconInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const screenshotDropRef = useRef<HTMLDivElement>(null);

  // Form state - removed shortDescription and whatsNew
  const [formData, setFormData] = useState({
    appName: fileData?.fileName.replace(/\.apk$/i, "") || "",
    developerName: "",
    category: "Other",
    versionName: "1.0",
    versionCode: "1",
    fullDescription: "",
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

  const handleScreenshotDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
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

  const handleScreenshotDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleScreenshotDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newScreenshots = [...screenshots];
    const [removed] = newScreenshots.splice(draggedIndex, 1);
    newScreenshots.splice(index, 0, removed);
    setScreenshots(newScreenshots);
    setDraggedIndex(index);
  };

  const handleScreenshotDragEnd = () => {
    setDraggedIndex(null);
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

  // Generate URL-safe slug from app name
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  };

  // Generate random short code
  const generateShortCode = (): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
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

      // Try to use slug first, fallback to random code
      let shortCode = generateSlug(formData.appName.trim());
      
      // Check if slug is available
      const { data: existingWithSlug } = await supabase
        .from("app_listings")
        .select("id")
        .eq("short_code", shortCode)
        .maybeSingle();
      
      if (existingWithSlug) {
        // Slug taken, generate random code
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 10) {
          shortCode = generateShortCode();
          const { data: existing } = await supabase
            .from("app_listings")
            .select("id")
            .eq("short_code", shortCode)
            .maybeSingle();
          isUnique = !existing;
          attempts++;
        }
      }

      // Create the app listing with short_code
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
          full_description: formData.fullDescription.trim() || null,
          icon_url: iconPreview,
          screenshots: screenshots,
          promo_banner_url: bannerPreview,
          short_code: shortCode,
        })
        .select("id, short_code")
        .single();

      if (listingError) throw listingError;

      // If this is a LittleSlice file, remove expiry (make it permanent)
      if (fileRecord.service_type === "ls") {
        await supabase
          .from("slicebox_files")
          .update({ expires_at: null })
          .eq("id", fileRecord.id);
      }

      const appUrl = `${getBaseUrl()}/app/${listing.short_code}`;
      
      // Set published state instead of navigating
      setPublishedApp({
        id: listing.id,
        shortCode: listing.short_code,
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
          className="w-full max-w-md p-8 rounded-2xl border text-center"
          style={{ 
            backgroundColor: SLICEAPPS_COLORS.card,
            borderColor: SLICEAPPS_COLORS.border,
          }}
        >
          <div 
            className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center"
            style={{ backgroundColor: SLICEAPPS_COLORS.border }}
          >
            <Check className="h-8 w-8" style={{ color: SLICEAPPS_COLORS.text }} />
          </div>
          
          <h2 
            className="text-xl font-bold mb-2"
            style={{ color: SLICEAPPS_COLORS.text }}
          >
            Your App Page is Live
          </h2>
          
          <p 
            className="text-sm mb-6"
            style={{ color: SLICEAPPS_COLORS.textSecondary }}
          >
            "{publishedApp.appName}" is now available for download.
          </p>

          <div className="mb-6">
            <p 
              className="text-xs mb-2"
              style={{ color: SLICEAPPS_COLORS.textSecondary }}
            >
              App Page Link:
            </p>
            <div 
              className="p-4 rounded-xl font-mono text-sm break-all"
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
              className="flex-1 h-12 rounded-xl font-medium"
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
              className="flex-1 h-12 rounded-xl font-medium border"
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
      {/* Header - Sticky with logo lockup */}
      <header 
        className="sticky top-0 z-50 border-b"
        style={{ 
          backgroundColor: SLICEAPPS_COLORS.bg,
          borderColor: SLICEAPPS_COLORS.border,
        }}
      >
        <div className="max-w-3xl mx-auto h-14 flex items-center px-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center"
              style={{ backgroundColor: SLICEAPPS_COLORS.card }}
            >
              <img 
                src={sliceAppsLogo} 
                alt="SliceAPPs" 
                className="w-7 h-7 object-contain"
              />
            </div>
            <div>
              <span 
                className="font-semibold text-lg tracking-tight block"
                style={{ color: SLICEAPPS_COLORS.text }}
              >
                SliceAPPs
              </span>
              <span 
                className="text-xs"
                style={{ color: SLICEAPPS_COLORS.textSecondary }}
              >
                {fileData.fileName} · {formatFileSize(fileData.fileSize)}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-10">
          
          {/* App Icon Section */}
          <section className="space-y-4">
            <Label 
              className="text-base font-medium"
              style={{ color: SLICEAPPS_COLORS.text }}
            >
              App Icon
            </Label>
            <div className="flex items-center gap-5">
              <div
                onClick={() => iconInputRef.current?.click()}
                className="w-28 h-28 rounded-2xl border flex items-center justify-center cursor-pointer transition-colors overflow-hidden"
                style={{ 
                  borderColor: SLICEAPPS_COLORS.borderSoft,
                  backgroundColor: SLICEAPPS_COLORS.card,
                }}
              >
                {iconPreview ? (
                  <img src={iconPreview} alt="Icon" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-10 w-10" style={{ color: SLICEAPPS_COLORS.textSecondary }} />
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
          </section>

          {/* App Name Section */}
          <section className="space-y-3">
            <Label 
              className="text-base font-medium"
              style={{ color: SLICEAPPS_COLORS.text }}
            >
              App Name *
            </Label>
            <Input
              value={formData.appName}
              onChange={(e) => setFormData(prev => ({ ...prev, appName: e.target.value }))}
              placeholder="My Awesome App"
              required
              className="h-12 text-base border rounded-xl px-4"
              style={{
                backgroundColor: SLICEAPPS_COLORS.card,
                borderColor: SLICEAPPS_COLORS.borderSoft,
                color: SLICEAPPS_COLORS.text,
              }}
            />
          </section>

          {/* Developer Name Section */}
          <section className="space-y-3">
            <Label 
              className="text-base font-medium"
              style={{ color: SLICEAPPS_COLORS.text }}
            >
              Developer Name
            </Label>
            <Input
              value={formData.developerName}
              onChange={(e) => setFormData(prev => ({ ...prev, developerName: e.target.value }))}
              placeholder="Your name or company"
              className="h-12 text-base border rounded-xl px-4"
              style={{
                backgroundColor: SLICEAPPS_COLORS.card,
                borderColor: SLICEAPPS_COLORS.borderSoft,
                color: SLICEAPPS_COLORS.text,
              }}
            />
          </section>

          {/* Category Section */}
          <section className="space-y-3">
            <Label 
              className="text-base font-medium"
              style={{ color: SLICEAPPS_COLORS.text }}
            >
              Category
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger
                className="h-12 text-base border rounded-xl px-4"
                style={{
                  backgroundColor: SLICEAPPS_COLORS.card,
                  borderColor: SLICEAPPS_COLORS.borderSoft,
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
          </section>

          {/* Version Section */}
          <section className="space-y-3">
            <Label 
              className="text-base font-medium"
              style={{ color: SLICEAPPS_COLORS.text }}
            >
              Version
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label 
                  className="text-sm"
                  style={{ color: SLICEAPPS_COLORS.textSecondary }}
                >
                  Version Name
                </Label>
                <Input
                  value={formData.versionName}
                  onChange={(e) => setFormData(prev => ({ ...prev, versionName: e.target.value }))}
                  placeholder="1.0"
                  className="h-12 text-base border rounded-xl px-4"
                  style={{
                    backgroundColor: SLICEAPPS_COLORS.card,
                    borderColor: SLICEAPPS_COLORS.borderSoft,
                    color: SLICEAPPS_COLORS.text,
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label 
                  className="text-sm"
                  style={{ color: SLICEAPPS_COLORS.textSecondary }}
                >
                  Version Code
                </Label>
                <Input
                  value={formData.versionCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, versionCode: e.target.value }))}
                  placeholder="1"
                  className="h-12 text-base border rounded-xl px-4"
                  style={{
                    backgroundColor: SLICEAPPS_COLORS.card,
                    borderColor: SLICEAPPS_COLORS.borderSoft,
                    color: SLICEAPPS_COLORS.text,
                  }}
                />
              </div>
            </div>
          </section>

          {/* Full Description Section */}
          <section className="space-y-3">
            <Label 
              className="text-base font-medium"
              style={{ color: SLICEAPPS_COLORS.text }}
            >
              Full Description
            </Label>
            <Textarea
              value={formData.fullDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, fullDescription: e.target.value }))}
              placeholder="Describe your app in detail..."
              rows={6}
              className="text-base border rounded-xl px-4 py-3 resize-none"
              style={{
                backgroundColor: SLICEAPPS_COLORS.card,
                borderColor: SLICEAPPS_COLORS.borderSoft,
                color: SLICEAPPS_COLORS.text,
              }}
            />
          </section>

          {/* Screenshots Section - Enhanced */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <Label 
                className="text-base font-medium"
                style={{ color: SLICEAPPS_COLORS.text }}
              >
                Screenshots
              </Label>
              <span 
                className="text-sm"
                style={{ color: SLICEAPPS_COLORS.textSecondary }}
              >
                {screenshots.length}/8
              </span>
            </div>
            
            {/* Drop zone + horizontal scroll preview */}
            <div
              ref={screenshotDropRef}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleScreenshotDrop}
              className="rounded-xl border p-4 transition-colors"
              style={{ 
                borderColor: isDragging ? SLICEAPPS_COLORS.text : SLICEAPPS_COLORS.borderSoft,
                backgroundColor: isDragging ? SLICEAPPS_COLORS.cardHover : SLICEAPPS_COLORS.card,
              }}
            >
              {screenshots.length === 0 ? (
                <div 
                  onClick={() => screenshotInputRef.current?.click()}
                  className="flex flex-col items-center justify-center py-10 cursor-pointer"
                >
                  <Upload className="h-10 w-10 mb-3" style={{ color: SLICEAPPS_COLORS.textSecondary }} />
                  <p className="text-sm mb-1" style={{ color: SLICEAPPS_COLORS.text }}>
                    Drop screenshots here or click to upload
                  </p>
                  <p className="text-xs" style={{ color: SLICEAPPS_COLORS.textSecondary }}>
                    Up to 8 screenshots, max 5MB each
                  </p>
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {screenshots.map((url, index) => (
                    <div 
                      key={index} 
                      className="relative flex-shrink-0 group"
                      draggable
                      onDragStart={() => handleScreenshotDragStart(index)}
                      onDragOver={(e) => handleScreenshotDragOver(e, index)}
                      onDragEnd={handleScreenshotDragEnd}
                    >
                      <img
                        src={url}
                        alt={`Screenshot ${index + 1}`}
                        className="w-32 h-56 object-cover rounded-xl border"
                        style={{ borderColor: SLICEAPPS_COLORS.border }}
                        loading="lazy"
                      />
                      {/* Drag handle */}
                      <div 
                        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
                        style={{ color: SLICEAPPS_COLORS.text }}
                      >
                        <GripVertical className="h-4 w-4" />
                      </div>
                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => removeScreenshot(index)}
                        className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
                      className="w-32 h-56 rounded-xl border flex flex-col items-center justify-center cursor-pointer flex-shrink-0 transition-colors"
                      style={{ 
                        borderColor: SLICEAPPS_COLORS.borderSoft,
                        backgroundColor: SLICEAPPS_COLORS.bg,
                      }}
                    >
                      <Upload className="h-6 w-6 mb-2" style={{ color: SLICEAPPS_COLORS.textSecondary }} />
                      <span className="text-xs" style={{ color: SLICEAPPS_COLORS.textSecondary }}>
                        Add more
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <input
              ref={screenshotInputRef}
              type="file"
              accept="image/png,image/jpeg"
              multiple
              className="hidden"
              onChange={handleScreenshotAdd}
            />
          </section>

          {/* Promo Banner Section */}
          <section className="space-y-4">
            <Label 
              className="text-base font-medium"
              style={{ color: SLICEAPPS_COLORS.text }}
            >
              Promo Banner <span style={{ color: SLICEAPPS_COLORS.textSecondary }}>(Optional)</span>
            </Label>
            <div
              onClick={() => bannerInputRef.current?.click()}
              className="h-44 rounded-xl border flex items-center justify-center cursor-pointer overflow-hidden transition-colors"
              style={{ 
                borderColor: SLICEAPPS_COLORS.borderSoft,
                backgroundColor: SLICEAPPS_COLORS.card,
              }}
            >
              {bannerPreview ? (
                <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="text-center">
                  <Upload className="h-10 w-10 mx-auto mb-3" style={{ color: SLICEAPPS_COLORS.textSecondary }} />
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
          </section>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 text-base font-semibold rounded-xl"
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
