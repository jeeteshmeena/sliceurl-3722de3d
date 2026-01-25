import { motion } from "framer-motion";
import { Box, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

/**
 * SliceBox Promotional Section
 * Yellow-themed promotional block for file sharing feature
 */
export function SliceBoxPromo() {
  const { t } = useLanguage();
  
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.3 }}
      className="mt-12 sm:mt-16 max-w-2xl mx-auto"
    >
      <div className="relative rounded-2xl p-6 sm:p-8 border border-border/50 bg-[#FFD64D]/10 dark:bg-[#FFD64D]/5 overflow-hidden">
        {/* Decorative diagonal slice */}
        <div 
          className="absolute top-0 right-0 w-32 h-32 opacity-20"
          style={{
            background: "linear-gradient(135deg, #FFD64D 0%, transparent 50%)",
          }}
        />
        
        <div className="relative flex flex-col sm:flex-row items-center gap-6">
          {/* Icon */}
          <div className="shrink-0">
            <div className="relative h-16 w-16 rounded-2xl bg-[#FFD64D] flex items-center justify-center shadow-lg">
              <Box className="h-8 w-8 text-black" />
              {/* Diagonal slice indicator */}
              <div 
                className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
                style={{
                  background: "linear-gradient(135deg, transparent 45%, rgba(0,0,0,0.1) 50%, transparent 55%)",
                }}
              />
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg sm:text-xl font-bold mb-2 text-foreground">
              {t("slicebox_promo_title") || "Introducing SliceBox"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("slicebox_promo_desc") || "Share files up to 200MB with a single link. Fast, secure, and temporary."}
            </p>
            <Button
              asChild
              className="bg-[#FFD64D] hover:bg-[#FFD64D]/90 text-black font-medium"
            >
              <Link to="/slicebox">
                {t("slicebox_promo_cta") || "Try SliceBox"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
