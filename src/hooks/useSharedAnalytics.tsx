import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SharedAnalyticsLink {
  id: string;
  link_id: string;
  share_token: string;
  password_hash: string | null;
  expires_at: string | null;
  is_active: boolean;
  views_count: number;
  created_at: string;
}

export function useSharedAnalytics(linkId: string) {
  const [shares, setShares] = useState<SharedAnalyticsLink[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShares = useCallback(async () => {
    if (!linkId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('shared_analytics')
        .select('*')
        .eq('link_id', linkId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShares(data || []);
    } catch (error) {
      console.error('Error fetching shared analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [linkId]);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  return { shares, loading, refetch: fetchShares };
}
