import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BarChart3 } from "lucide-react";

interface UtmBadgeProps {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
}

export function UtmBadge({ utm_source, utm_medium, utm_campaign, utm_term, utm_content }: UtmBadgeProps) {
  const hasUtm = utm_source || utm_medium || utm_campaign;
  
  if (!hasUtm) return null;

  const details = [
    utm_source && `Source: ${utm_source}`,
    utm_medium && `Medium: ${utm_medium}`,
    utm_campaign && `Campaign: ${utm_campaign}`,
    utm_term && `Term: ${utm_term}`,
    utm_content && `Content: ${utm_content}`,
  ].filter(Boolean);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="secondary" 
          className="gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20 cursor-help text-[10px] px-1.5 py-0"
        >
          <BarChart3 className="h-3 w-3" />
          UTM
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1 text-xs">
          <p className="font-semibold">UTM Tracking Enabled</p>
          {details.map((detail, i) => (
            <p key={i} className="text-muted-foreground">{detail}</p>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
