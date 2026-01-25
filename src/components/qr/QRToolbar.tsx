import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { Palette, Shapes, Image, Frame, Type, Download } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

export type ToolbarTab = "colors" | "style" | "logo" | "frames" | "text" | "export";

interface QRToolbarProps {
  activeTab: ToolbarTab | null;
  onTabChange: (tab: ToolbarTab) => void;
}

const toolbarItems: { id: ToolbarTab; icon: typeof Palette; label: string }[] = [
  { id: "colors", icon: Palette, label: "Colors" },
  { id: "style", icon: Shapes, label: "Style" },
  { id: "logo", icon: Image, label: "Logo" },
  { id: "frames", icon: Frame, label: "Frames" },
  { id: "text", icon: Type, label: "Text" },
  { id: "export", icon: Download, label: "Export" },
];

export const QRToolbar = memo(function QRToolbar({ activeTab, onTabChange }: QRToolbarProps) {
  const handleTabClick = useCallback((tab: ToolbarTab) => {
    triggerHaptic("light");
    onTabChange(tab);
  }, [onTabChange]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/50 safe-bottom">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {toolbarItems.map(({ id, icon: Icon, label }) => {
          const isActive = activeTab === id;
          return (
            <motion.button
              key={id}
              onClick={() => handleTabClick(id)}
              whileTap={{ scale: 0.95 }}
              className={`
                flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl
                transition-colors duration-200 min-w-[56px]
                ${isActive 
                  ? "text-foreground bg-muted" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }
              `}
            >
              <motion.div
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Icon className="w-5 h-5" />
              </motion.div>
              <span className="text-[10px] font-medium">{label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
});
