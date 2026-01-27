import { useState, useEffect } from "react";
import { X, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const AUTH_FIX_BANNER_KEY = "sliceurl_auth_fix_shown_v1";

export function AuthFixBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if banner was already shown
    const wasShown = localStorage.getItem(AUTH_FIX_BANNER_KEY);
    if (!wasShown) {
      setShow(true);
      // Mark as shown
      localStorage.setItem(AUTH_FIX_BANNER_KEY, "true");
    }
  }, []);

  const dismiss = () => {
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-16 left-0 right-0 z-40 px-4 pt-2"
        >
          <div className="max-w-xl mx-auto p-3 rounded-xl bg-primary/10 border border-primary/20 backdrop-blur-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm text-foreground">
                <span className="font-medium">Auth Fix Applied</span>
                <span className="text-muted-foreground"> — Your session is now stable. You may refresh if needed.</span>
              </p>
            </div>
            <button
              onClick={dismiss}
              className="shrink-0 flex items-center justify-center text-foreground opacity-100 hover:opacity-70 active:scale-95 transition-all duration-150"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
