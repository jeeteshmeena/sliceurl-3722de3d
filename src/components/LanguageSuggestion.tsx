import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useLanguage, languageSuggestionText, languageFlags, Language } from "@/lib/i18n";
import { usePopupManager, PopupPriority } from "@/hooks/usePopupManager";

const POPUP_ID = "language-suggestion";
const AUTO_DISMISS_MS = 6000;

export function LanguageSuggestion() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const autoHideTimer = useRef<NodeJS.Timeout | null>(null);
  const remainingTime = useRef(AUTO_DISMISS_MS);
  const pauseStartTime = useRef<number | null>(null);

  const { requestPopup, releasePopup, isPopupActive } = usePopupManager();

  // Context safety check
  let languageContext: ReturnType<typeof useLanguage> | null = null;
  try {
    languageContext = useLanguage();
  } catch {
    // Context not available
  }

  if (!languageContext) return null;

  const { 
    language, 
    suggestedLanguage, 
    dismissSuggestion, 
    applySuggestion 
  } = languageContext;

  useEffect(() => {
    setMounted(true);
    setIsMobile(window.innerWidth < 640);
    
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const startAutoHideTimer = useCallback((duration: number) => {
    if (autoHideTimer.current) {
      clearTimeout(autoHideTimer.current);
    }
    autoHideTimer.current = setTimeout(() => {
      handleDismiss();
    }, duration);
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    if (autoHideTimer.current) {
      clearTimeout(autoHideTimer.current);
    }
    setTimeout(() => {
      dismissSuggestion();
      releasePopup(POPUP_ID);
    }, 200);
  }, [dismissSuggestion, releasePopup]);

  const handleApply = useCallback(() => {
    setVisible(false);
    if (autoHideTimer.current) {
      clearTimeout(autoHideTimer.current);
    }
    setTimeout(() => {
      applySuggestion();
      releasePopup(POPUP_ID);
    }, 200);
  }, [applySuggestion, releasePopup]);

  useEffect(() => {
    if (!suggestedLanguage || !mounted || suggestedLanguage === language) return;

    const showTimer = setTimeout(() => {
      requestPopup(POPUP_ID, PopupPriority.LANGUAGE_SUGGESTION);
      setVisible(true);
      remainingTime.current = AUTO_DISMISS_MS;
      startAutoHideTimer(AUTO_DISMISS_MS);
    }, 300);

    return () => {
      clearTimeout(showTimer);
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current);
      }
    };
  }, [suggestedLanguage, mounted, language, requestPopup, startAutoHideTimer]);

  const handlePause = () => {
    if (autoHideTimer.current) {
      clearTimeout(autoHideTimer.current);
    }
    pauseStartTime.current = Date.now();
    setIsPaused(true);
  };

  const handleResume = () => {
    if (pauseStartTime.current) {
      const elapsed = Date.now() - pauseStartTime.current;
      remainingTime.current = Math.max(0, remainingTime.current - elapsed);
    }
    pauseStartTime.current = null;
    setIsPaused(false);
    
    if (remainingTime.current > 0) {
      startAutoHideTimer(remainingTime.current);
    } else {
      handleDismiss();
    }
  };

  if (!visible || !isPopupActive(POPUP_ID) || !suggestedLanguage) {
    return null;
  }

  const suggestionText = languageSuggestionText[suggestedLanguage as Language];
  const flag = languageFlags[suggestedLanguage as Language] || "🌐";
  const isRTL = suggestedLanguage === "ar";

  if (!suggestionText) return null;

  const content = (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className={`fixed z-[99999] ${
            isMobile
              ? "bottom-4 left-4 right-4"
              : isRTL
                ? "bottom-5 left-5 w-[340px]"
                : "bottom-5 right-5 w-[340px]"
          }`}
          dir={isRTL ? "rtl" : "ltr"}
          role="alertdialog"
          onMouseEnter={handlePause}
          onMouseLeave={handleResume}
          onTouchStart={handlePause}
          onTouchEnd={handleResume}
        >
          <div className="relative overflow-hidden bg-background border border-border rounded-2xl shadow-lg shadow-black/5 dark:shadow-black/20">
            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className={`absolute top-3 ${isRTL ? "left-3" : "right-3"} h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted/80 transition-colors duration-150`}
            >
              <X className="h-3.5 w-3.5" />
            </button>

            {/* Content */}
            <div className="p-4">
              {/* Header Row */}
              <div className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                {/* Flag Container */}
                <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-2xl shrink-0">
                  {flag}
                </div>

                {/* Text Container */}
                <div className={`flex-1 min-w-0 ${isRTL ? "pr-1" : "pl-1"}`}>
                  <h4 className={`text-sm font-semibold text-foreground leading-tight ${isRTL ? "text-right" : ""}`}>
                    {suggestionText.title}
                  </h4>
                  <p className={`text-xs text-muted-foreground mt-0.5 leading-relaxed ${isRTL ? "text-right" : ""}`}>
                    {suggestionText.subtitle}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className={`flex items-center gap-2 mt-3.5 ${isRTL ? "flex-row-reverse" : ""}`}>
                <button
                  onClick={handleApply}
                  className="flex-1 h-9 px-4 text-xs font-medium bg-foreground text-background hover:bg-foreground/90 rounded-lg transition-colors duration-150"
                >
                  {suggestionText.action}
                </button>
                <button
                  onClick={handleDismiss}
                  className="h-9 px-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors duration-150"
                >
                  {suggestionText.dismiss}
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            {!isPaused && (
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: AUTO_DISMISS_MS / 1000, ease: "linear" }}
                className="absolute bottom-0 left-0 h-0.5 bg-foreground/10"
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
