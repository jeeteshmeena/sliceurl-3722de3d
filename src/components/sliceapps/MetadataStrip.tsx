import {
  Star,
  ArrowDownCircle,
  HardDrive,
  UserCheck,
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
  Camera,
  ShoppingBag,
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

/** Category icon auto-assignment (filled style) */
function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const cat = category.toLowerCase();
  if (cat.includes("music")) return <Music className={className} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("entertainment")) return <Clapperboard className={className} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("game") || cat.includes("action")) return <Gamepad2 className={className} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("productiv") || cat.includes("finance")) return <Briefcase className={className} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("tool") || cat.includes("utilit")) return <Wrench className={className} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("social")) return <Users className={className} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("education")) return <BookOpen className={className} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("photo")) return <Camera className={className} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("shop")) return <ShoppingBag className={className} fill="currentColor" strokeWidth={0} />;
  return <LayoutGrid className={className} fill="currentColor" strokeWidth={0} />;
}

interface MetadataItemProps {
  label: string;
  value: string;
  subElement?: React.ReactNode;
}

function MetadataItem({ label, value, subElement }: MetadataItemProps) {
  return (
    <div className="flex flex-col items-center justify-start min-w-[calc(33.333%-8px)] snap-center py-3 px-1">
      <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase mb-1.5">
        {label}
      </span>
      <span className="text-lg font-bold text-foreground leading-none mb-1">
        {value}
      </span>
      {subElement && (
        <div className="h-4 flex items-center">{subElement}</div>
      )}
    </div>
  );
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
  const starIcons = (count: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className={`h-3 w-3 ${s <= Math.round(count) ? "fill-current text-foreground" : "text-muted-foreground/30"}`}
          strokeWidth={0}
        />
      ))}
    </div>
  );

  const formatRatingCount = (count: number | null): string => {
    if (!count || count === 0) return "";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M Ratings`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K Ratings`;
    return `${count} Ratings`;
  };

  const items = [
    {
      label: "RATINGS",
      value: ratingAvg?.toFixed(1) || "0.0",
      subElement: (
        <div className="flex flex-col items-center gap-0.5">
          {starIcons(ratingAvg || 0)}
          {ratingCount && ratingCount > 0 && (
            <span className="text-[9px] text-muted-foreground">{formatRatingCount(ratingCount)}</span>
          )}
        </div>
      ),
    },
    {
      label: "AGES",
      value: ageRating,
      subElement: <span className="text-[10px] text-muted-foreground/60">Years Old</span>,
    },
    {
      label: "CATEGORY",
      value: category || "Other",
      subElement: <CategoryIcon category={category} className="h-5 w-5 text-muted-foreground" />,
    },
    {
      label: "DEVELOPER",
      value: developer?.length > 12 ? developer.substring(0, 12) + "…" : (developer || "Unknown"),
      subElement: <User className="h-5 w-5 text-muted-foreground" fill="currentColor" strokeWidth={0} />,
    },
    {
      label: "SIZE",
      value: fileSize,
      subElement: <HardDrive className="h-5 w-5 text-muted-foreground" fill="currentColor" strokeWidth={0} />,
    },
    {
      label: "DOWNLOADS",
      value: downloads,
      subElement: <ArrowDownCircle className="h-5 w-5 text-muted-foreground" fill="currentColor" strokeWidth={0} />,
    },
  ];

  return (
    <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
      <div className="flex snap-x snap-mandatory" style={{ minWidth: "200%" }}>
        {items.map((item) => (
          <MetadataItem
            key={item.label}
            label={item.label}
            value={item.value}
            subElement={item.subElement}
          />
        ))}
      </div>
    </div>
  );
}

export default MetadataStrip;
