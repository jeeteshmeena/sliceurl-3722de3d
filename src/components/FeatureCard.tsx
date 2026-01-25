import { useLanguage } from "@/lib/i18n";
import { FeatureKey } from "./FeaturePreviewVisuals";

interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string }>;
  titleKey: FeatureKey;
  descKey: string;
  index: number;
  isQR?: boolean;
}

export function FeatureCard({
  icon: Icon,
  titleKey,
  descKey,
}: FeatureCardProps) {
  const { t } = useLanguage();
  
  return (
    <div className="p-4 rounded-xl bg-card border border-border/50">
      <div className="h-9 w-9 mb-3 rounded-lg bg-secondary/60 flex items-center justify-center">
        <Icon className="h-4 w-4 text-foreground/60" />
      </div>
      <h3 className="font-medium text-xs sm:text-sm mb-1">{t(titleKey)}</h3>
      <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed line-clamp-2">
        {t(descKey)}
      </p>
    </div>
  );
}
