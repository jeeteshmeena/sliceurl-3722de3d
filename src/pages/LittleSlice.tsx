import { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, Link as LinkIcon, Copy, Check,
  ExternalLink, Share2, Clock, Lock, Eye, EyeOff, Gauge
} from "lucide-react";
import { IsolatedButton, LITTLESLICE_COLORS } from "@/components/slicebox/IsolatedButton";
import { IsolatedInput } from "@/components/slicebox/IsolatedInput";
import { FilePreview } from "@/components/slicebox/FilePreview";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { triggerHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { UploadStatusPanel } from "@/components/slicebox/UploadStatusPanel";
import { SliceNavToggle } from "@/components/SliceNavToggle";

// LittleSlice: Temporary file sharing - 2GB limit, optional expiry (default 1 day)
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

// Pinkish Red color theme
const ACCENT_COLOR = "#FF4D6D";
const ACCENT_COLOR_LIGHT = "#FFE0E6";

type ExpiryOption = "1hour" | "1day" | "7days" | "30days" | "never";

interface UploadedFile {
  fileId: string;
  shortCode: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  shareUrl: string;
  expiresAt: string | null;
  passwordProtected: boolean;
  file?: File;
}

interface FileUploadState {
  file: File;
  id: string;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
  result?: UploadedFile;
  error?: string;
  speed: number;
  remainingTime: number;
  uploadedBytes: number;
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

function getExpiryDate(option: ExpiryOption): string | null {
  if (option === "never") return null;
  const now = new Date();
  switch (option) {
    case "1hour":
      now.setHours(now.getHours() + 1);
      return now.toISOString();
    case "1day":
      now.setDate(now.getDate() + 1);
      return now.toISOString();
    case "7days":
      now.setDate(now.getDate() + 7);
      return now.toISOString();
    case "30days":
      now.setDate(now.getDate() + 30);
      return now.toISOString();
    default:
      now.setDate(now.getDate() + 1);
      return now.toISOString();
  }
}

function formatExpiryLabel(option: ExpiryOption): string {
  switch (option) {
    case "1hour": return "1 hour";
    case "1day": return "1 day";
    case "7days": return "7 days";
    case "30days": return "30 days";
    case "never": return "Never";
    default: return "1 day";
  }
}

function formatExpiryTime(isoString: string | null): string {
  if (!isoString) return "Never expires";
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) return `Expires in ${diffDays}d`;
  if (diffHours > 0) return `Expires in ${diffHours}h`;
  return "Expires soon";
}

// Generate short code with collision handling
function generateShortCode(length = 4): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// PBKDF2 password hashing with unique salts
const PBKDF2_ITERATIONS = 100000;

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return `pbkdf2$${arrayBufferToBase64(salt)}$${arrayBufferToBase64(hash)}`;
}

export default function LittleSlice() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [fileUploads, setFileUploads] = useState<FileUploadState[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showStatusPanel, setShowStatusPanel] = useState(false);
  
  // LittleSlice specific options
  const [expiryOption, setExpiryOption] = useState<ExpiryOption>("1day");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);

  const uploadSingleFile = useCallback(async (
    file: File, 
    onProgress: (loaded: number, total: number, speed: number, remaining: number) => void,
    expiresAt: string | null,
    filePassword: string | null
  ): Promise<UploadedFile> => {
    const fileId = crypto.randomUUID().split("-")[0] + Date.now().toString(36);
    const storagePath = `uploads/${fileId}/${file.name}`;
    const deleteToken = crypto.randomUUID();
    
    // Generate short code
    let shortCode = generateShortCode(4);

    // Hash password if provided
    const passwordHash = filePassword ? await hashPassword(filePassword) : null;

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
            // Try to insert with short code, retry with longer code if collision
            let inserted = false;
            let attempts = 0;
            while (!inserted && attempts < 5) {
              const { error: dbError } = await supabase.from("slicebox_files").insert({
                file_id: fileId,
                original_name: file.name,
                file_size: file.size,
                mime_type: file.type || "application/octet-stream",
                storage_path: storagePath,
                user_id: user?.id || null,
                delete_token: deleteToken,
                expires_at: expiresAt,
                password_hash: passwordHash,
                short_code: shortCode,
                service_type: 'ls', // LittleSlice
              });

              if (dbError) {
                if (dbError.code === '23505') {
                  shortCode = generateShortCode(5 + attempts);
                  attempts++;
                } else {
                  throw dbError;
                }
              } else {
                inserted = true;
              }
            }

            if (!inserted) throw new Error("Failed to generate unique short code");

            // Use new short link format
            const shareUrl = `${window.location.origin}/ls/${shortCode}`;
            resolve({
              fileId,
              shortCode,
              originalName: file.name,
              fileSize: file.size,
              mimeType: file.type || "application/octet-stream",
              shareUrl,
              expiresAt,
              passwordProtected: !!passwordHash,
              file,
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
  }, [user]);

  const handleMultipleFileUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(f => {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name} exceeds 2GB limit`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    const hasExecutables = validFiles.some(isExecutableFile);
    if (hasExecutables) {
      toast.warning("Executable files may contain malware. Only download from trusted sources.", {
        duration: 5000,
      });
    }

    const expiresAt = getExpiryDate(expiryOption);
    const filePassword = password.trim() || null;

    const newUploads: FileUploadState[] = validFiles.map(file => ({
      file,
      id: crypto.randomUUID(),
      progress: 0,
      status: "pending" as const,
      speed: 0,
      remainingTime: 0,
      uploadedBytes: 0,
    }));

    setFileUploads(prev => [...prev, ...newUploads]);
    setShowStatusPanel(true);

    const results = await Promise.all(
      newUploads.map(async (upload) => {
        setFileUploads(prev => 
          prev.map(u => u.id === upload.id ? { ...u, status: "uploading" } : u)
        );

        try {
          const result = await uploadSingleFile(
            upload.file, 
            (loaded, total, speed, remaining) => {
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
            }, 
            expiresAt, 
            filePassword
          );

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
        ? "File uploaded!" 
        : `${successfulUploads.length} files uploaded!`
      );
      setPassword("");
    }
  }, [uploadSingleFile, expiryOption, password]);

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

  const showResults = uploadedFiles.length > 0;
  const hasActiveUploads = fileUploads.some(u => u.status === "uploading" || u.status === "pending");
  const hasUploadsInProgress = fileUploads.length > 0;

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

  const expiryOptions: ExpiryOption[] = ["1hour", "1day", "7days", "30days"];

  return (
    <div className="min-h-dvh flex flex-col bg-[#FFF5F7]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b shadow-sm bg-white" style={{ borderColor: ACCENT_COLOR_LIGHT }}>
        <div className="max-w-4xl mx-auto h-14 flex items-center justify-between px-4 sm:px-6">
          {/* Left: Brand */}
          <div className="flex items-center gap-2.5">
            <div 
              className="h-9 w-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: ACCENT_COLOR }}
            >
              <Clock className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight">
              <span className="text-[#0B0B0B]">Little</span>
              <span className="text-[#6B7280]">Slice</span>
            </span>
          </div>

          {/* Right: Navigation Toggle */}
          <SliceNavToggle />
        </div>
        
        {/* Helper text */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-2">
          <p className="text-xs text-[#6B7280]">Temporary file sharing</p>
        </div>
      </header>

      {/* Upload Status Panel */}
      <UploadStatusPanel
        uploads={uploadStats}
        isOpen={showStatusPanel && hasActiveUploads}
        onClose={() => setShowStatusPanel(false)}
        variant="littleslice"
      />

      {/* Main Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B0B0B] mb-2">
            Temporary File Sharing
          </h1>
          <p className="text-sm sm:text-base text-[#6B7280]">
            Upload up to 2GB. Files auto-delete after expiry.
          </p>
        </div>

        {/* Expiry Selector - Pill buttons */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-3.5 w-3.5 text-[#6B7280]" />
            <span className="text-xs font-medium text-[#6B7280]">Expires in</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {expiryOptions.map((option) => (
              <button
                key={option}
                onClick={() => setExpiryOption(option)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all",
                  expiryOption === option
                    ? "text-white"
                    : "bg-white text-[#0B0B0B] border border-[#E8E8E8] hover:border-[#FF4D6D]"
                )}
                style={{
                  backgroundColor: expiryOption === option ? ACCENT_COLOR : undefined,
                }}
              >
                {formatExpiryLabel(option)}
              </button>
            ))}
          </div>
        </div>

        {/* Password field - collapsible */}
        <div className="mb-6">
          <button
            onClick={() => setShowPasswordField(!showPasswordField)}
            className="flex items-center gap-2 text-xs font-medium text-[#6B7280] hover:text-[#0B0B0B] transition-colors"
          >
            <Lock className="h-3.5 w-3.5" />
            Add password (optional)
          </button>
          <AnimatePresence>
            {showPasswordField && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="relative mt-2">
                  <IsolatedInput
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="h-11 rounded-xl pr-10"
                    colorScheme="littleslice"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Upload Zone - Contains uploads inside */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !hasUploadsInProgress && fileInputRef.current?.click()}
            className={cn(
              "rounded-2xl text-center transition-all duration-200 border-2 bg-white shadow-sm overflow-hidden",
              isDragging 
                ? "border-[#FF4D6D] scale-[1.01] shadow-lg" 
                : "border-[#FFE0E6] hover:border-[#FF4D6D]/50 hover:shadow-md",
              hasUploadsInProgress ? "cursor-default" : "cursor-pointer"
            )}
          >
            {/* Drop zone header */}
            <div className="p-8 sm:p-10" onClick={(e) => hasUploadsInProgress && e.stopPropagation()}>
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${ACCENT_COLOR}12` }}
              >
                <Upload className="h-8 w-8" style={{ color: ACCENT_COLOR }} />
              </div>
              <p className="font-semibold text-lg text-[#0B0B0B] mb-1">
                {hasUploadsInProgress ? "Upload in progress" : "Drop files here"}
              </p>
              <p className="text-sm text-[#6B7280] mb-4">
                {hasUploadsInProgress ? "Files are being uploaded" : "or click to browse"}
              </p>
              <div 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: ACCENT_COLOR }}
              >
                Max 2GB · Expires in {formatExpiryLabel(expiryOption)}
                {password && " · 🔒 Protected"}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleMultipleFileUpload(e.target.files)}
              />
            </div>

            {/* Active Uploads - Inside the drop zone */}
            <AnimatePresence mode="popLayout">
              {fileUploads.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-t"
                  style={{ borderColor: ACCENT_COLOR_LIGHT }}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-[#0B0B0B] text-sm">Uploading Files</h3>
                      {!hasActiveUploads && (
                        <IsolatedButton 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => { e.stopPropagation(); clearCompleted(); }}
                          colorScheme="littleslice"
                          className="text-xs"
                          style={{ color: LITTLESLICE_COLORS.textSecondary }}
                        >
                          Clear
                        </IsolatedButton>
                      )}
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {fileUploads.map((upload) => (
                        <motion.div
                          key={upload.id}
                          layout
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="p-3 bg-[#FFF5F7] rounded-xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-3">
                            <FilePreview 
                              file={upload.file} 
                              size="sm" 
                              variant="littleslice"
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
                              <div className="h-1.5 bg-[#FFE0E6] rounded-full overflow-hidden">
                                <motion.div 
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: ACCENT_COLOR }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${upload.progress}%` }}
                                  transition={{ duration: 0.3 }}
                                />
                              </div>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

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
                {uploadedFiles.map((file) => (
                  <motion.div
                    key={file.fileId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-white rounded-xl border shadow-sm"
                    style={{ borderColor: ACCENT_COLOR_LIGHT }}
                  >
                    <div className="flex items-start gap-3">
                      <FilePreview 
                        file={file.file} 
                        mimeType={file.mimeType}
                        fileName={file.originalName}
                        size="md" 
                        variant="littleslice"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#0B0B0B] truncate mb-1">
                          {file.originalName}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                          <span>{formatFileSize(file.fileSize)}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatExpiryTime(file.expiresAt)}
                          </span>
                          {file.passwordProtected && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                Protected
                              </span>
                            </>
                          )}
                        </div>
                        <div 
                          className="flex items-center gap-2 p-2 rounded-lg mt-2"
                          style={{ backgroundColor: `${ACCENT_COLOR}10` }}
                        >
                          <LinkIcon className="h-3.5 w-3.5 text-[#6B7280] shrink-0" />
                          <span className="text-xs text-[#0B0B0B] truncate flex-1 font-mono">
                            {file.shareUrl}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: ACCENT_COLOR_LIGHT }}>
                      <IsolatedButton
                        size="sm"
                        onClick={() => handleCopy(file.shareUrl, file.fileId)}
                        colorScheme="littleslice"
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
                        colorScheme="littleslice"
                      >
                        <Share2 className="h-4 w-4" />
                      </IsolatedButton>
                      <IsolatedButton
                        size="sm"
                        variant="outline"
                        asChild
                        colorScheme="littleslice"
                      >
                        <a href={file.shareUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </IsolatedButton>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Switch to SliceBox */}
        <div className="text-center mb-8">
          <p className="text-sm text-[#6B7280] mb-3">
            Need permanent file hosting?
          </p>
          <IsolatedButton
            asChild
            variant="outline"
            colorScheme="littleslice"
          >
            <Link to="/slicebox">
              Switch to SliceBox →
            </Link>
          </IsolatedButton>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-6" style={{ borderColor: ACCENT_COLOR_LIGHT }}>
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-sm text-[#6B7280]">
            A Product by{" "}
            <Link to="/slicebox" className="font-medium text-[#0B0B0B] hover:underline">
              SliceBox
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
