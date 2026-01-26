import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

/**
 * TextSwitch - Toggle with ON/OFF text inside background
 * 
 * Design:
 * - ON state: Black background (#000000), white knob, "ON" text visible
 * - OFF state: Light grey background (#E5E5E5), white knob, "OFF" text visible
 * - Knob slides horizontally with smooth animation
 */
const TextSwitch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      // Base styles - wider to accommodate text
      "peer relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full",
      // Transition
      "transition-colors duration-[250ms] ease-in-out",
      // OFF state: light grey background
      "data-[state=unchecked]:bg-[#E5E5E5]",
      // ON state: black background
      "data-[state=checked]:bg-[#000000]",
      // Focus styles
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      // Disabled styles
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
    ref={ref}
  >
    {/* Text container */}
    <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none text-[10px] font-medium uppercase tracking-wide">
      {/* ON text (left side, visible when checked) */}
      <span
        className={cn(
          "transition-opacity duration-[250ms] ml-0.5",
          "data-[state=checked]:opacity-100 data-[state=unchecked]:opacity-0"
        )}
        data-state={props.checked ? "checked" : "unchecked"}
        style={{ color: "rgba(255,255,255,0.7)" }}
      >
        ON
      </span>
      {/* OFF text (right side, visible when unchecked) */}
      <span
        className={cn(
          "transition-opacity duration-[250ms] mr-0.5",
          "data-[state=checked]:opacity-0 data-[state=unchecked]:opacity-100"
        )}
        data-state={props.checked ? "checked" : "unchecked"}
        style={{ color: "rgba(100,100,100,0.8)" }}
      >
        OFF
      </span>
    </div>

    {/* Sliding knob */}
    <SwitchPrimitives.Thumb
      className={cn(
        // Base styles
        "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm ring-0",
        // Transition
        "transition-transform duration-[250ms] ease-in-out",
        // Position: left when OFF, right when ON
        "data-[state=unchecked]:translate-x-1 data-[state=checked]:translate-x-8"
      )}
    />
  </SwitchPrimitives.Root>
));
TextSwitch.displayName = "TextSwitch";

export { TextSwitch };
