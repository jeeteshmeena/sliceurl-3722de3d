import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, X, Plus, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { APP_CATEGORIES } from "./types";

interface AppListingFormProps {
  fileId: string;
  fileName: string;
  fileSize: number;
  onSuccess: (listingId: string) => void;
  onCancel: () => void;
}

export function AppListingForm({ fileId, fileName, fileSize, onSuccess, onCancel }: AppListingFormProps) {
  const { user } = useAuth();
  const iconInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [screenshots, setScreenshots] = useState<{ file: File; preview: string }[]>([]);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    appName: fileName.replace(/\.apk$/i, ""),
    shortDescription: "",
    fullDescription: "",
    category: "Other",
    versionName: "1.0",
    versionCode: "1",
    developerName: "",
    whatsNew: "",
  });

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIconFile(file);
      setIconPreview(URL.createObjectURL(file));
    }
  };

  const handleScreenshotsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newScreenshots = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setScreenshots(prev => [...prev, ...newScreenshots].slice(0, 8)); // Max 8 screenshots
  };

  const removeScreenshot = (index: number) => {
    setScreenshots(prev => prev.filter((_, i) => i !== index));
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const uploadAsset = async (file: File, path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from("app-assets")
      .upload(path, file, { upsert: true });
    
    if (error) {
      console.error("Upload error:", error);
      return null;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from("app-assets")
      .getPublicUrl(data.path);
    
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {
      const basePath = `${user.id}/${fileId}`;
      
      // Upload icon
      let iconUrl: string | null = null;
      if (iconFile) {
        iconUrl = await uploadAsset(iconFile, `${basePath}/icon.png`);
      }
      
      // Upload screenshots
      const screenshotUrls: string[] = [];
      for (let i = 0; i < screenshots.length; i++) {
        const url = await uploadAsset(
          screenshots[i].file, 
          `${basePath}/screenshot_${i}.png`
        );
        if (url) screenshotUrls.push(url);
      }
      
      // Upload banner
      let bannerUrl: string | null = null;
      if (bannerFile) {
        bannerUrl = await uploadAsset(bannerFile, `${basePath}/banner.png`);
      }

      // Get the slicebox_files record id
      const { data: fileRecord, error: fileError } = await supabase
        .from("slicebox_files")
        .select("id")
        .eq("file_id", fileId)
        .maybeSingle();

      if (fileError || !fileRecord) {
        throw new Error("File not found");
      }
      
      // Create app listing
      const { data: listing, error: listingError } = await supabase
        .from("app_listings")
        .insert({
          file_id: fileRecord.id,
          owner_id: user.id,
          app_name: formData.appName,
          short_description: formData.shortDescription || null,
          full_description: formData.fullDescription || null,
          icon_url: iconUrl,
          promo_banner_url: bannerUrl,
          screenshots: screenshotUrls,
          category: formData.category,
          version_name: formData.versionName,
          version_code: formData.versionCode,
          developer_name: formData.developerName || null,
          whats_new: formData.whatsNew || null,
        })
        .select("id")
        .single();
      
      if (listingError) throw listingError;
      
      toast.success("App listing created!");
      onSuccess(listing.id);
    } catch (err) {
      console.error("Error creating listing:", err);
      toast.error("Failed to create app listing");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#F5F5F0]">Create App Listing</h2>
          <p className="text-sm text-[#A0A0A0]">
            <span className="text-[#7C3AED]">SliceAPPs</span> by SliceURL
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="text-[#A0A0A0] hover:text-[#F5F5F0]"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* App Icon */}
        <div>
          <Label className="text-[#F5F5F0] mb-2 block">App Icon</Label>
          <div className="flex items-center gap-4">
            <div
              onClick={() => iconInputRef.current?.click()}
              className="w-20 h-20 rounded-2xl bg-[#2A2A2A] border-2 border-dashed border-[#3A3A3A] flex items-center justify-center cursor-pointer hover:border-[#7C3AED] transition-colors overflow-hidden"
            >
              {iconPreview ? (
                <img src={iconPreview} alt="Icon" className="w-full h-full object-cover" />
              ) : (
                <Upload className="h-6 w-6 text-[#6B6B6B]" />
              )}
            </div>
            <div className="text-sm text-[#A0A0A0]">
              512x512 recommended<br />PNG or JPG
            </div>
            <input
              ref={iconInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleIconChange}
            />
          </div>
        </div>

        {/* App Name & Developer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-[#F5F5F0] mb-2 block">App Name *</Label>
            <Input
              value={formData.appName}
              onChange={(e) => setFormData({ ...formData, appName: e.target.value })}
              required
              className="bg-[#2A2A2A] border-[#3A3A3A] text-[#F5F5F0] placeholder:text-[#6B6B6B]"
              placeholder="My Awesome App"
            />
          </div>
          <div>
            <Label className="text-[#F5F5F0] mb-2 block">Developer Name</Label>
            <Input
              value={formData.developerName}
              onChange={(e) => setFormData({ ...formData, developerName: e.target.value })}
              className="bg-[#2A2A2A] border-[#3A3A3A] text-[#F5F5F0] placeholder:text-[#6B6B6B]"
              placeholder="Your name or studio"
            />
          </div>
        </div>

        {/* Category & Version */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-[#F5F5F0] mb-2 block">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(v) => setFormData({ ...formData, category: v })}
            >
              <SelectTrigger className="bg-[#2A2A2A] border-[#3A3A3A] text-[#F5F5F0]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APP_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[#F5F5F0] mb-2 block">Version Name</Label>
            <Input
              value={formData.versionName}
              onChange={(e) => setFormData({ ...formData, versionName: e.target.value })}
              className="bg-[#2A2A2A] border-[#3A3A3A] text-[#F5F5F0]"
              placeholder="1.0.0"
            />
          </div>
          <div>
            <Label className="text-[#F5F5F0] mb-2 block">Version Code</Label>
            <Input
              value={formData.versionCode}
              onChange={(e) => setFormData({ ...formData, versionCode: e.target.value })}
              className="bg-[#2A2A2A] border-[#3A3A3A] text-[#F5F5F0]"
              placeholder="1"
            />
          </div>
        </div>

        {/* Short Description */}
        <div>
          <Label className="text-[#F5F5F0] mb-2 block">Short Description</Label>
          <Input
            value={formData.shortDescription}
            onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
            maxLength={80}
            className="bg-[#2A2A2A] border-[#3A3A3A] text-[#F5F5F0] placeholder:text-[#6B6B6B]"
            placeholder="A brief tagline for your app (80 chars max)"
          />
        </div>

        {/* Full Description */}
        <div>
          <Label className="text-[#F5F5F0] mb-2 block">About This App</Label>
          <Textarea
            value={formData.fullDescription}
            onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
            className="bg-[#2A2A2A] border-[#3A3A3A] text-[#F5F5F0] placeholder:text-[#6B6B6B] min-h-[100px]"
            placeholder="Describe what your app does, key features, etc."
          />
        </div>

        {/* What's New */}
        <div>
          <Label className="text-[#F5F5F0] mb-2 block">What's New (Changelog)</Label>
          <Textarea
            value={formData.whatsNew}
            onChange={(e) => setFormData({ ...formData, whatsNew: e.target.value })}
            className="bg-[#2A2A2A] border-[#3A3A3A] text-[#F5F5F0] placeholder:text-[#6B6B6B] min-h-[80px]"
            placeholder="- Bug fixes&#10;- New features&#10;- Improvements"
          />
        </div>

        {/* Screenshots */}
        <div>
          <Label className="text-[#F5F5F0] mb-2 block">Screenshots</Label>
          <div className="flex gap-2 flex-wrap">
            {screenshots.map((ss, i) => (
              <div key={i} className="relative w-24 h-40 rounded-lg overflow-hidden group">
                <img src={ss.preview} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeScreenshot(i)}
                  className="absolute top-1 right-1 bg-black/70 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
            {screenshots.length < 8 && (
              <div
                onClick={() => screenshotInputRef.current?.click()}
                className="w-24 h-40 rounded-lg bg-[#2A2A2A] border-2 border-dashed border-[#3A3A3A] flex flex-col items-center justify-center cursor-pointer hover:border-[#7C3AED] transition-colors"
              >
                <Plus className="h-6 w-6 text-[#6B6B6B] mb-1" />
                <span className="text-xs text-[#6B6B6B]">Add</span>
              </div>
            )}
          </div>
          <input
            ref={screenshotInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleScreenshotsChange}
          />
          <p className="text-xs text-[#6B6B6B] mt-2">Up to 8 screenshots, phone aspect ratio recommended</p>
        </div>

        {/* Promo Banner */}
        <div>
          <Label className="text-[#F5F5F0] mb-2 block">Promo Banner (Optional)</Label>
          <div
            onClick={() => bannerInputRef.current?.click()}
            className="w-full h-32 rounded-xl bg-[#2A2A2A] border-2 border-dashed border-[#3A3A3A] flex items-center justify-center cursor-pointer hover:border-[#7C3AED] transition-colors overflow-hidden"
          >
            {bannerPreview ? (
              <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <ImageIcon className="h-8 w-8 text-[#6B6B6B] mx-auto mb-2" />
                <span className="text-sm text-[#6B6B6B]">1024x500 recommended</span>
              </div>
            )}
          </div>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleBannerChange}
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 border-[#3A3A3A] text-[#A0A0A0] hover:bg-[#2A2A2A]"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Listing"
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
