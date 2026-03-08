import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Link2, MousePointer, Users, Globe, Lock, 
  Eye, Calendar, ExternalLink, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCountryFlag } from "@/lib/countryFlags";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";

interface SharedAnalyticsData {
  link: {
    id: string;
    short_code: string;
    title: string | null;
    original_url: string;
    created_at: string;
    click_count: number;
  };
  summary: {
    total_clicks: number;
    unique_clicks: number;
    devices: { name: string; count: number }[];
    countries: { name: string; count: number }[];
    referrers: { name: string; count: number }[];
    timeline: { date: string; clicks: number }[];
  };
  shared_at: string;
  views_count: number;
}

const MONO_COLORS = ["hsl(var(--foreground))", "hsl(var(--foreground) / 0.7)", "hsl(var(--foreground) / 0.5)", "hsl(var(--foreground) / 0.35)", "hsl(var(--foreground) / 0.2)", "hsl(var(--foreground) / 0.1)"];

const SharedAnalytics = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [linkTitle, setLinkTitle] = useState<string | null>(null);
  const [data, setData] = useState<SharedAnalyticsData | null>(null);

  const fetchData = async (pwd?: string) => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shared-analytics`);
      url.searchParams.set('token', token);
      if (pwd) {
        url.searchParams.set('password', pwd);
      }

      const response = await fetch(url.toString());
      const result = await response.json();

      if (!response.ok) {
        if (result.requires_password) {
          setRequiresPassword(true);
          setLinkTitle(result.link_title || null);
          if (pwd) {
            setError("Invalid password");
          }
        } else {
          setError(result.error || 'Failed to load analytics');
        }
        return;
      }

      setData(result);
      setRequiresPassword(false);
    } catch (err) {
      console.error('Error fetching shared analytics:', err);
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      fetchData(password);
    }
  };

  // Calculate conversion rate
  const ctr = useMemo(() => {
    if (!data || data.summary.total_clicks === 0) return "0%";
    return `${((data.summary.unique_clicks / data.summary.total_clicks) * 100).toFixed(1)}%`;
  }, [data]);

  // Loading state
  if (loading && !requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Password required state
  if (requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm"
        >
          <div className="p-6 rounded-2xl border border-border bg-card shadow-lg">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mx-auto mb-4">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <h1 className="text-lg font-semibold text-center mb-1">
              Password Protected
            </h1>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {linkTitle ? (
                <>Analytics for <span className="font-medium text-foreground">"{linkTitle}"</span> requires a password</>
              ) : (
                "This analytics dashboard is password protected"
              )}
            </p>
            
            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-center"
                autoFocus
              />
              {error && (
                <p className="text-xs text-destructive text-center">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={!password.trim() || loading}>
                {loading ? "Verifying..." : "View Analytics"}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm text-center"
        >
          <div className="p-6 rounded-2xl border border-border bg-card">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-lg font-semibold mb-2">Unable to Load</h1>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button asChild variant="outline">
              <Link to="/">Go Home</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container flex h-14 items-center gap-4 px-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-foreground/5 border border-border flex items-center justify-center shrink-0">
              <Link2 className="h-4 w-4 text-foreground" />
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-sm block truncate">
                {data.link.title || data.link.short_code}
              </span>
              <span className="text-xs text-muted-foreground truncate block">
                Shared Analytics
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
            <Eye className="h-3.5 w-3.5" />
            <span>{data.views_count} views</span>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          {/* Link Info */}
          <div className="p-4 rounded-2xl border border-border bg-card">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold truncate">
                  {data.link.title || `/${data.link.short_code}`}
                </h1>
                <a 
                  href={data.link.original_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 truncate"
                >
                  {data.link.original_url}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold">{data.link.click_count}</p>
                <p className="text-xs text-muted-foreground">total clicks</p>
              </div>
            </div>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Clicks", value: data.summary.total_clicks, icon: MousePointer },
              { label: "Unique Visitors", value: data.summary.unique_clicks, icon: Users },
              { label: "Conversion", value: ctr, icon: Globe },
              { label: "Countries", value: data.summary.countries.length, icon: Globe },
            ].map((stat, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-2xl border border-border bg-card"
              >
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
                <p className="text-xl font-bold">{stat.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Timeline Chart */}
          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-5 rounded-2xl border border-border bg-card"
          >
            <h3 className="font-semibold mb-4">Clicks Over Time</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.summary.timeline}>
                  <defs>
                    <linearGradient id="sharedColorClicks" x1="0" y1="0" x2="0" y2="1">
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
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} 
                    axisLine={false}
                    tickLine={false}
                    width={25}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="clicks" 
                    stroke="#1a1a1a" 
                    fill="url(#sharedColorClicks)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.section>

          {/* Countries & Sources */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Countries */}
            <motion.section 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="p-5 rounded-2xl border border-border bg-card"
            >
              <h3 className="font-semibold mb-4">Top Countries</h3>
              {data.summary.countries.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No data yet</p>
              ) : (
                <div className="space-y-2">
                  {data.summary.countries.slice(0, 5).map((country, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getCountryFlag(country.name)}</span>
                        <span className="text-sm">{country.name}</span>
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">{country.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.section>

            {/* Traffic Sources */}
            <motion.section 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-5 rounded-2xl border border-border bg-card"
            >
              <h3 className="font-semibold mb-4">Traffic Sources</h3>
              {data.summary.referrers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No data yet</p>
              ) : (
                <div className="space-y-2">
                  {data.summary.referrers.slice(0, 5).map((ref, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: MONO_COLORS[idx] || "#ccc" }}
                        />
                        <span className="text-sm">{ref.name}</span>
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">{ref.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.section>
          </div>

          {/* Devices */}
          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="p-5 rounded-2xl border border-border bg-card"
          >
            <h3 className="font-semibold mb-4">Devices</h3>
            {data.summary.devices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No data yet</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={data.summary.devices.map((d, i) => ({ ...d, fill: MONO_COLORS[i] }))} 
                        dataKey="count" 
                        nameKey="name" 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={25} 
                        outerRadius={50}
                        paddingAngle={2}
                      >
                        {data.summary.devices.map((_, idx) => (
                          <Cell key={idx} fill={MONO_COLORS[idx] || "#ccc"} />
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
                <div className="space-y-2">
                  {data.summary.devices.map((device, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <div 
                        className="w-2.5 h-2.5 rounded-full shrink-0" 
                        style={{ backgroundColor: MONO_COLORS[idx] || "#ccc" }} 
                      />
                      <span className="flex-1 capitalize">{device.name}</span>
                      <span className="font-medium">{device.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.section>

          {/* Footer */}
          <div className="text-center pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Powered by <a href="/" className="underline hover:text-foreground">SliceURL</a>
            </p>
          </div>

        </motion.div>
      </main>
    </div>
  );
};

export default SharedAnalytics;
