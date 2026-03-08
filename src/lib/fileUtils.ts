/**
 * Shared file utility functions used across SliceBox, LittleSlice, and SliceAPPs
 */

import { FileText, Image, Video, Music, Archive, File } from "lucide-react";

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Format download count to human-readable string (Play Store style)
 */
export function formatDownloads(count: number | null): string {
  if (!count || count === 0) return "0";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M+`;
  if (count >= 100000) return "100K+";
  if (count >= 10000) return "10K+";
  if (count >= 1000) return `${Math.floor(count / 1000)}K+`;
  if (count >= 100) return "100+";
  if (count >= 10) return "10+";
  return count.toString();
}

/**
 * Format upload/download speed
 */
export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return "0 B/s";
  const k = 1024;
  const sizes = ["B/s", "KB/s", "MB/s", "GB/s"];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
  return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Format remaining time for uploads/downloads
 */
export function formatTime(seconds: number): string {
  if (seconds === 0 || !isFinite(seconds)) return "--";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

/**
 * Format expiry time to human-readable string
 */
export function formatExpiryTime(isoString: string | null): string | null {
  if (!isoString) return null;
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  
  if (diffMs <= 0) return "Expired";
  
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) return `Expires in ${diffDays} day${diffDays > 1 ? "s" : ""}`;
  if (diffHours > 0) return `Expires in ${diffHours} hour${diffHours > 1 ? "s" : ""}`;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  return `Expires in ${diffMins} minute${diffMins > 1 ? "s" : ""}`;
}

/**
 * Get file icon component based on MIME type
 */
export function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.startsWith("video/")) return Video;
  if (mimeType.startsWith("audio/")) return Music;
  if (mimeType === "application/pdf") return FileText;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z")) return Archive;
  return File;
}

/**
 * Check if file is an executable
 */
export const EXECUTABLE_EXTENSIONS = ['apk', 'exe', 'ipa', 'dmg', 'msi', 'deb', 'rpm', 'bat', 'cmd', 'sh'];
export const EXECUTABLE_MIME_TYPES = [
  'application/vnd.android.package-archive',
  'application/x-msdownload',
  'application/octet-stream',
  'application/x-apple-diskimage',
];

export function isExecutableFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return EXECUTABLE_EXTENSIONS.includes(ext) || EXECUTABLE_MIME_TYPES.includes(file.type);
}

/**
 * Check if file is an APK
 */
export function isApkFile(fileName: string, mimeType?: string): boolean {
  if (fileName.toLowerCase().endsWith('.apk')) return true;
  if (mimeType === 'application/vnd.android.package-archive') return true;
  return false;
}

/**
 * Get correct MIME type for a file
 */
export function getCorrectMimeType(fileName: string, originalMimeType: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  const mimeMap: Record<string, string> = {
    'apk': 'application/vnd.android.package-archive',
    'pdf': 'application/pdf',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    'mp3': 'audio/mpeg',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
  };
  
  return mimeMap[ext] || originalMimeType || 'application/octet-stream';
}

/**
 * Generate a streaming download URL
 */
export function getStreamingDownloadUrl(fileId: string, verified = false): string {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const params = new URLSearchParams({ fileId });
  if (verified) params.append('verified', 'true');
  return `${baseUrl}/functions/v1/file-stream?${params.toString()}`;
}

/**
 * Trigger file download via hidden link
 */
export function triggerDownload(url: string, fileName: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}
