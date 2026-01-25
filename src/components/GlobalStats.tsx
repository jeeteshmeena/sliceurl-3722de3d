import { useState, useEffect, useRef, forwardRef } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { Link2, MousePointerClick, Zap } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { StatsSkeleton } from "@/components/Skeleton";

interface Stats {
  total_links: number;
  total_clicks: number;
  avg_slice_time_ms: number | null;
}

// Format slice time: < 1000ms = "XXX ms", >= 1000ms = "X.XX s"
function formatSliceTime(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

// Animated counter component with smooth transitions
const AnimatedCounter = forwardRef<HTMLSpanElement, { value: number; className?: string }>(
  ({ value, className }, ref) => {
    const spring = useSpring(0, { stiffness: 50, damping: 20 });
    const displayed = useTransform(spring, (latest) => Math.round(latest).toLocaleString());
    const [displayedValue, setDisplayedValue] = useState("0");

    useEffect(() => {
      spring.set(value);
    }, [value, spring]);

    useEffect(() => {
      const unsubscribe = displayed.on("change", (v) => setDisplayedValue(v));
      return () => unsubscribe();
    }, [displayed]);

    return <span ref={ref} className={className}>{displayedValue}</span>;
  }
);

AnimatedCounter.displayName = "AnimatedCounter";

export function GlobalStats() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<Stats>({
    total_links: 0,
    total_clicks: 0,
    avg_slice_time_ms: null,
  });
  const [loading, setLoading] = useState(true);
  const previousStats = useRef<Stats>({ total_links: 0, total_clicks: 0, avg_slice_time_ms: null });

  useEffect(() => {
    fetchStats();
    
    // Re-fetch stats every 30 seconds for near real-time updates
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/global-stats`,
        { method: "GET", headers: { "Content-Type": "application/json" } }
      );
      if (response.ok) {
        const data = await response.json();
        previousStats.current = stats;
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching global stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <StatsSkeleton />;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
        <div className="p-5 rounded-2xl bg-secondary/40 border border-border/50 text-center hover-lift">
          <div className="h-10 w-10 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center">
            <Link2 className="h-5 w-5 text-primary" />
          </div>
          <AnimatedCounter value={stats.total_links} className="text-2xl font-bold text-foreground" />
          <p className="text-xs text-muted-foreground mt-2">{t("total_urls")}</p>
        </div>
        
        <div className="p-5 rounded-2xl bg-secondary/40 border border-border/50 text-center hover-lift">
          <div className="h-10 w-10 mx-auto mb-3 rounded-xl bg-success/10 flex items-center justify-center">
            <MousePointerClick className="h-5 w-5 text-success" />
          </div>
          <AnimatedCounter value={stats.total_clicks} className="text-2xl font-bold text-foreground" />
          <p className="text-xs text-muted-foreground mt-2">{t("total_clicks")}</p>
        </div>
        
        <div className="p-5 rounded-2xl bg-secondary/40 border border-border/50 text-center hover-lift">
          <div className="h-10 w-10 mx-auto mb-3 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Zap className="h-5 w-5 text-amber-500" />
          </div>
          <span className="text-2xl font-bold text-foreground">
            {formatSliceTime(stats.avg_slice_time_ms)}
          </span>
          <p className="text-xs text-muted-foreground mt-2">Avg Slice Speed</p>
        </div>
      </div>
    </motion.div>
  );
}
