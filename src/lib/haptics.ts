/**
 * Haptic feedback utility for mobile devices
 * Only triggers on supported mobile devices
 */

export const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  // Check if vibration API is supported and we're on mobile
  if (typeof navigator === 'undefined') return;
  if (!navigator.vibrate) return;
  
  // Check if it's a mobile device (touch-capable)
  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isMobile) return;

  // Vibration duration based on style
  const durations: Record<typeof style, number> = {
    light: 10,   // Very subtle micro-pulse
    medium: 25,  // Noticeable but not distracting
    heavy: 50,   // Strong feedback
  };

  try {
    navigator.vibrate(durations[style]);
  } catch {
    // Silently fail if vibration is blocked
  }
};
