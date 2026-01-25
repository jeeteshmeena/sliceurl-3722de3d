import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, BarChart3 } from "lucide-react";
import { UtmForm, UtmParams } from "./UtmForm";
import { UtmPreview } from "./UtmPreview";
import { UtmPresets } from "./UtmPresets";

interface UtmSectionProps {
  baseUrl: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  params: UtmParams;
  onParamsChange: (params: UtmParams) => void;
  error?: string;
}

export function UtmSection({ 
  baseUrl, 
  enabled, 
  onEnabledChange, 
  params, 
  onParamsChange,
  error 
}: UtmSectionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="rounded-xl border border-border p-4 bg-muted/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="utm-toggle" className="cursor-pointer font-medium">
              UTM Tracking
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="utm-toggle"
              checked={enabled}
              onCheckedChange={(checked) => {
                onEnabledChange(checked);
                if (checked) setExpanded(true);
              }}
            />
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="icon-sm">
                <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <CollapsibleContent forceMount asChild>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-4 pt-2">
                  {enabled && (
                    <>
                      <UtmPresets onSelect={onParamsChange} />
                      <UtmForm params={params} onChange={onParamsChange} />
                      {error && (
                        <p className="text-xs text-destructive">{error}</p>
                      )}
                      <UtmPreview baseUrl={baseUrl} params={params} />
                    </>
                  )}
                  
                  {!enabled && (
                    <p className="text-xs text-muted-foreground py-2">
                      Enable UTM tracking to add campaign parameters to your links.
                    </p>
                  )}
                </div>
              </motion.div>
            </CollapsibleContent>
          )}
        </AnimatePresence>
      </div>
    </Collapsible>
  );
}
