import { useState, useRef } from "react";
import { Download, Image, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/lib/i18n";

interface QRDownloadProps {
  url: string;
  filename?: string;
}

export function QRDownload({ url, filename = "sliceurl-qr" }: QRDownloadProps) {
  const { t } = useLanguage();
  const qrRef = useRef<HTMLDivElement>(null);

  const downloadPNG = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new window.Image();

    canvas.width = 512;
    canvas.height = 512;

    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 512, 512);
      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = pngUrl;
      link.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const downloadSVG = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${filename}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div ref={qrRef} className="flex justify-center p-4 bg-white rounded-xl">
        <QRCodeSVG 
          value={url} 
          size={200} 
          level="H"
          includeMargin
        />
      </div>

      <div className="flex gap-2 justify-center">
        <Button
          variant="secondary"
          size="sm"
          onClick={downloadPNG}
          className="gap-2 btn-micro"
        >
          <Image className="h-4 w-4" />
          {t("download_png")}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={downloadSVG}
          className="gap-2 btn-micro"
        >
          <FileCode className="h-4 w-4" />
          {t("download_svg")}
        </Button>
      </div>
    </div>
  );
}
