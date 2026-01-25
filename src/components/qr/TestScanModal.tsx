import { useState, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TestScanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
}

export const TestScanModal = memo(function TestScanModal({ open, onOpenChange, url }: TestScanModalProps) {
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!open) {
      // Reset state when modal closes with a slight delay
      const timer = setTimeout(() => {
        setScanning(false);
        setScanned(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleSimulateScan = useCallback(() => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setScanned(true);
    }, 1500);
  }, []);

  const handleOpenLink = useCallback(() => {
    window.open(url, "_blank");
  }, [url]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-background border-border/50 rounded-2xl">
        <DialogHeader className="p-5 pb-0">
          <DialogTitle className="flex items-center gap-2.5 text-base">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-primary" />
            </div>
            Test QR Scan
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-6 px-5">
          {/* iPhone Frame */}
          <div className="relative w-56 h-[380px] bg-gradient-to-b from-muted/80 to-muted/40 rounded-[36px] border-4 border-foreground/10 shadow-2xl overflow-hidden">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-foreground/10 rounded-b-xl" />
            
            {/* Screen Content */}
            <div className="h-full flex flex-col items-center justify-center p-5 pt-8">
              <AnimatePresence mode="wait">
                {!scanned ? (
                  <motion.div
                    key="scanner"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center gap-4"
                  >
                    {/* Scanner Frame */}
                    <div className="relative w-32 h-32 border-2 border-dashed border-muted-foreground/30 rounded-xl flex items-center justify-center">
                      {/* Corner Brackets */}
                      <div className="absolute top-2 left-2 w-5 h-5 border-l-2 border-t-2 border-primary/60 rounded-tl-sm" />
                      <div className="absolute top-2 right-2 w-5 h-5 border-r-2 border-t-2 border-primary/60 rounded-tr-sm" />
                      <div className="absolute bottom-2 left-2 w-5 h-5 border-l-2 border-b-2 border-primary/60 rounded-bl-sm" />
                      <div className="absolute bottom-2 right-2 w-5 h-5 border-r-2 border-b-2 border-primary/60 rounded-br-sm" />

                      {/* Scanning Animation */}
                      {scanning && (
                        <motion.div
                          initial={{ y: -50 }}
                          animate={{ y: 50 }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                          className="absolute left-3 right-3 h-0.5 bg-primary rounded-full shadow-[0_0_8px_2px] shadow-primary/50"
                        />
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground text-center">
                      Point camera at QR code
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="flex flex-col items-center gap-4"
                  >
                    {/* Success Checkmark */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
                      className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30"
                    >
                      <Check className="w-7 h-7 text-white" strokeWidth={3} />
                    </motion.div>
                    
                    <div className="text-center space-y-1">
                      <h3 className="font-semibold text-sm">QR Code Detected!</h3>
                      <p className="text-[10px] text-muted-foreground break-all max-w-[180px] leading-relaxed">
                        {url}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenLink}
                      className="gap-2 rounded-xl h-9"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Link
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Home Indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-20 h-1 bg-foreground/20 rounded-full" />
          </div>
        </div>

        {/* Action Button */}
        {!scanned && (
          <div className="p-5 pt-0">
            <Button
              onClick={handleSimulateScan}
              disabled={scanning}
              className="w-full h-11 rounded-xl gap-2"
              size="lg"
            >
              {scanning ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Scanning...
                </>
              ) : (
                "Simulate Scan"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
});
