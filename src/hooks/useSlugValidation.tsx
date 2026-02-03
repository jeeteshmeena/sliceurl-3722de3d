import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export function useSlugValidation(initialSlug: string = "", currentLinkId?: string) {
  const [slug, setSlug] = useState(initialSlug);
  const [status, setStatus] = useState<SlugStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const validateSlug = useCallback(async (value: string, linkId?: string) => {
    // Clear any pending validation
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Empty slug is valid (will use auto-generated)
    if (!value) {
      setStatus('idle');
      return;
    }

    // Sanitize and check format
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    
    if (sanitized !== value) {
      setStatus('invalid');
      return;
    }

    if (sanitized.length < 2) {
      setStatus('invalid');
      return;
    }

    // Debounce the API call
    setStatus('checking');
    
    debounceRef.current = setTimeout(async () => {
      try {
        // Query to check if slug exists
        const query = supabase
          .from('links')
          .select('id, short_code, custom_slug')
          .or(`short_code.eq.${sanitized},custom_slug.eq.${sanitized}`)
          .maybeSingle();

        const { data, error } = await query;

        if (error) {
          console.error('Slug validation error:', error);
          setStatus('available'); // Fallback to available on error
          return;
        }

        // If editing an existing link, the same slug is OK
        if (data && linkId && data.id === linkId) {
          setStatus('available');
          return;
        }

        // If slug exists and it's not the current link, it's taken
        if (data) {
          setStatus('taken');
        } else {
          setStatus('available');
        }
      } catch (err) {
        console.error('Slug validation error:', err);
        setStatus('available'); // Fallback
      }
    }, 300);
  }, []);

  const handleSlugChange = useCallback((value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    setSlug(sanitized);
    validateSlug(sanitized, currentLinkId);
  }, [validateSlug, currentLinkId]);

  // Reset when currentLinkId changes
  useEffect(() => {
    if (initialSlug) {
      setSlug(initialSlug);
      setStatus('idle');
    }
  }, [initialSlug, currentLinkId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    slug,
    status,
    setSlug,
    setStatus,
    handleSlugChange,
    validateSlug,
    isValid: status === 'available' || status === 'idle',
  };
}
