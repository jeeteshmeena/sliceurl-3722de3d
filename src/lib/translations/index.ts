// Translation exports - organized by language
export { en } from './en';
export { hi } from './hi';
export { zh } from './zh';
export { ta } from './ta';
export { te } from './te';
export { or } from './or';
export { fr } from './fr';
export { de } from './de';
export { es } from './es';
export { pt } from './pt';
export { ar } from './ar';
export { ru } from './ru';
export { ja } from './ja';
export { ko } from './ko';
export { it } from './it';
export { id } from './id';
export { tr } from './tr';
export { hinglish } from './hinglish';

// Language type
export type Language = 
  | "en" | "hinglish" | "hi" | "ta" | "te" | "or" 
  | "fr" | "de" | "es" | "pt" | "it" | "ru" 
  | "ar" | "ja" | "ko" | "zh" | "id" | "tr";

// Language metadata - display names in native script
export const languageNames: Record<Language, string> = {
  en: "English",
  hi: "हिन्दी",
  hinglish: "Hinglish",
  zh: "中文",
  ta: "தமிழ்",
  te: "తెలుగు",
  or: "ଓଡ଼ିଆ",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  pt: "Português",
  ar: "العربية",
  ru: "Русский",
  ja: "日本語",
  ko: "한국어",
  it: "Italiano",
  id: "Bahasa Indonesia",
  tr: "Türkçe",
};

// Country to language mapping for Geo-IP detection
export const countryToLanguage: Record<string, Language> = {
  US: "en", GB: "en", AU: "en", CA: "en", NZ: "en", IE: "en",
  IN: "hi",
  CN: "zh", TW: "zh", HK: "zh", SG: "zh",
  FR: "fr", BE: "fr", CH: "fr", LU: "fr", MC: "fr",
  DE: "de", AT: "de", LI: "de",
  ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es",
  PT: "pt", BR: "pt", AO: "pt", MZ: "pt",
  SA: "ar", AE: "ar", EG: "ar", MA: "ar", DZ: "ar", IQ: "ar", SY: "ar", 
  JO: "ar", LB: "ar", KW: "ar", QA: "ar", BH: "ar", OM: "ar", YE: "ar", 
  LY: "ar", TN: "ar", SD: "ar",
  RU: "ru", BY: "ru", KZ: "ru", KG: "ru", TJ: "ru",
  JP: "ja",
  KR: "ko", KP: "ko",
  IT: "it", SM: "it", VA: "it",
  ID: "id",
  TR: "tr", CY: "tr",
  LK: "ta",
};

// RTL languages array
export const rtlLanguages: Language[] = ["ar"];

// Language suggestion popup text (in each language's native script)
export const languageSuggestionText: Record<Language, { 
  title: string; 
  subtitle: string; 
  action: string; 
  dismiss: string; 
}> = {
  en: { 
    title: "Switch to English?", 
    subtitle: "We noticed your preferred language.",
    action: "Switch", 
    dismiss: "Not now" 
  },
  hinglish: { 
    title: "Hinglish mein switch karna hai?", 
    subtitle: "Humne aapki language detect kar li.",
    action: "Switch karo", 
    dismiss: "Abhi nahi" 
  },
  hi: { 
    title: "हिन्दी में बदलें?", 
    subtitle: "हमने आपकी भाषा पहचान ली।",
    action: "बदलें", 
    dismiss: "अभी नहीं" 
  },
  zh: { 
    title: "切换到中文？", 
    subtitle: "我们检测到您的语言。",
    action: "切换", 
    dismiss: "稍后" 
  },
  ta: { 
    title: "தமிழுக்கு மாற்றவா?", 
    subtitle: "உங்கள் மொழியை கண்டறிந்தோம்.",
    action: "மாற்று", 
    dismiss: "பின்னர்" 
  },
  te: { 
    title: "తెలుగులోకి మారాలా?", 
    subtitle: "మీ భాషను గుర్తించాము.",
    action: "మారండి", 
    dismiss: "తర్వాత" 
  },
  or: { 
    title: "ଓଡ଼ିଆକୁ ବଦଳାନ୍ତୁ?", 
    subtitle: "ଆମେ ଆପଣଙ୍କ ଭାଷା ଚିହ୍ନଟ କଲୁ।",
    action: "ବଦଳାନ୍ତୁ", 
    dismiss: "ପରେ" 
  },
  fr: { 
    title: "Passer en français ?", 
    subtitle: "Nous avons détecté votre langue.",
    action: "Changer", 
    dismiss: "Plus tard" 
  },
  de: { 
    title: "Zu Deutsch wechseln?", 
    subtitle: "Wir haben Ihre Sprache erkannt.",
    action: "Wechseln", 
    dismiss: "Später" 
  },
  es: { 
    title: "¿Cambiar a español?", 
    subtitle: "Detectamos tu idioma.",
    action: "Cambiar", 
    dismiss: "Ahora no" 
  },
  pt: { 
    title: "Mudar para português?", 
    subtitle: "Detectamos seu idioma.",
    action: "Mudar", 
    dismiss: "Agora não" 
  },
  ar: { 
    title: "التبديل إلى العربية؟", 
    subtitle: "لقد اكتشفنا لغتك.",
    action: "تبديل", 
    dismiss: "لاحقًا" 
  },
  ru: { 
    title: "Переключиться на русский?", 
    subtitle: "Мы определили ваш язык.",
    action: "Переключить", 
    dismiss: "Позже" 
  },
  ja: { 
    title: "日本語に切り替えますか？", 
    subtitle: "言語を検出しました。",
    action: "切り替える", 
    dismiss: "後で" 
  },
  ko: { 
    title: "한국어로 전환할까요?", 
    subtitle: "언어가 감지되었습니다.",
    action: "전환", 
    dismiss: "나중에" 
  },
  it: { 
    title: "Passare all'italiano?", 
    subtitle: "Abbiamo rilevato la tua lingua.",
    action: "Cambia", 
    dismiss: "Non ora" 
  },
  id: { 
    title: "Ganti ke Bahasa Indonesia?", 
    subtitle: "Kami mendeteksi bahasa Anda.",
    action: "Ganti", 
    dismiss: "Nanti saja" 
  },
  tr: { 
    title: "Türkçeye geçilsin mi?", 
    subtitle: "Dilinizi algıladık.",
    action: "Değiştir", 
    dismiss: "Sonra" 
  },
};

// Country flag mapping
export const languageFlags: Record<Language, string> = {
  en: "🇬🇧",
  hi: "🇮🇳",
  hinglish: "🇮🇳",
  fr: "🇫🇷",
  de: "🇩🇪",
  es: "🇪🇸",
  pt: "🇵🇹",
  it: "🇮🇹",
  ru: "🇷🇺",
  ar: "🇸🇦",
  ja: "🇯🇵",
  ko: "🇰🇷",
  zh: "🇨🇳",
  id: "🇮🇩",
  tr: "🇹🇷",
  ta: "🇮🇳",
  te: "🇮🇳",
  or: "🇮🇳",
};
