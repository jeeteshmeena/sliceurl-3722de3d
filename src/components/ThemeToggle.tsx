import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * ThemeToggle - 3-way theme toggle: Light → Dark → Maggie
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const handleCycle = () => {
    if (resolvedTheme === "light") setTheme("dark");
    else if (resolvedTheme === "dark") setTheme("maggie");
    else setTheme("light");
  };

  return (
    <button
      onClick={handleCycle}
      className={cn(
        "relative inline-flex h-8 w-16 shrink-0 cursor-pointer items-center rounded-full p-1",
        "transition-colors duration-[250ms] ease-in-out",
        resolvedTheme === "maggie"
          ? "bg-[hsl(316_68%_85%)]"
          : resolvedTheme === "dark"
            ? "bg-neutral-800"
            : "bg-neutral-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
      aria-label={`Switch theme (current: ${resolvedTheme})`}
      role="switch"
      aria-checked={resolvedTheme === "dark"}
    >
      {/* Icons container */}
      <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
        <Moon
          className={cn(
            "h-3.5 w-3.5 transition-opacity duration-[250ms]",
            resolvedTheme === "dark"
              ? "text-neutral-400 opacity-100"
              : "text-neutral-400 opacity-40"
          )}
        />
        {resolvedTheme === "maggie" ? (
          <span className="text-xs opacity-100">🩷</span>
        ) : (
          <Sun
            className={cn(
              "h-3.5 w-3.5 transition-opacity duration-[250ms]",
              resolvedTheme === "light"
                ? "text-neutral-600 opacity-100"
                : "text-neutral-500 opacity-40"
            )}
          />
        )}
      </div>

      {/* Sliding knob */}
      <span
        className={cn(
          "pointer-events-none block h-6 w-6 rounded-full shadow-sm",
          "transition-transform duration-[250ms] ease-in-out",
          resolvedTheme === "dark"
            ? "translate-x-0 bg-white"
            : resolvedTheme === "maggie"
              ? "translate-x-8 bg-[hsl(163_100%_30%)]"
              : "translate-x-8 bg-neutral-900"
        )}
      />
    </button>
  );
}
