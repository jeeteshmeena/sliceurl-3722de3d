import { motion } from "framer-motion";
import { Scissors, CheckCircle2 } from "lucide-react";

interface BulkProgressProps {
  total: number;
  processed: number;
  isComplete: boolean;
}

export function BulkProgress({ total, processed, isComplete }: BulkProgressProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-8 sm:py-12 space-y-6"
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        className="relative"
      >
        {isComplete ? (
          <div className="p-5 rounded-full bg-foreground/5">
            <CheckCircle2 className="h-12 w-12 text-foreground" />
          </div>
        ) : (
          <div className="p-5 rounded-full bg-muted">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Scissors className="h-12 w-12 text-foreground" />
            </motion.div>
          </div>
        )}
      </motion.div>

      {/* Text */}
      <div className="text-center space-y-2">
        <motion.h3
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg font-semibold text-foreground"
        >
          {isComplete ? "Slicing Complete!" : "Slicing URLs..."}
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-muted-foreground"
        >
          {isComplete 
            ? `Successfully processed ${processed} URLs`
            : `Processing ${processed} of ${total} URLs`
          }
        </motion.p>
      </div>

      {/* Progress bar */}
      {!isComplete && (
        <motion.div
          initial={{ opacity: 0, width: "0%" }}
          animate={{ opacity: 1, width: "100%" }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-xs"
        >
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-foreground/70 rounded-full"
              initial={{ width: "0%" }}
              animate={{ 
                width: ["0%", "30%", "60%", "80%", "95%"],
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
        </motion.div>
      )}

      {/* Animated dots */}
      {!isComplete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-1.5"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40"
              animate={{ 
                opacity: [0.4, 1, 0.4],
                scale: [0.8, 1, 0.8]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
