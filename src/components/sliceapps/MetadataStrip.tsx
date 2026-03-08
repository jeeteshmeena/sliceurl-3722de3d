import {
  Star,
  Download,
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
  Globe,
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
  const cls = "h-[18px] w-[18px] text-muted-foreground";
  const cat = category.toLowerCase();
  if (cat.includes("music")) return <Music className={cls} strokeWidth={1.5} />;
  if (cat.includes("entertainment")) return <Clapperboard className={cls} strokeWidth={1.5} />;
  if (cat.includes("game") || cat.includes("action")) return <Gamepad2 className={cls} strokeWidth={1.5} />;
  if (cat.includes("productiv")) return <Briefcase className={cls} strokeWidth={1.5} />;
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
          className={`h-[10px] w-[10px] ${s <= rounded ? "fill-muted-foreground/70 text-muted-foreground/70" : "fill-muted-foreground/20 text-muted-foreground/20"}`}
          strokeWidth={0}
        />
      ))}
    </div>
  );
}

function formatRatingCount(count: number | null): string {
  if (!count || count === 0) return "0 Ratings";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M Ratings`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K Ratings`;
  return `${count} Ratings`;
}

function Divider() {
  return <div className="w-px self-stretch my-3 bg-border/60 flex-shrink-0" />;
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
  const items = [
    {
      label: formatRatingCount(ratingCount),
      main: ratingAvg?.toFixed(1) || "0.0",
      bottom: <StarRow rating={ratingAvg || 0} />,
    },
    {
      label: "Ages",
      main: ageRating,
      bottom: <span className="text-[11px] text-muted-foreground">Years Old</span>,
    },
    {
      label: "Category",
      main: <CategoryIcon category={category} />,
      bottom: <span className="text-[11px] text-muted-foreground">{category || "Other"}</span>,
    },
    {
      label: "Developer",
      main: <User className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.5} />,
      bottom: (
        <span className="text-[11px] text-muted-foreground truncate max-w-[90px]">
          {developer || "Unknown"}
        </span>
      ),
    },
    {
      label: "Language",
      main: "EN",
      bottom: <span className="text-[11px] text-muted-foreground">English</span>,
    },
    {
      label: "Size",
      main: fileSize?.split(" ")[0] || "--",
      bottom: (
        <span className="text-[11px] text-muted-foreground">
          {fileSize?.split(" ")[1] || ""}
        </span>
      ),
    },
  ];

  return (
    <div className="border-y border-border/50 overflow-x-auto overflow-y-hidden scrollbar-hide -mx-4 px-4">
      <div className="flex items-stretch min-w-max">
        {items.map((item, i) => (
          <div key={i} className="flex items-stretch">
            {i > 0 && <Divider />}
            <div className="flex flex-col items-center justify-between min-w-[100px] w-[100px] flex-shrink-0 py-3 px-2">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide leading-none">
                {item.label}
              </span>
              <div className="flex items-center justify-center my-1.5">
                {typeof item.main === "string" ? (
                  <span className="text-[20px] font-bold text-muted-foreground/80 leading-none">
                    {item.main}
                  </span>
                ) : (
                  item.main
                )}
              </div>
              <div className="flex items-center justify-center">{item.bottom}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MetadataStrip;
