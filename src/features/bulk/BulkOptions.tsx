import { useState } from "react";
import { Calendar, Lock, Hash, MousePointerClick, Settings2, Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TextSwitch } from "@/components/ui/text-switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface BulkOptionsData {
  batchName: string;
  password: string;
  passwordEnabled: boolean;
  expiry: Date | undefined;
  maxClicks: number | undefined;
  slugPrefix: string;
  autoTitle: boolean;
}

interface BulkOptionsProps {
  options: BulkOptionsData;
  onChange: (options: BulkOptionsData) => void;
}

export function BulkOptions({ options, onChange }: BulkOptionsProps) {
  const updateOption = <K extends keyof BulkOptionsData>(key: K, value: BulkOptionsData[K]) => {
    onChange({ ...options, [key]: value });
  };

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-xl border border-border/50">
      <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-muted-foreground" />
        Batch Settings
      </h3>

      {/* Batch Name */}
      <div className="space-y-2">
        <Label htmlFor="batchName" className="text-xs text-muted-foreground">
          Batch Name
        </Label>
        <Input
          id="batchName"
          placeholder="e.g., YouTube Campaign"
          value={options.batchName}
          onChange={(e) => updateOption("batchName", e.target.value)}
          className="h-9"
        />
      </div>

      {/* Slug Prefix */}
      <div className="space-y-2">
        <Label htmlFor="slugPrefix" className="text-xs text-muted-foreground flex items-center gap-1">
          <Hash className="h-3 w-3" />
          Slug Prefix
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="slugPrefix"
            placeholder="yt-"
            value={options.slugPrefix}
            onChange={(e) => updateOption("slugPrefix", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            className="h-9 flex-1"
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            → {options.slugPrefix || 'prefix-'}001
          </span>
        </div>
      </div>

      {/* Password Protection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="passwordToggle" className="text-xs text-muted-foreground flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Password Protection
          </Label>
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
            className="h-9"
          />
        )}
      </div>

      {/* Expiry Date */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Expiry Date
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal h-9",
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
      <div className="space-y-2">
        <Label htmlFor="maxClicks" className="text-xs text-muted-foreground flex items-center gap-1">
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
          className="h-9"
        />
      </div>

      {/* Auto Title */}
      <div className="flex items-center justify-between">
        <Label htmlFor="autoTitle" className="text-xs text-muted-foreground flex items-center gap-1">
          <Wand2 className="h-3 w-3" />
          AI Auto-Title
        </Label>
        <TextSwitch
          id="autoTitle"
          checked={options.autoTitle}
          onCheckedChange={(checked) => updateOption("autoTitle", checked)}
        />
      </div>
    </div>
  );
}
