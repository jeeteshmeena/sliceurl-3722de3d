import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Smartphone, Monitor, Tablet, Globe, MousePointerClick, Users, TrendingUp } from "lucide-react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { getTopCountryFlags } from "@/lib/countryFlags";
import { calculateHealthStatus, getHealthStatusConfig } from "@/hooks/useLinkHealth";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, Cell, PieChart, Pie } from "recharts";
import { useLanguage } from "@/lib/i18n";

interface InlineAnalyticsProps {
  linkId: string;
  lastClickedAt: string | null;
  isBroken?: boolean;
}

export function InlineAnalytics({ linkId, lastClickedAt, isBroken = false }: InlineAnalyticsProps) {
  const { t } = useLanguage();
  const { summary, loading } = useAnalytics(linkId);
  const [isOpen, setIsOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    timeline: true,
    countries: false,
    devices: false,
    sources: false,
  });

  const healthStatus = useMemo(() => calculateHealthStatus(lastClickedAt, isBroken), [lastClickedAt, isBroken]);
  const healthConfig = getHealthStatusConfig(healthStatus);

  const countryFlags = useMemo(() => getTopCountryFlags(summary.countryStats, 3), [summary.countryStats]);

  const deviceData = useMemo(() => {
    const total = summary.deviceStats.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) return { mobile: 0, desktop: 0, tablet: 0 };
    const mobileCount = summary.deviceStats.find(d => d.name.toLowerCase() === 'mobile')?.value || 0;
    const desktopCount = summary.deviceStats.find(d => d.name.toLowerCase() === 'desktop')?.value || 0;
    const tabletCount = summary.deviceStats.find(d => d.name.toLowerCase() === 'tablet')?.value || 0;
    return {
      mobile: Math.round((mobileCount / total) * 100),
      desktop: Math.round((desktopCount / total) * 100),
      tablet: Math.round((tabletCount / total) * 100),
    };
  }, [summary.deviceStats]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const colors = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--muted-foreground))', '#22c55e', '#f59e0b'];

  if (loading) {
    return (
      <div className="flex items-center gap-2 animate-pulse mt-2 pt-2 border-t border-border/50">
        <div className="h-4 w-16 bg-muted rounded" />
        <div className="h-4 w-12 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="mt-2 pt-2 border-t border-border/50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between py-2 text-sm hover:bg-muted/50 rounded-lg px-2 transition-colors">
            <div className="flex items-center gap-3">
              {/* Health Indicator */}
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${healthConfig.bgColor}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  healthStatus === 'active' ? 'bg-green-500' : 
                  healthStatus === 'low_activity' ? 'bg-yellow-500' : 
                  healthStatus === 'inactive' ? 'bg-orange-500' : 'bg-red-500'
                }`} />
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

              {/* Quick Stats */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MousePointerClick className="h-3 w-3" />
                  {summary.totalClicks}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {summary.uniqueClicks}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("analytics")}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 pt-3"
              >
                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold">{summary.totalClicks}</p>
                    <p className="text-xs text-muted-foreground">{t("clicks")}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold">{summary.uniqueClicks}</p>
                    <p className="text-xs text-muted-foreground">Unique</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold">{summary.countryStats.length}</p>
                    <p className="text-xs text-muted-foreground">Countries</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold">{summary.referrerStats.length}</p>
                    <p className="text-xs text-muted-foreground">Sources</p>
                  </div>
                </div>

                {/* Timeline Section */}
                <Collapsible open={openSections.timeline} onOpenChange={() => toggleSection('timeline')}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg text-sm font-medium">
                      <span className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Clicks Timeline
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${openSections.timeline ? 'rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="h-32 mt-2">
                      {summary.clicksTimeline.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={summary.clicksTimeline}>
                            <defs>
                              <linearGradient id="clickGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
                            <Tooltip 
                              contentStyle={{ 
                                background: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                fontSize: '12px'
                              }} 
                            />
                            <Area 
                              type="monotone" 
                              dataKey="clicks" 
                              stroke="hsl(var(--primary))" 
                              fill="url(#clickGradient)" 
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                          No click data yet
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Countries Section */}
                <Collapsible open={openSections.countries} onOpenChange={() => toggleSection('countries')}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg text-sm font-medium">
                      <span className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Countries
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${openSections.countries ? 'rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 space-y-1">
                      {summary.countryStats.slice(0, 5).map((country, i) => (
                        <div key={country.name} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50">
                          <span>{country.name}</span>
                          <span className="text-muted-foreground">{country.value} clicks</span>
                        </div>
                      ))}
                      {summary.countryStats.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-2">No country data</p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Devices Section */}
                <Collapsible open={openSections.devices} onOpenChange={() => toggleSection('devices')}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg text-sm font-medium">
                      <span className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Devices
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${openSections.devices ? 'rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2">
                      {summary.totalClicks > 0 ? (
                        <>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <Smartphone className="h-3 w-3" />
                            <span>Mobile: {deviceData.mobile}%</span>
                            <Monitor className="h-3 w-3 ml-2" />
                            <span>Desktop: {deviceData.desktop}%</span>
                            {deviceData.tablet > 0 && (
                              <>
                                <Tablet className="h-3 w-3 ml-2" />
                                <span>Tablet: {deviceData.tablet}%</span>
                              </>
                            )}
                          </div>
                          <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                            <div className="bg-sky-500" style={{ width: `${deviceData.mobile}%` }} />
                            <div className="bg-indigo-500" style={{ width: `${deviceData.desktop}%` }} />
                            {deviceData.tablet > 0 && (
                              <div className="bg-amber-500" style={{ width: `${deviceData.tablet}%` }} />
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-2">No device data</p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Sources Section */}
                <Collapsible open={openSections.sources} onOpenChange={() => toggleSection('sources')}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg text-sm font-medium">
                      <span className="flex items-center gap-2">
                        <MousePointerClick className="h-4 w-4" />
                        Sources
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${openSections.sources ? 'rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 flex items-start gap-4">
                      {summary.referrerStats.length > 0 ? (
                        <>
                          <div className="w-20 h-20 shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={summary.referrerStats.slice(0, 5)}
                                  dataKey="value"
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={15}
                                  outerRadius={35}
                                  strokeWidth={0}
                                >
                                  {summary.referrerStats.slice(0, 5).map((_, idx) => (
                                    <Cell key={idx} fill={colors[idx % colors.length]} />
                                  ))}
                                </Pie>
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex-1 space-y-1">
                            {summary.referrerStats.slice(0, 5).map((source, i) => (
                              <div key={source.name} className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                                  {source.name}
                                </span>
                                <span className="text-muted-foreground">{source.value}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-2 w-full">No source data</p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </motion.div>
            )}
          </AnimatePresence>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
