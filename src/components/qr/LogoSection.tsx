import { useState, useRef, memo, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, Trash2, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { QRDesign } from "@/hooks/useQRDesign";
import { toast } from "sonner";

interface LogoSectionProps {
  design: QRDesign;
  onUpdate: (updates: Partial<QRDesign>) => void;
}

export const LogoSection = memo(function LogoSection({ design, onUpdate }: LogoSectionProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      onUpdate({ logo_url: reader.result as string });
      setUploading(false);
    };
    reader.onerror = () => {
      toast.error("Failed to load image");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }, [onUpdate]);

  const removeLogo = useCallback(() => {
    onUpdate({ logo_url: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onUpdate]);

  const handleLogoSizeChange = useCallback((value: number[]) => {
    onUpdate({ logo_size: value[0] });
  }, [onUpdate]);

  const triggerUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="space-y-5">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/svg+xml,image/jpeg,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Center Logo</Label>
      
      {design.logo_url ? (
        <div className="space-y-5">
          {/* Logo Preview */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative group"
          >
            <div className="w-full aspect-[2/1] rounded-xl border-2 border-dashed border-border/50 bg-muted/20 flex items-center justify-center overflow-hidden">
              <img
                src={design.logo_url}
                alt="QR Logo"
                className="max-h-16 max-w-[80%] object-contain"
              />
            </div>
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 rounded-lg"
              onClick={removeLogo}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </motion.div>

          {/* Logo Size Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Logo Size</Label>
              <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                {design.logo_size}%
              </span>
            </div>
            <Slider
              value={[design.logo_size]}
              onValueChange={handleLogoSizeChange}
              min={10}
              max={35}
              step={1}
              className="w-full"
            />
          </div>
        </div>
      ) : (
        <motion.button
          onClick={triggerUpload}
          disabled={uploading}
          whileTap={{ scale: 0.98 }}
          className="w-full aspect-[2/1] rounded-xl border-2 border-dashed border-border/50 bg-muted/10 hover:bg-muted/30 hover:border-primary/40 transition-all duration-200 flex flex-col items-center justify-center gap-3 cursor-pointer"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
                <Upload className="w-6 h-6 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">Tap to upload PNG/SVG</span>
            </>
          )}
        </motion.button>
      )}
    </div>
  );
});
