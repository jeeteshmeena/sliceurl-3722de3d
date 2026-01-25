import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { UtmParams } from "./UtmForm";

interface UtmPreviewProps {
  baseUrl: string;
  params: UtmParams;
}

export function buildUtmUrl(baseUrl: string, params: UtmParams): string {
  if (!baseUrl) return "";
  
  try {
    const url = new URL(baseUrl);
    const entries = Object.entries(params).filter(([_, value]) => value.trim() !== "");
    
    entries.forEach(([key, value]) => {
      url.searchParams.set(key, value.trim());
    });
    
    return url.toString();
  } catch {
    // If URL is invalid, try to build manually
    const queryParams = Object.entries(params)
      .filter(([_, value]) => value.trim() !== "")
      .map(([key, value]) => `${key}=${encodeURIComponent(value.trim())}`)
      .join("&");
    
    if (!queryParams) return baseUrl;
    
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}${queryParams}`;
  }
}

export function UtmPreview({ baseUrl, params }: UtmPreviewProps) {
  const [copied, setCopied] = useState(false);
  const finalUrl = buildUtmUrl(baseUrl, params);
  
  const hasAnyParams = Object.values(params).some((v) => v.trim() !== "");

  const handleCopy = async () => {
    if (!finalUrl) return;
    await navigator.clipboard.writeText(finalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!baseUrl) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">
          Enter a destination URL to see the preview
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Final URL Preview</p>
      <div className="flex items-start gap-2">
        <div className="flex-1 rounded-lg border border-border bg-muted/30 p-3 overflow-hidden">
          <p className="text-xs break-all font-mono text-foreground/80">
            {hasAnyParams ? finalUrl : baseUrl}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={handleCopy}
          disabled={!finalUrl}
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
