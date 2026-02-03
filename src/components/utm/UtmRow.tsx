import { Info, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UtmParams } from "./UtmForm";

interface UtmRowProps {
  enabled: boolean;
  params: UtmParams;
  onEditClick: () => void;
}

export function UtmRow({ enabled, params, onEditClick }: UtmRowProps) {
  // Count how many UTM params are filled
  const filledCount = Object.values(params).filter((v) => v.trim() !== "").length;

  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl border border-border bg-muted/30">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <Label className="text-[13px] font-medium cursor-default">
          UTM Parameters
        </Label>
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center h-4 w-4 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-xs">
              Track campaign performance by adding UTM parameters to your links.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {enabled && filledCount > 0 && (
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
            {filledCount} set
          </Badge>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onEditClick}
        className="text-primary hover:text-primary/80 h-8 px-3 text-[13px] font-medium"
      >
        Edit
      </Button>
    </div>
  );
}
