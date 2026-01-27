import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePopupManager, PopupPriority } from "@/hooks/usePopupManager";
import { useLanguage } from "@/lib/i18n";

const STORAGE_KEY = "sliceurl_pwa_prompt_dismissed";
const POPUP_ID = "pwa-install";
const SHOW_DELAY_MS = 4000;
const AUTO_HIDE_MS = 5000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const { requestPopup, releasePopup, isPopupActive } = usePopupManager();
  
  // Context safety check
  let languageContext: ReturnType<typeof useLanguage> | null = null;
  try {
    languageContext = useLanguage();
  } catch {
    // Context not available
  }
  
  const t = languageContext?.t || ((key: string) => {
    const defaults: Record<string, string> = {
      pwaInstallTitle: "Add to Home Screen",
      pwaInstallDescription: "Quick access, works offline",
      pwaInstall: "Add",
      pwaLater: "Not now",
    };
    return defaults[key] || key;
  });

  useEffect(() => {
    setMounted(true);
    setIsMobile(window.innerWidth < 640);
    
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // Check if already dismissed or installed
    const isDismissed = localStorage.getItem(STORAGE_KEY) === "true";
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    
    if (isDismissed || isStandalone) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (!deferredPrompt || !mounted) return;

    const showTimer = setTimeout(() => {
      requestPopup(POPUP_ID, PopupPriority.PWA_INSTALL);
      setShowPrompt(true);
    }, SHOW_DELAY_MS);

    return () => clearTimeout(showTimer);
  }, [deferredPrompt, mounted, requestPopup]);

  useEffect(() => {
    if (!showPrompt || !isPopupActive(POPUP_ID)) return;

    const hideTimer = setTimeout(() => {
      handleDismiss();
    }, AUTO_HIDE_MS);

    return () => clearTimeout(hideTimer);
  }, [showPrompt, isPopupActive]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem(STORAGE_KEY, "true");
    releasePopup(POPUP_ID);
  }, [releasePopup]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log("PWA install outcome:", outcome);
    
    setDeferredPrompt(null);
    handleDismiss();
  };

  if (!mounted || !showPrompt || !isPopupActive(POPUP_ID) || !deferredPrompt) {
    return null;
  }

  const content = (
    <AnimatePresence>
      {showPrompt && (
        <>
          {/* Mobile Backdrop */}
          {isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[99998] bg-foreground/30 backdrop-blur-[2px]"
              onClick={handleDismiss}
            />
          )}

          {/* Card */}
          <motion.div
            initial={isMobile 
              ? { opacity: 0, y: 100 }
              : { opacity: 0, y: 20, scale: 0.95 }
            }
            animate={isMobile 
              ? { opacity: 1, y: 0 }
              : { opacity: 1, y: 0, scale: 1 }
            }
            exit={isMobile 
              ? { opacity: 0, y: 50 }
              : { opacity: 0, y: 10, scale: 0.95 }
            }
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className={`fixed z-[99999] bg-background border border-border shadow-2xl p-5 ${
              isMobile
                ? "bottom-0 left-0 right-0 w-full px-4 pb-4 safe-bottom rounded-t-2xl rounded-b-none"
                : "bottom-4 right-4 w-[380px] rounded-2xl"
            }`}
          >
            {/* Close Button - Plain icon, no background */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 flex items-center justify-center text-foreground opacity-100 hover:opacity-70 active:scale-95 transition-all duration-150"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Content */}
            <div className="mb-5 pr-10">
              <div className="flex items-center gap-4">
                {/* Icon Box */}
                <div className="h-14 w-14 rounded-xl bg-foreground flex items-center justify-center shrink-0">
                  <Smartphone className="h-7 w-7 text-background" />
                </div>

                {/* Text */}
                <div>
                  <h4 className="text-lg font-semibold text-foreground">
                    {t("pwaInstallTitle")}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t("pwaInstallDescription")}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={handleDismiss}
                className="h-11 px-5 text-sm border-border"
              >
                {t("pwaLater")}
              </Button>
              <Button
                size="lg"
                onClick={handleInstall}
                className="h-11 px-6 text-sm font-medium bg-foreground text-background hover:bg-foreground/90 flex-1"
              >
                {t("pwaInstall")}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
