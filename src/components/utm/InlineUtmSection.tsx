import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UtmParams } from "./UtmForm";
import { UtmPresets } from "./UtmPresets";

interface FieldConfig {
  key: keyof UtmParams;
  label: string;
  placeholder: string;
  tooltip: string;
}

const fields: FieldConfig[] = [
  {
    key: "utm_source",
    label: "UTM Source",
    placeholder: "e.g. google, facebook",
    tooltip: "Identifies where traffic comes from.",
  },
  {
    key: "utm_medium",
    label: "UTM Medium",
    placeholder: "e.g. cpc, email, social",
    tooltip: "Identifies marketing medium.",
  },
  {
    key: "utm_campaign",
    label: "UTM Campaign",
    placeholder: "e.g. spring_sale",
    tooltip: "Identifies specific campaign name.",
  },
  {
    key: "utm_term",
    label: "UTM Term",
    placeholder: "e.g. marketing-tools",
    tooltip: "Identifies search terms (primarily used for paid search).",
  },
  {
    key: "utm_content",
    label: "UTM Content",
    placeholder: "e.g. banner_ad",
    tooltip: "Identifies different ads or links pointing to same URL.",
  },
];

interface InlineUtmSectionProps {
  params: UtmParams;
  onChange: (params: UtmParams) => void;
}

export function InlineUtmSection({ params, onChange }: InlineUtmSectionProps) {
  const updateParam = (key: keyof UtmParams, value: string) => {
    onChange({ ...params, [key]: value });
  };

  const handlePresetSelect = (preset: UtmParams) => {
    onChange(preset);
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-4 pt-3 animate-fade-in">
        {/* Quick Presets */}
        <UtmPresets onSelect={handlePresetSelect} />
        
        {/* UTM Fields */}
        <div className="space-y-3">
          {fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label htmlFor={`inline-${field.key}`} className="text-[13px] font-medium">
                  {field.label}
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center h-4 w-4 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px] text-xs">
                    {field.tooltip}
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id={`inline-${field.key}`}
                placeholder={field.placeholder}
                value={params[field.key]}
                onChange={(e) => updateParam(field.key, e.target.value)}
                className="text-[14px] h-10"
              />
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
