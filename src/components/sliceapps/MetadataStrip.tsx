import {
  Star,
  User,
  Gamepad2,
  Briefcase,
  Wrench,
  Users,
  BookOpen,
  Settings,
  LayoutGrid,
  Music,
  Clapperboard,
  Navigation,
} from "lucide-react";

interface MetadataStripProps {
  ratingAvg: number | null;
  ratingCount: number | null;
  downloads: string;
  fileSize: string;
  ageRating?: string;
  category: string;
  developer: string;
}

function CategoryIcon({ category }: { category: string }) {
  const cls = "h-7 w-7 text-muted-foreground";
  const cat = category.toLowerCase();
  if (cat.includes("music")) return <Music className={cls} strokeWidth={1.5} />;
  if (cat.includes("entertainment")) return <Clapperboard className={cls} strokeWidth={1.5} />;
  if (cat.includes("game") || cat.includes("action")) return <Gamepad2 className={cls} strokeWidth={1.5} />;
  if (cat.includes("productiv")) return <Navigation className={cls} strokeWidth={1.5} />;
  if (cat.includes("tool")) return <Wrench className={cls} strokeWidth={1.5} />;
  if (cat.includes("social")) return <Users className={cls} strokeWidth={1.5} />;
  if (cat.includes("education")) return <BookOpen className={cls} strokeWidth={1.5} />;
  if (cat.includes("utilit")) return <Settings className={cls} strokeWidth={1.5} />;
  return <LayoutGrid className={cls} strokeWidth={1.5} />;
}

function StarRow({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <div className="flex gap-px">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-2.5 w-2.5 ${s <= rounded ? "fill-muted-foreground text-muted-foreground" : "text-muted-foreground/30"}`}
          strokeWidth={0}
        />
      ))}
    </div>
  );
}

function formatRatingCount(count: number | null): string {
  if (!count || count === 0) return "0 Ratings";
  if (count >= 1000000) return `${(count / 1000000).toFixed(0)}M Ratings`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K Ratings`;
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

  // Parse file size to show value and unit separately
  const sizeMatch = fileSize.match(/^([\d.]+)\s*(.*)$/);
  const sizeValue = sizeMatch ? sizeMatch[1] : fileSize;
  const sizeUnit = sizeMatch ? sizeMatch[2] : "";

  return (
    <div className="border-t border-b border-border/40 overflow-x-auto overflow-y-hidden scrollbar-hide -mx-4 scroll-smooth bg-background">
      <div className="flex min-w-max">
        {/* RATINGS - App Store exact style */}
        <div className="flex flex-col items-center justify-center min-w-[120px] py-4 px-3 border-r border-border/20">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            {formatRatingCount(ratingCount).split(" ")[0]} RATINGS
          </span>
          <span className="text-[28px] font-bold text-foreground mt-1 leading-none">
            {ratingAvg?.toFixed(1) || "0.0"}
          </span>
          <div className="mt-1.5">
            <StarRow rating={ratingAvg || 0} />
          </div>
        </div>

        {/* AGES - App Store exact style */}
        <div className="flex flex-col items-center justify-center min-w-[100px] py-4 px-3 border-r border-border/20">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">AGES</span>
          <span className="text-[28px] font-bold text-foreground mt-1 leading-none">{ageRating}</span>
          <span className="text-[11px] text-muted-foreground mt-1.5">Years Old</span>
        </div>

        {/* CATEGORY - App Store exact style with icon */}
        <div className="flex flex-col items-center justify-center min-w-[110px] py-4 px-3 border-r border-border/20">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">CATEGORY</span>
          <div className="mt-2">
            <CategoryIcon category={category} />
          </div>
          <span className="text-[11px] text-muted-foreground mt-1.5">{category || "Other"}</span>
        </div>

        {/* DEVELOPER - App Store exact style */}
        <div className="flex flex-col items-center justify-center min-w-[120px] py-4 px-3 border-r border-border/20">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">DEVELOPER</span>
          <div className="mt-2">
            <User className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <span className="text-[11px] text-muted-foreground mt-1.5">{devFirstWord}</span>
        </div>

        {/* SIZE - App Store exact style */}
        <div className="flex flex-col items-center justify-center min-w-[100px] py-4 px-3">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">SIZE</span>
          <span className="text-[28px] font-bold text-foreground mt-1 leading-none">{sizeValue}</span>
          <span className="text-[11px] text-muted-foreground mt-1.5">{sizeUnit}</span>
        </div>
      </div>
    </div>
  );
}

export default MetadataStrip;
