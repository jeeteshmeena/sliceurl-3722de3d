import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type SecurityMode = 'warn' | 'strict';

const STORAGE_KEY = 'sliceurl-security-mode';
const PREVIEW_STORAGE_KEY = 'sliceurl-link-preview';
const DEVICE_ID_KEY = 'sliceurl-device-id';
const DEBOUNCE_MS = 500;

// Generate a unique device ID for guest users
function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

interface UseLinkBehaviorReturn {
  securityMode: SecurityMode;
  linkPreviewEnabled: boolean;
  isLoading: boolean;
  isSaving: boolean;
  hasUserChanged: boolean;
  updateSecurityMode: (mode: SecurityMode) => Promise<void>;
  updateLinkPreview: (enabled: boolean) => Promise<void>;
}

export function useLinkBehavior(): UseLinkBehaviorReturn {
  const { user } = useAuth();
  const [securityMode, setSecurityMode] = useState<SecurityMode>('warn');
  const [linkPreviewEnabled, setLinkPreviewEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUserChanged, setHasUserChanged] = useState(false);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingModeRef = useRef<SecurityMode | null>(null);
  const pendingPreviewRef = useRef<boolean | null>(null);

  // Load preference on mount
  useEffect(() => {
    loadPreference();
  }, [user]);

  const loadPreference = async () => {
    setIsLoading(true);
    
    try {
      if (user) {
        // Authenticated user - load from database
        const { data: profile } = await supabase
          .from("profiles")
          .select("security_mode, auto_redirect_enabled")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (profile) {
          // auto_redirect_enabled = true means link preview is OFF
          const previewEnabled = profile.auto_redirect_enabled !== true;
          setLinkPreviewEnabled(previewEnabled);
          
          // Map old 'disable' mode to new structure
          if (profile.security_mode === 'disable') {
            setSecurityMode('warn');
            setLinkPreviewEnabled(false);
          } else if (profile.security_mode === 'strict') {
            setSecurityMode('strict');
          } else {
            setSecurityMode('warn');
          }
          setHasUserChanged(profile.security_mode !== 'warn' || profile.auto_redirect_enabled === true);
        } else {
          // Check localStorage for migration
          const storedMode = localStorage.getItem(STORAGE_KEY) as string | null;
          const storedPreview = localStorage.getItem(PREVIEW_STORAGE_KEY);
          
          if (storedMode === 'disable') {
            setLinkPreviewEnabled(false);
            setSecurityMode('warn');
            setHasUserChanged(true);
          } else if (storedMode && ['warn', 'strict'].includes(storedMode)) {
            setSecurityMode(storedMode as SecurityMode);
            setHasUserChanged(storedMode !== 'warn');
          }
          
          if (storedPreview !== null) {
            setLinkPreviewEnabled(storedPreview === 'true');
          }
        }
      } else {
        // Guest user - load from localStorage
        const storedMode = localStorage.getItem(STORAGE_KEY) as string | null;
        const storedPreview = localStorage.getItem(PREVIEW_STORAGE_KEY);
        
        if (storedMode === 'disable') {
          setLinkPreviewEnabled(false);
          setSecurityMode('warn');
          setHasUserChanged(true);
        } else if (storedMode && ['warn', 'strict'].includes(storedMode)) {
          setSecurityMode(storedMode as SecurityMode);
          setHasUserChanged(storedMode !== 'warn');
        }
        
        if (storedPreview !== null) {
          setLinkPreviewEnabled(storedPreview === 'true');
        }
      }
    } catch (error) {
      console.error("Error loading link behavior preference:", error);
      // Fall back to localStorage
      const storedMode = localStorage.getItem(STORAGE_KEY) as string | null;
      const storedPreview = localStorage.getItem(PREVIEW_STORAGE_KEY);
      
      if (storedMode === 'disable') {
        setLinkPreviewEnabled(false);
        setSecurityMode('warn');
      } else if (storedMode && ['warn', 'strict'].includes(storedMode)) {
        setSecurityMode(storedMode as SecurityMode);
      }
      
      if (storedPreview !== null) {
        setLinkPreviewEnabled(storedPreview === 'true');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveToDatabase = async (mode: SecurityMode, previewEnabled: boolean): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          security_mode: mode,
          auto_redirect_enabled: !previewEnabled,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) {
        // Try to create profile if it doesn't exist
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            security_mode: mode,
            auto_redirect_enabled: !previewEnabled,
          });
        
        if (insertError) {
          console.error("Error saving to database:", insertError);
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error("Error saving to database:", error);
      return false;
    }
  };

  const updateSecurityMode = useCallback(async (mode: SecurityMode) => {
    setSecurityMode(mode);
    setHasUserChanged(true);
    setIsSaving(true);
    
    localStorage.setItem(STORAGE_KEY, mode);
    pendingModeRef.current = mode;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      const modeToSave = pendingModeRef.current;
      if (!modeToSave) {
        setIsSaving(false);
        return;
      }
      
      if (user) {
        let success = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          success = await saveToDatabase(modeToSave, linkPreviewEnabled);
          if (success) break;
          await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)));
        }
        
        if (!success) {
          console.warn("Failed to save to database after 3 attempts, using localStorage fallback");
        }
      }
      
      pendingModeRef.current = null;
      setIsSaving(false);
    }, DEBOUNCE_MS);
    
  }, [user, linkPreviewEnabled]);

  const updateLinkPreview = useCallback(async (enabled: boolean) => {
    setLinkPreviewEnabled(enabled);
    setHasUserChanged(true);
    setIsSaving(true);
    
    localStorage.setItem(PREVIEW_STORAGE_KEY, String(enabled));
    pendingPreviewRef.current = enabled;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      const previewToSave = pendingPreviewRef.current;
      if (previewToSave === null) {
        setIsSaving(false);
        return;
      }
      
      if (user) {
        let success = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          success = await saveToDatabase(securityMode, previewToSave);
          if (success) break;
          await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)));
        }
        
        if (!success) {
          console.warn("Failed to save to database after 3 attempts, using localStorage fallback");
        }
      }
      
      pendingPreviewRef.current = null;
      setIsSaving(false);
    }, DEBOUNCE_MS);
    
  }, [user, securityMode]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    securityMode,
    linkPreviewEnabled,
    isLoading,
    isSaving,
    hasUserChanged,
    updateSecurityMode,
    updateLinkPreview,
  };
}
