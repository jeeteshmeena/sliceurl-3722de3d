import { useState, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Blend, Wand2, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { SlidingToggle } from "@/components/ui/sliding-toggle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { QRDesign } from "@/hooks/useQRDesign";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ColorSectionProps {
  design: QRDesign;
  onUpdate: (updates: Partial<QRDesign>) => void;
  destinationUrl?: string;
}

const colorPresets = [
  "#FFFFFF",
  "#000000",
  "#64748b",
  "#6366f1",
  "#0ea5e9",
  "#06b6d4",
  "#ec4899",
  "#f97316",
];

// Memoized color swatch component
const ColorSwatch = memo(function ColorSwatch({ 
  color, 
  isSelected, 
  onClick 
}: { 
  color: string; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-7 h-7 rounded-full border-2 transition-all duration-200 shrink-0 ${
        isSelected
          ? "border-primary ring-2 ring-primary/30 scale-110"
          : "border-border/60 hover:border-primary/40 hover:scale-105"
      }`}
      style={{ backgroundColor: color }}
    />
  );
});

// Memoized color picker component
const ColorPicker = memo(function ColorPicker({
  label,
  value,
  onChange,
  presets,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
  presets: string[];
}) {
  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</Label>
      <div className="flex items-center gap-3">
        <div 
          className="w-11 h-11 rounded-xl border-2 border-border/60 cursor-pointer overflow-hidden shadow-sm hover:shadow-md transition-shadow shrink-0"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        <Input
          value={value.toUpperCase()}
          onChange={(e) => {
            const val = e.target.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
              onChange(val);
            }
          }}
          className="flex-1 font-mono uppercase text-xs bg-muted/30 border-border/50 h-10 rounded-xl qr-input"
          maxLength={7}
          placeholder="#000000"
        />
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {presets.map((color) => (
          <ColorSwatch
            key={color}
            color={color}
            isSelected={value.toUpperCase() === color.toUpperCase()}
            onClick={() => onChange(color)}
          />
        ))}
      </div>
    </div>
  );
});

export const ColorSection = memo(function ColorSection({ design, onUpdate, destinationUrl }: ColorSectionProps) {
  const [loadingAI, setLoadingAI] = useState(false);

  const handleAIAutoStyle = useCallback(async () => {
    if (!destinationUrl) {
      toast.error("No destination URL available");
      return;
    }

    setLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-branding", {
        body: { url: destinationUrl },
      });

      if (error) throw error;

      if (data?.success && data?.palette) {
        onUpdate({
          fg_color: data.palette.foreground,
          bg_color: data.palette.background,
          gradient_enabled: true,
          gradient_start: data.palette.gradientStart,
          gradient_end: data.palette.gradientEnd,
        });

        if (data.faviconUrl) {
          onUpdate({ logo_url: data.faviconUrl });
        }

        toast.success("Applied branding colors!");
      } else {
        throw new Error("Could not extract branding colors");
      }
    } catch (error) {
      console.error("AI Auto Style error:", error);
      toast.error("Failed to fetch website branding");
    } finally {
      setLoadingAI(false);
    }
  }, [destinationUrl, onUpdate]);

  const handleFgChange = useCallback((color: string) => {
    onUpdate({ fg_color: color });
  }, [onUpdate]);

  const handleBgChange = useCallback((color: string) => {
    onUpdate({ bg_color: color });
  }, [onUpdate]);

  const handleGradientToggle = useCallback((checked: boolean) => {
    onUpdate({ gradient_enabled: checked });
  }, [onUpdate]);

  const handleGradientType = useCallback((type: "linear" | "radial") => {
    onUpdate({ gradient_type: type });
  }, [onUpdate]);

  const handleGradientStart = useCallback((color: string) => {
    onUpdate({ gradient_start: color });
  }, [onUpdate]);

  const handleGradientEnd = useCallback((color: string) => {
    onUpdate({ gradient_end: color });
  }, [onUpdate]);

  return (
    <div className="space-y-5">
      {/* AI Auto Style Button */}
      {destinationUrl && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleAIAutoStyle}
          disabled={loadingAI}
          className="w-full gap-2 h-9 rounded-xl border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 text-xs"
        >
          {loadingAI ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Wand2 className="w-3.5 h-3.5" />
          )}
          AI Auto Style from Website
        </Button>
      )}

      {/* Color Pickers */}
      <ColorPicker
        label="Foreground Color"
        value={design.fg_color}
        onChange={handleFgChange}
        presets={colorPresets}
      />

      <ColorPicker
        label="Background Color"
        value={design.bg_color}
        onChange={handleBgChange}
        presets={colorPresets}
      />

      {/* Gradient Toggle */}
      <div className="pt-2">
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
              <Blend className="w-4 h-4 text-muted-foreground" />
            </div>
            <Label className="text-sm font-medium cursor-pointer">Gradient Mode</Label>
          </div>
          <SlidingToggle
            checked={design.gradient_enabled}
            onCheckedChange={handleGradientToggle}
          />
        </div>
      </div>

      {/* Gradient Controls - Animated */}
      <AnimatePresence mode="wait">
        {design.gradient_enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 pt-1">
              {/* Gradient Type */}
              <div className="flex gap-2">
                {(["linear", "radial"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleGradientType(type)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 ${
                      design.gradient_type === type
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/50 hover:bg-muted text-foreground"
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>

              {/* Gradient Color Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Start</Label>
                  <div 
                    className="w-full h-10 rounded-lg border-2 border-border/50 cursor-pointer overflow-hidden shadow-sm"
                    style={{ backgroundColor: design.gradient_start }}
                  >
                    <input
                      type="color"
                      value={design.gradient_start}
                      onChange={(e) => handleGradientStart(e.target.value)}
                      className="w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">End</Label>
                  <div 
                    className="w-full h-10 rounded-lg border-2 border-border/50 cursor-pointer overflow-hidden shadow-sm"
                    style={{ backgroundColor: design.gradient_end }}
                  >
                    <input
                      type="color"
                      value={design.gradient_end}
                      onChange={(e) => handleGradientEnd(e.target.value)}
                      className="w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Preview gradient bar */}
              <div 
                className="h-3 rounded-full"
                style={{
                  background: design.gradient_type === "linear"
                    ? `linear-gradient(90deg, ${design.gradient_start}, ${design.gradient_end})`
                    : `radial-gradient(circle, ${design.gradient_start}, ${design.gradient_end})`
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
