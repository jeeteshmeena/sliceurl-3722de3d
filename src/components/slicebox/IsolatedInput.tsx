import * as React from "react";
import { cn } from "@/lib/utils";
import { SLICEBOX_COLORS, LITTLESLICE_COLORS } from "./IsolatedButton";

// Theme-isolated input for SliceBox and LittleSlice
// Does NOT inherit from global theme - uses hardcoded colors

interface IsolatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  colorScheme?: "slicebox" | "littleslice";
}

const IsolatedInput = React.forwardRef<HTMLInputElement, IsolatedInputProps>(
  ({ className, colorScheme = "slicebox", style, ...props }, ref) => {
    const colors = colorScheme === "slicebox" ? SLICEBOX_COLORS : LITTLESLICE_COLORS;

    return (
      <input
        className={cn(
          "flex h-10 w-full rounded-md px-3 py-2 text-base",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "md:text-sm",
          className
        )}
        style={{
          backgroundColor: colors.background,
          color: colors.text,
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: colors.border,
          // Placeholder color via CSS variable
          "--placeholder-color": colors.textSecondary,
          // Focus ring color
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

IsolatedInput.displayName = "IsolatedInput";

export { IsolatedInput };
