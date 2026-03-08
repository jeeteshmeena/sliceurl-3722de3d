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

function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const cls = className || "h-7 w-7 text-muted-foreground";
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
  const devName = developer || "Unknown";

  const sizeMatch = fileSize.match(/^([\d.]+)\s*(.*)$/);
  const sizeValue = sizeMatch ? sizeMatch[1] : fileSize;
  const sizeUnit = sizeMatch ? sizeMatch[2] : "";

  const items = [
    {
      label: formatRatingCount(ratingCount),
      value: ratingAvg?.toFixed(1) || "0.0",
      bottom: <StarRow rating={ratingAvg || 0} />,
    },
    {
      label: "AGES",
      value: ageRating,
      bottom: <span className="text-[11px] text-muted-foreground">Years Old</span>,
    },
    {
      label: "CATEGORY",
      value: null,
      center: <CategoryIcon category={category} />,
      bottom: <span className="text-[11px] text-muted-foreground">{category || "Other"}</span>,
    },
    {
      label: "DEVELOPER",
      value: null,
      center: <User className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />,
      bottom: <span className="text-[11px] text-muted-foreground truncate max-w-[100px]">{devName}</span>,
    },
    {
      label: "SIZE",
      value: sizeValue,
      bottom: <span className="text-[11px] text-muted-foreground">{sizeUnit}</span>,
    },
  ];

  return (
    <div className="border-t border-b border-border/40 overflow-x-auto overflow-y-hidden scrollbar-hide -mx-4 lg:mx-0 scroll-smooth bg-background">
      <div className="flex min-w-max lg:justify-center">
        {items.map((item, index) => (
          <div
            key={index}
            className={`flex flex-col items-center justify-center min-w-[110px] lg:min-w-[140px] py-4 px-3 lg:px-5 ${
              index < items.length - 1 ? "border-r border-border/20" : ""
            }`}
          >
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              {item.label}
            </span>
            {item.value && (
              <span className="text-[28px] font-bold text-foreground mt-1 leading-none">
                {item.value}
              </span>
            )}
            {item.center && <div className="mt-2">{item.center}</div>}
            <div className="mt-1.5">{item.bottom}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MetadataStrip;
