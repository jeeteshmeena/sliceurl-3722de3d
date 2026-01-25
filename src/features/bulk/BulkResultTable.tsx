import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { getShortUrl } from "@/lib/domain";

interface BulkResult {
  index: number;
  url: string;
  success: boolean;
  error?: string;
  link?: {
    id: string;
    short_code: string;
    custom_slug?: string;
    title?: string;
    original_url: string;
  };
}

interface BulkResultTableProps {
  results: BulkResult[];
}

export function BulkResultTable({ results }: BulkResultTableProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const copyToClipboard = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success("Link copied!", { duration: 2000 });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyAllLinks = async () => {
    const links = results
      .filter(r => r.link)
      .map(r => getShortUrl(r.link?.custom_slug || r.link?.short_code || ''))
      .join('\n');
    
    await navigator.clipboard.writeText(links);
    setCopiedAll(true);
    toast.success("All links copied!", { duration: 2500 });
    setTimeout(() => setCopiedAll(false), 2500);
  };

  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No successful links to display
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      {/* Copy All button */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground tabular-nums">
          {results.length} link{results.length !== 1 ? 's' : ''} created
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyAllLinks}
          className="gap-2 h-8 active:scale-[0.96] transition-transform"
        >
          <motion.div
            key={copiedAll ? 'check' : 'copy'}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            {copiedAll ? <Check className="h-3.5 w-3.5 text-foreground" /> : <Copy className="h-3.5 w-3.5" />}
          </motion.div>
          {copiedAll ? "Copied!" : "Copy All"}
        </Button>
      </div>

      {/* Results list */}
      <ScrollArea className="h-[200px] sm:h-[250px] rounded-lg border border-border/50 bg-muted/20">
        <div className="p-2 space-y-1.5">
          {results.map((result, idx) => (
            <motion.div
              key={result.link?.id || idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="flex items-center gap-2 p-2.5 sm:p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors group"
            >
              {/* Index badge */}
              <span className="flex-shrink-0 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded tabular-nums">
                #{idx + 1}
              </span>
              
              {/* Link info */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-sm text-primary truncate">
                    {getShortUrl(result.link?.custom_slug || result.link?.short_code || '')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {result.link?.title || getDomainFromUrl(result.url) || "Link preview unavailable"}
                </p>
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8 active:scale-[0.92] transition-transform"
                  onClick={() => copyToClipboard(
                    getShortUrl(result.link!.custom_slug || result.link!.short_code),
                    idx
                  )}
                >
                  <motion.div
                    key={copiedIndex === idx ? 'check' : 'copy'}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.15 }}
                  >
                    {copiedIndex === idx ? (
                      <Check className="h-3.5 w-3.5 text-foreground" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </motion.div>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8 active:scale-[0.92] transition-transform"
                  asChild
                >
                  <a
                    href={getShortUrl(result.link?.custom_slug || result.link?.short_code || '')}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    </motion.div>
  );
}

// Helper to extract domain from URL
function getDomainFromUrl(url: string): string {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch {
    return "";
  }
}