import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Language, 
  languageNames, 
  rtlLanguages, 
  countryToLanguage,
  languageSuggestionText,
  languageFlags
} from "./translations";
import { en } from "./translations/en";
import { hinglish } from "./translations/hinglish";
import { hi } from "./translations/hi";
import { ta } from "./translations/ta";
import { te } from "./translations/te";
import { or } from "./translations/or";
import { fr } from "./translations/fr";
import { de } from "./translations/de";
import { es } from "./translations/es";
import { pt } from "./translations/pt";
import { it } from "./translations/it";
import { ru } from "./translations/ru";
import { ar } from "./translations/ar";
import { ja } from "./translations/ja";
import { ko } from "./translations/ko";
import { zh } from "./translations/zh";
import { id } from "./translations/id";
import { tr } from "./translations/tr";

export type { Language };
export { languageNames, rtlLanguages, languageSuggestionText, languageFlags };

const translations: Record<Language, Record<string, string>> = {
  en, hinglish, hi, ta, te, or, fr, de, es, pt, it, ru, ar, ja, ko, zh, id, tr
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
  suggestedLanguage: Language | null;
  detectedSource: string | null;
  dismissSuggestion: () => void;
  applySuggestion: () => void;
}

const STORAGE_KEYS = {
  SELECTED: "sliceurl_language_selected",
  DETECTED: "sliceurl_detected_language",
  POPUP_DISMISSED: "sliceurl_language_popup_dismissed",
};

const defaultContext: LanguageContextType = {
  language: "en",
  setLanguage: () => {},
  t: (key: string) => key,
  isRTL: false,
  suggestedLanguage: null,
  detectedSource: null,
  dismissSuggestion: () => {},
  applySuggestion: () => {},
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function detectBrowserLanguage(): Language | null {
  const browserLangs = navigator.languages || [navigator.language];
  for (const lang of browserLangs) {
    const code = lang.split("-")[0].toLowerCase();
    if (code in translations) return code as Language;
    // Indian regional language fallbacks
    if (["bn", "mr", "gu", "pa", "kn", "ml"].includes(code)) return "hi";
  }
  return null;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.SELECTED);
    return (stored as Language) || "en";
  });
  const [suggestedLanguage, setSuggestedLanguage] = useState<Language | null>(null);
  const [detectedSource, setDetectedSource] = useState<string | null>(null);

  const isRTL = rtlLanguages.includes(language);

  // Apply RTL and lang attribute
  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language, isRTL]);

  // Load language from profile when user logs in
  useEffect(() => {
    if (user) {
      loadLanguageFromProfile();
    }
  }, [user?.id]);

  // Auto-detect language on mount
  useEffect(() => {
    const hasSelected = localStorage.getItem(STORAGE_KEYS.SELECTED);
    const popupDismissed = localStorage.getItem(STORAGE_KEYS.POPUP_DISMISSED);
    
    if (hasSelected || popupDismissed) return;

    // Check URL param first
    const params = new URLSearchParams(window.location.search);
    const langParam = params.get("lang");
    if (langParam && langParam in translations) {
      setLanguage(langParam as Language);
      return;
    }

    // Multi-signal detection
    const runDetection = async () => {
      // 1. Try Geo-IP detection first (highest confidence for non-English)
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/detect-geo`,
          {
            headers: {
              "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
          }
        );
        const geoData = await response.json();
        
        if (geoData.language && geoData.language !== "en" && geoData.language in translations) {
          setSuggestedLanguage(geoData.language as Language);
          setDetectedSource("geo-ip");
          localStorage.setItem(STORAGE_KEYS.DETECTED, geoData.language);
          return;
        }
      } catch (error) {
        console.warn("Geo-IP detection failed:", error);
      }

      // 2. Fallback to browser language detection
      const detected = detectBrowserLanguage();
      if (detected && detected !== "en" && detected !== language) {
        setSuggestedLanguage(detected);
        setDetectedSource("browser");
        localStorage.setItem(STORAGE_KEYS.DETECTED, detected);
      }
    };

    runDetection();
  }, []);

  const loadLanguageFromProfile = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("language")
        .eq("user_id", user.id)
        .single();
      
      if (data?.language && data.language in translations) {
        setLanguageState(data.language as Language);
        localStorage.setItem(STORAGE_KEYS.SELECTED, data.language);
      }
    } catch (error) {
      console.error("Error loading language preference:", error);
    }
  };

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEYS.SELECTED, lang);
    localStorage.setItem(STORAGE_KEYS.POPUP_DISMISSED, "true");
    setSuggestedLanguage(null);
    
    if (user) {
      try {
        await supabase
          .from("profiles")
          .update({ language: lang, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);
      } catch (error) {
        console.error("Error saving language preference:", error);
      }
    }
  }, [user]);

  const dismissSuggestion = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.POPUP_DISMISSED, "true");
    setSuggestedLanguage(null);
  }, []);

  const applySuggestion = useCallback(() => {
    if (suggestedLanguage) {
      setLanguage(suggestedLanguage);
    }
  }, [suggestedLanguage, setLanguage]);

  const t = useCallback((key: string): string => {
    return translations[language]?.[key] || translations.en[key] || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      t, 
      isRTL,
      suggestedLanguage,
      detectedSource,
      dismissSuggestion,
      applySuggestion
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    console.warn("useLanguage called outside LanguageProvider, using defaults");
    return defaultContext;
  }
  return context;
};
