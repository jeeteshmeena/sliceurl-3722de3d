import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Sparkles, BarChart3, Lock, Users, 
  CheckCircle2, TrendingUp, Share2, Zap, Shield 
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { Footer } from "@/components/Footer";
import { SliceLogo } from "@/components/SliceLogo";

const specialFeatures = [
  { number: "01", icon: Sparkles, titleKey: "about_special_smart", descKey: "about_special_smart_desc" },
  { number: "02", icon: BarChart3, titleKey: "about_special_analytics", descKey: "about_special_analytics_desc" },
  { number: "03", icon: Lock, titleKey: "about_special_privacy", descKey: "about_special_privacy_desc" },
  { number: "04", icon: Users, titleKey: "about_special_creator", descKey: "about_special_creator_desc" },
];

const helpFeatures = [
  { icon: Share2, titleKey: "about_help_cleaner", descKey: "about_help_cleaner_desc" },
  { icon: BarChart3, titleKey: "about_help_smart", descKey: "about_help_smart_desc" },
  { icon: Shield, titleKey: "about_help_privacy", descKey: "about_help_privacy_desc" },
  { icon: Zap, titleKey: "about_help_fast", descKey: "about_help_fast_desc" },
  { icon: Users, titleKey: "about_help_friendly", descKey: "about_help_friendly_desc" },
];

const whyChooseItems = [
  "about_why_faster",
  "about_why_better_ui",
  "about_why_cleaner_analytics",
  "about_why_professional",
  "about_why_no_spam",
];

const differenceItems = [
  "about_diff_simple",
  "about_diff_faster",
  "about_diff_cleaner_ui",
  "about_diff_control",
  "about_diff_modern",
];

export default function About() {
  const { t } = useLanguage();
  
  useEffect(() => {
    document.title = `${t("about_sliceurl")} – SliceURL`;
  }, [t]);

  return (
    <div className="min-h-dvh bg-background flex flex-col safe-bottom">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container flex items-center justify-between h-14 px-4">
          <Link to="/" className="flex items-center">
            <SliceLogo size="sm" />
          </Link>
          <Link 
            to="/" 
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("go_home")}
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        {/* Background gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08),transparent_70%)]" />
        
        <div className="relative container px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              {t("about_sliceurl")}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground">
              {t("about_subtitle_new")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 container max-w-4xl mx-auto px-4 pb-16 space-y-16">
        {/* Intro Paragraph */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            {t("about_intro_paragraph")}
          </p>
        </motion.section>

        {/* Our Mission */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4">{t("about_mission")}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t("about_mission_desc")}</p>
        </motion.section>

        {/* How SliceURL Helps You */}
        <section>
          <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8">{t("about_how_helps")}</h2>
          <div className="space-y-4">
            {helpFeatures.map((feature, index) => (
              <motion.div
                key={feature.titleKey}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border/50"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">{t(feature.titleKey)}</h3>
                  <p className="text-sm text-muted-foreground">{t(feature.descKey)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* What Makes SliceURL Special */}
        <section>
          <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8">{t("about_what_special")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {specialFeatures.map((feature, index) => (
              <motion.div
                key={feature.titleKey}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ y: -2 }}
                transition={{ delay: index * 0.05 }}
                className="p-5 rounded-xl bg-card border border-border/50"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-mono text-muted-foreground">{feature.number}</span>
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium mb-2">{t(feature.titleKey)}</h3>
                <p className="text-sm text-muted-foreground">{t(feature.descKey)}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Why Choose SliceURL */}
        <section>
          <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8">{t("about_why_choose")}</h2>
          <div className="space-y-3">
            {whyChooseItems.map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-4 rounded-lg bg-success/5 border border-success/20"
              >
                <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
                <span className="text-sm">{t(item)}</span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* What Makes SliceURL Different */}
        <section>
          <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8">{t("about_what_makes_different")}</h2>
          <div className="p-6 rounded-xl bg-card border border-border/50">
            <div className="space-y-4">
              {differenceItems.map((item, index) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <TrendingUp className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm text-muted-foreground">{t(item)}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}