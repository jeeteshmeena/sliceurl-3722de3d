import { useState, memo, useCallback } from "react";
import { motion } from "framer-motion";
import { FileImage, FileCode, FileText, Share2, Loader2, Save, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { QRDesign } from "@/hooks/useQRDesign";
import { toast } from "sonner";
import { toPng, toSvg } from "html-to-image";

interface ExportPanelProps {
  url: string;
  design: QRDesign;
  onSave: () => Promise<boolean>;
  onReset: () => void;
  saving: boolean;
}

type ExportFormat = "png" | "svg" | "pdf";

export const ExportPanel = memo(function ExportPanel({ url, design, onSave, onReset, saving }: ExportPanelProps) {
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportSize, setExportSize] = useState(1024);
  const [activeFormat, setActiveFormat] = useState<ExportFormat>("png");

  const downloadPNG = useCallback(async () => {
    setExporting("png");
    try {
      const qrContainer = document.querySelector('[data-qr-export]') as HTMLElement;
      if (!qrContainer) throw new Error("QR container not found");

      await new Promise(r => setTimeout(r, 150));

      const scale = exportSize / qrContainer.offsetWidth;

      const dataUrl = await toPng(qrContainer, {
        quality: 1,
        pixelRatio: scale,
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

      await new Promise(r => setTimeout(r, 150));

      const dataUrl = await toSvg(qrContainer, {
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

  const handleExport = useCallback(() => {
    switch (activeFormat) {
      case "png": downloadPNG(); break;
      case "svg": downloadSVG(); break;
    }
  }, [activeFormat, downloadPNG, downloadSVG]);

  const handleReset = useCallback(() => {
    onReset();
    toast.success("Design reset to defaults");
  }, [onReset]);

  const handleExportSizeChange = useCallback((value: number[]) => {
    setExportSize(value[0]);
  }, []);

  const formatOptions: { id: ExportFormat; icon: typeof FileImage; label: string }[] = [
    { id: "png", icon: FileImage, label: "PNG" },
    { id: "svg", icon: FileCode, label: "SVG" },
  ];

  return (
    <div className="space-y-5">
      {/* Save & Reset */}
      <div className="flex gap-2">
        <Button
          onClick={onSave}
          disabled={saving}
          className="flex-1 h-11 rounded-xl gap-2"
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
          className="h-11 w-11 rounded-xl shrink-0 p-0"
          title="Reset to defaults"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Format Selection */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Export Format
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {formatOptions.map(({ id, icon: Icon, label }) => (
            <motion.button
              key={id}
              onClick={() => setActiveFormat(id)}
              whileTap={{ scale: 0.97 }}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all duration-200 ${
                activeFormat === id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/50 hover:border-primary/40 bg-muted/20"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Export Size Slider (for PNG) */}
      {activeFormat === "png" && (
        <div className="space-y-3 p-4 rounded-xl bg-muted/20 border border-border/50">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Export Size</Label>
            <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
              {exportSize}px
            </span>
          </div>
          <Slider
            value={[exportSize]}
            onValueChange={handleExportSizeChange}
            min={512}
            max={2048}
            step={128}
            className="w-full"
          />
        </div>
      )}

      {/* Export Button */}
      <Button
        variant="outline"
        onClick={handleExport}
        disabled={!!exporting}
        className="w-full h-11 rounded-xl gap-2"
      >
        {exporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        Download {activeFormat.toUpperCase()}
      </Button>

      {/* Share Button */}
      {typeof navigator !== "undefined" && navigator.share && (
        <Button
          variant="ghost"
          onClick={() => navigator.share({ title: "QR Code", url })}
          className="w-full h-10 rounded-xl gap-2 text-muted-foreground hover:text-foreground"
        >
          <Share2 className="w-4 h-4" />
          Share Link
        </Button>
      )}
    </div>
  );
});
