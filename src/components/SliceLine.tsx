import { motion } from "framer-motion";

export function SliceLine() {
  return (
    <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden">
      {/* Animated gradient */}
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: "200%" }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
          repeatDelay: 1,
        }}
        className="absolute inset-y-0 w-1/3"
        style={{
          background: "linear-gradient(90deg, transparent, hsl(var(--foreground) / 0.4), hsl(var(--foreground) / 0.6), hsl(var(--foreground) / 0.4), transparent)",
        }}
      />
      {/* Static subtle line */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
    </div>
  );
}
