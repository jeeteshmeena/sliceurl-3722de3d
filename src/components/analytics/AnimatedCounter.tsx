import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  formatFn?: (value: number) => string;
}

export function AnimatedCounter({ 
  value, 
  duration = 1.5, 
  className = "",
  formatFn = (v) => v.toLocaleString()
}: AnimatedCounterProps) {
  const spring = useSpring(0, { 
    mass: 1, 
    stiffness: 75, 
    damping: 15,
    duration: duration * 1000
  });

  const display = useTransform(spring, (current) => formatFn(Math.round(current)));
  const [displayValue, setDisplayValue] = useState(formatFn(0));

  useEffect(() => {
    spring.set(value);
    
    const unsubscribe = display.on("change", (v) => {
      setDisplayValue(v);
    });

    return () => unsubscribe();
  }, [value, spring, display]);

  return (
    <motion.span 
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {displayValue}
    </motion.span>
  );
}

// Percentage counter with suffix
export function AnimatedPercentage({ 
  value, 
  className = "" 
}: { 
  value: number; 
  className?: string 
}) {
  return (
    <AnimatedCounter
      value={value}
      className={className}
      formatFn={(v) => `${v.toFixed(1)}%`}
    />
  );
}
