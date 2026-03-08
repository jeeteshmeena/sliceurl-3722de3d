import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * ThemeToggle - Sliding icon toggle for theme switching
 * 
 * Design:
 * - Left side: Moon icon (dark mode)
 * - Right side: Sun icon (light mode)  
 * - Circular knob that slides horizontally
 * - Rounded capsule background
 * 
 * Colors:
 * - Dark mode: dark background, white knob
 * - Light mode: light background, black knob
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const handleToggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        // Base capsule styles
        "relative inline-flex h-8 w-16 shrink-0 cursor-pointer items-center rounded-full p-1",
        // Transition
        "transition-colors duration-[250ms] ease-in-out",
        // Background colors
        isDark 
          ? "bg-neutral-800" 
          : "bg-neutral-200",
        // Focus styles
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      role="switch"
      aria-checked={isDark}
    >
      {/* Icons container */}
      <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
        {/* Moon icon (left) */}
        <Moon 
          className={cn(
            "h-3.5 w-3.5 transition-opacity duration-[250ms]",
            isDark 
              ? "text-neutral-400 opacity-100" 
              : "text-neutral-400 opacity-40"
          )} 
        />
        {/* Sun icon (right) */}
        <Sun 
          className={cn(
            "h-3.5 w-3.5 transition-opacity duration-[250ms]",
            isDark 
              ? "text-neutral-500 opacity-40" 
              : "text-neutral-600 opacity-100"
          )} 
        />
      </div>

      {/* Sliding knob */}
      <span
        className={cn(
          // Base knob styles
          "pointer-events-none block h-6 w-6 rounded-full shadow-sm",
          // Transition
          "transition-transform duration-[250ms] ease-in-out",
          // Position: left for dark, right for light
          isDark 
            ? "translate-x-0" 
            : "translate-x-8",
          // Knob color: white in dark mode, black in light mode
          isDark 
            ? "bg-white" 
            : "bg-neutral-900"
        )}
      />
    </button>
  );
}
