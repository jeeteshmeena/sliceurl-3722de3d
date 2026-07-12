import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, ShieldCheck, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Footer } from "@/components/Footer";
import { SliceLogo } from "@/components/SliceLogo";
import { ComingSoonModal } from "@/components/ComingSoonModal";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import {
  PLANS,
  PAID_PLAN_IDS,
  computeTotals,
  formatINR,
  type BillingCycle,
  type PlanId,
} from "@/config/plans";

export default function Checkout() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { profile } = useProfile();

  const planId = (params.get("plan") as PlanId) ?? "pro";
  const cycle = (params.get("cycle") as BillingCycle) ?? "monthly";

  const plan = PAID_PLAN_IDS.includes(planId) ? PLANS[planId] : PLANS.pro;
  const totals = useMemo(() => computeTotals(plan.id, cycle), [plan.id, cycle]);

  const [name, setName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);

  const statusParam = params.get("status");
  const orderParam = params.get("order");

  useEffect(() => {
    document.title = `Checkout · ${plan.name} – SliceURL`;
  }, [plan.name]);

  useEffect(() => {
    if (profile?.display_name && !name) setName(profile.display_name);
  }, [profile, name]);

  const loadPaytmScript = (host: string, mid: string, orderId: string) =>
    new Promise<void>((resolve, reject) => {
      const src = `${host}/merchantpgpui/checkoutjs/merchants/${mid}.js`;
      // Remove any prior script so orderId gets rebound
      document.querySelectorAll('script[data-paytm="1"]').forEach((s) => s.remove());
      const script = document.createElement("script");
      script.src = src;
      script.type = "application/javascript";
      script.crossOrigin = "anonymous";
      script.dataset.paytm = "1";
      script.dataset.orderId = orderId;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Paytm Checkout JS"));
      document.body.appendChild(script);
    });

  const launchPaytm = async (payRes: {
    mid: string;
    orderId: string;
    txnToken: string;
    amount: string;
    host: string;
  }) => {
    await loadPaytmScript(payRes.host, payRes.mid, payRes.orderId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (!w.Paytm?.CheckoutJS) throw new Error("Paytm SDK not available");
    await new Promise<void>((resolve) => w.Paytm.CheckoutJS.onLoad(() => resolve()));

    const config = {
      root: "",
      flow: "DEFAULT",
      data: {
        orderId: payRes.orderId,
        token: payRes.txnToken,
        tokenType: "TXN_TOKEN",
        amount: payRes.amount,
      },
      handler: {
        notifyMerchant: (eventName: string) => {
          if (eventName === "APP_CLOSED" || eventName === "SESSION_EXPIRED") {
            setSubmitting(false);
          }
        },
      },
    };
    await w.Paytm.CheckoutJS.init(config);
    w.Paytm.CheckoutJS.invoke();
  };

  const handlePay = async () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/checkout?plan=${plan.id}&cycle=${cycle}`)}`);
      return;
    }
    if (!accepted) {
      toast.error("Please accept the Terms & Conditions to continue.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: orderRes, error: orderErr } = await supabase.functions.invoke("create-order", {
        body: { plan_id: plan.id, billing_cycle: cycle, customer_name: name },
      });
      if (orderErr || !orderRes?.order_id) {
        toast.error("Unable to create order. Please try again.");
        setSubmitting(false);
        return;
      }
      const { data: payRes, error: payErr } = await supabase.functions.invoke("paytm-initiate", {
        body: { order_id: orderRes.order_id },
      });
      if (payErr) {
        const raw = (payErr as { context?: { body?: string; error?: string }; message?: string })
          ?.context?.body || payErr?.message || "Payment initiation failed.";
        let msg = "Payment initiation failed.";
        try {
          const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
          if (parsed?.message) msg = `Paytm: ${parsed.message}`;
          else if (parsed?.error) msg = parsed.error;
        } catch { /* keep default */ }
        toast.error(msg);
        setSubmitting(false);
        return;
      }
      if (payRes?.status === "coming_soon") {
        setComingSoonOpen(true);
        setSubmitting(false);
      } else if (payRes?.txnToken && payRes?.mid && payRes?.orderId && payRes?.host) {
        await launchPaytm(payRes);
        // Keep submitting=true; SDK takes over the page.
      } else {
        toast.error(payRes?.message ?? "Unable to start payment.");
        setSubmitting(false);
      }
    } catch (e) {
      console.error(e);
      toast.error("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };


  return (
    <div className="min-h-dvh bg-background flex flex-col safe-bottom">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container flex items-center justify-between h-14 px-4">
          <Link to="/" className="flex items-center">
            <SliceLogo size="sm" />
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>
      </header>

      <main className="flex-1 container max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">Checkout</h1>
        <p className="text-muted-foreground text-sm mb-6">Review your order and complete your purchase.</p>

        {statusParam && (
          <div
            className={`mb-5 rounded-[14px] border p-4 flex items-start gap-3 ${
              statusParam === "success"
                ? "border-emerald-500/40 bg-emerald-500/5"
                : statusParam === "pending"
                ? "border-amber-500/40 bg-amber-500/5"
                : "border-destructive/40 bg-destructive/5"
            }`}
          >
            {statusParam === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
            ) : statusParam === "pending" ? (
              <Clock className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            )}
            <div className="text-sm">
              <div className="font-semibold mb-0.5">
                {statusParam === "success"
                  ? "Payment successful"
                  : statusParam === "pending"
                  ? "Payment pending"
                  : "Payment did not complete"}
              </div>
              <div className="text-muted-foreground">
                {statusParam === "success"
                  ? "Your subscription is now active. You can head to your dashboard."
                  : statusParam === "pending"
                  ? "We're waiting for confirmation from Paytm. This usually takes a minute."
                  : "No amount was charged. You can try again below."}
                {orderParam && <span className="ml-1">Order #{orderParam}</span>}
              </div>
              {statusParam === "success" && (
                <button
                  onClick={() => navigate("/dashboard")}
                  className="mt-2 text-sm font-medium underline underline-offset-2"
                >
                  Go to dashboard
                </button>
              )}
            </div>
          </div>
        )}


        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Order Summary */}
          <section className="lg:col-span-3 rounded-[14px] border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">Order summary</h2>
              <button
                type="button"
                onClick={() => navigate("/pricing")}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Change plan
              </button>
            </div>

            <div className="rounded-xl border border-border/60 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-foreground">{plan.name} plan</div>
                  <div className="text-xs text-muted-foreground mt-0.5 capitalize">
                    {cycle} billing
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatINR(totals.amount)}</div>
                  <div className="text-xs text-muted-foreground">
                    {cycle === "monthly" ? "per month" : "per year"}
                  </div>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatINR(totals.amount)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/60 text-base font-semibold">
                <span>Total</span>
                <span>{formatINR(totals.total)}</span>
              </div>
            </div>
          </section>

          {/* Customer + Payment */}
          <section className="lg:col-span-2 space-y-5">
            <div className="rounded-[14px] border border-border bg-card p-5">
              <h2 className="text-base font-semibold mb-3">Customer info</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="h-10 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
                  <Input value={user?.email ?? ""} disabled className="h-10 rounded-lg" />
                </div>
              </div>
            </div>

            <div className="rounded-[14px] border border-border bg-card p-5">
              <h2 className="text-base font-semibold mb-3">Secure payment</h2>
              <div className="flex items-start gap-2 text-xs text-muted-foreground mb-4">
                <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
                Payments are processed securely by Paytm. Your card details never touch our servers.
              </div>

              <label className="flex items-start gap-2 mb-4 cursor-pointer select-none">
                <Checkbox
                  checked={accepted}
                  onCheckedChange={(v) => setAccepted(v === true)}
                  className="mt-0.5"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  I agree to the{" "}
                  <Link to="/terms" className="text-foreground underline underline-offset-2">Terms & Conditions</Link>,{" "}
                  <Link to="/refund-policy" className="text-foreground underline underline-offset-2">Refund & Cancellation Policy</Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-foreground underline underline-offset-2">Privacy Policy</Link>.
                </span>
              </label>

              <Button
                onClick={handlePay}
                disabled={submitting || !accepted}
                className="w-full h-11 rounded-xl"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  <>Pay {formatINR(totals.total)}</>
                )}
              </Button>

              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => navigate("/pricing")}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Change plan
                </button>
                <button
                  onClick={() => navigate(-1)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Back
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
      <ComingSoonModal open={comingSoonOpen} onOpenChange={setComingSoonOpen} />
    </div>
  );
}
