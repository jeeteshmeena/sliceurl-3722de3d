import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, Monitor, Tablet, Clock } from "lucide-react";
import { getCountryFlag } from "@/lib/countryFlags";
import type { Click } from "@/hooks/useAnalytics";

interface LiveActivityFeedProps {
  clicks: Click[];
  maxItems?: number;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function LiveActivityFeed({ clicks, maxItems = 5 }: LiveActivityFeedProps) {
  const recentClicks = useMemo(() => {
    return clicks.slice(0, maxItems);
  }, [clicks, maxItems]);

  const getDeviceIcon = (deviceType: string | null) => {
    const device = (deviceType || "desktop").toLowerCase();
    if (device === "mobile") return Smartphone;
    if (device === "tablet") return Tablet;
    return Monitor;
  };

  if (recentClicks.length === 0) {
    return (
      <div className="py-6 text-center">
        <Clock className="h-6 w-6 mx-auto mb-2 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {recentClicks.map((click, idx) => {
          const DeviceIcon = getDeviceIcon(click.device_type);
          return (
            <motion.div
              key={click.id}
              initial={{ opacity: 0, x: -20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: "auto" }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              transition={{ 
                duration: 0.3, 
                delay: idx * 0.05,
                type: "spring",
                stiffness: 500,
                damping: 30
              }}
              className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
            >
              {/* Country Flag */}
              <span className="text-lg shrink-0">
                {getCountryFlag(click.country || "Unknown")}
              </span>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="font-medium truncate">
                    {click.city || click.country || "Unknown"}
                  </span>
                  {click.city && click.country && (
                    <span className="text-muted-foreground text-xs">
                      , {click.country}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="capitalize">{click.device_type || "Desktop"}</span>
                  <span>•</span>
                  <span>{click.browser || "Unknown"}</span>
                  <span>•</span>
                  <span>{click.referrer || "Direct"}</span>
                </div>
              </div>

              {/* Time */}
              <div className="text-xs text-muted-foreground shrink-0">
                {formatTimeAgo(click.clicked_at)}
              </div>

              {/* Unique badge */}
              {click.is_unique && (
                <span className="text-[9px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded bg-foreground text-background">
                  NEW
                </span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
