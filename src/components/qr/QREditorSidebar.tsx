import { memo, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Palette, Image, Frame, Type, LayoutTemplate, Scissors, RotateCcw, Save, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRDesign } from "@/hooks/useQRDesign";
import { ColorSection } from "./ColorSection";
import { LogoSection } from "./LogoSection";
import { FrameSection } from "./FrameSection";
import { TextSection } from "./TextSection";
import { TemplatesSection } from "./TemplatesSection";
import { useLanguage } from "@/lib/i18n";
import { toast } from "sonner";
import { toPng, toSvg } from "html-to-image";

interface QREditorSidebarProps {
  design: QRDesign;
  onUpdate: (updates: Partial<QRDesign>) => void;
  onSave: () => Promise<boolean>;
  onReset: () => void;
  saving: boolean;
  destinationUrl: string;
}

type SectionId = "templates" | "colors" | "logo" | "frames" | "text";

interface SectionConfig {
  id: SectionId;
  title: string;
  icon: typeof Palette;
  iconExtra?: typeof Scissors;
}

const getSections = (t: (key: string) => string): SectionConfig[] => [
  { id: "templates", title: t("qr_templates"), icon: LayoutTemplate },
  { id: "colors", title: t("qr_colors"), icon: Palette },
  { id: "logo", title: t("qr_logo"), icon: Image },
  { id: "frames", title: t("qr_frames_shapes"), icon: Frame },
  { id: "text", title: t("qr_extra_text"), icon: Type },
];

export const QREditorSidebar = memo(function QREditorSidebar({
  design,
  onUpdate,
  onSave,
  onReset,
  saving,
  destinationUrl,
}: QREditorSidebarProps) {
  const { t } = useLanguage();
  const sections = getSections(t);
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(
    new Set(["templates", "colors"])
  );
  const [exporting, setExporting] = useState<string | null>(null);

  const toggleSection = useCallback((id: SectionId) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const downloadPNG = useCallback(async () => {
    setExporting("png");
    try {
      const qrContainer = document.querySelector('[data-qr-export]') as HTMLElement;
      if (!qrContainer) throw new Error("QR container not found");

      await new Promise(r => setTimeout(r, 150));

      const dataUrl = await toPng(qrContainer, {
        quality: 1,
        pixelRatio: 3,
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

      toast.success(t("png_downloaded"));
    } catch (error) {
      console.error("Export error:", error);
      toast.error(t("failed_export_png"));
    } finally {
      setExporting(null);
    }
  }, [design.bg_color]);

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
      toast.success(t("svg_downloaded"));
    } catch (error) {
      console.error("Export error:", error);
      toast.error(t("failed_export_svg"));
    } finally {
      setExporting(null);
    }
  }, [design.bg_color]);

  const handleReset = useCallback(() => {
    onReset();
    toast.success("Design reset to defaults");
  }, [onReset]);

  const renderSectionContent = (id: SectionId) => {
    switch (id) {
      case "templates":
        return <TemplatesSection onApply={onUpdate} />;
      case "colors":
        return <ColorSection design={design} onUpdate={onUpdate} destinationUrl={destinationUrl} />;
      case "logo":
        return <LogoSection design={design} onUpdate={onUpdate} />;
      case "frames":
        return <FrameSection design={design} onUpdate={onUpdate} />;
      case "text":
        return <TextSection design={design} onUpdate={onUpdate} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-card border-r border-border/50">
      {/* Header */}
      <div className="p-5 border-b border-border/50">
        <h2 className="text-lg font-semibold text-foreground">QR Editor</h2>
        <p className="text-xs text-muted-foreground mt-1">Customize your QR code</p>
      </div>

      {/* Scrollable Sections */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
        {sections.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          const Icon = section.icon;
          const IconExtra = section.iconExtra;

          return (
            <div
              key={section.id}
              className="rounded-xl border border-border/50 bg-background/50 overflow-hidden shadow-sm"
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    {section.title}
                    {IconExtra && <IconExtra className="w-3 h-3 text-muted-foreground" />}
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </motion.div>
              </button>

              {/* Section Content */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-1">
                      {renderSectionContent(section.id)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Action Buttons - Sticky Bottom */}
      <div className="p-4 border-t border-border/50 bg-card space-y-3">
        {/* Save & Reset */}
        <div className="flex gap-2">
          <Button
            onClick={onSave}
            disabled={saving}
            className="flex-1 h-10 rounded-xl gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving..." : "Save Design"}
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

        {/* Download Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={downloadPNG}
            disabled={!!exporting}
            className="flex-1 h-9 rounded-xl gap-2 text-xs"
          >
            {exporting === "png" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            PNG
          </Button>
          <Button
            variant="outline"
            onClick={downloadSVG}
            disabled={!!exporting}
            className="flex-1 h-9 rounded-xl gap-2 text-xs"
          >
            {exporting === "svg" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            SVG
          </Button>
        </div>
      </div>
    </div>
  );
});
