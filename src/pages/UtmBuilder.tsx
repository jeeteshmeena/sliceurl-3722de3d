import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, ExternalLink, ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { UtmForm, UtmParams } from "@/components/utm/UtmForm";
import { UtmPresets } from "@/components/utm/UtmPresets";
import { buildUtmUrl } from "@/components/utm/UtmPreview";

const emptyUtmParams: UtmParams = {
  utm_source: "",
  utm_medium: "",
  utm_campaign: "",
  utm_term: "",
  utm_content: "",
};

export default function UtmBuilder() {
  const navigate = useNavigate();
  const [destinationUrl, setDestinationUrl] = useState("");
  const [utmParams, setUtmParams] = useState<UtmParams>(emptyUtmParams);
  const [copied, setCopied] = useState(false);

  const finalUrl = buildUtmUrl(destinationUrl, utmParams);
  const hasAnyParams = Object.values(utmParams).some((v) => v.trim() !== "");

  const handleCopy = async () => {
    if (!finalUrl) return;
    await navigator.clipboard.writeText(finalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setDestinationUrl("");
    setUtmParams(emptyUtmParams);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">UTM Campaign Generator</h1>
            <p className="text-sm text-muted-foreground">Build campaign-ready URLs in seconds</p>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left Column - Form */}
          <motion.div 
            className="lg:col-span-3 space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="destination" className="text-base font-medium">
                  Destination URL
                </Label>
                <Input
                  id="destination"
                  placeholder="https://example.com/page"
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  className="text-base"
                />
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="font-medium mb-4">Campaign Parameters</h3>
                <UtmForm params={utmParams} onChange={setUtmParams} />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset} className="flex-1">
                  Reset All
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Right Column - Preview & Presets */}
          <motion.div 
            className="lg:col-span-2 space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* Preview Card */}
            <Card className="p-6 lg:sticky lg:top-24">
              <h3 className="font-medium mb-4">Generated URL</h3>
              
              {!destinationUrl ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Enter a destination URL to see the preview
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-muted/30 p-4 max-h-40 overflow-y-auto">
                    <p className="text-sm break-all font-mono text-foreground/80">
                      {hasAnyParams ? finalUrl : destinationUrl}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleCopy} className="flex-1 gap-2">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copied!" : "Copy URL"}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(hasAnyParams ? finalUrl : destinationUrl, "_blank")}
                      disabled={!destinationUrl}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Presets */}
              <div className="border-t border-border mt-6 pt-6">
                <UtmPresets onSelect={setUtmParams} />
              </div>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
