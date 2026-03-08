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

function StarRow({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <div className="flex gap-px">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-[11px] w-[11px] ${s <= rounded ? "fill-muted-foreground text-muted-foreground" : "fill-muted-foreground/25 text-muted-foreground/25"}`}
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

  const rows = [
    [
      {
        label: formatRatingCount(ratingCount).toUpperCase(),
        value: ratingAvg?.toFixed(1) || "0.0",
        sub: <StarRow rating={ratingAvg || 0} />,
      },
      {
        label: "AGES",
        value: ageRating,
        sub: <span style={{ fontSize: 13, color: '#6e6e73' }}>Years Old</span>,
      },
    ],
    [
      {
        label: "CATEGORY",
        value: category || "Other",
        sub: null,
      },
      {
        label: "DEVELOPER",
        value: devFirstName,
        sub: null,
      },
    ],
    [
      {
        label: "LANGUAGE",
        value: "EN",
        sub: null,
      },
      {
        label: "SIZE",
        value: sizeValue + (sizeUnit ? ` ${sizeUnit}` : ""),
        sub: null,
      },
    ],
  ];

  return (
    <div
      style={{
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 16,
        paddingBottom: 18,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto auto',
          rowGap: 18,
          columnGap: 32,
        }}
      >
        {rows.flat().map((item, index) => (
          <div key={index} className="flex flex-col items-start">
            {/* Label */}
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.06em',
                color: '#6e6e73',
                marginBottom: 4,
              }}
            >
              {item.label}
            </span>

            {/* Value */}
            <span
              className="dark:text-[#f5f5f7]"
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#1d1d1f',
                lineHeight: 1.2,
              }}
            >
              {item.value}
            </span>

            {/* Optional subtext */}
            {item.sub && (
              <div style={{ marginTop: 3 }}>
                {item.sub}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MetadataStrip;
