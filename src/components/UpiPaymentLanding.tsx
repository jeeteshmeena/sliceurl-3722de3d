import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Home, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface UpiPaymentLandingProps {
  /** The raw upi://pay?... URL (parameters preserved exactly) */
  upiUrl: string;
  /** Called when user taps an app button (use for click tracking) */
  onAppSelected?: (app: string) => void;
}

interface UpiApp {
  id: string;
  name: string;
  /** Android package name used in intent:// fallback */
  androidPackage: string;
  /** Brand color (used for the icon tile only — not gradients) */
  color: string;
  initials: string;
}

const UPI_APPS: UpiApp[] = [
  { id: "gpay",     name: "Google Pay", androidPackage: "com.google.android.apps.nbu.paisa.user", color: "#1A73E8", initials: "GP" },
  { id: "phonepe",  name: "PhonePe",    androidPackage: "com.phonepe.app",                         color: "#5F259F", initials: "PP" },
  { id: "paytm",    name: "Paytm",      androidPackage: "net.one97.paytm",                         color: "#00BAF2", initials: "PT" },
  { id: "bhim",     name: "BHIM",       androidPackage: "in.org.npci.upiapp",                      color: "#0F6CB7", initials: "BH" },
];

function isAndroid() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

/**
 * Build an Android intent URL that opens a *specific* UPI app.
 * Falls back gracefully if the app isn't installed.
 */
function buildIntentUrl(upiUrl: string, androidPackage: string): string {
  // upiUrl is "upi://pay?pa=...&am=..."
  // Convert to: intent://pay?pa=...&am=...#Intent;scheme=upi;package=<pkg>;end
  const queryIdx = upiUrl.indexOf("?");
  const query = queryIdx === -1 ? "" : upiUrl.slice(queryIdx); // includes leading "?"
  return `intent://pay${query}#Intent;scheme=upi;package=${androidPackage};end`;
}

function parseUpi(upiUrl: string) {
  const qIdx = upiUrl.indexOf("?");
  const params = new URLSearchParams(qIdx === -1 ? "" : upiUrl.slice(qIdx + 1));
  return {
    pa: params.get("pa") || "",       // payee VPA
    pn: params.get("pn") || "",       // payee name
    am: params.get("am") || "",       // amount
    cu: params.get("cu") || "INR",    // currency
    tn: params.get("tn") || "",       // note
  };
}

export function UpiPaymentLanding({ upiUrl, onAppSelected }: UpiPaymentLandingProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const details = useMemo(() => parseUpi(upiUrl), [upiUrl]);

  const handleAppClick = (app: UpiApp) => {
    onAppSelected?.(app.id);

    // CRITICAL: Trigger the deep link only on a real user click.
    // No intermediate redirect — go straight from this HTTPS page to the app.
    if (isAndroid()) {
      // Android: use intent:// to target a specific package (most reliable)
      window.location.href = buildIntentUrl(upiUrl, app.androidPackage);
    } else {
      // iOS / other: use the upi:// scheme directly (iOS shows app chooser)
      window.location.href = upiUrl;
    }
  };

  const handleGenericOpen = () => {
    onAppSelected?.("any");
    window.location.href = upiUrl;
  };

  const handleCopyVpa = async () => {
    try {
      await navigator.clipboard.writeText(details.pa);
      setCopied(true);
      toast.success("UPI ID copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col items-center justify-center p-4 safe-area-inset">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        {/* Branded header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 border border-success/20 mb-3">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            <span className="text-xs font-medium text-success">Secure UPI Payment</span>
          </div>
          <h1 className="text-xl font-semibold">
            <span className="text-foreground">Slice</span>
            <span className="text-muted-foreground">URL</span>
            <span className="text-muted-foreground"> · Pay</span>
          </h1>
        </div>

        {/* Payment details card */}
        <div className="rounded-2xl border border-border bg-card p-5 mb-5">
          <div className="text-center pb-4 border-b border-border">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Amount</p>
            <p className="text-3xl font-semibold tabular-nums">
              {details.cu === "INR" ? "₹" : ""}{details.am || "0"}
              {details.cu !== "INR" && <span className="text-base ml-1 text-muted-foreground">{details.cu}</span>}
            </p>
          </div>

          <div className="pt-4 space-y-3">
            {details.pn && (
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm text-muted-foreground">Pay to</span>
                <span className="text-sm font-medium text-right break-words max-w-[60%]">{details.pn}</span>
              </div>
            )}
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm text-muted-foreground">UPI ID</span>
              <button
                type="button"
                onClick={handleCopyVpa}
                className="text-sm font-medium text-right inline-flex items-center gap-1.5 break-all max-w-[60%] hover:text-primary transition-colors"
              >
                <span className="break-all">{details.pa}</span>
                {copied ? <Check className="h-3.5 w-3.5 shrink-0 text-success" /> : <Copy className="h-3.5 w-3.5 shrink-0 opacity-60" />}
              </button>
            </div>
            {details.tn && (
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm text-muted-foreground">Note</span>
                <span className="text-sm text-right break-words max-w-[60%]">{details.tn}</span>
              </div>
            )}
          </div>
        </div>

        {/* App selection */}
        <p className="text-xs text-muted-foreground text-center mb-3">Choose an app to pay</p>
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          {UPI_APPS.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => handleAppClick(app)}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/50 active:scale-[0.98] transition-all text-left"
            >
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center text-white text-xs font-semibold shrink-0"
                style={{ backgroundColor: app.color }}
                aria-hidden="true"
              >
                {app.initials}
              </div>
              <span className="text-sm font-medium truncate">{app.name}</span>
            </button>
          ))}
        </div>

        {/* Generic fallback (iOS app chooser / other UPI apps) */}
        <Button
          onClick={handleGenericOpen}
          variant="outline"
          className="w-full h-11 rounded-xl"
        >
          Open with another UPI app
        </Button>

        {/* Trust footer */}
        <div className="mt-5 text-center space-y-1">
          <p className="text-[11px] text-muted-foreground">
            Payment is processed entirely by your UPI app. SliceURL never sees your PIN or bank details.
          </p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-[11px] text-muted-foreground/70 hover:text-foreground inline-flex items-center gap-1 mt-2"
          >
            <Home className="h-3 w-3" /> Back to SliceURL
          </button>
        </div>
      </motion.div>
    </div>
  );
}
