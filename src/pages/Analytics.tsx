import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { 
  ArrowLeft, Link2, MousePointer, Users, Globe, Monitor, 
  Smartphone, Tablet, Download, Activity, MapPin, 
  TrendingUp, Clock, Grid3X3, List, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useLinks } from "@/hooks/useLinks";
import { useSharedAnalytics } from "@/hooks/useSharedAnalytics";
import { getCountryFlag } from "@/lib/countryFlags";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";

// Analytics components
import { ClickHeatmap } from "@/components/analytics/ClickHeatmap";
import { TrendIndicator, StatTrend } from "@/components/analytics/TrendIndicator";
import { DateRangePicker, type DateRange, getDateFromRange } from "@/components/analytics/DateRangePicker";
import { AnimatedCounter } from "@/components/analytics/AnimatedCounter";
import { LiveActivityFeed } from "@/components/analytics/LiveActivityFeed";
import { ClickLogTable } from "@/components/analytics/ClickLogTable";
import { ShareAnalyticsDialog } from "@/components/analytics/ShareAnalyticsDialog";

const Analytics = () => {
  const { id } = useParams<{ id: string }>();
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const dateRangeStart = getDateFromRange(dateRange);
  
  const { summary, clicks, filteredClicks, loading, trendStats } = useAnalytics(id || "", dateRangeStart);
  const { links } = useLinks();
  const { shares, refetch: refetchShares } = useSharedAnalytics(id || "");
  
  const link = useMemo(() => links.find(l => l.id === id), [links, id]);

  const ctr = useMemo(() => {
    if (summary.totalClicks === 0) return 0;
    return (summary.uniqueClicks / summary.totalClicks) * 100;
  }, [summary]);

  // Compute city stats from filtered clicks
  const cityStats = useMemo(() => {
    const cityCounts: Record<string, { city: string; country: string; count: number }> = {};
    filteredClicks.forEach((c) => {
      const city = c.city || "Unknown";
      const country = c.country || "Unknown";
      const key = `${city}-${country}`;
      if (!cityCounts[key]) {
        cityCounts[key] = { city, country, count: 0 };
      }
      cityCounts[key].count++;
    });
    return Object.values(cityCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredClicks]);

  const handleExportCSV = () => {
    if (filteredClicks.length === 0) return;
    
    const headers = ["Date", "Country", "City", "Device", "Browser", "OS", "Referrer", "Unique"];
    const rows = filteredClicks.map(c => [
      new Date(c.clicked_at).toLocaleString(),
      c.country || "Unknown",
      c.city || "Unknown",
      c.device_type || "Unknown",
      c.browser || "Unknown",
      c.os || "Unknown",
      c.referrer || "Direct",
      c.is_unique ? "Yes" : "No"
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${link?.short_code || id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Monochrome colors for sources
  const sourceColors = ["#1a1a1a", "#404040", "#666666", "#888888", "#aaaaaa", "#cccccc", "#e5e5e5", "#f5f5f5"];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Responsive with proper spacing */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container px-3 sm:px-4">
          {/* Main header row */}
          <div className="flex h-14 items-center gap-2 sm:gap-4">
            {/* Back button */}
            <Button variant="ghost" size="icon-sm" asChild className="h-9 w-9 rounded-full shrink-0">
              <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            
            {/* Link info - takes available space */}
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-foreground/5 border border-border flex items-center justify-center shrink-0">
                <Link2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-xs sm:text-sm block truncate max-w-[120px] xs:max-w-[180px] sm:max-w-none">
                  {link?.title || link?.short_code || "Analytics"}
                </span>
                {link && (
                  <span className="text-[10px] sm:text-xs text-muted-foreground truncate block">
                    /{link.short_code}
                  </span>
                )}
              </div>
            </div>
            
            {/* Action buttons - responsive layout */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Date picker - hidden text on mobile */}
              <DateRangePicker value={dateRange} onChange={setDateRange} />
              
              {/* Share button */}
              <ShareAnalyticsDialog 
                linkId={id || ""} 
                linkTitle={link?.title || link?.short_code}
                existingShares={shares}
                onShareCreated={refetchShares}
              />
              
              {/* Export button - icon only on mobile */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportCSV} 
                className="gap-1.5 h-8 rounded-xl px-2.5 sm:px-3"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-xs">Export</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-20 pb-12 container px-3 sm:px-4 md:px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 sm:space-y-6">
          
          {/* Overview Stats Grid - Responsive */}
          <section>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                <h2 className="text-base sm:text-lg font-semibold">Overview</h2>
              </div>
              <TrendIndicator clicks={clicks} periodDays={7} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
              {[
                { 
                  label: "Total Clicks", 
                  value: summary.totalClicks, 
                  icon: MousePointer,
                  trend: { current: trendStats.currentTotal, previous: trendStats.previousTotal }
                },
                { 
                  label: "Unique Visitors", 
                  value: summary.uniqueClicks, 
                  icon: Users,
                  trend: { current: trendStats.currentUnique, previous: trendStats.previousUnique }
                },
                { 
                  label: "Conversion", 
                  value: ctr, 
                  icon: Activity, 
                  isPercent: true,
                  trend: null
                },
                { 
                  label: "Countries", 
                  value: summary.countryStats.length, 
                  icon: Globe,
                  trend: null
                },
                { 
                  label: "Cities", 
                  value: cityStats.length, 
                  icon: MapPin,
                  trend: null
                },
              ].map((stat, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-border bg-card hover:shadow-md hover:border-border/80 transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <stat.icon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{stat.label}</p>
                    </div>
                    {stat.trend && (
                      <StatTrend current={stat.trend.current} previous={stat.trend.previous} />
                    )}
                  </div>
                  <p className="text-lg sm:text-2xl font-bold">
                    {stat.isPercent ? (
                      <AnimatedCounter value={stat.value as number} formatFn={(v) => `${v.toFixed(1)}%`} />
                    ) : (
                      <AnimatedCounter value={stat.value as number} />
                    )}
                  </p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Timeline Chart */}
          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-border bg-card hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4 flex-wrap gap-2">
              <h3 className="font-semibold text-sm sm:text-base">Clicks Over Time</h3>
              <span className="text-[10px] sm:text-xs text-muted-foreground px-2 py-1 bg-muted rounded-full">
                {dateRange === "all" ? "All time" : `Last ${dateRange.replace("d", " days")}`}
              </span>
            </div>
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary.clicksTimeline}>
                  <defs>
                    <linearGradient id="colorClicksMono" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1a1a1a" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#1a1a1a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} 
                    tickFormatter={(v) => v.slice(5)} 
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} 
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      fontSize: "12px"
                    }} 
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="clicks" 
                    stroke="#1a1a1a" 
                    fill="url(#colorClicksMono)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.section>

          {/* Heatmap Section */}
          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-border bg-card overflow-x-auto"
          >
            <div className="flex items-center gap-2 mb-3 sm:mb-4 flex-wrap">
              <Grid3X3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm sm:text-base">Click Heatmap</h3>
              <span className="text-[10px] sm:text-xs text-muted-foreground ml-auto">Hour × Day of Week</span>
            </div>
            <div className="min-w-[320px]">
              <ClickHeatmap clicks={filteredClicks} />
            </div>
          </motion.section>

          {/* Live Activity & Geographic Data */}
          <div className="grid lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Live Activity Feed */}
            <motion.section 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-border bg-card lg:col-span-1"
            >
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm sm:text-base">Live Activity</h3>
                {clicks.length > 0 && (
                  <span className="ml-auto flex items-center gap-1">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-foreground animate-pulse" />
                    <span className="text-[10px] sm:text-xs text-muted-foreground">Live</span>
                  </span>
                )}
              </div>
              <LiveActivityFeed clicks={filteredClicks} maxItems={5} />
            </motion.section>

            {/* Countries */}
            <motion.section 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-border bg-card"
            >
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm sm:text-base">Top Countries</h3>
              </div>
              {summary.countryStats.length === 0 ? (
                <div className="py-6 sm:py-8 text-center">
                  <Globe className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-xs sm:text-sm text-muted-foreground">No data yet</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-2.5">
                  {summary.countryStats.slice(0, 6).map((country, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1 sm:py-1.5">
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                        <span className="text-base sm:text-lg">{getCountryFlag(country.name)}</span>
                        <span className="text-xs sm:text-sm font-medium truncate">{country.name}</span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <div className="w-10 sm:w-16 h-1 sm:h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-foreground rounded-full transition-all" 
                            style={{ width: `${(country.value / summary.totalClicks) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs sm:text-sm font-medium w-6 sm:w-8 text-right text-muted-foreground">{country.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.section>

            {/* Cities */}
            <motion.section 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-border bg-card"
            >
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm sm:text-base">Top Cities</h3>
              </div>
              {cityStats.length === 0 ? (
                <div className="py-6 sm:py-8 text-center">
                  <MapPin className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-xs sm:text-sm text-muted-foreground">No data yet</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-2.5">
                  {cityStats.slice(0, 6).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1 sm:py-1.5">
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                        <span className="text-base sm:text-lg">{getCountryFlag(item.country)}</span>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs sm:text-sm font-medium block truncate">{item.city}</span>
                          <span className="text-[10px] sm:text-xs text-muted-foreground">{item.country}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <div className="w-8 sm:w-12 h-1 sm:h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-foreground/70 rounded-full transition-all" 
                            style={{ width: `${(item.count / summary.totalClicks) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs sm:text-sm font-medium w-6 sm:w-8 text-right text-muted-foreground">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.section>
          </div>

          {/* Devices, Browsers, OS Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Devices */}
            <motion.section 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-border bg-card"
            >
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <Monitor className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm sm:text-base">Devices</h3>
              </div>
              {summary.deviceStats.length === 0 ? (
                <div className="py-8 text-center">
                  <Monitor className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No data yet</p>
                </div>
              ) : (
                <>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={summary.deviceStats} 
                          dataKey="value" 
                          nameKey="name" 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={30} 
                          outerRadius={55}
                          paddingAngle={2}
                        >
                          {summary.deviceStats.map((entry, idx) => (
                            <Cell key={idx} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 space-y-2">
                    {summary.deviceStats.map((d, idx) => {
                      const Icon = d.name.toLowerCase() === 'mobile' ? Smartphone : 
                                   d.name.toLowerCase() === 'tablet' ? Tablet : Monitor;
                      return (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground flex-1">{d.name}</span>
                          <span className="font-medium">{d.value}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.section>

            {/* Browsers */}
            <motion.section 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-5 rounded-2xl border border-border bg-card"
            >
              <h3 className="font-semibold mb-4">Browsers</h3>
              {summary.browserStats.length === 0 ? (
                <div className="py-8 text-center">
                  <Globe className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No data yet</p>
                </div>
              ) : (
                <>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={summary.browserStats} 
                          dataKey="value" 
                          nameKey="name" 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={30} 
                          outerRadius={55}
                          paddingAngle={2}
                        >
                          {summary.browserStats.map((entry, idx) => (
                            <Cell key={idx} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 space-y-2">
                    {summary.browserStats.slice(0, 5).map((d, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                        <span className="text-muted-foreground flex-1 truncate">{d.name}</span>
                        <span className="font-medium">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.section>

            {/* Operating Systems */}
            <motion.section 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="p-5 rounded-2xl border border-border bg-card"
            >
              <h3 className="font-semibold mb-4">Operating Systems</h3>
              {summary.osStats.length === 0 ? (
                <div className="py-8 text-center">
                  <Monitor className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No data yet</p>
                </div>
              ) : (
                <>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={summary.osStats} 
                          dataKey="value" 
                          nameKey="name" 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={30} 
                          outerRadius={55}
                          paddingAngle={2}
                        >
                          {summary.osStats.map((entry, idx) => (
                            <Cell key={idx} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 space-y-2">
                    {summary.osStats.slice(0, 5).map((d, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                        <span className="text-muted-foreground flex-1 truncate">{d.name}</span>
                        <span className="font-medium">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.section>
          </div>

          {/* Traffic Sources */}
          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="p-5 rounded-2xl border border-border bg-card"
          >
            <h3 className="font-semibold mb-4">Traffic Sources</h3>
            {summary.referrerStats.length === 0 ? (
              <div className="py-8 text-center">
                <Link2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No data yet</p>
              </div>
            ) : (
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary.referrerStats} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={80} 
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Bar dataKey="value" fill="#1a1a1a" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2.5">
                  {summary.referrerStats.map((source, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-2.5 h-2.5 rounded-full shrink-0" 
                          style={{ backgroundColor: sourceColors[idx % sourceColors.length] }} 
                        />
                        <span className="text-sm">{source.name}</span>
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">{source.value} clicks</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.section>

          {/* Click Log Table */}
          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="p-5 rounded-2xl border border-border bg-card"
          >
            <div className="flex items-center gap-2 mb-4">
              <List className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Click Log</h3>
              <span className="text-xs text-muted-foreground ml-auto">{filteredClicks.length} total</span>
            </div>
            <ClickLogTable clicks={filteredClicks} itemsPerPage={10} />
          </motion.section>

        </motion.div>
      </main>
    </div>
  );
};

export default Analytics;
