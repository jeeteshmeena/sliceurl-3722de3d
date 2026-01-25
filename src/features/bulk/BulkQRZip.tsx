import JSZip from "jszip";
import QRCode from "qrcode";
import { getShortUrl } from "@/lib/domain";

interface BulkLink {
  id: string;
  short_code: string;
  custom_slug?: string;
  title?: string;
}

export async function generateQRZip(
  links: BulkLink[],
  batchId: string,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const zip = new JSZip();
  const qrFolder = zip.folder("qr-codes");
  
  if (!qrFolder) {
    throw new Error("Failed to create ZIP folder");
  }

  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const shortUrl = getShortUrl(link.custom_slug || link.short_code);
    
    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(shortUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });
    
    // Convert data URL to blob
    const response = await fetch(qrDataUrl);
    const blob = await response.blob();
    
    const filename = `${String(i + 1).padStart(3, "0")}-${link.custom_slug || link.short_code}.png`;
    qrFolder.file(filename, blob);
    
    if (onProgress) {
      onProgress(i + 1, links.length);
    }
  }

  return await zip.generateAsync({ type: "blob" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
