import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Click {
  id: string;
  link_id: string;
  clicked_at: string;
  ip_address: string | null;
  user_agent: string | null;
  referrer: string | null;
  country: string | null;
  city: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  is_unique: boolean;
}

export interface AnalyticsSummary {
  totalClicks: number;
  uniqueClicks: number;
  deviceStats: { name: string; value: number; fill: string }[];
  browserStats: { name: string; value: number; fill: string }[];
  osStats: { name: string; value: number; fill: string }[];
  countryStats: { name: string; value: number }[];
  referrerStats: { name: string; value: number }[];
  clicksTimeline: { date: string; clicks: number }[];
}

// Monochrome grey scale colors for charts
const MONO_COLORS = [
  "#1a1a1a", // Darkest
  "#404040",
  "#666666",
  "#888888",
  "#aaaaaa",
  "#cccccc", // Lightest
];

const DEVICE_COLORS: Record<string, string> = {
  mobile: "#1a1a1a",
  desktop: "#666666",
  tablet: "#aaaaaa",
  unknown: "#cccccc",
};

// Filter out bot traffic from analytics data
function filterHumanTraffic(clicks: Click[]): Click[] {
  return clicks.filter(click => {
    const deviceType = (click.device_type || '').toLowerCase();
    const browser = (click.browser || '').toLowerCase();
    
    // Exclude bot device types
    if (deviceType === 'bot') return false;
    
    // Exclude known bot browsers
    const botBrowsers = ['googlebot', 'bingbot', 'bot', 'crawler', 'spider', 'facebook bot', 'twitter bot', 'linkedin bot'];
    if (botBrowsers.some(b => browser.includes(b))) return false;
    
    return true;
  });
}

export function useAnalytics(linkId: string, dateRangeStart?: Date | null) {
  const [clicks, setClicks] = useState<Click[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary>({
    totalClicks: 0,
    uniqueClicks: 0,
    deviceStats: [],
    browserStats: [],
    osStats: [],
    countryStats: [],
    referrerStats: [],
    clicksTimeline: [],
  });

  // Filter clicks by date range and exclude bot traffic
  const filteredClicks = useMemo(() => {
    const humanClicks = filterHumanTraffic(clicks);
    if (!dateRangeStart) return humanClicks;
    return humanClicks.filter((c) => new Date(c.clicked_at) >= dateRangeStart);
  }, [clicks, dateRangeStart]);

  // Calculate previous period stats for trends (using only human traffic)
  const trendStats = useMemo(() => {
    const humanClicks = filterHumanTraffic(clicks);
    const now = new Date();
    const periodDays = 7;
    const currentPeriodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(currentPeriodStart.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const currentClicks = humanClicks.filter((c) => {
      const d = new Date(c.clicked_at);
      return d >= currentPeriodStart && d <= now;
    });

    const previousClicks = humanClicks.filter((c) => {
      const d = new Date(c.clicked_at);
      return d >= previousPeriodStart && d < currentPeriodStart;
    });

    return {
      currentTotal: currentClicks.length,
      previousTotal: previousClicks.length,
      currentUnique: currentClicks.filter((c) => c.is_unique).length,
      previousUnique: previousClicks.filter((c) => c.is_unique).length,
    };
  }, [clicks]);

  const processAnalytics = useCallback((clicksData: Click[], rangeStart?: Date | null) => {
    // Filter out bot traffic first, then apply date range filter
    const humanClicks = filterHumanTraffic(clicksData);
    const dataToProcess = rangeStart 
      ? humanClicks.filter((c) => new Date(c.clicked_at) >= rangeStart)
      : humanClicks;

    const totalClicks = dataToProcess.length;
    const uniqueClicks = dataToProcess.filter((c) => c.is_unique).length;

    // Device stats with monochrome colors
    const deviceCounts: Record<string, number> = {};
    dataToProcess.forEach((c) => {
      const device = c.device_type || "Unknown";
      deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    });
    const deviceStats = Object.entries(deviceCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      fill: DEVICE_COLORS[name.toLowerCase()] || "#cccccc",
    }));

    // Browser stats with monochrome colors
    const browserCounts: Record<string, number> = {};
    dataToProcess.forEach((c) => {
      const browser = c.browser || "Unknown";
      browserCounts[browser] = (browserCounts[browser] || 0) + 1;
    });
    const browserStats = Object.entries(browserCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], i) => ({
        name,
        value,
        fill: MONO_COLORS[i] || "#cccccc",
      }));

    // OS stats with monochrome colors
    const osCounts: Record<string, number> = {};
    dataToProcess.forEach((c) => {
      const os = c.os || "Unknown";
      osCounts[os] = (osCounts[os] || 0) + 1;
    });
    const osStats = Object.entries(osCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], i) => ({
        name,
        value,
        fill: MONO_COLORS[i] || "#cccccc",
      }));

    // Country stats
    const countryCounts: Record<string, number> = {};
    dataToProcess.forEach((c) => {
      const country = c.country || "Unknown";
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    });
    const countryStats = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));

    // Referrer stats
    const referrerCounts: Record<string, number> = {};
    dataToProcess.forEach((c) => {
      const referrer = c.referrer || "Direct";
      referrerCounts[referrer] = (referrerCounts[referrer] || 0) + 1;
    });
    const referrerStats = Object.entries(referrerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));

    // Clicks timeline (last 30 days or based on range)
    const daysToShow = rangeStart 
      ? Math.min(90, Math.ceil((Date.now() - rangeStart.getTime()) / (24 * 60 * 60 * 1000)))
      : 30;
    
    const last30Days: Record<string, number> = {};
    const now = new Date();
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split("T")[0];
      last30Days[key] = 0;
    }
    dataToProcess.forEach((c) => {
      const date = c.clicked_at.split("T")[0];
      if (last30Days[date] !== undefined) {
        last30Days[date]++;
      }
    });
    const clicksTimeline = Object.entries(last30Days).map(([date, clicks]) => ({
      date,
      clicks,
    }));

    setSummary({
      totalClicks,
      uniqueClicks,
      deviceStats,
      browserStats,
      osStats,
      countryStats,
      referrerStats,
      clicksTimeline,
    });
  }, []);

  const fetchClicks = useCallback(async () => {
    if (!linkId) return;
    
    try {
      const { data, error } = await supabase
        .from("clicks")
        .select("*")
        .eq("link_id", linkId)
        .order("clicked_at", { ascending: false });

      if (error) throw error;

      setClicks(data || []);
      processAnalytics(data || [], dateRangeStart);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  }, [linkId, processAnalytics, dateRangeStart]);

  // Re-process when date range changes
  useEffect(() => {
    if (clicks.length > 0) {
      processAnalytics(clicks, dateRangeStart);
    }
  }, [dateRangeStart, clicks, processAnalytics]);

  useEffect(() => {
    if (!linkId) {
      setLoading(false);
      return;
    }

    fetchClicks();

    // Subscribe to realtime click updates
    const channel = supabase
      .channel(`clicks-${linkId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'clicks',
          filter: `link_id=eq.${linkId}`
        },
        (payload) => {
          console.log('New click received:', payload);
          const newClick = payload.new as Click;
          setClicks((prev) => {
            const updated = [newClick, ...prev];
            processAnalytics(updated, dateRangeStart);
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [linkId, fetchClicks, processAnalytics, dateRangeStart]);

  return { 
    clicks, 
    filteredClicks,
    summary, 
    loading, 
    refetch: fetchClicks,
    trendStats 
  };
}
