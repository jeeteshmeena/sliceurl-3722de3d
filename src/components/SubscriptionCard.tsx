import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { PLANS } from "@/config/plans";

export function SubscriptionCard() {
  const navigate = useNavigate();
  const { subscription, loading } = useSubscription();

  if (loading) return null;

  const planId = subscription?.plan_id ?? "free";
  const plan = PLANS[planId as keyof typeof PLANS] ?? PLANS.free;
  const status = subscription?.status ?? "active";
  const renewal = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const statusLabel: Record<string, string> = {
    active: "Active",
    pending: "Pending payment",
    expired: "Expired",
    cancelled: "Cancelled",
    failed: "Payment failed",
  };

  return (
    <div className="border border-border bg-card rounded-[14px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Current plan</span>
          <span className="text-base font-semibold text-foreground">{plan.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {statusLabel[status] ?? status}
          </span>
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {renewal
            ? `Renews on ${renewal}`
            : plan.id === "free"
            ? "Free forever · upgrade anytime"
            : "No active billing cycle"}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {plan.limits.links} · {plan.limits.apiPerDay}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button
          variant={plan.id === "business" ? "outline" : "default"}
          size="sm"
          className="rounded-xl"
          onClick={() => navigate("/pricing")}
        >
          {plan.id === "business" ? "Manage" : "Upgrade Plan"}
        </Button>
      </div>
    </div>
  );
}
