import { memo } from "react";
import { motion } from "framer-motion";
import { QRPreview } from "./QRPreview";
import { QRDesign } from "@/hooks/useQRDesign";

interface QRPreviewPanelProps {
  url: string;
  design: QRDesign;
}

export const QRPreviewPanel = memo(function QRPreviewPanel({ url, design }: QRPreviewPanelProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Dotted Canvas Background */}
      <div 
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: `radial-gradient(circle, hsl(var(--muted-foreground) / 0.3) 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }}
      />

      {/* Ambient Glow Effect */}
      <div
        className="absolute inset-0 blur-[120px] opacity-[0.06] transition-all duration-700"
        style={{
          background: design.gradient_enabled
            ? `radial-gradient(circle at center, ${design.gradient_start}, ${design.gradient_end})`
            : design.fg_color,
        }}
      />

      {/* Preview Card Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        whileHover={{ scale: 1.02 }}
        className="relative z-10"
      >
        {/* QR Export Container */}
        <div 
          data-qr-export
          className="flex flex-col items-center bg-transparent"
        >
          <QRPreview url={url} design={design} size={260} />
        </div>
      </motion.div>

      {/* URL Display */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 z-10"
      >
        <code className="text-xs text-muted-foreground font-mono bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border/50 shadow-sm">
          {url}
        </code>
      </motion.div>
    </div>
  );
});
