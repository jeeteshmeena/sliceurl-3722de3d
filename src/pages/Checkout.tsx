import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, ShieldCheck, Loader2, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Footer } from "@/components/Footer";
import { SliceLogo } from "@/components/SliceLogo";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { useSubscription } from "@/hooks/useSubscription";
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
  const { subscription, loading: subscriptionLoading } = useSubscription();

  const planId = (params.get("plan") as PlanId) ?? "pro";
  const cycle = (params.get("cycle") as BillingCycle) ?? "monthly";

  const plan = PAID_PLAN_IDS.includes(planId) ? PLANS[planId] : PLANS.pro;
  const totals = useMemo(() => computeTotals(plan.id, cycle), [plan.id, cycle]);

  const [name, setName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<{ message: string; reason?: string; retryable?: boolean } | null>(null);
  const [verification, setVerification] = useState<"idle" | "checking" | "verified" | "pending" | "failed">("idle");

  const statusParam = params.get("status");
  const orderParam = params.get("order");

  useEffect(() => {
    document.title = `Checkout · ${plan.name} – SliceURL`;
  }, [plan.name]);

  useEffect(() => {
    if (profile?.display_name && !name) setName(profile.display_name);
  }, [profile, name]);

  useEffect(() => {
    if (statusParam !== "verifying" || !orderParam) return;
    let cancelled = false;
    let attempts = 0;
    const check = async () => {
      setVerification("checking");
      const { data } = await supabase.functions.invoke("dodo-status", { body: { order: orderParam } });
      if (cancelled) return;
      if (data?.verified) return setVerification("verified");
      if (["failed", "cancelled"].includes(data?.order_status)) return setVerification("failed");
      attempts += 1;
      if (attempts < 10) window.setTimeout(check, 3000); else setVerification("pending");
    };
    check();
    return () => { cancelled = true; };
  }, [statusParam, orderParam]);

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
    setPaymentError(null);
    try {
      const { data: orderRes, error: orderErr } = await supabase.functions.invoke("create-order", {
        body: { plan_id: plan.id, billing_cycle: cycle, customer_name: name },
      });
      if (orderErr || !orderRes?.order_id) {
        const details = orderErr instanceof FunctionsHttpError ? await orderErr.context.json().catch(() => null) : null;
        setPaymentError({ message: details?.error ?? "Unable to create order.", retryable: details?.code !== "SUBSCRIPTION_ACTIVE" });
        setSubmitting(false);
        return;
      }

      const { data: payRes, error: payErr } = await supabase.functions.invoke("dodo-initiate", {
        body: { order_id: orderRes.order_id, customer_name: name },
      });

      if (payErr) {
        const details = payErr instanceof FunctionsHttpError ? await payErr.context.json().catch(() => null) : null;
        setPaymentError({ message: details?.error ?? "Payment initiation failed.", reason: details?.reason ?? details?.action, retryable: details?.retryable !== false && details?.code !== "SUBSCRIPTION_ACTIVE" });
        setSubmitting(false);
        return;
      }

      if (payRes?.checkout_url) {
        window.location.href = payRes.checkout_url as string;
        return; // Dodo hosted checkout takes over
      }

      setPaymentError({ message: payRes?.message ?? "Unable to start payment.", retryable: true });
      setSubmitting(false);
    } catch (e) {
      console.error(e);
      setPaymentError({ message: "Something went wrong while starting payment.", reason: e instanceof Error ? e.message : undefined, retryable: true });
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

        {statusParam === "verifying" && (
          <div
            className={`mb-5 rounded-[14px] border p-4 flex items-start gap-3 ${
              verification === "verified"
                ? "border-emerald-500/40 bg-emerald-500/5"
                : verification === "checking" || verification === "pending"
                ? "border-amber-500/40 bg-amber-500/5"
                : "border-destructive/40 bg-destructive/5"
            }`}
          >
            {verification === "verified" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
            ) : verification === "checking" || verification === "pending" ? (
              <Clock className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            )}
            <div className="text-sm">
              <div className="font-semibold mb-0.5">
                {verification === "verified"
                  ? "Subscription confirmed"
                  : verification === "checking"
                  ? "Confirming your subscription"
                  : verification === "pending" ? "Confirmation is taking longer"
                  : "Payment did not complete"}
              </div>
              <div className="text-muted-foreground">
                {verification === "verified"
                  ? "Your payment and active subscription have both been verified."
                  : verification === "checking"
                  ? "We're securely checking the payment status with Dodo Payments."
                  : verification === "pending" ? "The payment may still be processing. Check your dashboard again shortly."
                  : "No active subscription was confirmed. You can try again below."}
                {orderParam && <span className="ml-1">Order #{orderParam}</span>}
              </div>
              {verification === "verified" && (
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

        {paymentError && (
          <div role="alert" className="mb-5 rounded-[14px] border border-destructive/40 bg-destructive/5 p-4">
            <div className="flex gap-3"><XCircle className="h-5 w-5 text-destructive shrink-0" /><div><div className="font-semibold text-sm">{paymentError.message}</div>{paymentError.reason && <p className="text-sm text-muted-foreground mt-1 break-words">{paymentError.reason}</p>}</div></div>
            {paymentError.retryable && <Button variant="outline" size="sm" className="mt-3" onClick={handlePay} disabled={submitting}><RefreshCw className="h-4 w-4 mr-2" />Retry payment</Button>}
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
                Payments are processed securely by Dodo Payments. Your card details never touch our servers.
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
                disabled={submitting || !accepted || subscriptionLoading || (subscription?.status === "active" && subscription.plan_id === plan.id)}
                className="w-full h-11 rounded-xl"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  <>{subscription?.status === "active" && subscription.plan_id === plan.id ? "Subscription active" : `Pay ${formatINR(totals.total)}`}</>
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
    </div>
  );
}
