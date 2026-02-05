import { Mail, Send, Twitter, Info, Skull, MessageSquareHeart } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";

export function Footer() {
  const { t, language } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/50 bg-background">
      <div className="container py-6 px-4 sm:px-6">
        {/* Main Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left: Copyright */}
          <p className="text-xs text-muted-foreground">
            SliceURL © {currentYear}. {t("all_rights_reserved")}
          </p>

          {/* Right: Links & Contacts */}
          <div className="flex items-center gap-5 flex-wrap justify-center">
            {/* Legal Links */}
            <Link
              to="/privacy"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("privacy")}
            </Link>
            <Link
              to="/terms"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("terms")}
            </Link>
            <Link
              to="/about"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Info className="h-3 w-3" />
              {t("about_us")}
            </Link>
            <Link
              to="/feedback"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageSquareHeart className="h-3 w-3" />
              {t("feedback") || "Feedback"}
            </Link>
            <Link
              to="/creepyurl"
              className="flex items-center text-red-500/80 hover:text-red-500 transition-colors"
              title="CreepyURL"
            >
              <Skull className="h-3.5 w-3.5" />
            </Link>

            {/* Divider */}
            <span className="hidden sm:block h-3 w-px bg-border" />

            {/* Contact Links */}
            <a
              href="mailto:Sus.jeetX@gmail.com"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mail className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("email_us")}</span>
            </a>
            <a
              href="https://t.me/MeJeetX"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("telegram")}</span>
            </a>
            <a
              href="https://x.com/Itx_Jeetesh"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Twitter className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">X</span>
            </a>
          </div>
        </div>

        {/* Bottom: Made with Love */}
        <div className="mt-4 pt-3 border-t border-border/30 text-center">
          <p className="text-[11px] text-foreground font-normal">
            {language === "en" ? (
              <>
                Built with <span className="heart-beat inline-block text-red-500">❤️</span> by JeetX
              </>
            ) : (
              t("made_with_love")
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}
