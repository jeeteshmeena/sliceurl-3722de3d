import { useState, useEffect, useRef } from "react";
import { 
  FileText, Image, Video, Music, Archive, File, 
  Smartphone, Package, Disc3 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FilePreviewProps {
  file?: File;
  mimeType: string;
  fileName: string;
  url?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "slicebox" | "littleslice";
}

// Get file extension
function getExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

// Check if APK file
function isApk(fileName: string, mimeType: string): boolean {
  const ext = getExtension(fileName);
  return ext === 'apk' || mimeType === 'application/vnd.android.package-archive';
}

// Check if executable
function isExecutable(fileName: string): boolean {
  const ext = getExtension(fileName);
  return ['exe', 'msi', 'dmg', 'ipa', 'deb', 'rpm'].includes(ext);
}

// Get icon for file type
function getFileIcon(mimeType: string, fileName: string) {
  if (isApk(fileName, mimeType)) return Smartphone;
  if (isExecutable(fileName)) return Package;
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.startsWith("video/")) return Video;
  if (mimeType.startsWith("audio/")) return Disc3;
  if (mimeType === "application/pdf") return FileText;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z")) return Archive;
  return File;
}

// Apple Music gradient colors
const GRADIENT_COLORS = {
  slicebox: {
    from: "#FF2D55", // Apple Music pink
    to: "#FF6B6B",   // Coral
    bg: "linear-gradient(135deg, #FF2D55 0%, #FF6B6B 100%)",
    light: "rgba(255, 45, 85, 0.15)",
  },
  littleslice: {
    from: "#FF2D55",
    to: "#C644FC", // Purple accent
    bg: "linear-gradient(135deg, #FF2D55 0%, #C644FC 100%)",
    light: "rgba(255, 45, 85, 0.15)",
  },
};

const SIZE_CLASSES = {
  sm: "h-10 w-10 rounded-lg",
  md: "h-12 w-12 rounded-xl",
  lg: "h-20 w-20 rounded-2xl",
};

const ICON_SIZES = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-10 w-10",
};

export function FilePreview({ 
  file, 
  mimeType, 
  fileName, 
  url,
  size = "md",
  className,
  variant = "slicebox"
}: FilePreviewProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const colors = GRADIENT_COLORS[variant];

  // Generate preview for images and videos
  useEffect(() => {
    if (error) return;

    // Image preview
    if (mimeType.startsWith("image/")) {
      if (file) {
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
      } else if (url) {
        setPreview(url);
      }
    }

    // Video thumbnail - capture first frame
    if (mimeType.startsWith("video/") && file) {
      const objectUrl = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.src = objectUrl;
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';
      
      video.onloadeddata = () => {
        video.currentTime = 1; // Seek to 1 second
      };
      
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 200;
        canvas.height = video.videoHeight || 200;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          setPreview(canvas.toDataURL('image/jpeg', 0.7));
        }
        URL.revokeObjectURL(objectUrl);
      };

      video.onerror = () => {
        setError(true);
        URL.revokeObjectURL(objectUrl);
      };

      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [file, url, mimeType, error]);

  const FileIcon = getFileIcon(mimeType, fileName);
  const isImage = mimeType.startsWith("image/");
  const isVideo = mimeType.startsWith("video/");
  const isAudio = mimeType.startsWith("audio/");
  const isPdf = mimeType === "application/pdf";
  const isApkFile = isApk(fileName, mimeType);

  // Render image/video preview
  if ((isImage || isVideo) && preview && !error) {
    return (
      <div 
        className={cn(
          SIZE_CLASSES[size],
          "overflow-hidden flex items-center justify-center relative",
          className
        )}
        style={{ background: colors.light }}
      >
        <img 
          src={preview} 
          alt={fileName}
          className="w-full h-full object-cover"
          onError={() => setError(true)}
        />
        {isVideo && (
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black/30"
          >
            <Video className="h-4 w-4 text-white" />
          </div>
        )}
      </div>
    );
  }

  // Audio waveform style
  if (isAudio) {
    return (
      <div 
        className={cn(
          SIZE_CLASSES[size],
          "flex items-center justify-center relative overflow-hidden",
          className
        )}
        style={{ background: colors.bg }}
      >
        {/* Waveform bars */}
        <div className="flex items-center gap-0.5 h-1/2">
          {[0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8].map((height, i) => (
            <div 
              key={i}
              className="w-0.5 bg-white/90 rounded-full animate-pulse"
              style={{ 
                height: `${height * 100}%`,
                animationDelay: `${i * 100}ms`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // APK icon with Android style
  if (isApkFile) {
    return (
      <div 
        className={cn(
          SIZE_CLASSES[size],
          "flex items-center justify-center",
          className
        )}
        style={{ background: "linear-gradient(135deg, #3DDC84 0%, #00C853 100%)" }}
      >
        <Smartphone className={cn(ICON_SIZES[size], "text-white")} />
      </div>
    );
  }

  // PDF with red accent
  if (isPdf) {
    return (
      <div 
        className={cn(
          SIZE_CLASSES[size],
          "flex items-center justify-center",
          className
        )}
        style={{ background: "linear-gradient(135deg, #FF3B30 0%, #FF6B6B 100%)" }}
      >
        <FileText className={cn(ICON_SIZES[size], "text-white")} />
      </div>
    );
  }

  // Default icon with gradient
  return (
    <div 
      className={cn(
        SIZE_CLASSES[size],
        "flex items-center justify-center",
        className
      )}
      style={{ background: colors.light }}
    >
      <FileIcon className={cn(ICON_SIZES[size])} style={{ color: colors.from }} />
    </div>
  );
}

export { getFileIcon, GRADIENT_COLORS };
