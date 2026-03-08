import {
  Star,
  Download,
  User,
  Gamepad2,
  Wrench,
  Users,
  GraduationCap,
  Camera,
  Popcorn,
  Send,
  Wallet,
  Navigation,
  Armchair,
  Sparkles,
  Music,
  ShoppingBag,
  HeartPulse,
  Newspaper,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  photography: Camera,
  social: Users,
  entertainment: Popcorn,
  education: GraduationCap,
  productivity: Send,
  finance: Wallet,
  navigation: Navigation,
  lifestyle: Armchair,
  action: Sparkles,
  game: Gamepad2,
  music: Music,
  shopping: ShoppingBag,
  health: HeartPulse,
  utilities: Wrench,
  tool: Wrench,
  news: Newspaper,
};

function CategoryIcon({ category }: { category: string }) {
  const cat = category.toLowerCase();
  const matched = Object.entries(CATEGORY_ICONS).find(([key]) => cat.includes(key));
  const Icon = matched ? matched[1] : LayoutGrid;
  return <Icon className="h-6 w-6 text-muted-foreground" strokeWidth={1.8} />;
}

interface MetadataStripProps {
  ratingAvg: number | null;
  ratingCount: number | null;
  downloads: string;
  fileSize: string;
  ageRating?: string;
  category: string;
  developer: string;
}

function StarRow({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <div className="flex gap-px">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3 w-3 ${s <= rounded ? "fill-current text-foreground" : "text-muted-foreground/30 fill-muted-foreground/10"}`}
          strokeWidth={0}
        />
      ))}
    </div>
  );
}

function formatRatingCount(count: number | null): string {
  if (!count || count === 0) return "";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M Ratings`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K Ratings`;
  if (count >= 100) return `${count}+ Ratings`;
  return `${count} Ratings`;
}

export function MetadataStrip({
  ratingAvg,
  ratingCount,
  downloads,
  fileSize,
  ageRating = "4+",
  category,
  developer,
}: MetadataStripProps) {
  const devFirstWord = developer ? developer.split(" ")[0] : "Unknown";

  return (
    <div className="mt-5 overflow-x-auto overflow-y-hidden scrollbar-hide -mx-4 px-4 scroll-smooth">
      <div className="flex snap-x snap-mandatory">
        {/* RATINGS */}
        <div className="flex flex-col items-center justify-between min-w-[110px] w-[110px] flex-shrink-0 snap-start py-3 px-2">
          <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Ratings</span>
          <span className="text-[22px] font-semibold text-foreground mt-1 whitespace-nowrap leading-tight">
            {ratingAvg?.toFixed(1) || "0.0"}
          </span>
          <div className="mt-1 flex flex-col items-center gap-0.5">
            <StarRow rating={ratingAvg || 0} />
            {ratingCount && ratingCount > 0 && (
              <span className="text-[11px] text-muted-foreground text-center leading-tight">{formatRatingCount(ratingCount)}</span>
            )}
          </div>
        </div>

        {/* AGES */}
        <div className="flex flex-col items-center justify-between min-w-[110px] w-[110px] flex-shrink-0 snap-start py-3 px-2">
          <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Ages</span>
          <span className="text-[22px] font-semibold text-foreground mt-1 whitespace-nowrap leading-tight">{ageRating}</span>
          <span className="mt-1 text-[11px] text-muted-foreground text-center leading-tight">Years Old</span>
        </div>

        {/* CATEGORY */}
        <div className="flex flex-col items-center justify-between min-w-[110px] w-[110px] flex-shrink-0 snap-start py-3 px-2">
          <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Category</span>
          <div className="mt-1">
            <CategoryIcon category={category} />
          </div>
          <span className="mt-1 text-[11px] text-muted-foreground text-center leading-tight">{category || "Other"}</span>
        </div>

        {/* DEVELOPER */}
        <div className="flex flex-col items-center justify-between min-w-[110px] w-[110px] flex-shrink-0 snap-start py-3 px-2">
          <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Developer</span>
          <div className="mt-1">
            <User className="h-6 w-6 text-foreground fill-foreground" strokeWidth={0} />
          </div>
          <span className="mt-1 text-[11px] text-muted-foreground text-center leading-tight">{devFirstWord}</span>
        </div>

        {/* SIZE */}
        <div className="flex flex-col items-center justify-between min-w-[110px] w-[110px] flex-shrink-0 snap-start py-3 px-2">
          <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Size</span>
          <span className="text-[22px] font-semibold text-foreground mt-1 whitespace-nowrap leading-tight">{fileSize || "--"}</span>
        </div>

        {/* DOWNLOADS */}
        <div className="flex flex-col items-center justify-between min-w-[110px] w-[110px] flex-shrink-0 snap-start py-3 px-2">
          <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Downloads</span>
          <div className="flex items-center gap-1 mt-1">
            <Download className="h-4 w-4 text-foreground fill-foreground" strokeWidth={0} />
            <span className="text-[22px] font-semibold text-foreground whitespace-nowrap leading-tight">{downloads}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MetadataStrip;
