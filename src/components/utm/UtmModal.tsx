import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { UtmParams } from "./UtmForm";
import { UtmPresets } from "./UtmPresets";

interface UtmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  params: UtmParams;
  onSave: (params: UtmParams) => void;
}

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
    placeholder: "e.g., google, facebook",
    tooltip: "Identifies where traffic comes from.",
  },
  {
    key: "utm_medium",
    label: "UTM Medium",
    placeholder: "e.g., cpc, email, social",
    tooltip: "Identifies marketing medium.",
  },
  {
    key: "utm_campaign",
    label: "UTM Campaign",
    placeholder: "e.g., spring_sale, product_launch",
    tooltip: "Identifies specific campaign name.",
  },
  {
    key: "utm_term",
    label: "UTM Term",
    placeholder: "e.g., marketing+tools",
    tooltip: "Identifies search terms (primarily used for paid search).",
  },
  {
    key: "utm_content",
    label: "UTM Content",
    placeholder: "e.g., logolink, textlink",
    tooltip: "Identifies different ads or links pointing to same URL.",
  },
];

export function UtmModal({ open, onOpenChange, params, onSave }: UtmModalProps) {
  const isMobile = useIsMobile();
  const [localParams, setLocalParams] = useState<UtmParams>(params);

  // Sync local state when modal opens
  useEffect(() => {
    if (open) {
      setLocalParams(params);
    }
  }, [open, params]);

  const updateParam = (key: keyof UtmParams, value: string) => {
    setLocalParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(localParams);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setLocalParams(params); // Reset to original
    onOpenChange(false);
  };

  const handlePresetSelect = (preset: UtmParams) => {
    setLocalParams(preset);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[400] bg-foreground/60 backdrop-blur-[2px]"
            onClick={handleCancel}
          />

          {/* Modal Content */}
          <motion.div
            initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
            exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`fixed z-[500] bg-background ${
              isMobile
                ? "inset-x-0 bottom-0 rounded-t-[18px] max-h-[85vh]"
                : "left-1/2 top-[76px] -translate-x-1/2 w-[94%] max-w-[420px] rounded-[18px] max-h-[calc(100dvh-76px-16px)]"
            } shadow-[0_10px_30px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 className="text-base font-semibold">UTM Parameters</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="text-muted-foreground hover:text-foreground h-8 px-3"
              >
                Close
              </Button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Quick Presets */}
              <UtmPresets onSelect={handlePresetSelect} />

              {/* Fields */}
              <TooltipProvider delayDuration={100}>
                <div className="space-y-4">
                  {fields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor={field.key} className="text-[13px] font-medium">
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
                        id={field.key}
                        placeholder={field.placeholder}
                        value={localParams[field.key]}
                        onChange={(e) => updateParam(field.key, e.target.value)}
                        className="text-[14px]"
                      />
                    </div>
                  ))}
                </div>
              </TooltipProvider>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-border flex gap-3 shrink-0">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1 h-11"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 h-11"
              >
                Save
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
