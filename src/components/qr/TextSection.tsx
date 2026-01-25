import { memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlignLeft, AlignCenter, AlignRight, Type } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { QRDesign } from "@/hooks/useQRDesign";

interface TextSectionProps {
  design: QRDesign;
  onUpdate: (updates: Partial<QRDesign>) => void;
}

const framePresets = [
  { id: "scan_me", label: "SCAN ME" },
  { id: "pay_here", label: "PAY HERE" },
  { id: "join_now", label: "JOIN NOW" },
  { id: "visit_us", label: "VISIT US" },
  { id: "follow", label: "FOLLOW" },
  { id: "download", label: "DOWNLOAD" },
  { id: "learn_more", label: "LEARN MORE" },
  { id: "shop_now", label: "SHOP NOW" },
] as const;

export const TextSection = memo(function TextSection({ design, onUpdate }: TextSectionProps) {
  const handleCustomTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ frame_text: e.target.value || null });
  }, [onUpdate]);

  const handlePresetSelect = useCallback((preset: string | null) => {
    onUpdate({ 
      frame_type: preset, 
      frame_text: null 
    });
  }, [onUpdate]);

  return (
    <div className="space-y-6">
      {/* Custom Text Input */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Type className="w-3.5 h-3.5" />
          Custom Text
        </Label>
        <Input
          value={design.frame_text || ""}
          onChange={handleCustomTextChange}
          placeholder="Enter text below QR..."
          maxLength={25}
          className="bg-muted/20 border-border/50 text-sm h-11 rounded-xl qr-input"
        />
        <p className="text-[10px] text-muted-foreground">
          Leave empty to use preset or no text
        </p>
      </div>

      {/* Quick Presets */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Quick Presets
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {framePresets.map((preset) => {
            const isSelected = design.frame_type === preset.id && !design.frame_text;
            return (
              <motion.button
                key={preset.id}
                onClick={() => handlePresetSelect(preset.id)}
                whileTap={{ scale: 0.97 }}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/20 hover:bg-muted/40 border-border/50 text-foreground"
                }`}
              >
                {preset.label}
              </motion.button>
            );
          })}
        </div>
        
        {/* None option */}
        <motion.button
          onClick={() => handlePresetSelect(null)}
          whileTap={{ scale: 0.98 }}
          className={`w-full px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 border ${
            design.frame_type === null && !design.frame_text
              ? "bg-muted text-foreground border-border"
              : "bg-transparent hover:bg-muted/30 border-border/50 text-muted-foreground"
          }`}
        >
          No Text
        </motion.button>
      </div>
    </div>
  );
});
