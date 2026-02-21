import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Copy, Check, Scissors, AlertTriangle, LogIn, UserPlus, LayoutDashboard,
  Lock, QrCode, Share2, BarChart3, Globe, FolderOpen, Clock,
  Zap, Shield, Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLinks } from "@/hooks/useLinks";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GlobalStats } from "@/components/GlobalStats";
import { FAQSection } from "@/components/FAQSection";
import { useLanguage } from "@/lib/i18n";
import { SliceBuddy } from "@/components/SliceBuddy";
import { SliceCelebration } from "@/components/SliceCelebration";
import { SliceBoxPromo } from "@/components/SliceBoxPromo";
import { FeatureCard } from "@/components/FeatureCard";
import { FeatureKey } from "@/components/FeaturePreviewVisuals";
import { useTone } from "@/hooks/useTone";
import { checkUrlSafety } from "@/lib/malwareCheck";
import { triggerHaptic } from "@/lib/haptics";

// Feature grid - 10 interactive cards
const featureKeys: Array<{ icon: React.ComponentType<{ className?: string }>; titleKey: FeatureKey; descKey: string; isQR?: boolean }> = [
  { icon: Lock, titleKey: "feature_lock_links", descKey: "feature_lock_links_desc" },
  { icon: QrCode, titleKey: "feature_qr_codes", descKey: "feature_qr_codes_desc", isQR: true },
  { icon: Share2, titleKey: "feature_social", descKey: "feature_social_desc" },
  { icon: BarChart3, titleKey: "feature_analytics", descKey: "feature_analytics_desc" },
  { icon: Globe, titleKey: "feature_domains", descKey: "feature_domains_desc" },
  { icon: FolderOpen, titleKey: "feature_bulk", descKey: "feature_bulk_desc" },
  { icon: Clock, titleKey: "feature_scheduling", descKey: "feature_scheduling_desc" },
  { icon: Zap, titleKey: "feature_instant", descKey: "feature_instant_desc" },
  { icon: Shield, titleKey: "feature_malware", descKey: "feature_malware_desc" },
  { icon: Target, titleKey: "feature_utm", descKey: "feature_utm_desc" },
];

const Index = () => {
  const { t, language } = useLanguage();
  const { greeting, heroDesc } = useTone();
  const isHindi = language === "hi";
  const [url, setUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [malwareWarning, setMalwareWarning] = useState<string | null>(null);
  const [isSplitting, setIsSplitting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [splitUrl, setSplitUrl] = useState("");
  const [showResult, setShowResult] = useState(false);
  const { createLink } = useLinks();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    triggerHaptic('medium');

    try {
      new URL(url);
    } catch {
      toast({ title: "Invalid URL", description: "Please enter a valid URL", variant: "destructive" });
      return;
    }

    const safetyCheck = checkUrlSafety(url);
    if (!safetyCheck.isSafe) {
      setMalwareWarning(safetyCheck.reason || "This URL appears unsafe");
      return;
    }

    setMalwareWarning(null);
    setLoading(true);
    
    setSplitUrl(url);
    setShowResult(false);
    
    const link = await createLink({ original_url: url });
    setLoading(false);

    if (link) {
      const newShortUrl = `${window.location.origin}/s/${link.short_code}`;
      
      setIsSplitting(true);
      
      setTimeout(() => {
        setShortUrl(newShortUrl);
        setShowResult(true);
        setIsSplitting(false);
        setIsActive(true);
        navigator.clipboard.writeText(newShortUrl);
        setCopied(true);
        setShowCelebration(true);
        setTimeout(() => setCopied(false), 2000);
        setTimeout(() => setIsActive(false), 1000);
      }, 500);
    }
  };

  const copyToClipboard = () => {
    triggerHaptic('light');
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col overflow-x-hidden">
      <Header />

      <SliceCelebration show={showCelebration} onComplete={() => setShowCelebration(false)} />

      <main className="flex-1 flex flex-col" style={{ marginTop: '64px' }}>
        <div className="container px-4 sm:px-6">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto pt-6 pb-4"
          >
            {/* SliceBuddy Mascot - Static with slice animation on success */}
            <div className="flex items-center justify-center mb-3 sm:mb-4">
              <div className="max-h-[120px] sm:max-h-none">
                <SliceBuddy size="lg" isSlicing={isSplitting} isActive={isActive} />
              </div>
            </div>

            {/* Title - Single hero variant */}
            <h1 
              className={`font-bold tracking-tight mb-2 ${isHindi ? "font-hindi-decorative" : ""}`}
              style={{ fontSize: 'clamp(28px, 6vw, 36px)' }}
            >
              <span className="inline-block">Slice</span>
              <span className="text-muted-foreground">URL</span>
            </h1>
            
            {/* Subtitle */}
            <p 
              className={`text-muted-foreground mb-2 ${isHindi ? "font-hindi-decorative" : ""}`}
              style={{ fontSize: 'clamp(16px, 4vw, 18px)' }}
            >
              The smartest way to share links.
            </p>
            
            {/* Description */}
            <p className="text-muted-foreground mb-4 max-w-md mx-auto" style={{ fontSize: '14px' }}>
              Create beautiful, trackable short links in seconds.
            </p>

            {/* URL Shortener Form */}
            <form onSubmit={handleShorten} className="w-full max-w-[520px] mx-auto my-4">
              <div className="flex flex-col sm:flex-row gap-3 p-2 bg-secondary/50 rounded-2xl border border-border">
                <Input
                  type="url"
                  placeholder={t("paste_url")}
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setMalwareWarning(null);
                  }}
                  className="flex-1 border-0 bg-background h-12 text-base"
                />
                <Button type="submit" size="lg" className="h-12 px-8 btn-micro" disabled={loading || !!malwareWarning}>
                  {loading ? t("slicing") : t("slice_link")}
                  <Scissors className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </form>

            {/* Helper Text - below Slice Link button (always visible) */}
            {!showResult && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-4 text-[11px] sm:text-xs text-muted-foreground max-w-md mx-auto leading-snug"
              >
                Sign up for SliceURL to unlock analytics, custom slugs, link management, QR codes, and secure tracking—{" "}
                {user ? (
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                  >
                    Go to dashboard
                  </button>
                ) : (
                  <button
                    onClick={() => navigate("/register")}
                    className="text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                  >
                    Register your account now
                  </button>
                )}
              </motion.p>
            )}

            {/* Malware Warning */}
            {malwareWarning && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl max-w-2xl mx-auto"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium text-destructive">⚠ This URL appears unsafe</p>
                    <p className="text-sm text-muted-foreground">{malwareWarning}</p>
                    <p className="text-xs text-muted-foreground mt-1">SliceURL blocked this link to protect users.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Splitting Animation */}
            <AnimatePresence>
              {isSplitting && splitUrl && (
                <div className="mt-6 max-w-2xl mx-auto h-12 flex items-center justify-center relative overflow-hidden">
                  <div className="url-split-container">
                    <span className="opacity-0 text-lg font-medium">{splitUrl}</span>
                    <span className={`url-split-left ${isSplitting ? 'splitting' : ''} text-lg font-medium text-foreground`}>
                      {splitUrl}
                    </span>
                    <span className={`url-split-right ${isSplitting ? 'splitting' : ''} text-lg font-medium text-foreground`}>
                      {splitUrl}
                    </span>
                  </div>
                </div>
              )}
            </AnimatePresence>

            {/* Result */}
            {showResult && shortUrl && !malwareWarning && (
              <div className="mt-6 p-4 bg-muted/50 border border-border rounded-2xl max-w-2xl mx-auto result-reveal">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="text-left">
                    <p className="text-sm text-muted-foreground">{t("your_sliced_link")}</p>
                    <p className="font-medium text-lg">{shortUrl}</p>
                  </div>
                  <Button onClick={copyToClipboard} variant="secondary" size="sm" className="btn-micro">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? t("copied") : t("copy")}
                  </Button>
                </div>
              </div>
            )}

            {/* CTA after result */}
            <AnimatePresence>
              {showResult && shortUrl && !malwareWarning && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: 0.3, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="mt-4 max-w-2xl mx-auto"
                >
                  {user ? (
                    <div className="p-4 bg-secondary/40 border border-border/50 rounded-2xl">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-center sm:text-left">
                          <p className="font-medium text-foreground">{t("link_ready_title")}</p>
                          <p className="text-sm text-muted-foreground">{t("link_ready_desc")}</p>
                        </div>
                        <Button onClick={() => navigate("/dashboard")} className="btn-micro shrink-0">
                          <LayoutDashboard className="h-4 w-4 mr-2" />
                          {t("go_dashboard")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-secondary/40 border border-border/50 rounded-2xl">
                      <div className="flex flex-col items-center gap-4">
                        <div className="text-center">
                          <p className="font-medium text-foreground">{t("want_track_title")}</p>
                          <p className="text-sm text-muted-foreground">{t("want_track_desc")}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button onClick={() => navigate("/register")} className="btn-micro">
                            <UserPlus className="h-4 w-4 mr-2" />
                            {t("create_free_account")}
                          </Button>
                          <Button onClick={() => navigate("/login")} variant="outline" className="btn-micro">
                            <LogIn className="h-4 w-4 mr-2" />
                            {t("sign_in")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Features Section with Interactive Cards */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="mt-12 sm:mt-16 max-w-5xl mx-auto"
          >
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="text-xl sm:text-2xl font-bold mb-2">
                {t("features_title")}
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {t("features_subtitle")}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {featureKeys.map((feature, index) => (
                <FeatureCard
                  key={feature.titleKey}
                  icon={feature.icon}
                  titleKey={feature.titleKey}
                  descKey={feature.descKey}
                  index={index}
                  isQR={feature.isQR}
                />
              ))}
            </div>
          </motion.section>


          {/* Global Stats */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.25 }}
            className="mt-12 sm:mt-16 max-w-3xl mx-auto"
          >
            <p className="text-center text-muted-foreground mb-6 text-xs sm:text-sm">
              {t("marketing_tagline")}
            </p>
            <GlobalStats />
          </motion.div>

          {/* FAQ Section */}
          <FAQSection />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
