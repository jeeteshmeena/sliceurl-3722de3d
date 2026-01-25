import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Download, FileText, ChevronDown, AlertTriangle, XCircle, Copy, Check, ExternalLink } from "lucide-react";
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

interface BulkSuccessStateProps {
  results: BulkResult[];
  progress: { total: number; processed: number; success: number; failed: number; skipped: number };
  onExportCSV: () => void;
  onExportQRZip: () => void;
  onClose: () => void;
  isExportingQR: boolean;
  onRetry?: () => void;
}

// Stagger animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.25, ease: "easeOut" as const },
  },
};

export function BulkSuccessState({
  results,
  progress,
  onExportCSV,
  onExportQRZip,
  onClose,
  isExportingQR,
  onRetry,
}: BulkSuccessStateProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFailed, setShowFailed] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const autoCloseRef = useRef<NodeJS.Timeout>();
  
  const successfulResults = results.filter(r => r.success);
  const failedResults = results.filter(r => !r.success);
  
  const isFullFailure = progress.success === 0 && progress.processed > 0;
  const isPartialSuccess = progress.success > 0 && progress.failed > 0;

  // Auto-close after 3 seconds if not interacting
  useEffect(() => {
    if (isFullFailure || isInteracting) return;
    
    autoCloseRef.current = setTimeout(() => {
      if (!isInteracting) {
        onClose();
      }
    }, 3000);
    
    return () => {
      if (autoCloseRef.current) {
        clearTimeout(autoCloseRef.current);
      }
    };
  }, [isFullFailure, isInteracting, onClose]);

  // Cancel auto-close on any interaction
  const handleInteraction = () => {
    setIsInteracting(true);
    if (autoCloseRef.current) {
      clearTimeout(autoCloseRef.current);
    }
  };

  const handleCopyAll = async () => {
    handleInteraction();
    const links = successfulResults
      .filter(r => r.link)
      .map(r => getShortUrl(r.link?.custom_slug || r.link?.short_code || ''))
      .join('\n');
    
    await navigator.clipboard.writeText(links);
    setCopiedAll(true);
    toast.success("All links copied!", { duration: 2500 });
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleCopySingle = async (result: BulkResult, index: number) => {
    handleInteraction();
    const shortUrl = getShortUrl(result.link?.custom_slug || result.link?.short_code || '');
    await navigator.clipboard.writeText(shortUrl);
    setCopiedIndex(index);
    toast.success("Copied ✓", { duration: 2000 });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Full failure state
  if (isFullFailure) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex flex-col h-full"
      >
        {/* Error Header */}
        <div className="flex flex-col items-center py-12 sm:py-16 px-4 space-y-6">
          <motion.div
            className="relative"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
          >
            <motion.div 
              className="p-6 rounded-full bg-destructive/10"
              animate={{ 
                boxShadow: [
                  "0 0 0 0 rgba(239, 68, 68, 0)",
                  "0 0 0 12px rgba(239, 68, 68, 0.08)",
                  "0 0 0 0 rgba(239, 68, 68, 0)"
                ]
              }}
              transition={{ duration: 1.5, repeat: 1 }}
            >
              <XCircle className="h-14 w-14 text-destructive" />
            </motion.div>
          </motion.div>

          <motion.div
            className="text-center space-y-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.3 }}
          >
            <h3 className="text-2xl font-bold text-foreground">Bulk slicing failed</h3>
            <p className="text-sm text-muted-foreground">
              {progress.failed} links failed to create
              {progress.skipped > 0 && ` · ${progress.skipped} skipped`}
            </p>
          </motion.div>
        </div>

        {/* Failed URLs List */}
        {failedResults.length > 0 && (
          <motion.div
            className="px-4 sm:px-6 flex-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
              <p className="text-sm font-medium text-destructive mb-3">Error details:</p>
              <ScrollArea className="h-[120px]">
                <div className="space-y-2 text-xs text-muted-foreground font-mono">
                  {failedResults.slice(0, 10).map((r, i) => (
                    <motion.div 
                      key={i} 
                      className="truncate py-1 border-b border-border/30 last:border-0"
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.03 }}
                    >
                      {r.url.substring(0, 40)}... — {r.error || "Unknown error"}
                    </motion.div>
                  ))}
                  {failedResults.length > 10 && (
                    <div className="text-muted-foreground pt-2">
                      ...and {failedResults.length - 10} more
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div 
          className="mt-auto p-4 sm:p-6 space-y-3 border-t border-border/50 bg-background"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {onRetry && (
            <motion.div variants={itemVariants}>
              <Button
                variant="outline"
                className="w-full h-11 gap-2 active:scale-[0.98] transition-transform"
                onClick={onRetry}
              >
                Retry
              </Button>
            </motion.div>
          )}
          <motion.div variants={itemVariants}>
            <Button
              className="w-full h-11 gap-2 active:scale-[0.98] transition-transform"
              onClick={onClose}
            >
              Close
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col h-full"
      onMouseEnter={handleInteraction}
      onTouchStart={handleInteraction}
    >
      {/* Success Header */}
      <div className="flex flex-col items-center py-8 sm:py-10 px-4 space-y-5">
        <motion.div
          className="relative"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.1 }}
        >
          {/* Success icon with pulse ring (max 2 loops) */}
          <motion.div 
            className="p-6 rounded-full bg-foreground/5 relative"
            animate={{ 
              boxShadow: [
                "0 0 0 0 hsl(var(--foreground) / 0)",
                "0 0 0 16px hsl(var(--foreground) / 0.06)",
                "0 0 0 0 hsl(var(--foreground) / 0)"
              ]
            }}
            transition={{ duration: 1.2, repeat: 2, repeatDelay: 0.3 }}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
            >
              <CheckCircle2 className="h-14 w-14 text-foreground" />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Success Text */}
        <motion.div
          className="text-center space-y-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.3 }}
        >
          <h3 className="text-2xl font-bold text-foreground tracking-tight">
            Perfectly sliced.
          </h3>
          <p className="text-sm text-muted-foreground tabular-nums">
            {progress.success} link{progress.success !== 1 ? 's' : ''} ready to share
            {progress.failed > 0 && (
              <span className="text-muted-foreground"> · {progress.failed} failed</span>
            )}
          </p>
        </motion.div>
      </div>

      {/* Partial failure warning */}
      <AnimatePresence>
        {isPartialSuccess && (
          <motion.div
            className="px-4 sm:px-6 mb-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <button
              onClick={() => {
                handleInteraction();
                setShowFailed(!showFailed);
              }}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-all duration-200 active:scale-[0.99]"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground tabular-nums">
                  {progress.success} sliced · {progress.failed} failed
                </span>
              </div>
              <motion.div
                animate={{ rotate: showFailed ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </motion.div>
            </button>

            <AnimatePresence>
              {showFailed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pt-2">
                    <ScrollArea className="h-[80px]">
                      <div className="space-y-1 text-xs text-muted-foreground font-mono p-3 bg-muted/30 rounded-lg">
                        {failedResults.map((r, i) => (
                          <div key={i} className="truncate">
                            {r.url.substring(0, 40)}... — {r.error || "Unknown error"}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Toggle (collapsible) */}
      {successfulResults.length > 0 && (
        <motion.div
          className="px-4 sm:px-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.3 }}
        >
          <button
            onClick={() => {
              handleInteraction();
              setIsExpanded(!isExpanded);
            }}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-all duration-200 active:scale-[0.99]"
          >
            <span className="text-sm font-medium text-foreground">
              View {successfulResults.length} created links
            </span>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          </button>

          {/* Collapsible Link Cards */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className="pt-3">
                  <ScrollArea className="h-[200px] sm:h-[240px]">
                    <div className="space-y-2 pr-2">
                      {successfulResults.map((result, index) => {
                        const shortUrl = getShortUrl(result.link?.custom_slug || result.link?.short_code || '');
                        const isCopied = copiedIndex === index;
                        
                        return (
                          <motion.div
                            key={result.index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="p-3 rounded-lg bg-background border border-border/50 hover:border-border transition-colors"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {result.link?.title || shortUrl}
                                </p>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {result.url.length > 50 ? result.url.substring(0, 50) + '...' : result.url}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="h-8 w-8 shrink-0"
                                onClick={() => handleCopySingle(result, index)}
                              >
                                {isCopied ? (
                                  <Check className="h-3.5 w-3.5 text-foreground" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Action Buttons - Equal width, consistent height */}
      <motion.div 
        className="mt-auto p-4 sm:p-6 space-y-3 border-t border-border/50 bg-background"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Primary action - Copy All */}
        <motion.div variants={itemVariants}>
          <Button
            className="w-full h-11 gap-2 active:scale-[0.98] transition-transform"
            onClick={handleCopyAll}
            disabled={successfulResults.length === 0}
          >
            {copiedAll ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy All Links
              </>
            )}
          </Button>
        </motion.div>

        {/* Secondary actions - Equal width */}
        <div className="grid grid-cols-2 gap-2">
          <motion.div variants={itemVariants}>
            <Button
              variant="outline"
              onClick={() => {
                handleInteraction();
                onExportCSV();
              }}
              className="w-full h-11 gap-2 active:scale-[0.98] transition-transform"
              disabled={successfulResults.length === 0}
            >
              <FileText className="h-4 w-4" />
              Export CSV
            </Button>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <Button
              variant="outline"
              onClick={() => {
                handleInteraction();
                onExportQRZip();
              }}
              disabled={isExportingQR || successfulResults.length === 0}
              className="w-full h-11 gap-2 active:scale-[0.98] transition-transform"
            >
              <Download className="h-4 w-4" />
              {isExportingQR ? "..." : "QR ZIP"}
            </Button>
          </motion.div>
        </div>
        
        <motion.div variants={itemVariants}>
          <Button
            variant="ghost"
            className="w-full h-11 gap-2 active:scale-[0.98] transition-transform"
            onClick={onClose}
          >
            Done
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
