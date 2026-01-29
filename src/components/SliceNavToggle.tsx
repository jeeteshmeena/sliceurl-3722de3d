import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * SliceNavToggle - Navigation toggle between SliceBox and LittleSlice
 * 
 * Design: Matches ThemeToggle exactly (same dimensions, animation, style)
 * but uses text labels instead of icons
 */
export function SliceNavToggle() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isLittleSlice = location.pathname === "/littleslice";

  const handleToggle = () => {
    navigate(isLittleSlice ? "/slicebox" : "/littleslice", { replace: true });
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        // Base capsule styles - matches ThemeToggle
        "relative inline-flex h-8 w-[140px] shrink-0 cursor-pointer items-center rounded-full p-1",
        // Transition
        "transition-colors duration-[250ms] ease-in-out",
        // Background: Apple Music gradient style
        isLittleSlice 
          ? "bg-gradient-to-r from-[#FF2D55] to-[#C644FC]" 
          : "bg-gradient-to-r from-[#FF2D55] to-[#FF6B6B]",
        // Focus styles
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
      aria-label={`Switch to ${isLittleSlice ? "SliceBox" : "LittleSlice"}`}
      role="switch"
      aria-checked={isLittleSlice}
    >
      {/* Labels container */}
      <div className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none">
        {/* SliceBox label (left) */}
        <span 
          className={cn(
            "text-[10px] font-semibold transition-opacity duration-[250ms] z-10",
            !isLittleSlice 
              ? "opacity-0" 
              : "opacity-80 text-white"
          )}
        >
          SliceBox
        </span>
        {/* LittleSlice label (right) */}
        <span 
          className={cn(
            "text-[10px] font-semibold transition-opacity duration-[250ms] z-10",
            isLittleSlice 
              ? "opacity-0" 
              : "opacity-80 text-white"
          )}
        >
          LittleSlice
        </span>
      </div>

      {/* Sliding knob with label */}
      <span
        className={cn(
          // Base knob styles
          "pointer-events-none flex items-center justify-center h-6 rounded-full shadow-sm px-2",
          // Transition
          "transition-all duration-[250ms] ease-in-out",
          // Knob color
          "bg-white",
          // Position and width based on active state
          isLittleSlice 
            ? "translate-x-[72px] w-[60px]" 
            : "translate-x-0 w-[56px]"
        )}
      >
        <span className="text-[10px] font-bold text-[#0B0B0B] whitespace-nowrap">
          {isLittleSlice ? "LittleSlice" : "SliceBox"}
        </span>
      </span>
    </button>
  );
}
