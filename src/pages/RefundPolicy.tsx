import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { Footer } from "@/components/Footer";
import { SliceLogo } from "@/components/SliceLogo";

export default function RefundPolicy() {
  const { t } = useLanguage();

  useEffect(() => {
    document.title = "Refund Policy – SliceURL";
    const noindex = document.createElement("meta");
    noindex.name = "robots";
    noindex.content = "noindex, nofollow";
    document.head.appendChild(noindex);
    return () => { document.head.removeChild(noindex); };
  }, []);

  return (
    <div className="min-h-dvh bg-background flex flex-col safe-bottom">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container flex items-center justify-between h-14 px-4">
          <Link to="/" className="flex items-center"><SliceLogo size="sm" /></Link>
          <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />{t("go_home")}
          </Link>
        </div>
      </header>

      <main className="flex-1 container max-w-2xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold mb-2">Refund Policy</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: April 2026</p>

        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">Eligibility</h2>
            <p className="text-muted-foreground leading-relaxed">
              Refund requests must be submitted within <strong className="text-foreground">7 days</strong> of the original purchase date. Only payments made through our official channels are eligible for a refund.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Processing</h2>
            <p className="text-muted-foreground leading-relaxed">
              Refunds are processed within <strong className="text-foreground">5–7 working days</strong> for eligible requests. The refunded amount will be credited back to the original payment method used during the transaction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Non-Refundable Cases</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Requests made after 7 days of purchase</li>
              <li>Accounts terminated for violating Terms of Service</li>
              <li>Partial month usage after the billing cycle has started</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">How to Request</h2>
            <p className="text-muted-foreground leading-relaxed">
              To request a refund, email us at{" "}
              <a href="mailto:Sliceurl@Gmail.com" className="text-foreground underline hover:no-underline">
                Sliceurl@Gmail.com
              </a>{" "}
              with your registered email address and payment details. We will review and respond within 48 hours.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
