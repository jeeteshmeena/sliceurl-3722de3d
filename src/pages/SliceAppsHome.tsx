import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Star, TrendingUp, Sparkles, Clock } from "lucide-react";
import { SliceAppsHeader } from "@/components/sliceapps";

interface AppCard {
  id: string;
  short_code: string | null;
  app_name: string;
  developer_name: string | null;
  category: string | null;
  icon_url: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  total_downloads: number | null;
  created_at: string;
}

function AppCardSmall({ app, onClick }: { app: AppCard; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full text-left py-3 group"
    >
      <div className="w-[60px] h-[60px] rounded-[14px] flex-shrink-0 overflow-hidden bg-muted">
        {app.icon_url ? (
          <img src={app.icon_url} alt={app.app_name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-lg font-bold">
            {app.app_name.charAt(0)}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-foreground leading-tight truncate">
          {app.app_name}
        </p>
        <p className="text-[13px] text-muted-foreground leading-snug mt-0.5 truncate">
          {app.developer_name || "Unknown Developer"}
        </p>
        {app.rating_avg !== null && app.rating_avg > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <div className="flex gap-px">
              {[1, 2, 3, 4, 5].map(s => (
                <Star
                  key={s}
                  className={`h-2.5 w-2.5 ${s <= Math.round(app.rating_avg || 0) ? "fill-current text-foreground" : "text-muted-foreground/25"}`}
                  strokeWidth={0}
                />
              ))}
            </div>
            <span className="text-[11px] text-muted-foreground">{app.rating_avg.toFixed(1)}</span>
          </div>
        )}
      </div>
    </button>
  );
}

function AppCardLarge({ app, onClick }: { app: AppCard; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-[140px] snap-start group"
    >
      <div className="w-[140px] h-[140px] rounded-[28px] overflow-hidden bg-muted mb-2 transition-transform duration-200 group-active:scale-[0.97]">
        {app.icon_url ? (
          <img src={app.icon_url} alt={app.app_name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-3xl font-bold">
            {app.app_name.charAt(0)}
          </div>
        )}
      </div>
      <p className="text-[13px] font-medium text-foreground leading-tight truncate">
        {app.app_name}
      </p>
      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 truncate">
        {app.category || "Other"}
      </p>
    </button>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: typeof TrendingUp; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 px-4">
      <Icon className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.8} />
      <h2 className="text-[17px] font-semibold text-foreground tracking-tight">{title}</h2>
    </div>
  );
}

export default function SliceAppsHome() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<AppCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-app-info?list=true`,
        { method: "GET", headers: { "Content-Type": "application/json" }, credentials: "omit" }
      );
      if (response.ok) {
        const data = await response.json();
        setApps(data.apps || []);
      }
    } catch (err) {
      console.error("Failed to load apps:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const goToApp = (app: AppCard) => {
    navigate(`/app/${app.short_code || app.id}`);
  };

  // Split apps into sections
  const featuredApps = [...apps].sort((a, b) => (b.total_downloads || 0) - (a.total_downloads || 0)).slice(0, 8);
  const newestApps = [...apps].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);
  const topRated = [...apps].filter(a => a.rating_avg && a.rating_avg > 0).sort((a, b) => (b.rating_avg || 0) - (a.rating_avg || 0)).slice(0, 10);

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background">
        <SliceAppsHeader />
        <div className="flex items-center justify-center py-32">
          <p className="text-muted-foreground text-sm">Loading apps...</p>
        </div>
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div className="min-h-dvh bg-background">
        <SliceAppsHeader />
        <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
          <p className="text-lg font-semibold text-foreground mb-2">No apps yet</p>
          <p className="text-sm text-muted-foreground">
            Upload an APK on LittleSlice and create an app page to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <SliceAppsHeader />

      <main className="max-w-2xl mx-auto pb-12">
        {/* Hero — Feature the top app */}
        {featuredApps.length > 0 && (
          <section className="px-4 pt-6 pb-2">
            <button
              onClick={() => goToApp(featuredApps[0])}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/50 transition-colors active:bg-muted/80"
            >
              <div className="w-[80px] h-[80px] rounded-[20px] flex-shrink-0 overflow-hidden bg-muted">
                {featuredApps[0].icon_url ? (
                  <img src={featuredApps[0].icon_url} alt={featuredApps[0].app_name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-2xl font-bold">
                    {featuredApps[0].app_name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Featured</p>
                <p className="text-lg font-bold text-foreground leading-tight truncate">{featuredApps[0].app_name}</p>
                <p className="text-[13px] text-muted-foreground mt-0.5 truncate">
                  {featuredApps[0].developer_name || "Unknown Developer"}
                </p>
              </div>
            </button>
          </section>
        )}

        {/* Trending Apps — horizontal scroll large cards */}
        {featuredApps.length > 1 && (
          <section className="mt-6">
            <SectionHeader icon={TrendingUp} title="Trending" />
            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
              <div className="flex gap-4 snap-x snap-mandatory pb-2">
                {featuredApps.slice(1).map(app => (
                  <AppCardLarge key={app.id} app={app} onClick={() => goToApp(app)} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* New Apps — list style */}
        {newestApps.length > 0 && (
          <section className="mt-8 px-4">
            <SectionHeader icon={Clock} title="New Apps" />
            <div className="divide-y divide-border/50">
              {newestApps.slice(0, 5).map(app => (
                <AppCardSmall key={app.id} app={app} onClick={() => goToApp(app)} />
              ))}
            </div>
          </section>
        )}

        {/* Top Rated — horizontal scroll large cards */}
        {topRated.length > 0 && (
          <section className="mt-8">
            <SectionHeader icon={Sparkles} title="Top Rated" />
            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
              <div className="flex gap-4 snap-x snap-mandatory pb-2">
                {topRated.map(app => (
                  <AppCardLarge key={app.id} app={app} onClick={() => goToApp(app)} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}