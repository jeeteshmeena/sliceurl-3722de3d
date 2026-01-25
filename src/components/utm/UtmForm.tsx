import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export function UtmForm({ params, onChange }: UtmFormProps) {
  const updateParam = (key: keyof UtmParams, value: string) => {
    onChange({ ...params, [key]: value });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Use UTM parameters to track campaigns and traffic sources.
      </p>
      
      <div className="space-y-2">
        <Label htmlFor="utm_source" className="text-sm">
          Campaign Source <span className="text-destructive">*</span>
        </Label>
        <Input
          id="utm_source"
          placeholder="e.g., google, newsletter, instagram"
          value={params.utm_source}
          onChange={(e) => updateParam("utm_source", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="utm_medium" className="text-sm">Campaign Medium</Label>
        <Input
          id="utm_medium"
          placeholder="e.g., cpc, email, social"
          value={params.utm_medium}
          onChange={(e) => updateParam("utm_medium", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="utm_campaign" className="text-sm">Campaign Name</Label>
        <Input
          id="utm_campaign"
          placeholder="e.g., summer_sale, product_launch"
          value={params.utm_campaign}
          onChange={(e) => updateParam("utm_campaign", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="utm_term" className="text-sm">
          Campaign Term <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Input
          id="utm_term"
          placeholder="e.g., running+shoes"
          value={params.utm_term}
          onChange={(e) => updateParam("utm_term", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="utm_content" className="text-sm">
          Campaign Content <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Input
          id="utm_content"
          placeholder="e.g., logo_link, text_link"
          value={params.utm_content}
          onChange={(e) => updateParam("utm_content", e.target.value)}
        />
      </div>
    </div>
  );
}
