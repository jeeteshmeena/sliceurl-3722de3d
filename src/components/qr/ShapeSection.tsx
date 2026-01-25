import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { Square, Circle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { QRDesign } from "@/hooks/useQRDesign";

interface ShapeSectionProps {
  design: QRDesign;
  onUpdate: (updates: Partial<QRDesign>) => void;
}

const shapes = [
  { id: "square", label: "Square", icon: Square },
  { id: "rounded", label: "Rounded", icon: () => <div className="w-4 h-4 rounded-md border-2 border-current" /> },
  { id: "dots", label: "Dots", icon: Circle },
  { id: "mosaic", label: "Mosaic", icon: () => (
    <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
      <div className="bg-current rounded-[2px]" />
      <div className="bg-current rounded-[2px]" />
      <div className="bg-current rounded-[2px]" />
      <div className="bg-current rounded-[2px]" />
    </div>
  )},
] as const;

export const ShapeSection = memo(function ShapeSection({ design, onUpdate }: ShapeSectionProps) {
  const handleShapeChange = useCallback((shape: QRDesign["shape"]) => {
    onUpdate({ shape });
  }, [onUpdate]);

  const handleCornerRadiusChange = useCallback((value: number[]) => {
    onUpdate({ corner_radius: value[0] });
  }, [onUpdate]);

  const handlePaddingChange = useCallback((value: number[]) => {
    onUpdate({ padding: value[0] });
  }, [onUpdate]);

  return (
    <div className="space-y-6">
      {/* Pixel Shape */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pixel Shape</Label>
        <div className="grid grid-cols-2 gap-2">
          {shapes.map((shape) => {
            const Icon = shape.icon;
            const isSelected = design.shape === shape.id;
            return (
              <motion.button
                key={shape.id}
                onClick={() => handleShapeChange(shape.id as QRDesign["shape"])}
                whileTap={{ scale: 0.97 }}
                className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 transition-all duration-200 ${
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/50 hover:border-primary/40 bg-muted/20 hover:bg-muted/40"
                }`}
              >
                <Icon />
                <span className="text-xs font-medium">{shape.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Corner Radius Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Corner Radius</Label>
          <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
            {design.corner_radius}px
          </span>
        </div>
        <Slider
          value={[design.corner_radius]}
          onValueChange={handleCornerRadiusChange}
          max={24}
          step={1}
          className="w-full"
        />
      </div>

      {/* Quiet Zone Padding Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quiet Zone</Label>
          <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
            {design.padding}px
          </span>
        </div>
        <Slider
          value={[design.padding]}
          onValueChange={handlePaddingChange}
          min={8}
          max={48}
          step={4}
          className="w-full"
        />
      </div>
    </div>
  );
});
