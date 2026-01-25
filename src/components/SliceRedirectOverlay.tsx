import { useEffect } from "react";
import { motion } from "framer-motion";
import { SliceLogo } from "@/components/SliceLogo";
import { useTheme } from "@/lib/theme";

interface SliceRedirectOverlayProps {
  onComplete: () => void;
}

export function SliceRedirectOverlay({ onComplete }: SliceRedirectOverlayProps) {
  const { resolvedTheme } = useTheme();
  
  useEffect(() => {
    // Redirect after 400ms animation
    const timer = setTimeout(() => {
      onComplete();
    }, 400);

    return () => clearTimeout(timer);
  }, [onComplete]);

  // Theme-aware colors for the animated slice
  const toppingColor = "#ff6b35";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background"
    >
      <div className="text-center">
        {/* Animated Logo with Pizza Slice Effect */}
        <div className="relative mb-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex items-center justify-center"
          >
            <SliceLogo size="xl" showText={false} />
          </motion.div>
          
          {/* Sparkle effect */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ 
              opacity: [0, 1, 0],
              scale: [0.5, 1.2, 0.8]
            }}
            transition={{ 
              duration: 0.4,
              ease: "easeOut"
            }}
            className="absolute -top-1 -right-1 text-lg"
          >
            ✨
          </motion.div>
        </div>

        {/* Logo Text */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, delay: 0.05 }}
          className="mb-3"
        >
          <span className="text-2xl font-bold tracking-tight">
            <span className="text-foreground">Slice</span>
            <span className="text-muted-foreground">URL</span>
          </span>
        </motion.div>

        {/* Animated underline with topping color accent */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="h-0.5 w-24 mx-auto origin-left"
          style={{ 
            background: `linear-gradient(to right, hsl(var(--foreground)), ${toppingColor})` 
          }}
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-xs text-muted-foreground mt-4"
        >
          Slicing your link...
        </motion.p>
      </div>
    </motion.div>
  );
}
