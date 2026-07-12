import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { Footer } from "@/components/Footer";
import { SliceLogo } from "@/components/SliceLogo";
import { Button } from "@/components/ui/button";
import { PLANS, PAID_PLAN_IDS, formatINR, type BillingCycle, type PlanId } from "@/config/plans";

export default function Pricing() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  useEffect(() => {
    document.title = "Pricing – SliceURL";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "SliceURL pricing plans. Free, Pro, and Business tiers with monthly or yearly billing.");
  }, []);

  const handleChoose = (planId: PlanId) => {
    if (planId === "free") {
      navigate(user ? "/dashboard" : "/register");
      return;
    }
    const target = `/checkout?plan=${planId}&cycle=${cycle}`;
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(target)}`);
      return;
    }
    navigate(target);
  };

  const plans = [PLANS.free, PLANS.pro, PLANS.business];

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

      <main className="flex-1 container max-w-5xl mx-auto py-12 px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 tracking-tight">Pricing</h1>
          <p className="text-muted-foreground text-base">Simple, transparent pricing. Cancel anytime.</p>
        </div>

        {/* Monthly / Yearly toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center bg-muted/50 border border-border rounded-full p-1">
            {(["monthly", "yearly"] as BillingCycle[]).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={`relative px-5 py-2 text-sm font-medium rounded-full transition-colors ${
                  cycle === c ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {cycle === c && (
                  <motion.span
                    layoutId="cycle-pill"
                    className="absolute inset-0 bg-foreground rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative">
                  {c === "monthly" ? "Monthly" : "Yearly"}
                  {c === "yearly" && (
                    <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${cycle === "yearly" ? "bg-background/20 text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                      Save 17%
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan) => {
            const price = cycle === "monthly" ? plan.monthly : plan.yearly;
            const perLabel = plan.id === "free" ? "forever" : cycle === "monthly" ? "/mo" : "/yr";
            const isPaid = PAID_PLAN_IDS.includes(plan.id);
            return (
              <div
                key={plan.id}
                className={`relative rounded-[14px] border bg-card p-6 flex flex-col transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${
                  plan.popular ? "border-foreground/30 shadow-sm" : "border-border"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-foreground text-background text-[11px] font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                )}
                <div className="text-lg font-semibold">{plan.name}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{plan.tagline}</div>

                <div className="mt-5 h-14 flex items-baseline gap-1">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${plan.id}-${cycle}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="flex items-baseline gap-1"
                    >
                      <span className="text-3xl font-bold tracking-tight">
                        {price === 0 ? "₹0" : formatINR(price)}
                      </span>
                      <span className="text-sm text-muted-foreground">{perLabel}</span>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {isPaid && cycle === "yearly" && (
                  <div className="text-xs text-muted-foreground -mt-2 mb-2">
                    Equivalent to {formatINR(Math.round(plan.yearly / 12))}/mo
                  </div>
                )}

                <ul className="space-y-2.5 my-4 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground/90">
                      <Check className="h-4 w-4 text-foreground/70 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="text-xs text-muted-foreground space-y-1 mb-4 pt-3 border-t border-border/60">
                  <div>Links: {plan.limits.links}</div>
                  <div>API: {plan.limits.apiPerDay}</div>
                  <div>Storage: {plan.limits.storage}</div>
                  <div>Support: {plan.limits.support}</div>
                </div>

                <Button
                  onClick={() => handleChoose(plan.id)}
                  variant={plan.popular ? "default" : "outline"}
                  className="w-full rounded-xl h-11"
                >
                  {plan.id === "free" ? "Get Started" : "Choose Plan"}
                </Button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Prices in INR. No hidden taxes — the price you see is what you pay.
        </p>
      </main>

      <Footer />
    </div>
  );
}
