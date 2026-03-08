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

function Divider() {
  return <div className="w-px self-stretch my-3 bg-border/50 flex-shrink-0" />;
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

  const items = [
    // RATINGS
    <div key="ratings" className="flex flex-col items-center justify-between min-w-[100px] w-[100px] flex-shrink-0 snap-start py-3 px-1">
      <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/70 uppercase">Ratings</span>
      <span className="text-[20px] font-bold text-foreground mt-1 whitespace-nowrap leading-none">
        {ratingAvg?.toFixed(1) || "—"}
      </span>
      <div className="mt-1.5 flex flex-col items-center gap-0.5">
        <StarRow rating={ratingAvg || 0} />
        {ratingCount != null && ratingCount > 0 && (
          <span className="text-[10px] text-muted-foreground/60 text-center leading-tight mt-0.5">{formatRatingCount(ratingCount)}</span>
        )}
      </div>
    </div>,

    // AGES
    <div key="ages" className="flex flex-col items-center justify-between min-w-[80px] w-[80px] flex-shrink-0 snap-start py-3 px-1">
      <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/70 uppercase">Age</span>
      <span className="text-[20px] font-bold text-foreground mt-1 whitespace-nowrap leading-none">{ageRating}</span>
      <span className="mt-1.5 text-[10px] text-muted-foreground/60 text-center leading-tight">Years Old</span>
    </div>,

    // CATEGORY
    <div key="category" className="flex flex-col items-center justify-between min-w-[90px] w-[90px] flex-shrink-0 snap-start py-3 px-1">
      <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/70 uppercase">Category</span>
      <div className="mt-1">
        <CategoryIcon category={category} />
      </div>
      <span className="mt-1.5 text-[10px] text-muted-foreground/60 text-center leading-tight capitalize">{category || "Other"}</span>
    </div>,

    // DEVELOPER
    <div key="developer" className="flex flex-col items-center justify-between min-w-[90px] w-[90px] flex-shrink-0 snap-start py-3 px-1">
      <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/70 uppercase">Developer</span>
      <div className="mt-1">
        <User className="h-6 w-6 text-muted-foreground" strokeWidth={1.8} />
      </div>
      <span className="mt-1.5 text-[10px] text-muted-foreground/60 text-center leading-tight truncate max-w-[80px]">{devFirstWord}</span>
    </div>,

    // SIZE
    <div key="size" className="flex flex-col items-center justify-between min-w-[80px] w-[80px] flex-shrink-0 snap-start py-3 px-1">
      <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/70 uppercase">Size</span>
      <span className="text-[20px] font-bold text-foreground mt-1 whitespace-nowrap leading-none">{fileSize || "—"}</span>
      <span className="mt-1.5 text-[10px] text-muted-foreground/60 invisible">—</span>
    </div>,
  ];

  return (
    <div className="mt-5 overflow-x-auto overflow-y-hidden scrollbar-hide -mx-4 px-4 scroll-smooth">
      <div className="flex snap-x snap-mandatory items-stretch">
        {items.map((item, i) => (
          <div key={i} className="flex items-stretch">
            {item}
            {i < items.length - 1 && <Divider />}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MetadataStrip;
