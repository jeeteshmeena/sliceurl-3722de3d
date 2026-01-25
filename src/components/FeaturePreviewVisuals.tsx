import { Lock, Shield, Zap, Globe, FolderOpen, Clock, BarChart3, Share2, Target, QrCode } from "lucide-react";

/**
 * Visual mockup components for feature card previews
 * Each component provides a mini visual representation of the feature
 */

export function LockLinksVisual() {
  return (
    <div className="w-full max-w-[140px] mx-auto space-y-2">
      <div className="flex items-center gap-2 p-2 bg-secondary/60 rounded-lg border border-border/50">
        <Lock className="h-4 w-4 text-foreground/70" />
        <div className="flex-1 h-2 bg-muted rounded" />
        <div className="h-2.5 w-2.5 rounded-full bg-success animate-pulse" />
      </div>
      <div className="flex items-center justify-between text-[10px] px-1">
        <span className="text-muted-foreground">Password</span>
        <span className="font-mono text-foreground/60">••••••</span>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div className="h-full w-2/3 bg-foreground/30 rounded-full" />
      </div>
    </div>
  );
}

export function QRCodesVisual() {
  return (
    <div className="w-full max-w-[100px] mx-auto">
      <div className="grid grid-cols-5 gap-0.5 p-2 bg-white rounded-lg border border-border/50">
        {[1,1,1,1,1, 1,0,0,0,1, 1,0,1,0,1, 1,0,0,0,1, 1,1,1,1,1].map((filled, i) => (
          <div 
            key={i} 
            className={`aspect-square rounded-[1px] ${filled ? "bg-foreground" : "bg-white"}`}
          />
        ))}
      </div>
      <div className="flex justify-center gap-1.5 mt-2">
        <div className="h-2 w-2 rounded-full bg-foreground" />
        <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
        <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
      </div>
    </div>
  );
}

export function SocialVisual() {
  const platforms = [
    { label: "X", bg: "bg-foreground", text: "text-background" },
    { label: "FB", bg: "bg-blue-600", text: "text-white" },
    { label: "IN", bg: "bg-blue-700", text: "text-white" },
    { label: "WA", bg: "bg-green-600", text: "text-white" },
  ];
  return (
    <div className="w-full max-w-[140px] mx-auto">
      <div className="flex items-center justify-center gap-2">
        {platforms.map((p) => (
          <div 
            key={p.label}
            className={`h-8 w-8 rounded-full ${p.bg} flex items-center justify-center text-[9px] font-semibold ${p.text} shadow-sm`}
          >
            {p.label}
          </div>
        ))}
      </div>
      <div className="text-center mt-2 text-[9px] text-muted-foreground">Click to share anywhere</div>
    </div>
  );
}

export function AnalyticsVisual() {
  const bars = [35, 55, 45, 75, 60, 85, 70];
  return (
    <div className="w-full max-w-[140px] mx-auto">
      <div className="flex items-end justify-center gap-1.5 h-12 mb-2">
        {bars.map((height, i) => (
          <div
            key={i}
            className="w-3 bg-foreground/20 rounded-t transition-all duration-300 hover:bg-foreground/40"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
        <span>Mon</span>
        <span className="font-medium text-foreground">+24%</span>
        <span>Sun</span>
      </div>
    </div>
  );
}

export function DomainsVisual() {
  return (
    <div className="w-full max-w-[160px] mx-auto space-y-2">
      <div className="flex items-center gap-2 p-2 bg-secondary/60 rounded-lg border border-border/50">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <div className="text-[10px]">
          <span className="text-primary font-medium">yourbrand</span>
          <span className="text-muted-foreground">.co/link</span>
        </div>
      </div>
      <div className="flex items-center gap-1 justify-center">
        <div className="h-1.5 w-1.5 rounded-full bg-success" />
        <span className="text-[9px] text-muted-foreground">Connected</span>
      </div>
    </div>
  );
}

export function BulkVisual() {
  const files = [
    { name: "links.csv", status: "done" },
    { name: "batch-2.csv", status: "done" },
    { name: "urls.csv", status: "processing" },
  ];
  return (
    <div className="w-full max-w-[140px] mx-auto space-y-1.5">
      {files.map((file, i) => (
        <div key={file.name} className="flex items-center gap-2 p-1.5 bg-secondary/40 rounded text-[10px]">
          <div className={`h-2 w-2 rounded-sm ${
            file.status === "done" ? "bg-success" : "bg-amber-500 animate-pulse"
          }`} />
          <span className="text-muted-foreground flex-1 truncate">{file.name}</span>
          <span className="text-[8px] text-muted-foreground">{file.status === "done" ? "✓" : "..."}</span>
        </div>
      ))}
    </div>
  );
}

export function SchedulingVisual() {
  return (
    <div className="w-full max-w-[140px] mx-auto space-y-3">
      <div className="flex items-center justify-center gap-2">
        <Clock className="h-5 w-5 text-muted-foreground" />
        <div className="text-center">
          <div className="text-sm font-semibold text-foreground">2h 30m</div>
          <div className="text-[9px] text-muted-foreground">until active</div>
        </div>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className="h-full w-3/5 bg-foreground/40 rounded-full transition-all duration-1000" />
      </div>
    </div>
  );
}

export function InstantVisual() {
  return (
    <div className="w-full max-w-[120px] mx-auto flex flex-col items-center">
      <div className="relative">
        <Zap className="h-8 w-8 text-amber-500" />
        <div className="absolute -top-1 -right-1 h-2 w-2 bg-amber-400 rounded-full animate-ping" />
      </div>
      <div className="text-center mt-2">
        <div className="text-xl font-bold text-foreground">0.2s</div>
        <div className="text-[9px] text-muted-foreground">average redirect</div>
      </div>
    </div>
  );
}

export function MalwareVisual() {
  return (
    <div className="w-full max-w-[140px] mx-auto">
      <div className="flex items-center gap-2 p-2.5 bg-success/10 rounded-lg border border-success/20">
        <Shield className="h-5 w-5 text-success" />
        <div>
          <div className="text-[10px] font-medium text-success">Verified Safe</div>
          <div className="text-[8px] text-muted-foreground">No threats found</div>
        </div>
      </div>
    </div>
  );
}

export function UTMVisual() {
  const tags = [
    { key: "source", value: "twitter" },
    { key: "medium", value: "social" },
    { key: "campaign", value: "launch" },
  ];
  return (
    <div className="w-full max-w-[150px] mx-auto space-y-1.5">
      {tags.map((tag) => (
        <div key={tag.key} className="flex items-center gap-1.5 text-[9px]">
          <span className="px-1.5 py-0.5 bg-secondary rounded text-muted-foreground font-mono">
            utm_{tag.key}
          </span>
          <span className="text-foreground/60">=</span>
          <span className="text-foreground font-medium">{tag.value}</span>
        </div>
      ))}
    </div>
  );
}

// Feature preview content registry
export type FeatureKey = 
  | "feature_lock_links"
  | "feature_qr_codes"
  | "feature_social"
  | "feature_analytics"
  | "feature_domains"
  | "feature_bulk"
  | "feature_scheduling"
  | "feature_instant"
  | "feature_malware"
  | "feature_utm";

interface FeaturePreviewContent {
  title: string;
  description: string;
  benefit: string;
  useCase: string;
  Visual: React.ComponentType;
}

export const featurePreviewContent: Record<FeatureKey, FeaturePreviewContent> = {
  feature_lock_links: {
    title: "Password Protection",
    description: "Add passwords, expiry dates, and click limits to any link.",
    benefit: "Control exactly who can access your content.",
    useCase: "Perfect for private documents and exclusive content.",
    Visual: LockLinksVisual,
  },
  feature_qr_codes: {
    title: "Custom QR Codes",
    description: "Generate branded QR codes with custom colors and logos.",
    benefit: "Stand out with unique, scannable codes.",
    useCase: "Ideal for marketing materials and print media.",
    Visual: QRCodesVisual,
  },
  feature_social: {
    title: "Social Sharing",
    description: "Share links instantly to any social platform.",
    benefit: "One-click sharing saves time.",
    useCase: "Great for marketers and content creators.",
    Visual: SocialVisual,
  },
  feature_analytics: {
    title: "Click Analytics",
    description: "Track clicks, locations, devices, and referrers in real-time.",
    benefit: "Understand your audience deeply.",
    useCase: "Essential for measuring campaign performance.",
    Visual: AnalyticsVisual,
  },
  feature_domains: {
    title: "Custom Domains",
    description: "Use your own domain for a fully branded experience.",
    benefit: "Build trust with your own URLs.",
    useCase: "Perfect for agencies and enterprises.",
    Visual: DomainsVisual,
  },
  feature_bulk: {
    title: "Bulk Shortening",
    description: "Shorten hundreds of links at once via CSV upload.",
    benefit: "Save hours of manual work.",
    useCase: "Ideal for large campaigns and migrations.",
    Visual: BulkVisual,
  },
  feature_scheduling: {
    title: "Link Scheduling",
    description: "Schedule links to activate or expire at specific times.",
    benefit: "Automate your link lifecycle.",
    useCase: "Great for time-sensitive promotions.",
    Visual: SchedulingVisual,
  },
  feature_instant: {
    title: "Instant Redirects",
    description: "Sub-second redirects powered by global CDN.",
    benefit: "Never lose visitors to slow links.",
    useCase: "Critical for high-traffic campaigns.",
    Visual: InstantVisual,
  },
  feature_malware: {
    title: "Malware Protection",
    description: "Automatic scanning blocks malicious URLs.",
    benefit: "Keep your audience safe.",
    useCase: "Essential for user-generated content.",
    Visual: MalwareVisual,
  },
  feature_utm: {
    title: "UTM Builder",
    description: "Build and track UTM parameters automatically.",
    benefit: "Never misconfigure campaigns again.",
    useCase: "Perfect for marketing attribution.",
    Visual: UTMVisual,
  },
};
