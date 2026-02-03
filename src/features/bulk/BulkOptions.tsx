import { Calendar, Lock, Hash, MousePointerClick, Settings2, Wand2, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TextSwitch } from "@/components/ui/text-switch";
import { SlidingToggle } from "@/components/ui/sliding-toggle";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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
  // Get global link preview setting
  const { linkPreviewEnabled: globalLinkPreview } = useLinkBehavior();
  
  const updateOption = <K extends keyof BulkOptionsData>(key: K, value: BulkOptionsData[K]) => {
    onChange({ ...options, [key]: value });
  };

  return (
    <div className="space-y-4 p-4 rounded-[12px] border border-border bg-muted/30">
      <h3 className="text-[13px] font-medium text-foreground flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-muted-foreground" />
        Batch Settings
      </h3>

      {/* Link Preview Toggle - Only visible when global setting is OFF */}
      {!globalLinkPreview && (
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-1.5">
              <Label htmlFor="linkPreview" className="text-[13px] font-medium">
                Link Preview
              </Label>
              <InfoTooltip content="Show a preview page before redirecting visitors." />
            </div>
          </div>
          <SlidingToggle
            id="linkPreview"
            checked={options.linkPreviewEnabled}
            onCheckedChange={(checked) => updateOption("linkPreviewEnabled", checked)}
          />
        </div>
      )}

      {/* Batch Name */}
      <div className="space-y-1.5">
        <Label htmlFor="batchName" className="text-[13px] font-medium">
          Batch Name
        </Label>
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
        <Label htmlFor="slugPrefix" className="text-[13px] font-medium flex items-center gap-1">
          <Hash className="h-3 w-3" />
          Slug Prefix
        </Label>
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

      {/* Password Protection */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-1.5">
              <Label htmlFor="passwordToggle" className="text-[13px] font-medium">
                Password Protection
              </Label>
              <InfoTooltip content="Require visitors to enter a password before accessing the link." />
            </div>
          </div>
          <TextSwitch
            id="passwordToggle"
            checked={options.passwordEnabled}
            onCheckedChange={(checked) => updateOption("passwordEnabled", checked)}
          />
        </div>
        {options.passwordEnabled && (
          <Input
            type="password"
            placeholder="Enter password for all links"
            value={options.password}
            onChange={(e) => updateOption("password", e.target.value)}
            className="h-10"
          />
        )}
      </div>

      {/* Expiry Date */}
      <div className="space-y-1.5">
        <Label className="text-[13px] font-medium flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Expiry Date
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal h-10 rounded-[12px]",
                !options.expiry && "text-muted-foreground"
              )}
            >
              {options.expiry ? format(options.expiry, "PPP") : "No expiry"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={options.expiry}
              onSelect={(date) => updateOption("expiry", date)}
              disabled={(date) => date < new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {options.expiry && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => updateOption("expiry", undefined)}
          >
            Clear expiry
          </Button>
        )}
      </div>

      {/* Max Clicks */}
      <div className="space-y-1.5">
        <Label htmlFor="maxClicks" className="text-[13px] font-medium flex items-center gap-1">
          <MousePointerClick className="h-3 w-3" />
          Max Clicks (optional)
        </Label>
        <Input
          id="maxClicks"
          type="number"
          min={1}
          placeholder="Unlimited"
          value={options.maxClicks || ""}
          onChange={(e) => updateOption("maxClicks", e.target.value ? parseInt(e.target.value) : undefined)}
          className="h-10"
        />
      </div>

      {/* Auto Title */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="autoTitle" className="text-[13px] font-medium">
            AI Auto-Title
          </Label>
        </div>
        <TextSwitch
          id="autoTitle"
          checked={options.autoTitle}
          onCheckedChange={(checked) => updateOption("autoTitle", checked)}
        />
      </div>
    </div>
  );
}
