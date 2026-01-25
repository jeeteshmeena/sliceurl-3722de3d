import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scissors, AlertCircle } from "lucide-react";

interface BulkProcessingAnimationProps {
  total: number;
  processed: number;
  isComplete: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

export function BulkProcessingAnimation({ 
  total, 
  processed, 
  isComplete,
  hasError,
  errorMessage 
}: BulkProcessingAnimationProps) {
  // Smooth animated progress that continues even if backend is slow
  const [displayProgress, setDisplayProgress] = useState(0);
  const actualProgress = total > 0 ? (processed / total) * 100 : 0;
  const animationRef = useRef<number>();
  const lastUpdateRef = useRef(Date.now());
  
  // Smooth progress animation - never shows 0% frozen state
  useEffect(() => {
    // Initial bump to show activity immediately
    if (displayProgress === 0 && total > 0) {
      setDisplayProgress(2);
    }
    
    const animate = () => {
      const now = Date.now();
      const elapsed = now - lastUpdateRef.current;
      
      setDisplayProgress(current => {
        // If actual progress is ahead, catch up smoothly
        if (actualProgress > current) {
          const diff = actualProgress - current;
          const step = Math.max(0.5, diff * 0.15);
          return Math.min(actualProgress, current + step);
        }
        
        // If backend is slow, keep making tiny progress to feel responsive
        // But don't exceed 95% until we have real data
        if (current < 95 && current < actualProgress + 15) {
          return current + 0.1;
        }
        
        return current;
      });
      
      lastUpdateRef.current = now;
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [actualProgress, total]);

  // Snap to 100% when complete
  useEffect(() => {
    if (isComplete || actualProgress >= 100) {
      setDisplayProgress(100);
    }
  }, [isComplete, actualProgress]);

  const currentLink = Math.min(processed + 1, total);
  const displayPercentage = Math.round(displayProgress);

  // Generate slice segments for the URL bar
  const sliceCount = Math.min(total, 12);
  const sliceWidth = 100 / sliceCount;

  // Error state
  if (hasError) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-16 sm:py-20 space-y-6"
      >
        <motion.div 
          className="p-6 rounded-full bg-destructive/10"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <AlertCircle className="h-14 w-14 text-destructive" />
        </motion.div>
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-semibold text-foreground">Processing failed</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {errorMessage || "An error occurred while processing your URLs"}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-12 sm:py-16 space-y-10"
    >
      {/* Title */}
      <motion.div
        className="text-center space-y-2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          Slicing URLs...
        </h3>
        <motion.p
          key={currentLink}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          className="text-sm text-muted-foreground tabular-nums"
        >
          Slicing link {currentLink} of {total}
        </motion.p>
      </motion.div>

      {/* URL Slicing Animation */}
      <div className="w-full max-w-md px-6">
        <div className="relative h-16">
          {/* URL Bar Track */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-5 bg-muted/60 rounded-full overflow-hidden border border-border/30">
            {/* Slice segments */}
            <div className="absolute inset-0 flex">
              {Array.from({ length: sliceCount }).map((_, i) => {
                const segmentStart = i * sliceWidth;
                const isSliced = displayProgress >= segmentStart + sliceWidth;
                const isBeingSliced = displayProgress >= segmentStart && displayProgress < segmentStart + sliceWidth;
                
                return (
                  <motion.div
                    key={i}
                    className="h-full border-r border-border/20 last:border-r-0"
                    style={{ width: `${sliceWidth}%` }}
                    animate={{
                      backgroundColor: isSliced 
                        ? "hsl(var(--foreground) / 0.15)" 
                        : isBeingSliced 
                          ? "hsl(var(--foreground) / 0.08)"
                          : "transparent",
                    }}
                    transition={{ duration: 0.2 }}
                  />
                );
              })}
            </div>
            
            {/* Progress fill */}
            <motion.div
              className="absolute left-0 top-0 h-full bg-foreground/25 rounded-l-full"
              style={{ width: `${displayProgress}%` }}
              transition={{ duration: 0.1, ease: "linear" }}
            />
            
            {/* Shimmer effect on progress */}
            <motion.div
              className="absolute top-0 h-full w-20 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{ 
                left: ["-20%", "120%"],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </div>

          {/* Scissors blade - synced with progress */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 z-20"
            style={{ 
              left: `calc(${Math.min(Math.max(displayProgress, 2), 98)}% - 16px)`,
            }}
          >
            {/* Cutting glow effect */}
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{
                boxShadow: [
                  "0 0 8px 2px hsl(var(--foreground) / 0.1)",
                  "0 0 16px 4px hsl(var(--foreground) / 0.2)",
                  "0 0 8px 2px hsl(var(--foreground) / 0.1)",
                ],
              }}
              transition={{ duration: 0.4, repeat: Infinity }}
            />
            
            {/* Scissors icon */}
            <motion.div
              animate={{ 
                rotate: [-10, 10, -10],
                y: [-1, 1, -1],
              }}
              transition={{ 
                duration: 0.3, 
                repeat: Infinity, 
                ease: "easeInOut",
              }}
              className="relative"
            >
              <div className="p-2 rounded-full bg-background border border-border/50 shadow-lg">
                <Scissors className="h-5 w-5 text-foreground" />
              </div>
            </motion.div>

            {/* Micro slice particles */}
            <AnimatePresence>
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={`particle-${i}-${Math.floor(displayProgress / 10)}`}
                  className="absolute top-1/2 left-full"
                  initial={{ opacity: 0, x: 0, y: 0, scale: 1 }}
                  animate={{ 
                    opacity: [0.6, 0],
                    x: [4, 20 + i * 8],
                    y: [0, (i - 1) * 12],
                    scale: [1, 0.5],
                  }}
                  transition={{
                    duration: 0.6,
                    delay: i * 0.1,
                    ease: "easeOut",
                  }}
                >
                  <div className="w-2 h-0.5 bg-muted-foreground/40 rounded-full" />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Cut pieces falling animation */}
          <div className="absolute -bottom-3 left-0 right-0 h-8 overflow-hidden pointer-events-none">
            <AnimatePresence>
              {Array.from({ length: Math.min(Math.floor(displayProgress / 15), 6) }).map((_, i) => (
                <motion.div
                  key={`piece-${i}`}
                  className="absolute h-1.5 rounded-full bg-muted-foreground/20"
                  style={{ 
                    width: 12 + (i % 3) * 8,
                    left: `${10 + i * 14}%`,
                  }}
                  initial={{ y: -8, opacity: 0, rotate: 0 }}
                  animate={{ 
                    y: [0, 16],
                    opacity: [0.5, 0],
                    rotate: [0, 15 + i * 5],
                  }}
                  transition={{
                    duration: 1,
                    delay: i * 0.2,
                    ease: "easeOut",
                  }}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-xs px-6"
      >
        <div className="relative h-2 bg-muted/50 rounded-full overflow-hidden border border-border/20">
          {/* Progress fill with smooth animation */}
          <motion.div
            className="h-full bg-foreground/60 rounded-full relative overflow-hidden"
            style={{ width: `${displayProgress}%` }}
            transition={{ duration: 0.1, ease: "linear" }}
          >
            {/* Shimmer on progress bar */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </motion.div>
        </div>
        
        {/* Percentage */}
        <motion.p 
          className="text-lg font-semibold text-foreground text-center mt-4 tabular-nums"
          key={displayPercentage}
        >
          {displayPercentage}%
        </motion.p>
      </motion.div>

      {/* Pulsing activity indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-1.5"
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50"
            animate={{ 
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}
