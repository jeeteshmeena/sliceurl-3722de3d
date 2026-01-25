import { useState, memo, useCallback } from "react";
import { FileImage, FileCode, FileText, Share2, Loader2, Save, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { QRDesign } from "@/hooks/useQRDesign";
import { toast } from "sonner";
import { toPng, toSvg } from "html-to-image";

interface ExportSectionProps {
  url: string;
  design: QRDesign;
  onSave: () => Promise<boolean>;
  onReset: () => void;
  saving: boolean;
}

type ExportFormat = "png" | "svg" | "pdf";

export const ExportSection = memo(function ExportSection({ url, design, onSave, onReset, saving }: ExportSectionProps) {
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportSize, setExportSize] = useState(1024);
  const [activeFormat, setActiveFormat] = useState<ExportFormat>("png");

  const downloadPNG = useCallback(async () => {
    setExporting("png");
    try {
      const qrContainer = document.querySelector('[data-qr-export]') as HTMLElement;
      if (!qrContainer) throw new Error("QR container not found");

      // Wait for any pending renders to complete
      await new Promise(r => setTimeout(r, 150));

      // Calculate scale factor for high-resolution export
      const scale = exportSize / qrContainer.offsetWidth;

      const dataUrl = await toPng(qrContainer, {
        quality: 1,
        pixelRatio: scale,
        backgroundColor: design.bg_color,
        cacheBust: true,
        skipFonts: true,
        filter: (node) => {
          // Skip the ambient glow effect div
          if (node instanceof HTMLElement && node.classList.contains('blur-[80px]')) {
            return false;
          }
          return true;
        },
      });

      const link = document.createElement("a");
      link.download = `qr-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("PNG downloaded!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export PNG");
    } finally {
      setExporting(null);
    }
  }, [design.bg_color, exportSize]);

  const downloadSVG = useCallback(async () => {
    setExporting("svg");
    try {
      const qrContainer = document.querySelector('[data-qr-export]') as HTMLElement;
      if (!qrContainer) throw new Error("QR container not found");

      // Wait for any pending renders to complete
      await new Promise(r => setTimeout(r, 150));

      const dataUrl = await toSvg(qrContainer, {
        backgroundColor: design.bg_color,
        cacheBust: true,
        skipFonts: true,
        filter: (node) => {
          // Skip the ambient glow effect div
          if (node instanceof HTMLElement && node.classList.contains('blur-[80px]')) {
            return false;
          }
          return true;
        },
      });

      // Convert data URL to blob and download
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.download = `qr-${Date.now()}.svg`;
      link.href = downloadUrl;
      link.click();

      URL.revokeObjectURL(downloadUrl);
      toast.success("SVG downloaded!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export SVG");
    } finally {
      setExporting(null);
    }
  }, [design.bg_color]);

  const downloadPDF = useCallback(async () => {
    setExporting("pdf");
    try {
      const qrContainer = document.querySelector('[data-qr-export]') as HTMLElement;
      if (!qrContainer) throw new Error("QR container not found");

      // Wait for any pending renders to complete
      await new Promise(r => setTimeout(r, 150));

      // Generate PNG for PDF printing
      const dataUrl = await toPng(qrContainer, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: design.bg_color,
        cacheBust: true,
        skipFonts: true,
        filter: (node) => {
          if (node instanceof HTMLElement && node.classList.contains('blur-[80px]')) {
            return false;
          }
          return true;
        },
      });

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Please allow popups for PDF export");
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>QR Code</title>
            <style>
              body { display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: white; }
              .container { text-align: center; padding: 40px; }
              img { max-width: 400px; height: auto; }
            </style>
          </head>
          <body><div class="container"><img src="${dataUrl}" alt="QR Code" /></div></body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 200);

      toast.success("PDF ready for print!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setExporting(null);
    }
  }, [design.bg_color]);

  const handleExport = useCallback(() => {
    switch (activeFormat) {
      case "png": downloadPNG(); break;
      case "svg": downloadSVG(); break;
      case "pdf": downloadPDF(); break;
    }
  }, [activeFormat, downloadPNG, downloadSVG, downloadPDF]);

  const shareQR = useCallback(async () => {
    if (!navigator.share) {
      toast.error("Sharing not supported on this device");
      return;
    }

    try {
      await navigator.share({
        title: "QR Code",
        text: `Scan this QR code: ${url}`,
        url: url,
      });
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        toast.error("Failed to share");
      }
    }
  }, [url]);

  const handleExportSizeChange = useCallback((value: number[]) => {
    setExportSize(value[0]);
  }, []);

  const formatOptions: { id: ExportFormat; icon: typeof FileImage; label: string }[] = [
    { id: "png", icon: FileImage, label: "PNG" },
    { id: "svg", icon: FileCode, label: "SVG" },
    { id: "pdf", icon: FileText, label: "PDF" },
  ];

  const handleReset = useCallback(() => {
    onReset();
    toast.success("Design reset to defaults");
  }, [onReset]);

  return (
    <div className="space-y-4">
      {/* Save & Reset Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={onSave}
          disabled={saving}
          className="flex-1 h-10 rounded-xl gap-2"
          size="lg"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Design
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={handleReset}
          className="h-10 w-10 rounded-xl shrink-0 p-0"
          title="Reset to defaults"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Format Selection */}
      <div className="grid grid-cols-3 gap-2">
        {formatOptions.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveFormat(id)}
            className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border-2 transition-all duration-200 ${
              activeFormat === id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/50 hover:border-primary/40 bg-muted/20"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium uppercase">{label}</span>
          </button>
        ))}
      </div>

      {/* Export Size Slider (for PNG) */}
      {activeFormat === "png" && (
        <div className="space-y-3 p-3 rounded-xl bg-muted/20 border border-border/50">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Export Size</Label>
            <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
              {exportSize}px
            </span>
          </div>
          <Slider
            value={[exportSize]}
            onValueChange={handleExportSizeChange}
            min={300}
            max={2400}
            step={100}
            className="w-full"
          />
        </div>
      )}

      {/* Export Button */}
      <Button
        variant="outline"
        onClick={handleExport}
        disabled={!!exporting}
        className="w-full h-10 rounded-xl gap-2"
      >
        {exporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        Download {activeFormat.toUpperCase()}
      </Button>

      {/* Share Button */}
      <Button
        variant="ghost"
        onClick={shareQR}
        className="w-full h-9 rounded-xl gap-2 text-muted-foreground hover:text-foreground"
      >
        <Share2 className="w-4 h-4" />
        Share Link
      </Button>
    </div>
  );
});
