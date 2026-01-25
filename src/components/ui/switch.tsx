import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

/**
 * Standardized Toggle Switch Component
 * 
 * Visual specification (LOCKED):
 * - Track size: h-6 w-11 (24px × 44px)
 * - Thumb size: h-5 w-5 (20px × 20px)
 * - Transition: 180ms ease-in-out
 * 
 * OFF state (unchecked):
 * - Light theme: gray track (#D1D5DB), white knob
 * - Dark theme: dark gray track (#374151), white knob
 * - Knob position: LEFT (translate-x-0)
 * 
 * ON state (checked):
 * - Light theme: black track (#171717), white knob
 * - Dark theme: white track (#FAFAFA), black knob  
 * - Knob position: RIGHT (translate-x-5)
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      // Base styles
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent",
      // Transition
      "transition-colors duration-[180ms] ease-in-out",
      // OFF state: gray track
      "data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-700",
      // ON state: inverted (black in light, white in dark)
      "data-[state=checked]:bg-neutral-900 dark:data-[state=checked]:bg-neutral-100",
      // Focus styles
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      // Disabled styles
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        // Base styles - NO shadow, NO glow, NO blur per spec
        "pointer-events-none block h-5 w-5 rounded-full ring-0",
        // Transition
        "transition-all duration-[180ms] ease-in-out",
        // Position: left when OFF, right when ON
        "data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-5",
        // Thumb color: white in light, white OFF / black ON in dark
        "bg-white",
        "dark:data-[state=unchecked]:bg-white dark:data-[state=checked]:bg-black",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
