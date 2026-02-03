import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface UtmParams {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
}

interface UtmFormProps {
  params: UtmParams;
  onChange: (params: UtmParams) => void;
}

interface FieldConfig {
  key: keyof UtmParams;
  label: string;
  placeholder: string;
  tooltip: string;
  required?: boolean;
}

const fields: FieldConfig[] = [
  {
    key: "utm_source",
    label: "Campaign Source",
    placeholder: "e.g., google, facebook",
    tooltip: "Identifies where traffic comes from.",
    required: true,
  },
  {
    key: "utm_medium",
    label: "Campaign Medium",
    placeholder: "e.g., cpc, email, social",
    tooltip: "Identifies marketing medium.",
  },
  {
    key: "utm_campaign",
    label: "Campaign Name",
    placeholder: "e.g., spring_sale, product_launch",
    tooltip: "Identifies specific campaign name.",
  },
  {
    key: "utm_term",
    label: "Campaign Term",
    placeholder: "e.g., marketing+tools",
    tooltip: "Identifies search terms (primarily used for paid search).",
  },
  {
    key: "utm_content",
    label: "Campaign Content",
    placeholder: "e.g., logolink, textlink",
    tooltip: "Identifies different ads or links pointing to same URL.",
  },
];

export function UtmForm({ params, onChange }: UtmFormProps) {
  const updateParam = (key: keyof UtmParams, value: string) => {
    onChange({ ...params, [key]: value });
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Use UTM parameters to track campaigns and traffic sources.
        </p>

        {fields.map((field) => (
          <div key={field.key} className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor={field.key} className="text-[13px] font-medium">
                {field.label}
                {field.required && <span className="text-destructive ml-0.5">*</span>}
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
              id={field.key}
              placeholder={field.placeholder}
              value={params[field.key]}
              onChange={(e) => updateParam(field.key, e.target.value)}
              className="text-[14px]"
            />
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
