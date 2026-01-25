import { motion } from "framer-motion";
import sliceurlLogo from "@/assets/sliceurl-logo.png";

interface SliceMascotProps {
  size?: "sm" | "md" | "lg";
  animate?: boolean;
  variant?: "character" | "icon" | "card" | "cutting";
}

export function SliceMascot({ size = "md", animate = true, variant = "character" }: SliceMascotProps) {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  const imageSrc = sliceurlLogo;

  return (
    <motion.div
      className={`${sizeClasses[size]} relative flex items-center justify-center`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
    >
      <motion.img
        src={imageSrc}
        alt="SliceURL Mascot"
        className="w-full h-full object-contain"
        animate={animate ? { 
          rotate: [0, -3, 3, -3, 0],
          y: [0, -4, 0]
        } : {}}
        transition={{ 
          duration: 3, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      />

      {/* Subtle monochrome particles */}
      {animate && (
        <>
          <motion.div
            className="absolute -top-2 -right-2 w-2 h-2 bg-muted-foreground/30 rounded-full"
            animate={{ 
              scale: [0, 1, 0],
              opacity: [0, 0.5, 0]
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity,
              delay: 0.2
            }}
          />
          <motion.div
            className="absolute -bottom-1 -left-3 w-1.5 h-1.5 bg-muted-foreground/20 rounded-full"
            animate={{ 
              scale: [0, 1, 0],
              opacity: [0, 0.5, 0]
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity,
              delay: 0.6
            }}
          />
          <motion.div
            className="absolute top-0 -left-2 w-1 h-1 bg-foreground/20 rounded-full"
            animate={{ 
              scale: [0, 1, 0],
              opacity: [0, 0.5, 0]
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity,
              delay: 1
            }}
          />
        </>
      )}
    </motion.div>
  );
}
