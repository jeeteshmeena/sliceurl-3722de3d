import { useMemo } from "react";
import { Smartphone, Monitor, Tablet, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/hooks/useAnalytics";
import { getTopCountryFlags } from "@/lib/countryFlags";
import { calculateHealthStatus, getHealthStatusConfig, type LinkHealthStatus } from "@/hooks/useLinkHealth";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface LinkAnalyticsCardProps {
  linkId: string;
  lastClickedAt: string | null;
  isBroken?: boolean;
  onViewFull: () => void;
}

export function LinkAnalyticsCard({ linkId, lastClickedAt, isBroken = false, onViewFull }: LinkAnalyticsCardProps) {
  const { summary, loading } = useAnalytics(linkId);

  // Calculate health status client-side
  const healthStatus = useMemo(() => 
    calculateHealthStatus(lastClickedAt, isBroken), 
    [lastClickedAt, isBroken]
  );
  const healthConfig = getHealthStatusConfig(healthStatus);

  // Get top 3 country flags
  const countryFlags = useMemo(() => 
    getTopCountryFlags(summary.countryStats, 3),
    [summary.countryStats]
  );

  // Calculate device percentages
  const deviceData = useMemo(() => {
    const total = summary.deviceStats.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) return { mobile: 0, desktop: 0, tablet: 0 };
    
    const mobileCount = summary.deviceStats.find(d => d.name.toLowerCase() === 'mobile')?.value || 0;
    const desktopCount = summary.deviceStats.find(d => d.name.toLowerCase() === 'desktop')?.value || 0;
    const tabletCount = summary.deviceStats.find(d => d.name.toLowerCase() === 'tablet')?.value || 0;
    
    return {
      mobile: Math.round((mobileCount / total) * 100),
      desktop: Math.round((desktopCount / total) * 100),
      tablet: Math.round((tabletCount / total) * 100)
    };
  }, [summary.deviceStats]);

  // Mini referrer pie data
  const referrerPieData = useMemo(() => {
    const colors = ['#0ea5e9', '#6366f1', '#f59e0b', '#22c55e', '#94a3b8'];
    return summary.referrerStats.slice(0, 5).map((stat, i) => ({
      name: stat.name,
      value: stat.value,
      fill: colors[i]
    }));
  }, [summary.referrerStats]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <div className="h-4 w-16 bg-muted rounded" />
        <div className="h-4 w-12 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-border/50">
      {/* Health Status & Country Flags Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Health Indicator */}
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${healthConfig.bgColor}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${healthStatus === 'active' ? 'bg-green-500' : healthStatus === 'low_activity' ? 'bg-yellow-500' : healthStatus === 'inactive' ? 'bg-orange-500' : 'bg-red-500'}`} />
            <span className={healthConfig.color}>{healthConfig.label}</span>
          </div>

          {/* Top Country Flags */}
          {countryFlags.length > 0 && (
            <div className="flex items-center gap-0.5 text-sm">
              {countryFlags.map((flag, i) => (
                <span key={i} title={summary.countryStats[i]?.name}>{flag}</span>
              ))}
            </div>
          )}
        </div>

        {/* View Full Analytics Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 text-xs gap-1"
          onClick={onViewFull}
        >
          <BarChart3 className="h-3 w-3" />
          View Full
        </Button>
      </div>

      {/* Device Breakdown & Referrer Mini Pie */}
      <div className="flex items-center gap-3">
        {/* Device Breakdown Bar */}
        {summary.totalClicks > 0 && (
          <div className="flex-1">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
              <Smartphone className="h-3 w-3" />
              <span>{deviceData.mobile}%</span>
              <Monitor className="h-3 w-3 ml-1" />
              <span>{deviceData.desktop}%</span>
              {deviceData.tablet > 0 && (
                <>
                  <Tablet className="h-3 w-3 ml-1" />
                  <span>{deviceData.tablet}%</span>
                </>
              )}
            </div>
            <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
              <div 
                className="bg-sky-500 transition-all" 
                style={{ width: `${deviceData.mobile}%` }} 
              />
              <div 
                className="bg-indigo-500 transition-all" 
                style={{ width: `${deviceData.desktop}%` }} 
              />
              {deviceData.tablet > 0 && (
                <div 
                  className="bg-amber-500 transition-all" 
                  style={{ width: `${deviceData.tablet}%` }} 
                />
              )}
            </div>
          </div>
        )}

        {/* Mini Referrer Pie */}
        {referrerPieData.length > 0 && (
          <div className="w-10 h-10 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={referrerPieData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={8}
                  outerRadius={18}
                  strokeWidth={0}
                >
                  {referrerPieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
