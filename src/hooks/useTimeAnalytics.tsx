import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TimeChartData {
  label: string;
  clicks: number;
}

export function useTimeAnalytics(linkId: string) {
  const [hourlyData, setHourlyData] = useState<TimeChartData[]>([]);
  const [dailyData, setDailyData] = useState<TimeChartData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTimeData = useCallback(async () => {
    if (!linkId) {
      setLoading(false);
      return;
    }

    try {
      const [hourlyRes, dailyRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analytics-time?link_id=${linkId}&type=hourly`)
          .then(r => r.json()),
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analytics-time?link_id=${linkId}&type=daily`)
          .then(r => r.json())
      ]);

      setHourlyData(hourlyRes.data || []);
      setDailyData(dailyRes.data || []);
    } catch (error) {
      console.error('Error fetching time analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [linkId]);

  useEffect(() => {
    fetchTimeData();
  }, [fetchTimeData]);

  return { hourlyData, dailyData, loading, refresh: fetchTimeData };
}
