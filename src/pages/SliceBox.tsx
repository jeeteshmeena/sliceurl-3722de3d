import { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, Link as LinkIcon, Copy, Check, ChevronDown, ChevronUp,
  ExternalLink, Share2, HardDrive, Clock, Gauge
} from "lucide-react";
import { IsolatedButton, SLICEBOX_COLORS } from "@/components/slicebox/IsolatedButton";
import { FilePreview, GRADIENT_COLORS } from "@/components/slicebox/FilePreview";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { triggerHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { UploadStatusPanel } from "@/components/slicebox/UploadStatusPanel";
import { SliceNavToggle } from "@/components/SliceNavToggle";

// SliceBox: Permanent file hosting - 200MB limit, no expiry
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

// Apple Music inspired colors
const COLORS = {
  primary: "#FF2D55",
  primaryLight: "rgba(255, 45, 85, 0.1)",
  gradient: "linear-gradient(135deg, #FF2D55 0%, #FF6B6B 100%)",
  text: "#0B0B0B",
  textSecondary: "#6B7280",
  background: "#FAFAFA",
  card: "#FFFFFF",
  border: "#E8E8E8",
};

interface UploadedFile {
  fileId: string;
  shortCode: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  shareUrl: string;
  file?: File;
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

// Executable file extensions for warning
const EXECUTABLE_EXTENSIONS = ['apk', 'exe', 'ipa', 'dmg', 'msi', 'deb', 'rpm', 'bat', 'cmd', 'sh'];
const EXECUTABLE_MIME_TYPES = [
  'application/vnd.android.package-archive',
  'application/x-msdownload',
  'application/octet-stream',
  'application/x-apple-diskimage',
];

function isExecutableFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return EXECUTABLE_EXTENSIONS.includes(ext) || EXECUTABLE_MIME_TYPES.includes(file.type);
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

  // Generate short code client-side with collision retry
  const generateShortCode = useCallback(async (length: number = 4, maxAttempts: number = 10): Promise<string> => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    
    const generate = (len: number) => {
      let result = "";
      for (let i = 0; i < len; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    // Try 4-character codes
    for (let i = 0; i < maxAttempts; i++) {
      const code = generate(length);
      const { data } = await supabase
        .from("slicebox_files")
        .select("id")
        .eq("short_code", code)
        .maybeSingle();
      
      if (!data) return code;
    }
    
    // Fallback to 5-character codes
    for (let i = 0; i < maxAttempts; i++) {
      const code = generate(5);
      const { data } = await supabase
        .from("slicebox_files")
        .select("id")
        .eq("short_code", code)
        .maybeSingle();
      
      if (!data) return code;
    }
    
    // Ultimate fallback to 6 characters
    return generate(6);
  }, []);

  const uploadSingleFile = useCallback(async (
    file: File, 
    uploadId: string,
    onProgress: (loaded: number, total: number, speed: number, remaining: number) => void
  ): Promise<UploadedFile> => {
    const fileId = crypto.randomUUID().split("-")[0] + Date.now().toString(36);
    const storagePath = `uploads/${fileId}/${file.name}`;
    const deleteToken = crypto.randomUUID();
    
    // Generate unique short code
    const shortCode = await generateShortCode();

    const { data: session } = await supabase.auth.getSession();
    const authToken = session?.session?.access_token;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/slicebox/${storagePath}`;
      
      let lastLoaded = 0;
      let lastTime = Date.now();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const now = Date.now();
          const timeDelta = (now - lastTime) / 1000; // seconds
          const bytesDelta = e.loaded - lastLoaded;
          
          // Calculate speed (smoothed)
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
            // Insert metadata with short_code and service_type
            const { error: dbError } = await supabase.from("slicebox_files").insert({
              file_id: fileId,
              original_name: file.name,
              file_size: file.size,
              mime_type: file.type || "application/octet-stream",
              storage_path: storagePath,
              user_id: user?.id || null,
              delete_token: deleteToken,
              expires_at: null, // PERMANENT - no expiry
              short_code: shortCode,
              service_type: "sb", // SliceBox
            });

            if (dbError) throw dbError;

            // Use new short link format: /sb/{shortCode}
            const shareUrl = `${window.location.origin}/sb/${shortCode}`;
            resolve({
              fileId,
              shortCode,
              originalName: file.name,
              fileSize: file.size,
              mimeType: file.type || "application/octet-stream",
              shareUrl,
              file, // Keep file reference for preview
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
      xhr.send(file);
    });
  }, [user, generateShortCode]);

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

    // Show warning for executable files
    const hasExecutables = validFiles.some(isExecutableFile);
    if (hasExecutables) {
      toast.warning("Executable files may contain malware. Only download from trusted sources.", {
        duration: 5000,
      });
    }

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
    { q: "What is SliceBox?", a: "Permanent file hosting service to share files with a single shareable link." },
    { q: "What's the maximum file size?", a: "200MB per file—use LittleSlice for larger files up to 2GB." },
    { q: "How long are files stored?", a: "Permanently—your links never expire and files stay accessible forever." },
    { q: "Is my file data secure?", a: "Yes, all transfers are encrypted and files get unique, unguessable URLs." },
    { q: "Can I password protect files?", a: "Use LittleSlice for password protection and expiration options." },
    { q: "Can I upload multiple files at once?", a: "Yes, drag and drop or select multiple files for bulk upload." },
    { q: "What file types are supported?", a: "All file types—documents, images, videos, audio, archives, and more." },
    { q: "Can I delete my files?", a: "Yes, you can delete any file from your account or via the delete link." },
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
      {/* Header - LEFT: Logo + Name | RIGHT: Toggle */}
      <header className="sticky top-0 z-50 border-b border-[#E8E8E8] bg-white shadow-sm">
        <div className="max-w-5xl mx-auto h-14 flex items-center justify-between px-4 sm:px-6">
          {/* Left: Brand */}
          <div className="flex items-center gap-2.5">
            <div 
              className="h-9 w-9 rounded-lg flex items-center justify-center"
              style={{ background: COLORS.gradient }}
            >
              <HardDrive className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight">
              <span className="text-[#0B0B0B]">Slice</span>
              <span className="text-[#6B7280]">Box</span>
            </span>
          </div>

          {/* Right: Navigation Toggle */}
          <SliceNavToggle />
        </div>
        
        {/* Helper text */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-2">
          <p className="text-xs text-[#6B7280]">Permanent file hosting</p>
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
                ? "scale-[1.01] shadow-lg" 
                : "hover:shadow-md"
            )}
            style={{
              borderColor: isDragging ? COLORS.primary : COLORS.border,
            }}
          >
            <div 
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: COLORS.gradient }}
            >
              <Upload className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            </div>
            <p className="font-semibold text-lg sm:text-xl text-[#0B0B0B] mb-1">
              Drop files here
            </p>
            <p className="text-sm text-[#6B7280] mb-4">
              or click to browse
            </p>
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-medium"
              style={{ background: COLORS.gradient }}
            >
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
                        <FilePreview
                          file={upload.file}
                          mimeType={upload.file.type}
                          fileName={upload.file.name}
                          size="sm"
                          variant="slicebox"
                        />
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
                              className="h-full rounded-full"
                              style={{ background: COLORS.gradient }}
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
                  return (
                    <motion.div
                      key={file.fileId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-white rounded-xl border border-[#E8E8E8] shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <FilePreview
                          file={file.file}
                          mimeType={file.mimeType}
                          fileName={file.originalName}
                          size="md"
                          variant="slicebox"
                        />
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
