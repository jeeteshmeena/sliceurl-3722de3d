import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

// Theme-isolated button for SliceBox and LittleSlice
// Does NOT inherit from global theme - uses hardcoded colors

interface IsolatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
  colorScheme?: "slicebox" | "littleslice";
}

// Hardcoded color palettes (NO theme inheritance)
// Apple Music inspired red/pink gradient theme
const SLICEBOX_COLORS = {
  primary: "#FF2D55",
  primaryHover: "#E6294D",
  primaryGradient: "linear-gradient(135deg, #FF2D55 0%, #FF6B6B 100%)",
  text: "#FFFFFF",
  textDark: "#0B0B0B",
  textSecondary: "#6B7280",
  background: "#FFFFFF",
  backgroundDark: "#1C1C1E",
  backgroundHover: "#F5F5F5",
  border: "#E8E8E8",
  accent: "#FF6B6B",
};

const LITTLESLICE_COLORS = {
  primary: "#FF2D55",
  primaryHover: "#E6294D",
  primaryGradient: "linear-gradient(135deg, #FF2D55 0%, #C644FC 100%)",
  text: "#FFFFFF",
  textDark: "#0B0B0B",
  textSecondary: "#6B7280",
  background: "#FFFFFF",
  backgroundDark: "#1C1C1E",
  backgroundHover: "#FFF5F7",
  border: "#FFE5EA",
  accent: "#C644FC",
};

const IsolatedButton = React.forwardRef<HTMLButtonElement, IsolatedButtonProps>(
  ({ 
    className, 
    variant = "primary", 
    size = "default", 
    asChild = false, 
    colorScheme = "slicebox",
    style,
    ...props 
  }, ref) => {
    const colors = colorScheme === "slicebox" ? SLICEBOX_COLORS : LITTLESLICE_COLORS;
    const Comp = asChild ? Slot : "button";

    // Build inline styles based on variant
    const getVariantStyles = (): React.CSSProperties => {
      switch (variant) {
        case "primary":
          return {
            background: colors.primaryGradient,
            color: colors.text,
            border: "none",
            boxShadow: `0 4px 14px 0 ${colors.primary}40`,
          };
        case "secondary":
          return {
            backgroundColor: colors.background,
            color: colors.textDark,
            border: `1px solid ${colors.border}`,
          };
        case "outline":
          return {
            backgroundColor: "transparent",
            color: colors.textDark,
            border: `1px solid ${colors.border}`,
          };
        case "ghost":
          return {
            backgroundColor: "transparent",
            color: colors.textDark,
            border: "none",
          };
        default:
          return {
            background: colors.primaryGradient,
            color: colors.text,
          };
      }
    };

    const getSizeClasses = () => {
      switch (size) {
        case "sm": return "h-9 px-3 text-sm rounded-lg min-h-[36px]";
        case "lg": return "h-11 px-6 text-base rounded-lg min-h-[44px]";
        case "icon": return "h-10 w-10 min-h-[44px] min-w-[44px] rounded-lg";
        default: return "h-10 px-4 py-2 text-sm rounded-lg min-h-[44px]";
      }
    };

    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
          "touch-manipulation active:scale-[0.98]",
          "hover:opacity-90",
          getSizeClasses(),
          className
        )}
        style={{
          ...getVariantStyles(),
          // Override focus ring to use hardcoded colors
          "--tw-ring-color": colors.primary,
          "--tw-ring-offset-color": colors.background,
          ...style,
        } as React.CSSProperties}
        ref={ref}
        {...props}
      />
    );
  }
);

IsolatedButton.displayName = "IsolatedButton";

export { IsolatedButton, SLICEBOX_COLORS, LITTLESLICE_COLORS };
