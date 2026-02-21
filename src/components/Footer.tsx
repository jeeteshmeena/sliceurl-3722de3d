import { Mail, Send, Skull, MessageSquareHeart } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { Separator } from "@/components/ui/separator";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const linkClass = "text-xs text-muted-foreground hover:text-foreground transition-colors";
const iconClass = "h-4 w-4 text-muted-foreground hover:text-foreground transition-colors";

export function Footer() {
  const { t, language } = useLanguage();
  const currentYear = new Date().getFullYear();

  const links = (
    <>
      <Link to="/terms" className={linkClass}>{t("terms")}</Link>
      <Link to="/privacy" className={linkClass}>{t("privacy")}</Link>
      <Link to="/about" className={linkClass}>{t("about_us")}</Link>
      <Link to="/feedback" className={linkClass}>{t("feedback") || "Feedback"}</Link>
      <Link to="/creepyurl" className="text-red-500/80 hover:text-red-500 transition-colors" title="CreepyURL">
        <Skull className="h-3.5 w-3.5" />
      </Link>
    </>
  );

  const socials = (
    <>
      <a href="mailto:Sus.jeetX@gmail.com" className={iconClass}>
        <Mail className="h-4 w-4" fill="currentColor" strokeWidth={0} />
      </a>
      <a href="https://t.me/MeJeetX" target="_blank" rel="noopener noreferrer" className={iconClass}>
        <Send className="h-4 w-4" fill="currentColor" strokeWidth={0} />
      </a>
      <a href="https://x.com/Itx_Jeetesh" target="_blank" rel="noopener noreferrer" className={iconClass}>
        <XIcon className="h-4 w-4" />
      </a>
    </>
  );

  return (
    <footer className="border-t border-border/50 bg-background">
      <div className="container py-5 px-4 sm:px-6">
        {/* Mobile */}
        <div className="sm:hidden flex flex-col items-center">
          <div className="flex items-center justify-center gap-5 flex-wrap">
            <Link to="/terms" className={linkClass}>{t("terms")}</Link>
            <Link to="/privacy" className={linkClass}>{t("privacy")}</Link>
            <Link to="/about" className={linkClass}>{t("about_us")}</Link>
          </div>
          <div className="flex items-center justify-center gap-5 mt-3">
            <Link to="/feedback" className={linkClass}>{t("feedback") || "Feedback"}</Link>
            <Link to="/creepyurl" className="text-red-500/80 hover:text-red-500 transition-colors" title="CreepyURL">
              <Skull className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="flex items-center gap-5 mt-4">
            {socials}
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden sm:flex items-center justify-between">
          <div className="flex items-center gap-5">
            {links}
          </div>
          <div className="flex items-center gap-5">
            {socials}
          </div>
        </div>

        <Separator className="my-4 bg-foreground/15" />

        <p className="text-center text-xs text-muted-foreground">
          SliceURL © {currentYear}. {t("all_rights_reserved")}
        </p>
        <p className="text-center text-[11px] text-muted-foreground/70 mt-1.5">
          {language === "en" ? (
            <>Built with <span className="heart-beat inline-block text-red-500">❤️</span> by JeetX</>
          ) : (
            t("made_with_love")
          )}
        </p>
      </div>
    </footer>
  );
}
