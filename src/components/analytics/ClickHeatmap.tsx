import { useMemo } from "react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Click } from "@/hooks/useAnalytics";

interface ClickHeatmapProps {
  clicks: Click[];
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function ClickHeatmap({ clicks }: ClickHeatmapProps) {
  // Build a 7x24 heatmap: rows = days of week, cols = hours
  const heatmapData = useMemo(() => {
    const grid: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));
    
    clicks.forEach((click) => {
      const date = new Date(click.clicked_at);
      const day = date.getDay();
      const hour = date.getHours();
      grid[day][hour]++;
    });
    
    return grid;
  }, [clicks]);

  // Find max value for intensity scaling
  const maxValue = useMemo(() => {
    return Math.max(1, ...heatmapData.flat());
  }, [heatmapData]);

  // Get intensity class based on value (monochrome grey scale)
  const getIntensityStyle = (value: number) => {
    if (value === 0) return { backgroundColor: "hsl(var(--muted))" };
    const intensity = value / maxValue;
    // Theme-aware: use foreground color with increasing opacity
    const opacity = 0.1 + (intensity * 0.85); // 10% -> 95%
    return { backgroundColor: `hsl(var(--foreground) / ${opacity})` };
  };

  // Find peak times
  const peakTimes = useMemo(() => {
    const peaks: { day: number; hour: number; count: number }[] = [];
    heatmapData.forEach((dayData, day) => {
      dayData.forEach((count, hour) => {
        if (count > 0) {
          peaks.push({ day, hour, count });
        }
      });
    });
    return peaks.sort((a, b) => b.count - a.count).slice(0, 3);
  }, [heatmapData]);

  if (clicks.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">No click data for heatmap</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hour labels */}
          <div className="flex mb-1 ml-12">
            {HOURS.filter((_, i) => i % 3 === 0).map((hour) => (
              <div 
                key={hour} 
                className="text-[10px] text-muted-foreground w-[42px] text-center"
              >
                {hour.toString().padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Grid rows */}
          <TooltipProvider delayDuration={0}>
            {DAYS.map((day, dayIdx) => (
              <div key={day} className="flex items-center gap-1.5 mb-1">
                <span className="text-xs text-muted-foreground w-10 text-right">{day}</span>
                <div className="flex gap-0.5">
                  {HOURS.map((hour) => {
                    const value = heatmapData[dayIdx][hour];
                    return (
                      <Tooltip key={hour}>
                        <TooltipTrigger asChild>
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: (dayIdx * 24 + hour) * 0.002 }}
                            className="w-3 h-3 rounded-sm cursor-pointer hover:ring-1 hover:ring-foreground/30 transition-all"
                            style={getIntensityStyle(value)}
                          />
                        </TooltipTrigger>
                        <TooltipContent className="bg-card border text-foreground">
                          <p className="text-xs font-medium">
                            {day} {hour.toString().padStart(2, "0")}:00
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {value} {value === 1 ? "click" : "clicks"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            ))}
          </TooltipProvider>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-4 ml-12">
            <span className="text-[10px] text-muted-foreground">Less</span>
            <div className="flex gap-0.5">
              {[0, 0.25, 0.5, 0.75, 1].map((intensity, idx) => (
                <div
                  key={idx}
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: `hsl(0, 0%, ${90 - intensity * 75}%)` }}
                />
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground">More</span>
          </div>
        </div>
      </div>

      {/* Peak Times Insight */}
      {peakTimes.length > 0 && (
        <div className="pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Peak engagement times:</p>
          <div className="flex flex-wrap gap-2">
            {peakTimes.map((peak, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-foreground"
              >
                {DAYS[peak.day]} {peak.hour.toString().padStart(2, "0")}:00 
                <span className="ml-1.5 text-muted-foreground">({peak.count})</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
