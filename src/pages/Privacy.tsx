import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { Footer } from "@/components/Footer";
import { SliceLogo } from "@/components/SliceLogo";

export default function Privacy() {
  const { t } = useLanguage();
  
  useEffect(() => {
    document.title = "Privacy Policy – SliceURL";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", "Learn how SliceURL collects, uses, and protects your data.");
    }
  }, []);

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

      {/* Main Content */}
      <main className="flex-1 container max-w-2xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold mb-2">{t("privacy_policy")}</h1>
        <p className="text-muted-foreground text-sm mb-8">{t("last_updated")}: January 2026</p>

        <div className="space-y-8">
          {/* Introduction */}
          <section>
            <p className="text-muted-foreground leading-relaxed">{t("privacy_intro")}</p>
          </section>

          {/* Data We Collect */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t("privacy_data_collected")}</h2>
            <p className="text-muted-foreground mb-3">{t("privacy_data_collected_intro")}</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">{t("privacy_account_info")}:</strong> {t("privacy_account_info_desc")}</li>
              <li><strong className="text-foreground">{t("privacy_links_created")}:</strong> {t("privacy_links_created_desc")}</li>
              <li><strong className="text-foreground">{t("privacy_click_analytics")}:</strong> {t("privacy_click_analytics_desc")}</li>
            </ul>
          </section>

          {/* What We Don't Do */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t("privacy_what_we_dont")}</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>{t("privacy_no_sell")}</li>
              <li>{t("privacy_no_track_outside")}</li>
              <li>{t("privacy_no_third_party_ads")}</li>
            </ul>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t("privacy_cookies")}</h2>
            <p className="text-muted-foreground leading-relaxed">{t("privacy_cookies_desc")}</p>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t("privacy_third_party")}</h2>
            <p className="text-muted-foreground mb-3">{t("privacy_third_party_intro")}</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Google OAuth:</strong> {t("privacy_google_oauth")}</li>
              <li><strong className="text-foreground">{t("privacy_database")}:</strong> {t("privacy_database_desc")}</li>
            </ul>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t("privacy_security")}</h2>
            <p className="text-muted-foreground leading-relaxed">{t("privacy_security_desc")}</p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t("privacy_your_rights")}</h2>
            <p className="text-muted-foreground mb-3">{t("privacy_rights_intro")}</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>{t("privacy_right_access")}</li>
              <li>{t("privacy_right_delete")}</li>
              <li>{t("privacy_right_export")}</li>
            </ul>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t("privacy_contact")}</h2>
            <p className="text-muted-foreground">
              {t("privacy_contact_desc")}{" "}
              <a 
                href="mailto:Sus.jeetX@gmail.com" 
                className="text-foreground underline hover:no-underline"
              >
                Sus.jeetX@gmail.com
              </a>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}