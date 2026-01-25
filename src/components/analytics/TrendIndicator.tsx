import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";
import type { Click } from "@/hooks/useAnalytics";

interface TrendIndicatorProps {
  clicks: Click[];
  periodDays?: number;
}

export function TrendIndicator({ clicks, periodDays = 7 }: TrendIndicatorProps) {
  const trend = useMemo(() => {
    const now = new Date();
    const currentPeriodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(currentPeriodStart.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const currentPeriodClicks = clicks.filter((c) => {
      const clickDate = new Date(c.clicked_at);
      return clickDate >= currentPeriodStart && clickDate <= now;
    }).length;

    const previousPeriodClicks = clicks.filter((c) => {
      const clickDate = new Date(c.clicked_at);
      return clickDate >= previousPeriodStart && clickDate < currentPeriodStart;
    }).length;

    if (previousPeriodClicks === 0) {
      return { percentage: currentPeriodClicks > 0 ? 100 : 0, direction: currentPeriodClicks > 0 ? "up" : "neutral" };
    }

    const change = ((currentPeriodClicks - previousPeriodClicks) / previousPeriodClicks) * 100;
    const direction = change > 0 ? "up" : change < 0 ? "down" : "neutral";

    return { percentage: Math.abs(change), direction };
  }, [clicks, periodDays]);

  const Icon = trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        trend.direction === "up"
          ? "text-foreground"
          : trend.direction === "down"
          ? "text-muted-foreground"
          : "text-muted-foreground"
      }`}
    >
      <Icon className="h-3 w-3" />
      <span>
        {trend.direction === "up" ? "+" : trend.direction === "down" ? "-" : ""}
        {trend.percentage.toFixed(0)}%
      </span>
      <span className="text-muted-foreground font-normal">vs last {periodDays}d</span>
    </motion.div>
  );
}

// Individual stat trend for overview cards
interface StatTrendProps {
  current: number;
  previous: number;
  label?: string;
}

export function StatTrend({ current, previous, label = "vs last week" }: StatTrendProps) {
  const trend = useMemo(() => {
    if (previous === 0) {
      return { percentage: current > 0 ? 100 : 0, direction: current > 0 ? "up" : "neutral" };
    }
    const change = ((current - previous) / previous) * 100;
    return { percentage: Math.abs(change), direction: change > 0 ? "up" : change < 0 ? "down" : "neutral" };
  }, [current, previous]);

  const Icon = trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : Minus;

  if (trend.percentage === 0 && trend.direction === "neutral") {
    return null;
  }

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-0.5 text-[10px] ${
        trend.direction === "up"
          ? "text-foreground"
          : "text-muted-foreground"
      }`}
    >
      <Icon className="h-2.5 w-2.5" />
      {trend.direction === "up" ? "+" : trend.direction === "down" ? "-" : ""}
      {trend.percentage.toFixed(0)}%
    </motion.span>
  );
}
