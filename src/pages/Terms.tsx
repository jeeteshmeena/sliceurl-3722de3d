import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { Footer } from "@/components/Footer";
import { SliceLogo } from "@/components/SliceLogo";

export default function Terms() {
  const { t } = useLanguage();
  
  useEffect(() => {
    document.title = "Terms of Service – SliceURL";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", "Read the SliceURL Terms of Service.");
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
        <h1 className="text-3xl font-bold mb-2">{t("terms_of_service")}</h1>
        <p className="text-muted-foreground text-sm mb-8">{t("last_updated")}: January 2026</p>

        <div className="space-y-8">
          {/* Introduction */}
          <section>
            <p className="text-muted-foreground leading-relaxed">{t("terms_intro")}</p>
          </section>

          {/* Acceptable Use */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t("terms_acceptable_use")}</h2>
            <p className="text-muted-foreground mb-3">{t("terms_acceptable_use_intro")}</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>{t("terms_no_malware")}</li>
              <li>{t("terms_no_phishing")}</li>
              <li>{t("terms_no_illegal")}</li>
              <li>{t("terms_no_spam")}</li>
              <li>{t("terms_no_abuse")}</li>
            </ul>
          </section>

          {/* Link Availability */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t("terms_link_availability")}</h2>
            <p className="text-muted-foreground leading-relaxed">{t("terms_link_availability_desc")}</p>
          </section>

          {/* Analytics Disclaimer */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t("terms_analytics")}</h2>
            <p className="text-muted-foreground leading-relaxed">{t("terms_analytics_desc")}</p>
          </section>

          {/* Account Termination */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t("terms_termination")}</h2>
            <p className="text-muted-foreground leading-relaxed">{t("terms_termination_desc")}</p>
          </section>

          {/* Service Availability */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t("terms_service_availability")}</h2>
            <p className="text-muted-foreground leading-relaxed">{t("terms_service_availability_desc")}</p>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t("terms_changes")}</h2>
            <p className="text-muted-foreground leading-relaxed">{t("terms_changes_desc")}</p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t("terms_contact")}</h2>
            <p className="text-muted-foreground">
              {t("terms_contact_desc")}{" "}
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