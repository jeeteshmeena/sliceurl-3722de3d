import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { QRDesign } from "@/hooks/useQRDesign";

interface FrameSectionProps {
  design: QRDesign;
  onUpdate: (updates: Partial<QRDesign>) => void;
}

const frameStyles = [
  { id: "none", label: "None", preview: () => (
    <div className="w-10 h-10 border-2 border-dashed border-muted-foreground/30 rounded-lg" />
  )},
  { id: "rounded", label: "Rounded", preview: () => (
    <div className="w-10 h-10 border-2 border-foreground rounded-xl" />
  )},
  { id: "thick", label: "Thick", preview: () => (
    <div className="w-10 h-10 border-4 border-foreground rounded-lg" />
  )},
  { id: "ticket", label: "Ticket", preview: () => (
    <div className="w-10 h-10 border-2 border-foreground rounded-lg relative">
      <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-background border-2 border-foreground rounded-full" />
      <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-background border-2 border-foreground rounded-full" />
    </div>
  )},
] as const;

export const FrameSection = memo(function FrameSection({ design, onUpdate }: FrameSectionProps) {
  const handleFrameSelect = useCallback((frameId: string | null) => {
    if (frameId === "none") {
      onUpdate({ frame_type: null, frame_text: null });
    } else {
      onUpdate({ frame_type: frameId });
    }
  }, [onUpdate]);

  return (
    <div className="space-y-5">
      {/* Frame Styles Grid */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Frame Style</Label>
        <div className="grid grid-cols-2 gap-3">
          {frameStyles.map((frame) => {
            const isSelected = frame.id === "none" 
              ? design.frame_type === null 
              : design.frame_type === frame.id;
            const Preview = frame.preview;
            return (
              <motion.button
                key={frame.id}
                onClick={() => handleFrameSelect(frame.id)}
                whileTap={{ scale: 0.97 }}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border/50 hover:border-primary/40 bg-muted/20"
                }`}
              >
                <Preview />
                <span className="text-xs font-medium">{frame.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Quick Info */}
      <p className="text-xs text-muted-foreground text-center">
        Frame style affects the visual border around your QR code
      </p>
    </div>
  );
});
