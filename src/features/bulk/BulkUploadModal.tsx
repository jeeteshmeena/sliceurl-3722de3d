import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Scissors, Loader2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BulkOptions, BulkOptionsData } from "./BulkOptions";
import { BulkProcessingAnimation } from "./BulkProcessingAnimation";
import { BulkSuccessState } from "./BulkSuccessState";
import { generateQRZip, downloadBlob } from "./BulkQRZip";
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

interface BulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

type Stage = "input" | "processing" | "complete";

// Uses bulk-shorten edge function for atomic server-side processing

export function BulkUploadModal({ open, onOpenChange, onComplete }: BulkUploadModalProps) {
  const [stage, setStage] = useState<Stage>("input");
  const [urlText, setUrlText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExportingQR, setIsExportingQR] = useState(false);
  const [options, setOptions] = useState<BulkOptionsData>({
    batchName: "",
    password: "",
    passwordEnabled: false,
    expiry: undefined,
    maxClicks: undefined,
    slugPrefix: "",
    autoTitle: false,
    linkPreviewEnabled: false,
  });
  
  const [results, setResults] = useState<BulkResult[]>([]);
  const [batchId, setBatchId] = useState("");
  const [progress, setProgress] = useState({ total: 0, processed: 0, success: 0, failed: 0, skipped: 0 });

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const URL_REGEX = /^https?:\/\/[^\s]+$/i;
  
  const parseUrls = (text: string): { valid: string[]; invalid: string[] } => {
    const lines = text
      .split(/[\n,]/)
      .map(url => url.trim())
      .filter(url => url.length > 0);
    
    const valid: string[] = [];
    const invalid: string[] = [];
    
    lines.forEach(url => {
      if (URL_REGEX.test(url)) {
        valid.push(url);
      } else {
        invalid.push(url);
      }
    });
    
    return { valid, invalid };
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const lines = content.split('\n');
      const urls = lines
        .map(line => {
          const parts = line.split(',');
          return parts[0]?.trim().replace(/^["']|["']$/g, '');
        })
        .filter(url => url && url.startsWith('http'));
      
      setUrlText(urls.join('\n'));
      toast.success(`Loaded ${urls.length} URLs from file`);
    };
    reader.readAsText(file);
  }, []);

  const handleSliceAll = async () => {
    const { valid: urls, invalid: invalidUrls } = parseUrls(urlText);
    
    if (urls.length === 0) {
      toast.error("No valid URLs found", { description: "Please paste URLs starting with http:// or https://" });
      return;
    }

    if (urls.length > 100) {
      toast.error("Maximum 100 URLs per batch");
      return;
    }

    // Start UI immediately - optimistic update
    setIsLoading(true);
    setStage("processing");
    setProgress({ total: urls.length, processed: 0, success: 0, failed: 0, skipped: invalidUrls.length });
    setResults([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to use bulk shortener");
        setStage("input");
        setIsLoading(false);
        return;
      }

      // Call the bulk-shorten edge function with all URLs at once
      const response = await supabase.functions.invoke('bulk-shorten', {
        body: {
          urls: urls,
          batchName: options.batchName || undefined,
          password: options.passwordEnabled ? options.password : undefined,
          expiry: options.expiry?.toISOString(),
          maxClicks: options.maxClicks,
          slugPrefix: options.slugPrefix || undefined,
          autoTitle: options.autoTitle,
        },
      });

      console.log('Bulk shorten response:', response);

      if (response.error) {
        console.error('Bulk shorten error:', response.error);
        toast.error("Bulk shortening failed", {
          description: response.error.message || "Server error",
        });
        setStage("input");
        setIsLoading(false);
        return;
      }

      const data = response.data;

      // Handle NO_VALID_URLS error
      if (data?.error === 'NO_VALID_URLS') {
        toast.error("No valid URLs found", {
          description: "All provided URLs were invalid",
        });
        setStage("input");
        setIsLoading(false);
        return;
      }

      // Validate response structure
      if (!data || typeof data.successCount !== 'number') {
        console.error('Invalid response structure:', data);
        toast.error("Invalid response from server");
        setStage("input");
        setIsLoading(false);
        return;
      }

      // Set batch ID from server response
      setBatchId(data.batchId || '');

      // Process results from the server
      const serverResults: BulkResult[] = (data.results || []).map((r: any) => ({
        index: r.index,
        url: r.url,
        success: r.success,
        error: r.error,
        link: r.link ? {
          id: r.link.id,
          short_code: r.link.short_code,
          custom_slug: r.link.custom_slug,
          title: r.link.title,
          original_url: r.link.original_url,
        } : undefined,
      }));

      // Update progress with real server data
      setProgress({
        total: data.totalUrls || urls.length,
        processed: data.totalUrls || urls.length,
        success: data.successCount,
        failed: data.failCount,
        skipped: invalidUrls.length,
      });
      setResults(serverResults);
      setStage("complete");

      if (onComplete) {
        onComplete();
      }

      // Show appropriate toast based on results
      if (data.successCount > 0) {
        toast.success(`Sliced ${data.successCount} URLs successfully`, {
          description: data.failCount > 0 ? `${data.failCount} failed` : (invalidUrls.length > 0 ? `Skipped ${invalidUrls.length} invalid URLs` : undefined),
        });
      } else {
        toast.error("All URLs failed to shorten", {
          description: "Check the error details in the results",
        });
      }

    } catch (error) {
      console.error("Bulk shorten error:", error);
      toast.error("Bulk shortening failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      setStage("input");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    const successfulResults = results.filter(r => r.success);
    if (successfulResults.length === 0) {
      toast.error("No successful links to export");
      return;
    }
    
    const csvContent = [
      "Original URL,Short URL,Slug,Title",
      ...successfulResults.map(r => {
        const shortUrl = getShortUrl(r.link?.custom_slug || r.link?.short_code || '');
        return `"${r.url}","${shortUrl}","${r.link?.custom_slug || r.link?.short_code}","${r.link?.title || ''}"`;
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    downloadBlob(blob, `sliceurl-batch-${batchId}.csv`);
    toast.success("CSV exported!");
  };

  const handleExportQRZip = async () => {
    const successfulLinks = results
      .filter(r => r.success && r.link)
      .map(r => r.link!);

    if (successfulLinks.length === 0) {
      toast.error("No successful links to export");
      return;
    }

    setIsExportingQR(true);
    try {
      const zipBlob = await generateQRZip(successfulLinks, batchId, () => {});
      downloadBlob(zipBlob, `sliceurl-qr-batch-${batchId}.zip`);
      toast.success("QR codes exported!");
    } catch (error) {
      console.error("QR export error:", error);
      toast.error("Failed to export QR codes");
    } finally {
      setIsExportingQR(false);
    }
  };

  const handleRetry = () => {
    setStage("input");
    setResults([]);
    setProgress({ total: 0, processed: 0, success: 0, failed: 0, skipped: 0 });
  };

  const handleClose = () => {
    if (stage === "processing") return; // Prevent closing during processing
    onOpenChange(false);
    setTimeout(() => {
      setStage("input");
      setUrlText("");
      setResults([]);
      setBatchId("");
      setProgress({ total: 0, processed: 0, success: 0, failed: 0, skipped: 0 });
      setOptions({
        batchName: "",
        password: "",
        passwordEnabled: false,
        expiry: undefined,
        maxClicks: undefined,
        slugPrefix: "",
        autoTitle: false,
        linkPreviewEnabled: false,
      });
    }, 300);
  };

  const { valid: validUrls, invalid: invalidUrls } = parseUrls(urlText);
  const urlCount = validUrls.length;
  const invalidCount = invalidUrls.length;

  // Ref for initial focus
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus management when stage changes
  useEffect(() => {
    if (!open) return;
    
    const timer = setTimeout(() => {
      if (stage === "input") {
        textareaRef.current?.focus();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [open, stage]);

  // Disable ESC key and backdrop click during processing
  const handleOpenChange = (newOpen: boolean) => {
    if (stage === "processing") return; // Block all close attempts during processing
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        hideCloseButton
        onPointerDownOutside={(e) => {
          if (stage === "processing") e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (stage === "processing") e.preventDefault();
        }}
        className={`
          flex flex-col p-0 gap-0 border-border/50 overflow-hidden
          w-[94%] max-w-2xl
          max-h-[calc(100dvh-76px-16px)]
          !top-[76px] !translate-y-0
          shadow-[0_10px_30px_rgba(0,0,0,0.12)] rounded-[18px]
          ${stage === "processing" ? "pointer-events-auto" : ""}
        `}
      >
        {/* Header - Hidden during processing for full-screen feel */}
        {stage !== "processing" && (
          <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-6 border-b border-border/50 bg-background">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-foreground/5">
                <Scissors className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Bulk Shortener</h2>
                <p className="text-xs text-muted-foreground">
                  {stage === "input" && "Paste URLs to slice them all at once"}
                  {stage === "complete" && (progress.success > 0 ? "All done!" : "Processing complete")}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-muted"
              onClick={handleClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Content - Scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          <AnimatePresence mode="wait">
            {/* STATE A: INPUT */}
            {stage === "input" && (
              <motion.div
                key="input"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="p-4 sm:p-6 space-y-4"
              >
                {/* URL Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">URLs</Label>
                    <div className="flex items-center gap-2">
                      {invalidCount > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {invalidCount} invalid
                        </span>
                      )}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        urlCount > 0 
                          ? "bg-primary/10 text-primary" 
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {urlCount} URL{urlCount !== 1 ? 's' : ''} detected
                      </span>
                    </div>
                  </div>
                  <Textarea
                    ref={textareaRef}
                    placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
                    value={urlText}
                    onChange={(e) => setUrlText(e.target.value)}
                    className="min-h-[140px] font-mono text-sm resize-none text-[14px]"
                    onKeyDown={(e) => {
                      // Ctrl/Cmd + Enter to submit
                      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && urlCount > 0 && !isLoading) {
                        e.preventDefault();
                        handleSliceAll();
                      }
                    }}
                  />
                  <div className="flex items-center gap-3">
                    <Label
                      htmlFor="csv-upload"
                      className="cursor-pointer inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload CSV
                    </Label>
                    <input
                      id="csv-upload"
                      type="file"
                      accept=".csv,.txt"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>

                {/* Options */}
                <BulkOptions options={options} onChange={setOptions} />
              </motion.div>
            )}

            {/* STATE B: PROCESSING */}
            {stage === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="p-6 sm:p-10"
              >
                <BulkProcessingAnimation
                  total={progress.total}
                  processed={progress.processed}
                  isComplete={false}
                />
              </motion.div>
            )}

            {/* STATE C: COMPLETE */}
            {stage === "complete" && (
              <BulkSuccessState
                results={results}
                progress={progress}
                onExportCSV={handleExportCSV}
                onExportQRZip={handleExportQRZip}
                onClose={handleClose}
                isExportingQR={isExportingQR}
                onRetry={handleRetry}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Footer - Only for input stage, sticky at bottom with 16px margin */}
        {stage === "input" && (
          <div className="flex-shrink-0 sticky bottom-0 border-t border-border/50 bg-background p-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
            <Button
              className="w-full gap-2 h-12 text-[14px] font-medium"
              size="lg"
              onClick={handleSliceAll}
              disabled={urlCount === 0 || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Scissors className="h-4 w-4" />
              )}
              Slice All ({urlCount})
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
