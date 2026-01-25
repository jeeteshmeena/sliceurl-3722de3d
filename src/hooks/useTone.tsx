import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/lib/i18n";
import { Tone, getRandomTone, getGreeting, getHeroDesc } from "@/lib/tones";

/**
 * Hook for managing dynamic tone-based content
 * Provides greeting and hero description based on selected tone and language
 * Tone is session-stable (randomly selected on mount, persists until refresh)
 */
export function useTone() {
  const { language } = useLanguage();
  
  // Session-stable tone - selected once on mount
  const [tone] = useState<Tone>(() => getRandomTone());
  
  const greeting = useMemo(() => getGreeting(language, tone), [language, tone]);
  const heroDesc = useMemo(() => getHeroDesc(language, tone), [language, tone]);
  
  return {
    tone,
    greeting,
    heroDesc,
  };
}
