import { Lock, Settings2, Eye, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SlidingToggle } from "@/components/ui/sliding-toggle";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useLinkBehavior } from "@/hooks/useLinkBehavior";
import { InfoTooltip } from "@/components/InfoTooltip";

export interface BulkOptionsData {
  batchName: string;
  password: string;
  passwordEnabled: boolean;
  expiry: Date | undefined;
  maxClicks: number | undefined;
  slugPrefix: string;
  autoTitle: boolean;
  linkPreviewEnabled: boolean;
}

interface BulkOptionsProps {
  options: BulkOptionsData;
  onChange: (options: BulkOptionsData) => void;
}

export function BulkOptions({ options, onChange }: BulkOptionsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Get global link preview setting
  const { linkPreviewEnabled: globalLinkPreview } = useLinkBehavior();
  
  const updateOption = <K extends keyof BulkOptionsData>(key: K, value: BulkOptionsData[K]) => {
    onChange({ ...options, [key]: value });
  };

  return (
    <div className="space-y-3">
      {/* Link Preview Toggle - Only visible when global setting is OFF */}
      {!globalLinkPreview && (
        <div className="flex items-center justify-between py-3 px-4 rounded-[12px] border border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-1.5">
              <Label htmlFor="bulk-linkPreview" className="cursor-pointer text-[13px] font-medium">
                Link Preview
              </Label>
              <InfoTooltip content="Show a preview page before redirecting visitors." />
            </div>
          </div>
          <SlidingToggle
            id="bulk-linkPreview"
            checked={options.linkPreviewEnabled}
            onCheckedChange={(checked) => updateOption("linkPreviewEnabled", checked)}
          />
        </div>
      )}

      {/* Password Protection Toggle */}
      <div className="rounded-[12px] border border-border bg-muted/30 overflow-hidden">
        <div className="flex items-center justify-between py-3 px-4">
          <div className="flex items-center gap-3">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-1.5">
              <Label htmlFor="bulk-passwordToggle" className="cursor-pointer text-[13px] font-medium">
                Password Protection
              </Label>
              <InfoTooltip content="Require visitors to enter a password before accessing the link." />
            </div>
          </div>
          <SlidingToggle
            id="bulk-passwordToggle"
            checked={options.passwordEnabled}
            onCheckedChange={(checked) => updateOption("passwordEnabled", checked)}
          />
        </div>
        {options.passwordEnabled && (
          <div className="px-4 pb-4 border-t border-border pt-3 animate-fade-in">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-password" className="text-[13px]">Password</Label>
              <Input
                id="bulk-password"
                type="password"
                placeholder="Password for all links"
                value={options.password}
                onChange={(e) => updateOption("password", e.target.value)}
                className="h-10"
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              All links will require this password to access.
            </p>
          </div>
        )}
      </div>

      {/* Advanced Options (Collapsible) */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button 
            type="button" 
            variant="ghost" 
            className="w-full justify-between h-11 px-4 rounded-[12px] border border-border bg-muted/30"
          >
            <span className="flex items-center gap-3">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-[13px] font-medium">Advanced Options</span>
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3 animate-fade-in">
          {/* Batch Name */}
          <div className="space-y-1.5">
            <Label htmlFor="batchName" className="text-[13px]">Batch Name</Label>
            <Input
              id="batchName"
              placeholder="e.g., YouTube Campaign"
              value={options.batchName}
              onChange={(e) => updateOption("batchName", e.target.value)}
              className="h-10"
            />
          </div>

          {/* Slug Prefix */}
          <div className="space-y-1.5">
            <Label htmlFor="slugPrefix" className="text-[13px]">Slug Prefix</Label>
            <div className="flex items-center gap-2">
              <Input
                id="slugPrefix"
                placeholder="yt-"
                value={options.slugPrefix}
                onChange={(e) => updateOption("slugPrefix", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="h-10 flex-1"
              />
              <span className="text-[12px] text-muted-foreground whitespace-nowrap">
                → {options.slugPrefix || 'prefix-'}001
              </span>
            </div>
          </div>

          {/* Expiration Date */}
          <div className="space-y-1.5">
            <Label htmlFor="bulk-expires" className="text-[13px]">Expiration Date</Label>
            <Input
              id="bulk-expires"
              type="datetime-local"
              value={options.expiry ? options.expiry.toISOString().slice(0, 16) : ""}
              onChange={(e) => updateOption("expiry", e.target.value ? new Date(e.target.value) : undefined)}
              className="h-10"
            />
          </div>

          {/* Max Clicks */}
          <div className="space-y-1.5">
            <Label htmlFor="bulk-maxClicks" className="text-[13px]">Max Clicks</Label>
            <Input
              id="bulk-maxClicks"
              type="number"
              min={1}
              placeholder="Unlimited"
              value={options.maxClicks || ""}
              onChange={(e) => updateOption("maxClicks", e.target.value ? parseInt(e.target.value) : undefined)}
              className="h-10"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
