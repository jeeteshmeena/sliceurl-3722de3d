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
  const cls = className || "h-6 w-6 text-muted-foreground";
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
          className={`h-[9px] w-[9px] ${s <= rounded ? "fill-muted-foreground text-muted-foreground" : "fill-muted-foreground/25 text-muted-foreground/25"}`}
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
  const devFirstName = (developer || "Unknown").split(" ")[0];

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
      label: "AGE",
      value: ageRating,
      bottom: <span style={{ fontSize: 13, color: '#6e6e73' }} className="leading-none">Years Old</span>,
    },
    {
      label: "DOWNLOAD",
      value: downloads || "0",
      bottom: <span style={{ fontSize: 13, color: '#6e6e73' }} className="leading-none">Downloads</span>,
    },
    {
      label: "DEVELOPER",
      value: null,
      center: <User className="h-[18px] w-[18px] text-[#8e8e93]" strokeWidth={1.5} />,
      bottom: <span style={{ fontSize: 13, color: '#6e6e73' }} className="leading-none truncate max-w-[80px]">{devFirstName}</span>,
    },
    {
      label: "CATEGORY",
      value: null,
      center: <CategoryIcon category={category} className="h-[18px] w-[18px] text-[#8e8e93]" />,
      bottom: <span style={{ fontSize: 13, color: '#6e6e73' }} className="leading-none">{category || "Other"}</span>,
    },
    {
      label: "SIZE",
      value: sizeValue,
      bottom: <span style={{ fontSize: 13, color: '#6e6e73' }} className="leading-none">{sizeUnit}</span>,
    },
  ];

  return (
    <div className="bg-background">
      <style>{`.metadata-row::-webkit-scrollbar { display: none; }`}</style>
      <div
        className="metadata-row"
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 0,
          overflowX: 'auto',
          overflowY: 'hidden',
          paddingLeft: 16,
          paddingRight: 16,
          paddingTop: 18,
          paddingBottom: 18,
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >
        {items.map((item, index) => (
          <div
            key={index}
            className="flex flex-col items-center justify-between"
            style={{
              minWidth: 120,
              flexShrink: 0,
              textAlign: 'center',
              scrollSnapAlign: 'start',
              paddingLeft: 14,
              paddingRight: 14,
              borderRight: 'none',
            }}
          >
            {/* Top label */}
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: '#8e8e93' }} className="uppercase leading-none">
              {item.label}
            </span>

            {/* Center: value or icon */}
            <div className="my-1.5 flex items-center justify-center min-h-[26px]">
              {item.value && (
                <span className="text-foreground leading-none tracking-tight" style={{ fontSize: 20, fontWeight: 700 }}>
                  {item.value}
                </span>
              )}
              {item.center && item.center}
            </div>

            {/* Bottom */}
            <div className="flex items-center justify-center">{item.bottom}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MetadataStrip;
