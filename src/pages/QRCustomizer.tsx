import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Link2, Loader2, Smartphone, PenLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQRDesign } from "@/hooks/useQRDesign";
import { QREditorSidebar } from "@/components/qr/QREditorSidebar";
import { QRPreviewPanel } from "@/components/qr/QRPreviewPanel";
import { TestScanModal } from "@/components/qr/TestScanModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { getBaseUrl } from "@/lib/domain";

interface LinkData {
  id: string;
  short_code: string;
  original_url: string;
  title: string | null;
}

export default function QRCustomizer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  
  const [link, setLink] = useState<LinkData | null>(null);
  const [loadingLink, setLoadingLink] = useState(true);
  const [testScanOpen, setTestScanOpen] = useState(false);
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);

  const { design, loading: designLoading, saving, updateDesign, resetDesign, saveDesign } = useQRDesign(id);

  useEffect(() => {
    document.title = "QR Editor – SliceURL";
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (!id) {
      navigate("/dashboard");
      return;
    }

    const fetchLink = async () => {
      try {
        // Use links_safe view to avoid exposing password_hash to client
        const { data, error } = await supabase
          .from("links_safe")
          .select("id, short_code, original_url, title")
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          navigate("/dashboard");
          return;
        }

        setLink(data);
      } catch (error) {
        console.error("Error fetching link:", error);
        navigate("/dashboard");
      } finally {
        setLoadingLink(false);
      }
    };

    if (user) {
      fetchLink();
    }
  }, [id, user, authLoading, navigate]);

  const handleUpdateDesign = useCallback((updates: Parameters<typeof updateDesign>[0]) => {
    updateDesign(updates);
  }, [updateDesign]);

  const handleSaveDesign = useCallback(() => {
    return saveDesign();
  }, [saveDesign]);

  const shortUrl = useMemo(() => {
    if (!link) return "";
    return `${getBaseUrl()}/s/${link.short_code}`;
  }, [link]);

  // Loading state
  if (authLoading || loadingLink || designLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading QR Editor...</p>
        </motion.div>
      </div>
    );
  }

  if (!link || !design) {
    return null;
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 h-14 bg-card/95 backdrop-blur-xl border-b border-border/50 shadow-sm z-50">
        <div className="h-full px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/dashboard")} 
              className="h-9 w-9 shrink-0 rounded-xl hover:bg-muted"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Link2 className="w-4 h-4 text-primary" />
              </div>
              <div className="hidden sm:block min-w-0">
                <h1 className="font-semibold text-sm truncate">QR Editor</h1>
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {link.title || link.original_url}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile Edit Button */}
            {isMobile && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setMobileEditorOpen(true)}
                className="gap-2 h-9 rounded-xl"
              >
                <PenLine className="w-4 h-4" />
                Edit QR
              </Button>
            )}

            {/* Test Scan Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTestScanOpen(true)}
              className="gap-2 shrink-0 h-9 rounded-xl border-border/60 hover:border-primary/50 hover:bg-primary/5"
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden sm:inline">Test Scan</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - 2 Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Desktop Only */}
        {!isMobile && (
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="w-[350px] shrink-0 overflow-hidden"
          >
            <QREditorSidebar
              design={design}
              onUpdate={handleUpdateDesign}
              onSave={handleSaveDesign}
              onReset={resetDesign}
              saving={saving}
              destinationUrl={link.original_url}
            />
          </motion.div>
        )}

        {/* Right Preview Panel */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex-1 bg-muted/30 overflow-hidden"
        >
          <QRPreviewPanel url={shortUrl} design={design} />
        </motion.div>
      </div>

      {/* Mobile Editor Sheet */}
      <Sheet open={mobileEditorOpen} onOpenChange={setMobileEditorOpen}>
        <SheetContent 
          side="bottom" 
          className="h-[90vh] rounded-t-3xl p-0 border-t border-border/50"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Edit QR Code</SheetTitle>
          </SheetHeader>
          <div className="h-full flex flex-col">
            {/* Mobile Sheet Handle */}
            <div className="flex items-center justify-center py-3 border-b border-border/30">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
            </div>
            
            {/* Mobile Sidebar Content */}
            <div className="flex-1 overflow-hidden">
              <QREditorSidebar
                design={design}
                onUpdate={handleUpdateDesign}
                onSave={handleSaveDesign}
                onReset={resetDesign}
                saving={saving}
                destinationUrl={link.original_url}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Test Scan Modal */}
      <TestScanModal 
        open={testScanOpen} 
        onOpenChange={setTestScanOpen} 
        url={shortUrl} 
      />
    </div>
  );
}
