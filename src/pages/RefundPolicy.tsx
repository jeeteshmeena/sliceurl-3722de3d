import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { Footer } from "@/components/Footer";
import { SliceLogo } from "@/components/SliceLogo";

export default function RefundPolicy() {
  const { t } = useLanguage();

  useEffect(() => {
    document.title = "Refund and Cancellation Policy – SliceURL";
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
        <h1 className="text-3xl font-bold mb-2">Refund and Cancellation Policy</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: July 8, 2026</p>

        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">Eligibility</h2>
            <p className="text-muted-foreground leading-relaxed">
              Refund requests must be submitted within <strong className="text-foreground">7 days</strong> of the original purchase date. Only payments made through our official payment channels are eligible for a refund. Refund requests are subject to verification and approval.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Cancellation</h2>
            <p className="text-muted-foreground leading-relaxed">
              Orders or subscriptions may be cancelled before the purchased service has been fully delivered or activated. Once a digital product, subscription, or service has been successfully delivered, activated, or accessed, cancellation requests may not be eligible. Eligible cancellations will be processed according to this policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Refund Processing</h2>
            <p className="text-muted-foreground leading-relaxed">
              Approved refunds are processed within <strong className="text-foreground">5–7 working days</strong>. The refunded amount will be credited back to the original payment method used for the transaction. Processing times may vary depending on the customer's bank or payment provider.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Non-Refundable Cases</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Refund requests submitted more than 7 days after the purchase date.</li>
              <li>Accounts suspended or terminated for violating the Terms of Service.</li>
              <li>Partial billing periods after a subscription or billing cycle has started.</li>
              <li>Successfully delivered, activated, or fully accessed digital products or services.</li>
              <li>Duplicate refund requests for the same transaction.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">How to Request</h2>
            <p className="text-muted-foreground leading-relaxed">
              To request a refund or cancellation, email{" "}
              <a href="mailto:Sliceurl@gmail.com" className="text-foreground underline hover:no-underline">
                Sliceurl@gmail.com
              </a>{" "}
              using your registered email address and include your Order ID, payment details, and the reason for your request. Our support team will review your request and respond within 48 hours.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Additional Notes</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to approve or reject any refund or cancellation request after verification.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
