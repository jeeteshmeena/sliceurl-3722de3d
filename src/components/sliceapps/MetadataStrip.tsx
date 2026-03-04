import {
  Star,
  ArrowDownCircle,
  HardDrive,
  UserCheck,
  User,
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

/** Category to icon mapping (filled style) */
function CategoryIcon({ category, className }: { category: string; className?: string }) {
  // All icons use fill for "filled" style
  const cat = category.toLowerCase();
  if (cat.includes("music")) return <Star className={className} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("entertainment")) return <Star className={className} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("game") || cat.includes("action")) return <Star className={className} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("productiv") || cat.includes("finance")) return <Star className={className} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("tool") || cat.includes("utilit")) return <Star className={className} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("social")) return <User className={className} fill="currentColor" strokeWidth={0} />;
  if (cat.includes("education")) return <Star className={className} fill="currentColor" strokeWidth={0} />;
  // Default
  return <Star className={className} fill="currentColor" strokeWidth={0} />;
}

/** Custom filled icons using SVG for SF Symbols style */
function FilledStar({ className }: { className?: string }) {
  return <Star className={className} fill="currentColor" strokeWidth={0} />;
}

function FilledDownload({ className }: { className?: string }) {
  return <ArrowDownCircle className={className} fill="currentColor" strokeWidth={0} />;
}

function FilledDrive({ className }: { className?: string }) {
  return <HardDrive className={className} fill="currentColor" strokeWidth={0} />;
}

function FilledUserCheck({ className }: { className?: string }) {
  return <UserCheck className={className} fill="currentColor" strokeWidth={0} />;
}

function FilledUser({ className }: { className?: string }) {
  return <User className={className} fill="currentColor" strokeWidth={0} />;
}

interface MetadataItemProps {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  stars?: number;
}

function MetadataItem({ label, value, subValue, icon, stars }: MetadataItemProps) {
  return (
    <div className="flex flex-col items-center justify-start min-w-[110px] snap-center px-2 py-3">
      <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase mb-1.5">
        {label}
      </span>
      <div className="flex flex-col items-center gap-1">
        <span className="text-xl font-bold text-foreground leading-none">
          {value}
        </span>
        {stars !== undefined && stars > 0 ? (
          <div className="flex gap-0.5 mt-0.5">
            {[1, 2, 3, 4, 5].map(s => (
              <Star
                key={s}
                className={`h-3 w-3 ${s <= Math.round(stars) ? "fill-current text-foreground" : "text-muted-foreground/30"}`}
                strokeWidth={0}
              />
            ))}
          </div>
        ) : subValue ? (
          <span className="text-[10px] text-muted-foreground leading-tight text-center">
            {subValue}
          </span>
        ) : (
          <div className="h-3.5 flex items-center">{icon}</div>
        )}
      </div>
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
  const formatRatingCount = (count: number | null): string => {
    if (!count || count === 0) return "No Ratings";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M Ratings`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K Ratings`;
    return `${count} Ratings`;
  };

  return (
    <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
      <div className="flex snap-x snap-mandatory min-w-max">
        <MetadataItem
          label="RATINGS"
          value={ratingAvg?.toFixed(1) || "—"}
          stars={ratingAvg || 0}
          icon={<FilledStar className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        {ratingCount !== null && ratingCount > 0 && (
          <div className="flex items-end pb-3 -ml-2 -mr-1">
            <span className="text-[9px] text-muted-foreground">{formatRatingCount(ratingCount)}</span>
          </div>
        )}
        <MetadataItem
          label="DOWNLOADS"
          value={downloads}
          icon={<FilledDownload className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <MetadataItem
          label="SIZE"
          value={fileSize}
          icon={<FilledDrive className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <MetadataItem
          label="AGES"
          value={ageRating}
          subValue="Years Old"
          icon={<FilledUserCheck className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <MetadataItem
          label="CATEGORY"
          value={category || "Other"}
          icon={<CategoryIcon category={category} className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <MetadataItem
          label="DEVELOPER"
          value={developer || "Unknown"}
          icon={<FilledUser className="h-3.5 w-3.5 text-muted-foreground" />}
        />
      </div>
    </div>
  );
}

export default MetadataStrip;
