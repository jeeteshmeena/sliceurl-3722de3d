import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

// Priority system - higher number = higher priority (shows first)
export enum PopupPriority {
  COOKIE_CONSENT = 5,
  PWA_INSTALL = 10,
  LANGUAGE_SUGGESTION = 20,
}

interface PopupRequest {
  id: string;
  priority: number;
}

interface PopupManagerContextType {
  activePopup: string | null;
  requestPopup: (id: string, priority: number) => boolean;
  releasePopup: (id: string) => void;
  isPopupActive: (id: string) => boolean;
  canShowPopup: (id: string, priority: number) => boolean;
}

const PopupManagerContext = createContext<PopupManagerContextType | undefined>(undefined);

export function PopupManagerProvider({ children }: { children: React.ReactNode }) {
  const [popupQueue, setPopupQueue] = useState<PopupRequest[]>([]);

  // Get the highest priority popup
  const activePopup = useMemo(() => {
    if (popupQueue.length === 0) return null;
    const sorted = [...popupQueue].sort((a, b) => b.priority - a.priority);
    return sorted[0]?.id ?? null;
  }, [popupQueue]);

  const requestPopup = useCallback((id: string, priority: number): boolean => {
    setPopupQueue((prev) => {
      // Don't add duplicates
      if (prev.some((p) => p.id === id)) return prev;
      return [...prev, { id, priority }];
    });
    return true;
  }, []);

  const releasePopup = useCallback((id: string) => {
    setPopupQueue((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const isPopupActive = useCallback(
    (id: string) => activePopup === id,
    [activePopup]
  );

  const canShowPopup = useCallback(
    (id: string, priority: number) => {
      if (popupQueue.length === 0) return true;
      const highestPriority = Math.max(...popupQueue.map((p) => p.priority));
      return priority >= highestPriority || activePopup === id;
    },
    [popupQueue, activePopup]
  );

  const value = useMemo(
    () => ({
      activePopup,
      requestPopup,
      releasePopup,
      isPopupActive,
      canShowPopup,
    }),
    [activePopup, requestPopup, releasePopup, isPopupActive, canShowPopup]
  );

  return (
    <PopupManagerContext.Provider value={value}>
      {children}
    </PopupManagerContext.Provider>
  );
}

export function usePopupManager() {
  const context = useContext(PopupManagerContext);
  if (!context) {
    throw new Error("usePopupManager must be used within a PopupManagerProvider");
  }
  return context;
}
