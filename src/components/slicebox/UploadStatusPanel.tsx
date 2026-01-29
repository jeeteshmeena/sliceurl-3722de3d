import { motion, AnimatePresence } from "framer-motion";
import { Gauge, Clock, Wifi, FileUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UploadStats {
  fileName: string;
  progress: number;
  speed: number; // bytes per second
  remainingTime: number; // seconds
  totalSize: number;
  uploadedSize: number;
}

interface UploadStatusPanelProps {
  uploads: UploadStats[];
  onClose: () => void;
  isOpen: boolean;
  variant?: "slicebox" | "littleslice";
}

function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return "0 B/s";
  const k = 1024;
  const sizes = ["B/s", "KB/s", "MB/s", "GB/s"];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
  return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatTime(seconds: number): string {
  if (seconds === 0 || !isFinite(seconds)) return "--";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function UploadStatusPanel({ uploads, onClose, isOpen, variant = "slicebox" }: UploadStatusPanelProps) {
  const activeUploads = uploads.filter(u => u.progress < 100);
  const totalSpeed = activeUploads.reduce((sum, u) => sum + u.speed, 0);
  const avgProgress = activeUploads.length > 0 
    ? Math.round(activeUploads.reduce((sum, u) => sum + u.progress, 0) / activeUploads.length)
    : 0;

  const accentColor = variant === "slicebox" ? "#FF3B30" : "#FF4D6D";
  const accentColorDark = variant === "slicebox" ? "#E6352B" : "#E6455F";

  if (activeUploads.length === 0 && !isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && activeUploads.length > 0 && (
        <>
          {/* Desktop: Sticky right panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="hidden lg:block fixed right-4 top-24 w-72 z-40"
          >
            <div 
              className="rounded-xl border shadow-lg overflow-hidden"
              style={{ 
                backgroundColor: "#FFFFFF", 
                borderColor: variant === "slicebox" ? "#E8E8E8" : "#E2EEF2" 
              }}
            >
              {/* Header */}
              <div 
                className="px-4 py-3 flex items-center justify-between"
                style={{ backgroundColor: accentColor }}
              >
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-[#0B0B0B]" />
                  <span className="font-semibold text-sm text-[#0B0B0B]">Upload Status</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onClose}
                  className="h-6 w-6 hover:bg-black/10"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Stats */}
              <div className="p-4 space-y-4">
                {/* Overall Progress */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[#6B7280]">Overall Progress</span>
                    <span className="font-medium text-[#0B0B0B]">{avgProgress}%</span>
                  </div>
                  <div className="h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: accentColorDark }}
                      initial={{ width: 0 }}
                      animate={{ width: `${avgProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* Speed */}
                <div className="flex items-center justify-between py-2 border-t border-[#F0F0F0]">
                  <div className="flex items-center gap-2 text-[#6B7280]">
                    <Wifi className="h-4 w-4" />
                    <span className="text-xs">Upload Speed</span>
                  </div>
                  <span className="font-semibold text-sm text-[#0B0B0B]">
                    {formatSpeed(totalSpeed)}
                  </span>
                </div>

                {/* File List */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {activeUploads.map((upload, i) => (
                    <div key={i} className="p-2 bg-[#F8F8F8] rounded-lg">
                      <div className="flex items-center gap-2 mb-1.5">
                        <FileUp className="h-3.5 w-3.5 text-[#6B7280] shrink-0" />
                        <span className="text-xs text-[#0B0B0B] truncate flex-1">
                          {upload.fileName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#6B7280]">
                        <span>{formatSize(upload.uploadedSize)} / {formatSize(upload.totalSize)}</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(upload.remainingTime)}</span>
                        </div>
                      </div>
                      <div className="h-1 bg-[#E8E8E8] rounded-full overflow-hidden mt-1.5">
                        <div 
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${upload.progress}%`, backgroundColor: accentColor }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Mobile: Bottom slide-in */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
          >
            <div 
              className="rounded-t-2xl border-t shadow-2xl overflow-hidden"
              style={{ 
                backgroundColor: "#FFFFFF", 
                borderColor: variant === "slicebox" ? "#E8E8E8" : "#E2EEF2" 
              }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-10 h-1 rounded-full bg-[#D0D0D0]" />
              </div>

              {/* Header */}
              <div className="px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4" style={{ color: accentColorDark }} />
                  <span className="font-semibold text-sm text-[#0B0B0B]">
                    Uploading {activeUploads.length} file{activeUploads.length > 1 ? "s" : ""}
                  </span>
                </div>
                <span className="text-sm font-bold" style={{ color: accentColorDark }}>
                  {avgProgress}%
                </span>
              </div>

              {/* Progress & Speed */}
              <div className="px-4 pb-4">
                <div className="h-2 bg-[#F0F0F0] rounded-full overflow-hidden mb-2">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: accentColor }}
                    animate={{ width: `${avgProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="flex justify-between text-xs text-[#6B7280]">
                  <span>{formatSpeed(totalSpeed)}</span>
                  <span>
                    {activeUploads[0] && formatTime(activeUploads[0].remainingTime)} remaining
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
