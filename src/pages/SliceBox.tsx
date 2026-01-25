import { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, Link as LinkIcon, Copy, Check, FileText, Image, Video, Music, 
  Archive, File, ChevronDown, ChevronUp, ArrowLeft,
  ExternalLink, Share2, HardDrive, Clock, Gauge, Shield
} from "lucide-react";
import { IsolatedButton, SLICEBOX_COLORS } from "@/components/slicebox/IsolatedButton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { triggerHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { UploadStatusPanel } from "@/components/slicebox/UploadStatusPanel";
import { encryptFileObject } from "@/lib/encryption";

// SliceBox: Permanent file hosting - 200MB limit, no expiry
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

interface UploadedFile {
  fileId: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  shareUrl: string;
  isEncrypted?: boolean;
}

interface FileUploadState {
  file: File;
  id: string;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
  result?: UploadedFile;
  error?: string;
  speed: number; // bytes per second
  remainingTime: number; // seconds
  uploadedBytes: number;
  startTime: number;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.startsWith("video/")) return Video;
  if (mimeType.startsWith("audio/")) return Music;
  if (mimeType === "application/pdf") return FileText;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z")) return Archive;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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

export default function SliceBox() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [fileUploads, setFileUploads] = useState<FileUploadState[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showStatusPanel, setShowStatusPanel] = useState(false);

  const uploadSingleFile = useCallback(async (
    file: File, 
    uploadId: string,
    onProgress: (loaded: number, total: number, speed: number, remaining: number) => void
  ): Promise<UploadedFile> => {
    const fileId = crypto.randomUUID().split("-")[0] + Date.now().toString(36);
    const deleteToken = crypto.randomUUID();

    const { data: session } = await supabase.auth.getSession();
    const authToken = session?.session?.access_token;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    // Step 1: Encrypt the file client-side (E2E encryption)
    const { encryptedBlob, key, iv, originalSize, originalType } = await encryptFileObject(file);
    
    // Storage path uses .enc extension to indicate encrypted file
    const storagePath = `uploads/${fileId}/${file.name}.enc`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/slicebox/${storagePath}`;
      
      let lastLoaded = 0;
      let lastTime = Date.now();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const now = Date.now();
          const timeDelta = (now - lastTime) / 1000;
          const bytesDelta = e.loaded - lastLoaded;
          
          const instantSpeed = timeDelta > 0 ? bytesDelta / timeDelta : 0;
          const remainingBytes = e.total - e.loaded;
          const remainingTime = instantSpeed > 0 ? remainingBytes / instantSpeed : 0;
          
          lastLoaded = e.loaded;
          lastTime = now;
          
          onProgress(e.loaded, e.total, instantSpeed, remainingTime);
        }
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            // Insert metadata with encryption info - NO expiry for SliceBox
            const { error: dbError } = await supabase.from("slicebox_files").insert({
              file_id: fileId,
              original_name: file.name,
              file_size: originalSize, // Store original size, not encrypted size
              mime_type: originalType,
              storage_path: storagePath,
              user_id: user?.id || null,
              delete_token: deleteToken,
              expires_at: null, // PERMANENT - no expiry
              is_encrypted: true,
              encryption_iv: iv, // Store IV in database (safe - key is in URL fragment)
            });

            if (dbError) throw dbError;

            // Key goes in URL fragment - never sent to server!
            const shareUrl = `${window.location.origin}/slicebox/${fileId}#${key}`;
            resolve({
              fileId,
              originalName: file.name,
              fileSize: originalSize,
              mimeType: originalType,
              shareUrl,
              isEncrypted: true,
            });
          } catch (err) {
            await supabase.storage.from("slicebox").remove([storagePath]);
            reject(err);
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));

      xhr.open("POST", url);
      xhr.setRequestHeader("Authorization", `Bearer ${authToken || anonKey}`);
      xhr.setRequestHeader("apikey", anonKey);
      xhr.setRequestHeader("x-upsert", "false");
      xhr.setRequestHeader("Content-Type", "application/octet-stream");
      xhr.send(encryptedBlob);
    });
  }, [user]);

  const handleMultipleFileUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(f => {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name} exceeds 200MB limit`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    const newUploads: FileUploadState[] = validFiles.map(file => ({
      file,
      id: crypto.randomUUID(),
      progress: 0,
      status: "pending" as const,
      speed: 0,
      remainingTime: 0,
      uploadedBytes: 0,
      startTime: Date.now(),
    }));

    setFileUploads(prev => [...prev, ...newUploads]);
    setShowStatusPanel(true);

    const results = await Promise.all(
      newUploads.map(async (upload) => {
        setFileUploads(prev => 
          prev.map(u => u.id === upload.id ? { ...u, status: "uploading", startTime: Date.now() } : u)
        );

        try {
          const result = await uploadSingleFile(upload.file, upload.id, (loaded, total, speed, remaining) => {
            const progress = Math.round((loaded / total) * 100);
            setFileUploads(prev =>
              prev.map(u => u.id === upload.id ? { 
                ...u, 
                progress, 
                speed, 
                remainingTime: remaining,
                uploadedBytes: loaded,
              } : u)
            );
          });

          setFileUploads(prev =>
            prev.map(u => u.id === upload.id ? { 
              ...u, 
              status: "complete", 
              result, 
              progress: 100,
              speed: 0,
              remainingTime: 0,
            } : u)
          );

          return result;
        } catch (err) {
          setFileUploads(prev =>
            prev.map(u => u.id === upload.id ? { 
              ...u, 
              status: "error", 
              error: err instanceof Error ? err.message : "Upload failed",
              speed: 0,
              remainingTime: 0,
            } : u)
          );
          return null;
        }
      })
    );

    const successfulUploads = results.filter((r): r is UploadedFile => r !== null);
    if (successfulUploads.length > 0) {
      setUploadedFiles(prev => [...prev, ...successfulUploads]);
      triggerHaptic("medium");
      toast.success(successfulUploads.length === 1 
        ? "File uploaded successfully!" 
        : `${successfulUploads.length} files uploaded!`
      );
    }
  }, [uploadSingleFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleMultipleFileUpload(e.dataTransfer.files);
    }
  };

  const handleCopy = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    triggerHaptic("light");
    toast.success("Link copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShare = async (file: UploadedFile) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: file.originalName,
          text: `Check out this file: ${file.originalName}`,
          url: file.shareUrl,
        });
      } catch {
        handleCopy(file.shareUrl, file.fileId);
      }
    } else {
      handleCopy(file.shareUrl, file.fileId);
    }
  };

  const clearCompleted = () => {
    setFileUploads(prev => prev.filter(u => u.status !== "complete" && u.status !== "error"));
  };

  const faqItems = [
    { 
      q: "What is SliceBox?", 
      a: "SliceBox is a permanent file hosting platform. Upload any file up to 200MB and share it with a unique link that never expires." 
    },
    { 
      q: "What's the maximum file size?", 
      a: "200MB per file. This ensures fast uploads and reliable hosting." 
    },
    { 
      q: "How long are files stored?", 
      a: "Forever. SliceBox offers permanent hosting — your files will remain accessible indefinitely." 
    },
    { 
      q: "Does SliceBox support bulk uploads?", 
      a: "Yes! You can drag and drop multiple files or select multiple files from the file browser." 
    },
    { 
      q: "What is LittleSlice?", 
      a: "LittleSlice is our temporary file sharing service. Unlike SliceBox, LittleSlice files expire after a set duration (1 hour to 30 days). It supports larger files (up to 2GB) and optional password protection." 
    },
    { 
      q: "What's the difference between SliceBox and LittleSlice?", 
      a: "SliceBox = Permanent hosting, 200MB limit, no expiry. LittleSlice = Temporary sharing, 2GB limit, required expiry, optional password protection." 
    },
  ];

  const showResults = uploadedFiles.length > 0;
  const hasActiveUploads = fileUploads.some(u => u.status === "uploading" || u.status === "pending");

  // Status panel data
  const uploadStats = fileUploads
    .filter(u => u.status === "uploading")
    .map(u => ({
      fileName: u.file.name,
      progress: u.progress,
      speed: u.speed,
      remainingTime: u.remainingTime,
      totalSize: u.file.size,
      uploadedSize: u.uploadedBytes,
    }));

  return (
    <div className="min-h-dvh flex flex-col bg-[#FAFAFA]">
      {/* Header - LEFT: Logo + Name | RIGHT: Back button */}
      <header className="sticky top-0 z-50 border-b border-[#E8E8E8] bg-white shadow-sm">
        <div className="max-w-5xl mx-auto h-14 flex items-center justify-between px-4 sm:px-6">
          {/* Left: Brand */}
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-[#FFD64D] flex items-center justify-center">
              <HardDrive className="h-4 w-4 text-[#0B0B0B]" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight">
              <span className="text-[#0B0B0B]">Slice</span>
              <span className="text-[#6B7280]">Box</span>
            </span>
          </div>

          {/* Right: Back button */}
          <IsolatedButton 
            variant="ghost" 
            size="sm" 
            asChild 
            colorScheme="slicebox"
            className="gap-2 font-medium"
          >
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to SliceURL</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </IsolatedButton>
        </div>
      </header>

      {/* Upload Status Panel */}
      <UploadStatusPanel
        uploads={uploadStats}
        isOpen={showStatusPanel && hasActiveUploads}
        onClose={() => setShowStatusPanel(false)}
        variant="slicebox"
      />

      {/* Main Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B0B0B] mb-2">
            Permanent File Hosting
          </h1>
          <p className="text-[#6B7280] text-sm sm:text-base">
            Upload any file up to 200MB. Share with a link that never expires.
          </p>
        </div>

        {/* Upload Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 border-2 bg-white shadow-sm",
              isDragging 
                ? "border-[#FFD64D] scale-[1.01] shadow-lg" 
                : "border-[#E8E8E8] hover:border-[#FFD64D]/50 hover:shadow-md"
            )}
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#FFD64D] flex items-center justify-center mx-auto mb-5">
              <Upload className="h-8 w-8 sm:h-10 sm:w-10 text-[#0B0B0B]" />
            </div>
            <p className="font-semibold text-lg sm:text-xl text-[#0B0B0B] mb-1">
              Drop files here
            </p>
            <p className="text-sm text-[#6B7280] mb-4">
              or click to browse
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFD64D] text-[#0B0B0B] text-sm font-medium">
              <HardDrive className="h-4 w-4" />
              Max 200MB · Any file type · Bulk upload
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleMultipleFileUpload(e.target.files)}
            />
          </div>
        </motion.div>

        {/* Active Uploads */}
        <AnimatePresence mode="popLayout">
          {fileUploads.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[#0B0B0B]">Uploads</h3>
                {!hasActiveUploads && (
                  <IsolatedButton 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearCompleted}
                    colorScheme="slicebox"
                    className="text-xs"
                    style={{ color: SLICEBOX_COLORS.textSecondary }}
                  >
                    Clear
                  </IsolatedButton>
                )}
              </div>
              <div className="space-y-2">
                {fileUploads.map((upload) => {
                  const FileIcon = getFileIcon(upload.file.type);
                  return (
                    <motion.div
                      key={upload.id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-3 bg-white rounded-xl border border-[#E8E8E8]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-[#F5F5F5] flex items-center justify-center shrink-0">
                          <FileIcon className="h-5 w-5 text-[#6B7280]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#0B0B0B] truncate">
                            {upload.file.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                            <span>{formatFileSize(upload.file.size)}</span>
                            {upload.status === "uploading" && upload.speed > 0 && (
                              <>
                                <span>·</span>
                                <span className="flex items-center gap-1">
                                  <Gauge className="h-3 w-3" />
                                  {formatSpeed(upload.speed)}
                                </span>
                                <span>·</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(upload.remainingTime)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0">
                          {upload.status === "complete" && (
                            <Check className="h-5 w-5 text-green-600" />
                          )}
                          {upload.status === "error" && (
                            <span className="text-xs text-red-600">Failed</span>
                          )}
                        </div>
                      </div>
                      {upload.status === "uploading" && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-[#6B7280] mb-1">
                            <span>{upload.progress}%</span>
                            <span>{formatFileSize(upload.uploadedBytes)} / {formatFileSize(upload.file.size)}</span>
                          </div>
                          <div className="h-1.5 bg-[#E8E8E8] rounded-full overflow-hidden">
                            <motion.div 
                              className="h-full bg-[#FFD64D] rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${upload.progress}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Uploaded Files Results */}
        <AnimatePresence>
          {showResults && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-12"
            >
              <h3 className="font-semibold text-[#0B0B0B] mb-3">Your Files</h3>
              <div className="space-y-3">
                {uploadedFiles.map((file) => {
                  const FileIcon = getFileIcon(file.mimeType);
                  return (
                    <motion.div
                      key={file.fileId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-white rounded-xl border border-[#E8E8E8] shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-xl bg-[#FFD64D]/20 flex items-center justify-center shrink-0">
                          <FileIcon className="h-6 w-6 text-[#0B0B0B]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#0B0B0B] truncate mb-1">
                            {file.originalName}
                          </p>
                          <p className="text-xs text-[#6B7280] mb-2">
                            {formatFileSize(file.fileSize)} · Permanent link
                          </p>
                          <div className="flex items-center gap-2 p-2 bg-[#F5F5F5] rounded-lg">
                            <LinkIcon className="h-3.5 w-3.5 text-[#6B7280] shrink-0" />
                            <span className="text-xs text-[#0B0B0B] truncate flex-1 font-mono">
                              {file.shareUrl}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#E8E8E8]">
                        <IsolatedButton
                          size="sm"
                          onClick={() => handleCopy(file.shareUrl, file.fileId)}
                          colorScheme="slicebox"
                          className="flex-1 shadow-none"
                        >
                          {copiedId === file.fileId ? (
                            <Check className="h-4 w-4 mr-1.5" />
                          ) : (
                            <Copy className="h-4 w-4 mr-1.5" />
                          )}
                          {copiedId === file.fileId ? "Copied!" : "Copy Link"}
                        </IsolatedButton>
                        <IsolatedButton
                          size="sm"
                          variant="outline"
                          onClick={() => handleShare(file)}
                          colorScheme="slicebox"
                        >
                          <Share2 className="h-4 w-4" />
                        </IsolatedButton>
                        <IsolatedButton
                          size="sm"
                          variant="outline"
                          asChild
                          colorScheme="slicebox"
                        >
                          <a href={file.shareUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </IsolatedButton>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAQ Section */}
        <section className="mb-12">
          <h2 className="text-lg sm:text-xl font-bold text-[#0B0B0B] mb-4 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-2">
            {faqItems.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl border border-[#E8E8E8] overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-[#F5F5F5] transition-colors"
                >
                  <span className="font-medium text-[#0B0B0B] text-sm sm:text-base pr-4">
                    {item.q}
                  </span>
                  {expandedFaq === idx ? (
                    <ChevronUp className="h-4 w-4 text-[#6B7280] shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-[#6B7280] shrink-0" />
                  )}
                </button>
                <AnimatePresence>
                  {expandedFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 text-sm text-[#6B7280] leading-relaxed">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>

        {/* Switch to LittleSlice */}
        <div className="text-center mb-8">
          <p className="text-sm text-[#6B7280] mb-3">
            Need temporary file sharing with larger limits?
          </p>
          <IsolatedButton
            asChild
            variant="outline"
            colorScheme="slicebox"
          >
            <Link to="/littleslice">
              Switch to LittleSlice →
            </Link>
          </IsolatedButton>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E8E8E8] bg-white py-6">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-sm text-[#6B7280]">
            Powered by{" "}
            <Link to="/" className="font-medium text-[#0B0B0B] hover:underline">
              SliceURL
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
