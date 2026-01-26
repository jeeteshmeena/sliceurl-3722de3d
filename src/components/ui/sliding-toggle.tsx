import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";

interface SlidingToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

/**
 * SlidingToggle - Matches ThemeToggle design exactly
 * 
 * Design:
 * - Same size as ThemeToggle (h-8 w-16)
 * - Same knob size (h-6 w-6)
 * - Circular sliding knob
 * - Rounded capsule background
 * 
 * Colors (matching ThemeToggle):
 * - Dark mode: dark background, white knob
 * - Light mode: light background, black knob
 */
export function SlidingToggle({
  checked,
  onCheckedChange,
  id,
  disabled = false,
  className,
  "aria-label": ariaLabel,
}: SlidingToggleProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const handleToggle = () => {
    if (!disabled) {
      onCheckedChange(!checked);
    }
  };

  return (
    <button
      id={id}
      onClick={handleToggle}
      disabled={disabled}
      className={cn(
        // Base capsule styles - EXACT same as ThemeToggle
        "relative inline-flex h-8 w-16 shrink-0 cursor-pointer items-center rounded-full p-1",
        // Transition
        "transition-colors duration-[250ms] ease-in-out",
        // Background colors - same as ThemeToggle
        isDark 
          ? "bg-neutral-800" 
          : "bg-neutral-200",
        // Disabled state
        disabled && "opacity-50 cursor-not-allowed",
        // Focus styles
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
      aria-label={ariaLabel}
      role="switch"
      aria-checked={checked}
      type="button"
    >
      {/* ON/OFF text inside capsule */}
      <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
        <span 
          className={cn(
            "text-[10px] font-medium transition-opacity duration-[250ms]",
            checked 
              ? (isDark ? "text-neutral-400 opacity-100" : "text-neutral-500 opacity-100")
              : "opacity-0"
          )}
        >
          ON
        </span>
        <span 
          className={cn(
            "text-[10px] font-medium transition-opacity duration-[250ms]",
            !checked 
              ? (isDark ? "text-neutral-500 opacity-100" : "text-neutral-500 opacity-100")
              : "opacity-0"
          )}
        >
          OFF
        </span>
      </div>

      {/* Sliding knob - EXACT same as ThemeToggle */}
      <span
        className={cn(
          // Base knob styles - same size as ThemeToggle
          "pointer-events-none block h-6 w-6 rounded-full shadow-sm",
          // Transition
          "transition-transform duration-[250ms] ease-in-out",
          // Position: left when OFF, right when ON
          checked 
            ? "translate-x-8" 
            : "translate-x-0",
          // Knob color: white in dark mode, black in light mode (same as ThemeToggle)
          isDark 
            ? "bg-white" 
            : "bg-neutral-900"
        )}
      />
    </button>
  );
}
