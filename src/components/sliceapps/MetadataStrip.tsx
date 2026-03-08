import {
  Star,
  UserRound,
  Gamepad2,
  Wrench,
  Users,
  BookOpen,
  LayoutGrid,
  Music,
  Clapperboard,
  Camera,
  Heart,
  Sofa,
  ShoppingBag,
  Plane,
  Cloud,
  Newspaper,
  DollarSign,
  GraduationCap,
  Settings,
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
  developerUrl?: string | null;
}

function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const cls = className || "h-[18px] w-[18px]";
  const style = { color: '#8e8e93' };
  const cat = category.toLowerCase();
  if (cat.includes("photo")) return <Camera className={cls} style={style} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("music")) return <Music className={cls} style={style} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("entertainment")) return <Clapperboard className={cls} style={style} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("game") || cat.includes("action")) return <Gamepad2 className={cls} style={style} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("productiv")) return <Navigation className={cls} style={style} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("lifestyle")) return <Heart className={cls} style={style} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("tool")) return <Wrench className={cls} style={style} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("social")) return <Users className={cls} style={style} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("education")) return <BookOpen className={cls} style={style} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("finance")) return <DollarSign className={cls} style={style} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("health") || cat.includes("fitness")) return <Heart className={cls} style={style} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("shopping")) return <ShoppingBag className={cls} style={style} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("travel")) return <Plane className={cls} style={style} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("weather")) return <Cloud className={cls} style={style} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("news")) return <Newspaper className={cls} style={style} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("utilit")) return <Settings className={cls} style={style} fill="currentColor" strokeWidth={0} />;
  return <LayoutGrid className={cls} style={style} fill="currentColor" strokeWidth={0} />;
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
  return `${count} Rating${count > 1 ? 's' : ''}`;
}

export function MetadataStrip({
  ratingAvg,
  ratingCount,
  downloads,
  fileSize,
  ageRating = "4+",
  category,
  developer,
  developerUrl,
}: MetadataStripProps) {
  const devFirstName = (developer || "Unknown").split(" ")[0];

  const sizeMatch = fileSize.match(/^([\d.]+)\s*(.*)$/);
  const sizeValue = sizeMatch ? sizeMatch[1] : fileSize;
  const sizeUnit = sizeMatch ? sizeMatch[2] : "";

  const handleDeveloperClick = () => {
    if (developerUrl) {
      window.open(developerUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const items = [
    {
      label: formatRatingCount(ratingCount),
      value: ratingAvg?.toFixed(1) || "0.0",
      bottom: <StarRow rating={ratingAvg || 0} />,
    },
    {
      label: "AGES",
      value: ageRating || "4+",
      bottom: <span style={{ fontSize: 13, fontWeight: 400, color: '#a1a1a6' }} className="leading-none">Years</span>,
    },
    {
      label: "DOWNLOAD",
      value: downloads || "0",
      bottom: <span style={{ fontSize: 13, fontWeight: 400, color: '#a1a1a6' }} className="leading-none">Downloads</span>,
    },
    {
      label: "DEVELOPER",
      value: null,
      center: <UserRound className="h-[21px] w-[21px]" style={{ color: '#8e8e93' }} fill="#8e8e93" strokeWidth={0} />,
      bottom: <span style={{ fontSize: 13, fontWeight: 400, color: '#a1a1a6' }} className="leading-none truncate max-w-[80px]">{devFirstName}</span>,
      onClick: developerUrl ? handleDeveloperClick : undefined,
    },
    {
      label: "CATEGORY",
      value: null,
      center: <CategoryIcon category={category} className="h-[21px] w-[21px]" />,
      bottom: <span style={{ fontSize: 13, fontWeight: 400, color: '#a1a1a6' }} className="leading-none">{category || "Other"}</span>,
    },
    {
      label: "SIZE",
      value: sizeValue || "0",
      bottom: <span style={{ fontSize: 13, fontWeight: 400, color: '#a1a1a6' }} className="leading-none">{sizeUnit || "MB"}</span>,
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
          gap: 22,
          overflowX: 'auto',
          overflowY: 'hidden',
          paddingLeft: 16,
          paddingRight: 16,
          paddingTop: 16,
          paddingBottom: 16,
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >
        {items.map((item, index) => (
          <div
            key={index}
            className="flex flex-col items-center justify-between transition-transform duration-200 ease-out hover:scale-105 active:scale-95 select-none"
            style={{
              minWidth: 110,
              flexShrink: 0,
              textAlign: 'center',
              scrollSnapAlign: 'start',
              cursor: item.onClick ? 'pointer' : 'default',
            }}
            onClick={item.onClick}
          >
            {/* Top label */}
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', color: '#8e8e93' }} className="uppercase leading-none">
              {item.label}
            </span>

            {/* Center: value or icon */}
            <div className="my-2 flex items-center justify-center min-h-[28px]">
              {item.value && (
                <span className="leading-none tracking-tight text-foreground" style={{ fontSize: 17, fontWeight: 600 }}>
                  {item.value}
                </span>
              )}
              {item.center && item.center}
            </div>

            {/* Bottom */}
            <div className="flex items-center justify-center">
              {item.bottom}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MetadataStrip;
