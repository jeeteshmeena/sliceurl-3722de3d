import { useState, useEffect, memo } from "react";
import { motion } from "framer-motion";
import { 
  Image, Video, Music, FileText, Archive, File, Lock,
  Smartphone, FileCode, Package
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface FilePreviewProps {
  file?: File;
  mimeType?: string;
  fileName?: string;
  storagePath?: string;
  signedUrl?: string;
  isPasswordProtected?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  variant?: "slicebox" | "littleslice";
}

const SIZES = {
  sm: { container: "w-10 h-10", icon: "h-5 w-5", iconBg: "w-10 h-10" },
  md: { container: "w-14 h-14", icon: "h-6 w-6", iconBg: "w-14 h-14" },
  lg: { container: "w-20 h-20", icon: "h-10 w-10", iconBg: "w-20 h-20" },
  xl: { container: "w-32 h-32", icon: "h-16 w-16", iconBg: "w-32 h-32" },
};

// Get file type category
function getFileCategory(mimeType: string, fileName?: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z") || mimeType.includes("tar")) return "archive";
  
  // Check file extension for APK
  const ext = fileName?.split('.').pop()?.toLowerCase();
  if (ext === "apk" || mimeType === "application/vnd.android.package-archive") return "apk";
  if (ext === "exe" || ext === "msi" || mimeType === "application/x-msdownload") return "executable";
  if (ext === "dmg" || ext === "pkg" || mimeType === "application/x-apple-diskimage") return "mac-app";
  if (ext === "deb" || ext === "rpm") return "linux-app";
  
  // Code files
  if (["js", "ts", "jsx", "tsx", "py", "java", "cpp", "c", "go", "rs", "html", "css", "json", "xml"].includes(ext || "")) return "code";
  
  // Document files
  if (["doc", "docx", "txt", "rtf", "odt"].includes(ext || "")) return "document";
  if (["xls", "xlsx", "csv"].includes(ext || "")) return "spreadsheet";
  if (["ppt", "pptx"].includes(ext || "")) return "presentation";
  
  return "file";
}

// Get icon for file type
function getFileIcon(category: string) {
  switch (category) {
    case "image": return Image;
    case "video": return Video;
    case "audio": return Music;
    case "pdf": return FileText;
    case "archive": return Archive;
    case "apk": return Smartphone;
    case "executable": return Package;
    case "mac-app": return Package;
    case "linux-app": return Package;
    case "code": return FileCode;
    case "document": return FileText;
    case "spreadsheet": return FileText;
    case "presentation": return FileText;
    default: return File;
  }
}

// Audio waveform visualization
function AudioWaveform({ variant, size }: { variant: "slicebox" | "littleslice"; size: string }) {
  const bars = 5;
  const accentColor = variant === "slicebox" ? "#FFD64D" : "#D0E7EF";
  
  return (
    <div className="flex items-center justify-center gap-0.5 h-full">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="rounded-full"
          style={{ 
            backgroundColor: accentColor,
            width: size === "sm" ? 2 : size === "md" ? 3 : 4,
          }}
          animate={{
            height: size === "sm" 
              ? [8, 16, 8] 
              : size === "md" 
                ? [12, 24, 12] 
                : [16, 32, 16],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export const FilePreview = memo(function FilePreview({
  file,
  mimeType,
  fileName,
  storagePath,
  signedUrl,
  isPasswordProtected = false,
  size = "md",
  className,
  variant = "slicebox",
}: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const resolvedMimeType = mimeType || file?.type || "application/octet-stream";
  const resolvedFileName = fileName || file?.name;
  const category = getFileCategory(resolvedMimeType, resolvedFileName);
  const FileIcon = getFileIcon(category);
  const sizeConfig = SIZES[size];
  const accentColor = variant === "slicebox" ? "#FFD64D" : "#D0E7EF";

  // Generate preview URL for local files or use signed URL
  useEffect(() => {
    setLoading(true);
    setError(false);

    // Password protected files show lock icon
    if (isPasswordProtected) {
      setLoading(false);
      return;
    }

    // For images and videos, generate preview
    if (category === "image" || category === "video") {
      if (file) {
        // Local file - create object URL
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setLoading(false);
        return () => URL.revokeObjectURL(url);
      } else if (signedUrl) {
        // Signed URL from storage
        setPreviewUrl(signedUrl);
        setLoading(false);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [file, signedUrl, category, isPasswordProtected]);

  // Password protected - show lock icon
  if (isPasswordProtected) {
    return (
      <div 
        className={cn(
          "rounded-xl flex items-center justify-center shrink-0",
          sizeConfig.iconBg,
          className
        )}
        style={{ backgroundColor: `${accentColor}20` }}
      >
        <Lock className={cn(sizeConfig.icon, "text-[#6B7280]")} />
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Skeleton 
        className={cn(
          "rounded-xl shrink-0",
          sizeConfig.container,
          className
        )} 
      />
    );
  }

  // Image preview
  if (category === "image" && previewUrl && !error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          "rounded-xl overflow-hidden shrink-0 bg-[#F0F0F0]",
          sizeConfig.container,
          className
        )}
      >
        <img
          src={previewUrl}
          alt={resolvedFileName || "Image preview"}
          className="w-full h-full object-cover"
          onError={() => setError(true)}
        />
      </motion.div>
    );
  }

  // Video thumbnail
  if (category === "video" && previewUrl && !error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          "rounded-xl overflow-hidden shrink-0 bg-[#F0F0F0] relative",
          sizeConfig.container,
          className
        )}
      >
        <video
          src={previewUrl}
          className="w-full h-full object-cover"
          muted
          playsInline
          preload="metadata"
          onError={() => setError(true)}
        />
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div 
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: accentColor }}
          >
            <div className="w-0 h-0 border-l-[6px] border-l-[#0B0B0B] border-y-[4px] border-y-transparent ml-0.5" />
          </div>
        </div>
      </motion.div>
    );
  }

  // Audio with animated waveform
  if (category === "audio") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          "rounded-xl overflow-hidden shrink-0 flex items-center justify-center",
          sizeConfig.container,
          className
        )}
        style={{ backgroundColor: `${accentColor}20` }}
      >
        <AudioWaveform variant={variant} size={size} />
      </motion.div>
    );
  }

  // APK with Android icon
  if (category === "apk") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          "rounded-xl overflow-hidden shrink-0 flex items-center justify-center",
          sizeConfig.iconBg,
          className
        )}
        style={{ backgroundColor: "#3DDC84" }} // Android green
      >
        <Smartphone className={cn(sizeConfig.icon, "text-white")} />
      </motion.div>
    );
  }

  // Default icon preview
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "rounded-xl flex items-center justify-center shrink-0",
        sizeConfig.iconBg,
        className
      )}
      style={{ backgroundColor: `${accentColor}20` }}
    >
      <FileIcon className={cn(sizeConfig.icon, "text-[#0B0B0B]")} />
    </motion.div>
  );
});

export default FilePreview;
