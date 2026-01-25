import { motion } from "framer-motion";
import { X, Globe, Smartphone, Monitor, Tablet, Share2, Clock, Calendar, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useTimeAnalytics } from "@/hooks/useTimeAnalytics";
import { getCountryFlag } from "@/lib/countryFlags";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar 
} from "recharts";

interface AnalyticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkId: string;
  linkTitle?: string;
}

export function AnalyticsModal({ open, onOpenChange, linkId, linkTitle }: AnalyticsModalProps) {
  const { summary, loading } = useAnalytics(linkId);
  const { hourlyData, dailyData, loading: timeLoading } = useTimeAnalytics(linkId);

  if (loading || timeLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Full Analytics</span>
            {linkTitle && <Badge variant="secondary">{linkTitle}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 mt-4"
        >
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Clicks", value: summary.totalClicks, icon: Users },
              { label: "Unique", value: summary.uniqueClicks, icon: Users },
              { label: "Countries", value: summary.countryStats.length, icon: Globe },
              { label: "Sources", value: summary.referrerStats.length, icon: Share2 },
            ].map((stat, i) => (
              <div key={i} className="p-4 rounded-xl border border-border bg-card/50">
                <stat.icon className="h-4 w-4 text-muted-foreground mb-2" />
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Hourly Chart */}
          <div className="p-4 rounded-xl border border-border bg-card/50">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium text-sm">Clicks by Hour (Last 24h)</h3>
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData}>
                  <defs>
                    <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={3} />
                  <YAxis tick={{ fontSize: 10 }} width={30} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="clicks" 
                    stroke="hsl(var(--primary))" 
                    fill="url(#hourlyGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly Chart */}
          <div className="p-4 rounded-xl border border-border bg-card/50">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium text-sm">Clicks by Day (Last 7 days)</h3>
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} width={30} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar 
                    dataKey="clicks" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Two column grid for charts */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Country & City Table */}
            <div className="p-4 rounded-xl border border-border bg-card/50">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium text-sm">Top Countries & Cities</h3>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {summary.countryStats.slice(0, 10).map((stat, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span>{getCountryFlag(stat.name)}</span>
                      <span className="text-muted-foreground">{stat.name}</span>
                    </div>
                    <span className="font-medium">{stat.value}</span>
                  </div>
                ))}
                {summary.countryStats.length === 0 && (
                  <p className="text-sm text-muted-foreground">No data yet</p>
                )}
              </div>
            </div>

            {/* Referral Sources */}
            <div className="p-4 rounded-xl border border-border bg-card/50">
              <div className="flex items-center gap-2 mb-4">
                <Share2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium text-sm">Referral Sources</h3>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {summary.referrerStats.slice(0, 10).map((stat, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{stat.name}</span>
                    <span className="font-medium">{stat.value}</span>
                  </div>
                ))}
                {summary.referrerStats.length === 0 && (
                  <p className="text-sm text-muted-foreground">No referral data yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Device, Browser, OS Charts */}
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { title: "Devices", data: summary.deviceStats, icon: Smartphone },
              { title: "Browsers", data: summary.browserStats, icon: Globe },
              { title: "Operating Systems", data: summary.osStats, icon: Monitor },
            ].map((chart, i) => (
              <div key={i} className="p-4 rounded-xl border border-border bg-card/50">
                <div className="flex items-center gap-2 mb-3">
                  <chart.icon className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium text-sm">{chart.title}</h3>
                </div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={chart.data} 
                        dataKey="value" 
                        nameKey="name" 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={25} 
                        outerRadius={45}
                      >
                        {chart.data.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 space-y-1">
                  {chart.data.slice(0, 3).map((d, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                      <span className="text-muted-foreground truncate">{d.name}</span>
                      <span className="ml-auto font-medium">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
