import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { LayoutTemplate } from "lucide-react";
import { QRDesign, defaultQRDesign } from "@/hooks/useQRDesign";
import { toast } from "sonner";

interface TemplatesSectionProps {
  onApply: (updates: Partial<QRDesign>) => void;
}

const templates = [
  {
    id: "clean",
    name: "Clean",
    preview: { bg: "#ffffff", fg: "#000000" },
    config: {
      fg_color: "#000000",
      bg_color: "#ffffff",
      gradient_enabled: false,
      shape: "square" as const,
      corner_radius: 0,
      padding: 20,
      frame_type: null,
    },
  },
  {
    id: "dark-modern",
    name: "Dark Modern",
    preview: { bg: "#1a1a1a", fg: "#ffffff" },
    config: {
      fg_color: "#ffffff",
      bg_color: "#1a1a1a",
      gradient_enabled: false,
      shape: "rounded" as const,
      corner_radius: 8,
      padding: 24,
      frame_type: "scan_me",
    },
  },
  {
    id: "gradient",
    name: "Gradient",
    preview: { bg: "#ffffff", fg: "linear-gradient(135deg, #6366f1, #ec4899)" },
    config: {
      fg_color: "#6366f1",
      bg_color: "#ffffff",
      gradient_enabled: true,
      gradient_type: "linear" as const,
      gradient_start: "#6366f1",
      gradient_end: "#ec4899",
      shape: "dots" as const,
      corner_radius: 0,
      padding: 20,
    },
  },
  {
    id: "business",
    name: "Business Card",
    preview: { bg: "#f8fafc", fg: "#0f172a" },
    config: {
      fg_color: "#0f172a",
      bg_color: "#f8fafc",
      gradient_enabled: false,
      shape: "square" as const,
      corner_radius: 4,
      padding: 28,
      frame_type: "visit_us",
    },
  },
  {
    id: "floating",
    name: "Floating Logo",
    preview: { bg: "#fefce8", fg: "#854d0e" },
    config: {
      fg_color: "#854d0e",
      bg_color: "#fefce8",
      gradient_enabled: false,
      shape: "rounded" as const,
      corner_radius: 12,
      padding: 24,
      logo_size: 25,
    },
  },
];

export const TemplatesSection = memo(function TemplatesSection({ onApply }: TemplatesSectionProps) {
  const handleApply = useCallback((config: Partial<QRDesign>) => {
    onApply(config);
    toast.success("Template applied!");
  }, [onApply]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <LayoutTemplate className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Quick Start Templates
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {templates.map((template) => (
          <motion.button
            key={template.id}
            onClick={() => handleApply(template.config)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200"
          >
            {/* Template Preview */}
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center shadow-sm"
              style={{ backgroundColor: template.preview.bg }}
            >
              <div 
                className="w-6 h-6 rounded"
                style={{ 
                  background: template.preview.fg,
                }}
              />
            </div>
            <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
              {template.name}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
});
