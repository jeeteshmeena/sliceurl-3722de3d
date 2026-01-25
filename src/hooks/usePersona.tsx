import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserPersona = 'influencer' | 'marketer' | 'agency' | 'casual';

export interface PersonaData {
  persona: UserPersona;
  totalLinks: number;
  totalClicks: number;
  utmUsageCount: number;
  folderCount: number;
  linksThisWeek: number;
}

const personaLabels: Record<UserPersona, string> = {
  influencer: 'Influencer',
  marketer: 'Marketer',
  agency: 'Agency',
  casual: 'Casual User'
};

const personaColors: Record<UserPersona, string> = {
  influencer: 'bg-gradient-to-r from-purple-500 to-pink-500',
  marketer: 'bg-gradient-to-r from-blue-500 to-cyan-500',
  agency: 'bg-gradient-to-r from-orange-500 to-amber-500',
  casual: 'bg-gradient-to-r from-gray-400 to-gray-500'
};

export function usePersona(userId: string | undefined) {
  const [persona, setPersona] = useState<PersonaData | null>(null);
  const [loading, setLoading] = useState(true);

  const calculatePersona = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      // First check if we have a cached persona
      const { data: cached } = await supabase
        .from('user_personas')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (cached) {
        // Check if cached data is less than 1 hour old
        const lastCalculated = new Date(cached.last_calculated_at);
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        
        if (lastCalculated > hourAgo) {
          setPersona({
            persona: cached.persona as UserPersona,
            totalLinks: cached.total_links,
            totalClicks: cached.total_clicks,
            utmUsageCount: cached.utm_usage_count,
            folderCount: cached.folder_count,
            linksThisWeek: cached.links_this_week
          });
          setLoading(false);
          return;
        }
      }

      // Calculate fresh persona
      const { data, error } = await supabase.functions.invoke('calculate-persona', {
        body: { user_id: userId }
      });

      if (error) throw error;

      setPersona({
        persona: data.persona as UserPersona,
        totalLinks: data.stats.totalLinks,
        totalClicks: data.stats.totalClicks,
        utmUsageCount: data.stats.utmUsageCount,
        folderCount: data.stats.folderCount,
        linksThisWeek: data.stats.linksThisWeek
      });
    } catch (error) {
      console.error('Error calculating persona:', error);
      // Default to casual
      setPersona({
        persona: 'casual',
        totalLinks: 0,
        totalClicks: 0,
        utmUsageCount: 0,
        folderCount: 0,
        linksThisWeek: 0
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    calculatePersona();
  }, [calculatePersona]);

  return { 
    persona, 
    loading, 
    refresh: calculatePersona,
    getLabel: (p: UserPersona) => personaLabels[p],
    getColor: (p: UserPersona) => personaColors[p]
  };
}
