import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Upload, X, Image as ImageIcon, Copy, Check, GripVertical, Share2, RefreshCw } from "lucide-react";
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
import { SliceAppsHeader } from "@/components/sliceapps";

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
  slugCode: string;
  appName: string;
  appUrl: string;
  slugUrl: string;
  canUseSlug: boolean;
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
  const [selectedLinkType, setSelectedLinkType] = useState<"short" | "named">("short");
  const [isRegeneratingLink, setIsRegeneratingLink] = useState(false);
  const [customSlug, setCustomSlug] = useState("");
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  
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
    fullDescription: "",
  });

  if (!fileData) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-white dark:bg-black text-gray-900 dark:text-white">
        <div className="text-center">
          <p className="text-lg mb-4">No APK file selected</p>
          <Button
            onClick={() => navigate("/slicebox")}
            variant="outline"
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
    
    const urlToCopy = selectedLinkType === "short" ? publishedApp.appUrl : publishedApp.slugUrl;
    
    try {
      await navigator.clipboard.writeText(urlToCopy);
      setCopiedLink(true);
      toast.success("Link copied!");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleShareLink = async () => {
    if (!publishedApp) return;
    
    const urlToShare = selectedLinkType === "short" ? publishedApp.appUrl : publishedApp.slugUrl;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: publishedApp.appName,
          url: urlToShare,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      handleCopyLink();
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
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleRegenerateLink = async () => {
    if (!publishedApp) return;
    
    setIsRegeneratingLink(true);
    try {
      let newShortCode = generateShortCode();
      
      // Ensure it's unique
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 10) {
        const { data: existing } = await supabase
          .from("app_listings")
          .select("id")
          .eq("short_code", newShortCode)
          .maybeSingle();
        isUnique = !existing;
        if (!isUnique) {
          newShortCode = generateShortCode();
        }
        attempts++;
      }

      // Update in database
      const { error } = await supabase
        .from("app_listings")
        .update({ short_code: newShortCode })
        .eq("id", publishedApp.id);

      if (error) throw error;

      const baseUrl = getBaseUrl();
      setPublishedApp(prev => prev ? {
        ...prev,
        shortCode: newShortCode,
        appUrl: `${baseUrl}/app/${newShortCode}`,
      } : null);

      toast.success("New link generated!");
    } catch (err) {
      console.error("Failed to regenerate link:", err);
      toast.error("Failed to generate new link");
    } finally {
      setIsRegeneratingLink(false);
    }
  };

  const handleCheckSlugAvailability = async (slug: string) => {
    if (!slug || slug.length < 2) {
      setSlugAvailable(null);
      return;
    }

    setIsCheckingSlug(true);
    try {
      const formattedSlug = generateSlug(slug);
      const { data: existing } = await supabase
        .from("app_listings")
        .select("id")
        .eq("short_code", formattedSlug)
        .neq("id", publishedApp?.id || "")
        .maybeSingle();
      
      setSlugAvailable(!existing);
    } catch {
      setSlugAvailable(null);
    } finally {
      setIsCheckingSlug(false);
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

      // Generate both short code and slug
      const slugCode = generateSlug(formData.appName.trim());
      let shortCode = generateShortCode();
      
      // Ensure short code is unique
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 10) {
        const { data: existing } = await supabase
          .from("app_listings")
          .select("id")
          .eq("short_code", shortCode)
          .maybeSingle();
        isUnique = !existing;
        if (!isUnique) {
          shortCode = generateShortCode();
        }
        attempts++;
      }

      // Check if slug is available
      const { data: existingWithSlug } = await supabase
        .from("app_listings")
        .select("id")
        .eq("short_code", slugCode)
        .maybeSingle();
      
      const canUseSlug = !existingWithSlug;

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

      const baseUrl = getBaseUrl();
      const appUrl = `${baseUrl}/app/${shortCode}`;
      const slugUrl = canUseSlug ? `${baseUrl}/app/${slugCode}` : appUrl;
      
      // Set custom slug for editing
      setCustomSlug(slugCode);
      
      // Set published state
      setPublishedApp({
        id: listing.id,
        shortCode: shortCode,
        slugCode: canUseSlug ? slugCode : shortCode,
        appName: formData.appName.trim(),
        appUrl,
        slugUrl,
        canUseSlug,
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
    const currentUrl = selectedLinkType === "short" ? publishedApp.appUrl : publishedApp.slugUrl;
    
    return (
      <div className="min-h-dvh bg-white dark:bg-black">
        <SliceAppsHeader />
        
        <div className="flex items-center justify-center p-4 pt-20">
          <div className="w-full max-w-md p-8 rounded-2xl border text-center bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center bg-green-500">
              <Check className="h-8 w-8 text-white" />
            </div>
            
            <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
              App Page is Live
            </h2>
            
            <p className="text-sm mb-6 text-gray-500 dark:text-gray-400">
              {publishedApp.appName}
            </p>

            {/* Link type toggle buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSelectedLinkType("short")}
                className={`flex-1 h-10 rounded-lg text-sm font-medium transition-colors ${
                  selectedLinkType === "short"
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                }`}
              >
                Short Link
              </button>
              <button
                onClick={() => setSelectedLinkType("named")}
                className={`flex-1 h-10 rounded-lg text-sm font-medium transition-colors ${
                  selectedLinkType === "named"
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                }`}
              >
                Named Link
              </button>
            </div>

            {/* Link display */}
            <div className="mb-4">
              <div className="p-4 rounded-xl font-mono text-sm break-all bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">
                {currentUrl}
              </div>
            </div>

            {/* Generate random link button (only for short links) */}
            {selectedLinkType === "short" && (
              <Button
                onClick={handleRegenerateLink}
                disabled={isRegeneratingLink}
                variant="outline"
                className="w-full mb-4 h-10 rounded-lg border-gray-200 dark:border-gray-700"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRegeneratingLink ? "animate-spin" : ""}`} />
                Generate Random Link
              </Button>
            )}

            {/* Named link editor (only for named links) */}
            {selectedLinkType === "named" && publishedApp.canUseSlug && (
              <div className="mb-4">
                <div className="flex gap-2">
                  <Input
                    value={customSlug}
                    onChange={(e) => {
                      setCustomSlug(e.target.value);
                      handleCheckSlugAvailability(e.target.value);
                    }}
                    placeholder="custom-slug"
                    className="text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  />
                </div>
                {isCheckingSlug && (
                  <p className="text-xs mt-2 text-gray-500">Checking availability...</p>
                )}
                {slugAvailable === true && (
                  <p className="text-xs mt-2 text-green-500">Available</p>
                )}
                {slugAvailable === false && (
                  <p className="text-xs mt-2 text-red-500">Not available</p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleCopyLink}
                className="flex-1 h-12 rounded-xl font-medium bg-green-500 hover:bg-green-600 text-white"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleShareLink}
                variant="outline"
                className="h-12 rounded-xl font-medium border px-4 border-gray-200 dark:border-gray-700"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>

            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              className="w-full mt-4 text-gray-500 dark:text-gray-400"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-white dark:bg-black">
      {/* Header */}
      <SliceAppsHeader />

      {/* Form */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* File info badge */}
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg mb-8 bg-gray-100 dark:bg-gray-800">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {fileData.fileName} - {formatFileSize(fileData.fileSize)}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          
          {/* App Icon Section */}
          <section className="space-y-4">
            <Label className="text-base font-medium text-gray-900 dark:text-white">
              App Icon
            </Label>
            <div className="flex items-center gap-5">
              <div
                onClick={() => iconInputRef.current?.click()}
                className="w-28 h-28 rounded-2xl border flex items-center justify-center cursor-pointer transition-colors overflow-hidden bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              >
                {iconPreview ? (
                  <img src={iconPreview} alt="Icon" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-10 w-10 text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  512x512 PNG or JPG
                </p>
                <p className="text-xs mt-1 text-gray-500">
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
            <Label className="text-base font-medium text-gray-900 dark:text-white">
              App Name *
            </Label>
            <Input
              value={formData.appName}
              onChange={(e) => setFormData(prev => ({ ...prev, appName: e.target.value }))}
              placeholder="My Awesome App"
              required
              className="h-14 text-base border rounded-xl px-4 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
            />
          </section>

          {/* Developer Name Section */}
          <section className="space-y-3">
            <Label className="text-base font-medium text-gray-900 dark:text-white">
              Developer Name
            </Label>
            <Input
              value={formData.developerName}
              onChange={(e) => setFormData(prev => ({ ...prev, developerName: e.target.value }))}
              placeholder="Your name or company"
              className="h-14 text-base border rounded-xl px-4 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
            />
          </section>

          {/* Category Section */}
          <section className="space-y-3">
            <Label className="text-base font-medium text-gray-900 dark:text-white">
              Category
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger className="h-14 text-base border rounded-xl px-4 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                {CATEGORIES.map(cat => (
                  <SelectItem 
                    key={cat} 
                    value={cat}
                    className="text-gray-900 dark:text-white"
                  >
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          {/* Version Section */}
          <section className="space-y-3">
            <Label className="text-base font-medium text-gray-900 dark:text-white">
              Version
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-gray-500 dark:text-gray-400">
                  Version Name
                </Label>
                <Input
                  value={formData.versionName}
                  onChange={(e) => setFormData(prev => ({ ...prev, versionName: e.target.value }))}
                  placeholder="1.0"
                  className="h-14 text-base border rounded-xl px-4 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-gray-500 dark:text-gray-400">
                  Version Code
                </Label>
                <Input
                  value={formData.versionCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, versionCode: e.target.value }))}
                  placeholder="1"
                  className="h-14 text-base border rounded-xl px-4 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </section>

          {/* Full Description Section */}
          <section className="space-y-3">
            <Label className="text-base font-medium text-gray-900 dark:text-white">
              Description
            </Label>
            <Textarea
              value={formData.fullDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, fullDescription: e.target.value }))}
              placeholder="Describe your app..."
              rows={5}
              className="text-base border rounded-xl px-4 py-4 resize-none bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
            />
          </section>

          {/* Screenshots Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium text-gray-900 dark:text-white">
                Screenshots
              </Label>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {screenshots.length}/8
              </span>
            </div>
            
            {/* Drop zone + horizontal scroll preview */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleScreenshotDrop}
              className={`rounded-xl border p-4 transition-colors ${
                isDragging 
                  ? "border-green-500 bg-green-50 dark:bg-green-900/20" 
                  : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
              }`}
            >
              {screenshots.length === 0 ? (
                <div 
                  onClick={() => screenshotInputRef.current?.click()}
                  className="flex flex-col items-center justify-center py-12 cursor-pointer"
                >
                  <Upload className="h-10 w-10 mb-3 text-gray-400" />
                  <p className="text-sm mb-1 text-gray-900 dark:text-white">
                    Drop screenshots here or tap to upload
                  </p>
                  <p className="text-xs text-gray-500">
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
                        className="w-32 h-56 object-cover rounded-xl border border-gray-200 dark:border-gray-700"
                        loading="lazy"
                      />
                      {/* Drag handle */}
                      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab text-white">
                        <GripVertical className="h-4 w-4" />
                      </div>
                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => removeScreenshot(index)}
                        className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {screenshots.length < 8 && (
                    <div
                      onClick={() => screenshotInputRef.current?.click()}
                      className="w-32 h-56 rounded-xl border flex flex-col items-center justify-center cursor-pointer flex-shrink-0 transition-colors border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600"
                    >
                      <Upload className="h-6 w-6 mb-2 text-gray-400" />
                      <span className="text-xs text-gray-500">
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
            <Label className="text-base font-medium text-gray-900 dark:text-white">
              Promo Banner <span className="text-gray-500">(Optional)</span>
            </Label>
            <div
              onClick={() => bannerInputRef.current?.click()}
              className="h-44 rounded-xl border flex items-center justify-center cursor-pointer overflow-hidden transition-colors bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            >
              {bannerPreview ? (
                <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="text-center">
                  <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-500">
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
            className="w-full h-14 text-base font-semibold rounded-2xl bg-green-500 hover:bg-green-600 text-white"
          >
            {isSubmitting ? "Publishing..." : "Publish App Page"}
          </Button>
        </form>
      </main>
    </div>
  );
}
