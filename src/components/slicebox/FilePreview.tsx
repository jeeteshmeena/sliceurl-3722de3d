import { useState, useEffect, useRef } from "react";
import { 
  FileText, Image as ImageIcon, Video, Music, Archive, File, 
  Smartphone, FileSpreadsheet 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// Apple Music Red for SliceBox, Pinkish Red for LittleSlice
const SLICEBOX_ACCENT = "#FF3B30"; // Apple Music Red
const LITTLESLICE_ACCENT = "#FF4D6D"; // Pinkish Red

interface FilePreviewProps {
  file?: File;
  mimeType?: string;
  fileName?: string;
  previewUrl?: string;
  size?: "sm" | "md" | "lg";
  variant?: "slicebox" | "littleslice";
  className?: string;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType.startsWith("video/")) return Video;
  if (mimeType.startsWith("audio/")) return Music;
  if (mimeType === "application/pdf") return FileText;
  if (mimeType === "application/vnd.android.package-archive") return Smartphone;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return FileSpreadsheet;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z") || mimeType.includes("tar")) return Archive;
  return File;
}

function getFileExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()?.toUpperCase() || "" : "";
}

export function FilePreview({ 
  file, 
  mimeType: propMimeType, 
  fileName: propFileName,
  previewUrl,
  size = "md", 
  variant = "slicebox",
  className 
}: FilePreviewProps) {
  const [thumbnail, setThumbnail] = useState<string | null>(previewUrl || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const mimeType = propMimeType || file?.type || "application/octet-stream";
  const fileName = propFileName || file?.name || "file";
  const accentColor = variant === "slicebox" ? SLICEBOX_ACCENT : LITTLESLICE_ACCENT;
  
  const sizeClasses = {
    sm: "h-10 w-10 rounded-lg",
    md: "h-14 w-14 rounded-xl",
    lg: "h-20 w-20 rounded-2xl",
  };
  
  const iconSizes = {
    sm: "h-5 w-5",
    md: "h-7 w-7",
    lg: "h-10 w-10",
  };

  useEffect(() => {
    if (previewUrl) {
      setThumbnail(previewUrl);
      setLoading(false);
      return;
    }
    
    if (!file) {
      setLoading(false);
      return;
    }

    // Generate thumbnail for images
    if (mimeType.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setThumbnail(url);
      setLoading(false);
      return () => URL.revokeObjectURL(url);
    }

    // Generate thumbnail for videos (capture first frame)
    if (mimeType.startsWith("video/")) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      
      video.onloadeddata = () => {
        video.currentTime = 0.1; // Seek to 0.1s to get a frame
      };
      
      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          setThumbnail(canvas.toDataURL("image/jpeg", 0.8));
        }
        setLoading(false);
        URL.revokeObjectURL(video.src);
      };
      
      video.onerror = () => {
        setError(true);
        setLoading(false);
        URL.revokeObjectURL(video.src);
      };
      
      video.src = URL.createObjectURL(file);
      return;
    }

    // No preview available for other types
    setLoading(false);
  }, [file, mimeType, previewUrl]);

  const FileIcon = getFileIcon(mimeType);
  const extension = getFileExtension(fileName);

  // Show loading skeleton
  if (loading) {
    return (
      <Skeleton className={cn(sizeClasses[size], className)} />
    );
  }

  // Show image/video thumbnail
  if (thumbnail && !error) {
    return (
      <div 
        className={cn(
          sizeClasses[size],
          "relative overflow-hidden bg-[#F5F5F5]",
          className
        )}
      >
        <img 
          src={thumbnail} 
          alt={fileName}
          className="w-full h-full object-cover"
          onError={() => setError(true)}
        />
        {mimeType.startsWith("video/") && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Video className="h-4 w-4 text-white drop-shadow-lg" />
          </div>
        )}
      </div>
    );
  }

  // Audio: Show waveform animation
  if (mimeType.startsWith("audio/")) {
    return (
      <div 
        className={cn(
          sizeClasses[size],
          "flex items-center justify-center gap-0.5",
          className
        )}
        style={{ backgroundColor: `${accentColor}15` }}
      >
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-full animate-pulse"
            style={{
              width: size === "sm" ? 2 : 3,
              height: `${30 + Math.random() * 40}%`,
              backgroundColor: accentColor,
              animationDelay: `${i * 0.15}s`,
              animationDuration: "0.8s",
            }}
          />
        ))}
      </div>
    );
  }

  // APK: Show Android icon with extension badge
  if (mimeType === "application/vnd.android.package-archive") {
    return (
      <div 
        className={cn(
          sizeClasses[size],
          "flex items-center justify-center relative",
          className
        )}
        style={{ backgroundColor: "#3DDC8415" }}
      >
        <Smartphone className={cn(iconSizes[size])} style={{ color: "#3DDC84" }} />
        <span 
          className="absolute bottom-0.5 right-0.5 text-[8px] font-bold px-1 rounded"
          style={{ backgroundColor: "#3DDC84", color: "white" }}
        >
          APK
        </span>
      </div>
    );
  }

  // PDF: Show PDF icon with badge
  if (mimeType === "application/pdf") {
    return (
      <div 
        className={cn(
          sizeClasses[size],
          "flex items-center justify-center relative",
          className
        )}
        style={{ backgroundColor: "#FF574715" }}
      >
        <FileText className={cn(iconSizes[size])} style={{ color: "#FF5747" }} />
        <span 
          className="absolute bottom-0.5 right-0.5 text-[8px] font-bold px-1 rounded"
          style={{ backgroundColor: "#FF5747", color: "white" }}
        >
          PDF
        </span>
      </div>
    );
  }

  // Default: Show file type icon with extension
  return (
    <div 
      className={cn(
        sizeClasses[size],
        "flex items-center justify-center relative",
        className
      )}
      style={{ backgroundColor: `${accentColor}12` }}
    >
      <FileIcon className={cn(iconSizes[size], "text-[#6B7280]")} />
      {extension && size !== "sm" && (
        <span 
          className="absolute bottom-0.5 right-0.5 text-[7px] font-bold px-1 rounded text-white"
          style={{ backgroundColor: "#6B7280" }}
        >
          {extension.slice(0, 4)}
        </span>
      )}
    </div>
  );
}
