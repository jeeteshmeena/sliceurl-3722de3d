import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePopupManager, PopupPriority } from "@/hooks/usePopupManager";

const POPUP_ID = "cookie-consent";
const STORAGE_KEY = "cookie-consent-accepted";
const SHOW_DELAY_MS = 2000; // Show after 2 seconds

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const { requestPopup, releasePopup, isPopupActive } = usePopupManager();

  // Check if already consented
  const hasConsented = typeof localStorage !== "undefined" && 
    localStorage.getItem(STORAGE_KEY) !== null;

  useEffect(() => {
    if (hasConsented) return;

    const timer = setTimeout(() => {
      requestPopup(POPUP_ID, PopupPriority.COOKIE_CONSENT);
      setIsVisible(true);
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, [hasConsented, requestPopup]);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsVisible(false);
    releasePopup(POPUP_ID);
  };

  const handleDecline = () => {
    localStorage.setItem(STORAGE_KEY, "false");
    setIsVisible(false);
    releasePopup(POPUP_ID);
  };

  if (!isVisible || !isPopupActive(POPUP_ID) || hasConsented) return null;

  const content = (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="fixed bottom-0 left-0 right-0 z-[9997] p-4 pb-safe-bottom"
        >
          <div className="max-w-2xl mx-auto bg-card border border-border rounded-2xl shadow-premium-lg p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 rounded-xl bg-muted shrink-0">
                  <Cookie className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  We use cookies to enhance your experience.{" "}
                  <a 
                    href="/privacy" 
                    className="text-foreground underline hover:no-underline"
                  >
                    Privacy Policy
                  </a>
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDecline}
                  className="flex-1 sm:flex-none text-muted-foreground"
                >
                  Decline
                </Button>
                <Button
                  size="sm"
                  onClick={handleAccept}
                  className="flex-1 sm:flex-none"
                >
                  Accept
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
