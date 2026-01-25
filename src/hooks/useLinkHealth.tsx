import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LinkHealthStatus = 'active' | 'low_activity' | 'inactive' | 'broken';

export interface LinkHealth {
  status: LinkHealthStatus;
  lastClickedAt: string | null;
  isBroken: boolean;
}

const statusConfig: Record<LinkHealthStatus, { color: string; label: string; bgColor: string }> = {
  active: { 
    color: 'text-green-500', 
    label: 'Active',
    bgColor: 'bg-green-500/10'
  },
  low_activity: { 
    color: 'text-yellow-500', 
    label: 'Low Activity',
    bgColor: 'bg-yellow-500/10'
  },
  inactive: { 
    color: 'text-orange-500', 
    label: 'Inactive',
    bgColor: 'bg-orange-500/10'
  },
  broken: { 
    color: 'text-red-500', 
    label: 'Broken',
    bgColor: 'bg-red-500/10'
  }
};

export function useLinkHealth(linkId: string) {
  const [health, setHealth] = useState<LinkHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const checkHealth = useCallback(async (checkUrl = false) => {
    if (!linkId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-link-health', {
        body: { link_id: linkId, check_url: checkUrl }
      });

      if (error) throw error;

      setHealth({
        status: data.health_status as LinkHealthStatus,
        lastClickedAt: data.last_clicked_at,
        isBroken: data.is_broken
      });
    } catch (error) {
      console.error('Error checking link health:', error);
    } finally {
      setLoading(false);
    }
  }, [linkId]);

  useEffect(() => {
    checkHealth(false);
  }, [checkHealth]);

  return { 
    health, 
    loading, 
    refresh: checkHealth,
    getStatusConfig: (status: LinkHealthStatus) => statusConfig[status]
  };
}

// Utility function to calculate health status client-side without API call
export function calculateHealthStatus(lastClickedAt: string | null, isBroken: boolean): LinkHealthStatus {
  if (isBroken) return 'broken';
  if (!lastClickedAt) return 'active';
  
  const now = new Date();
  const lastClick = new Date(lastClickedAt);
  const daysSinceClick = (now.getTime() - lastClick.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceClick > 30) return 'inactive';
  if (daysSinceClick > 14) return 'low_activity';
  return 'active';
}

export function getHealthStatusConfig(status: LinkHealthStatus) {
  return statusConfig[status];
}
