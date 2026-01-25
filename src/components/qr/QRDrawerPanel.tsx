import { memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { QRDesign } from "@/hooks/useQRDesign";
import { ColorSection } from "./ColorSection";
import { ShapeSection } from "./ShapeSection";
import { LogoSection } from "./LogoSection";
import { FrameSection } from "./FrameSection";
import { TextSection } from "./TextSection";
import { ExportPanel } from "./ExportPanel";
import { ToolbarTab } from "./QRToolbar";
import { useIsMobile } from "@/hooks/use-mobile";

interface QRDrawerPanelProps {
  activeTab: ToolbarTab | null;
  onClose: () => void;
  design: QRDesign;
  onUpdate: (updates: Partial<QRDesign>) => void;
  onSave: () => Promise<boolean>;
  onReset: () => void;
  saving: boolean;
  shortUrl: string;
  destinationUrl: string;
}

const panelTitles: Record<ToolbarTab, string> = {
  colors: "Colors",
  style: "Style",
  logo: "Logo",
  frames: "Frames",
  text: "Text",
  export: "Export",
};

export const QRDrawerPanel = memo(function QRDrawerPanel({
  activeTab,
  onClose,
  design,
  onUpdate,
  onSave,
  onReset,
  saving,
  shortUrl,
  destinationUrl,
}: QRDrawerPanelProps) {
  const isMobile = useIsMobile();
  
  const snapPoints = isMobile 
    ? [0.8] // Mobile: 80% height
    : [0.6]; // Tablet/Desktop: 60% height

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) onClose();
  }, [onClose]);

  const renderPanelContent = () => {
    switch (activeTab) {
      case "colors":
        return <ColorSection design={design} onUpdate={onUpdate} destinationUrl={destinationUrl} />;
      case "style":
        return <ShapeSection design={design} onUpdate={onUpdate} />;
      case "logo":
        return <LogoSection design={design} onUpdate={onUpdate} />;
      case "frames":
        return <FrameSection design={design} onUpdate={onUpdate} />;
      case "text":
        return <TextSection design={design} onUpdate={onUpdate} />;
      case "export":
        return (
          <ExportPanel 
            url={shortUrl} 
            design={design} 
            onSave={onSave} 
            onReset={onReset} 
            saving={saving} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <Drawer 
      open={activeTab !== null} 
      onOpenChange={handleOpenChange}
      snapPoints={snapPoints}
    >
      <DrawerContent className="max-h-[85vh] rounded-t-3xl border-border/50">
        <DrawerHeader className="border-b border-border/30 pb-4">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-base font-semibold">
              {activeTab ? panelTitles[activeTab] : ""}
            </DrawerTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DrawerHeader>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex-1 overflow-y-auto px-5 py-5 pb-safe-bottom"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
            >
              {renderPanelContent()}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </DrawerContent>
    </Drawer>
  );
});
