import { useTheme } from "@/lib/theme";
import { motion, Variants, Easing } from "framer-motion";

interface SliceBuddyProps {
  size?: "sm" | "md" | "lg";
  isSlicing?: boolean;
  isActive?: boolean;
  hasError?: boolean;
  isLoading?: boolean;
  clickable?: boolean;
  onClick?: () => void;
}

// Size increased by ~25% from original
const sizeConfig = {
  sm: { width: 70, height: 35, scale: 0.875 },
  md: { width: 100, height: 50, scale: 1.25 },
  lg: { width: 130, height: 65, scale: 1.625 },
};

const easeOut: Easing = [0.0, 0.0, 0.2, 1];
const bouncyEase: Easing = [0.34, 1.56, 0.64, 1];

/**
 * SliceBuddy - Static Link Chain Mascot
 * Two rounded chain-link segments with diagonal slice gap
 * ONLY animation: slice animation on successful shorten (isActive=true)
 */
export function SliceBuddy({
  size = "md",
  isSlicing = false,
  isActive = false,
  clickable = false,
  onClick,
}: SliceBuddyProps) {
  const config = sizeConfig[size];
  const { resolvedTheme } = useTheme();

  // Theme-aware colors
  const primaryColor = "hsl(var(--foreground))";
  const holeColor = "hsl(var(--background))";
  const shadowColor = resolvedTheme === "dark" 
    ? "rgba(255,255,255,0.03)" 
    : "rgba(0,0,0,0.05)";

  // Animation variants for slice effect - ONLY on successful shorten
  const leftLinkVariants: Variants = {
    idle: { x: 0, rotate: 0 },
    slicing: { 
      x: -8, 
      rotate: -3,
      transition: { duration: 0.2, ease: easeOut }
    },
    active: {
      x: [-8, 0],
      rotate: [-3, 0],
      transition: { 
        duration: 0.4, 
        ease: bouncyEase,
        delay: 0.1
      }
    }
  };

  const rightLinkVariants: Variants = {
    idle: { x: 0, rotate: 0 },
    slicing: { 
      x: 8, 
      rotate: 3,
      transition: { duration: 0.2, ease: easeOut }
    },
    active: {
      x: [8, 0],
      rotate: [3, 0],
      transition: { 
        duration: 0.4, 
        ease: bouncyEase,
        delay: 0.1
      }
    }
  };

  // Determine animation state
  const animationState = isSlicing ? "slicing" : isActive ? "active" : "idle";

  return (
    <div
      className={`relative flex items-center justify-center ${clickable ? "cursor-pointer" : ""}`}
      style={{ 
        width: config.width, 
        height: config.height,
        transform: `scale(${config.scale})`
      }}
      onClick={clickable ? onClick : undefined}
    >
      <svg 
        width={80} 
        height={40} 
        viewBox="0 0 80 40"
        className="overflow-visible"
      >
        {/* Soft shadow ellipse at bottom */}
        <ellipse
          cx={40}
          cy={39}
          rx={28}
          ry={2}
          fill={shadowColor}
        />

        {/* Left chain link group - animated */}
        <motion.g 
          style={{ transformOrigin: "20px 18px" }}
          variants={leftLinkVariants}
          animate={animationState}
        >
          {/* Left link body */}
          <rect
            x={2}
            y={4}
            width={36}
            height={28}
            rx={14}
            fill={primaryColor}
          />
          {/* Left inner hole */}
          <rect
            x={10}
            y={11}
            width={16}
            height={14}
            rx={7}
            fill={holeColor}
          />
          {/* Left connection bridge */}
          <rect
            x={32}
            y={12}
            width={8}
            height={12}
            rx={3}
            fill={primaryColor}
          />
        </motion.g>

        {/* Right chain link group - animated */}
        <motion.g 
          style={{ transformOrigin: "60px 18px" }}
          variants={rightLinkVariants}
          animate={animationState}
        >
          {/* Right link body */}
          <rect
            x={42}
            y={4}
            width={36}
            height={28}
            rx={14}
            fill={primaryColor}
          />
          {/* Right inner hole */}
          <rect
            x={54}
            y={11}
            width={16}
            height={14}
            rx={7}
            fill={holeColor}
          />
          {/* Right connection bridge */}
          <rect
            x={40}
            y={12}
            width={8}
            height={12}
            rx={3}
            fill={primaryColor}
          />
        </motion.g>

        {/* Diagonal slice line */}
        <line
          x1={39}
          y1={2}
          x2={41}
          y2={34}
          stroke={holeColor}
          strokeWidth={4}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
