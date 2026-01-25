import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Image, FileCode, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { useLanguage } from "@/lib/i18n";

interface SliceQRProps {
  url: string;
  filename?: string;
  size?: number;
}

export function SliceQR({ url, filename = "sliceurl-qr", size = 200 }: SliceQRProps) {
  const { t } = useLanguage();
  const qrRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimating(false), 2000);
    return () => clearTimeout(timer);
  }, []);

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
      // White background
      ctx!.fillStyle = "white";
      ctx!.fillRect(0, 0, 512, 512);
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
      {/* QR Container with Slice-style animation */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative"
      >
        {/* Animated corner slices */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top-left slice */}
          <motion.div
            className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-foreground rounded-tl-lg"
            initial={{ opacity: 0, x: -10, y: -10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: 0.2 }}
          />
          {/* Top-right slice */}
          <motion.div
            className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-foreground rounded-tr-lg"
            initial={{ opacity: 0, x: 10, y: -10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: 0.3 }}
          />
          {/* Bottom-left slice */}
          <motion.div
            className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-foreground rounded-bl-lg"
            initial={{ opacity: 0, x: -10, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: 0.4 }}
          />
          {/* Bottom-right slice */}
          <motion.div
            className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-foreground rounded-br-lg"
            initial={{ opacity: 0, x: 10, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: 0.5 }}
          />

          {/* Animated slice line */}
          {isAnimating && (
            <motion.div
              className="absolute top-0 left-0 right-0 h-full overflow-hidden"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ delay: 1.5, duration: 0.3 }}
            >
              <motion.div
                className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent"
                initial={{ y: -10 }}
                animate={{ y: size + 50 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              />
            </motion.div>
          )}
        </div>

        {/* QR Code */}
        <div 
          ref={qrRef} 
          className="flex justify-center p-4 bg-background rounded-xl border border-border shadow-premium-md"
        >
          <motion.div
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
          >
            <QRCodeSVG 
              value={url} 
              size={size} 
              level="H"
              includeMargin
              bgColor="transparent"
              fgColor="currentColor"
              className="text-foreground"
            />
          </motion.div>
        </div>
      </motion.div>

      {/* Download buttons */}
      <motion.div 
        className="flex gap-2 justify-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
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
      </motion.div>
    </div>
  );
}
