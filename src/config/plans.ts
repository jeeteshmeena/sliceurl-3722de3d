// Central plan configuration. Update pricing/limits/features here.
export type PlanId = "free" | "pro" | "business";
export type BillingCycle = "monthly" | "yearly";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  monthly: number; // ₹
  yearly: number; // ₹ (charged upfront yearly)
  currency: "INR";
  popular?: boolean;
  limits: {
    links: string;
    apiPerDay: string;
    storage: string;
    support: string;
  };
  features: string[];
}

export const GST_RATE = 0; // No GST applied

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    tagline: "For individuals getting started",
    monthly: 0,
    yearly: 0,
    currency: "INR",
    limits: {
      links: "25 short links",
      apiPerDay: "No API access",
      storage: "100 MB",
      support: "Community",
    },
    features: [
      "Up to 25 short links",
      "Basic click analytics",
      "Standard QR codes",
      "Community support",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "For creators & power users",
    monthly: 199,
    yearly: 1990, // ~2 months free
    currency: "INR",
    popular: true,
    limits: {
      links: "Unlimited",
      apiPerDay: "1,000 requests / day",
      storage: "5 GB",
      support: "Priority email",
    },
    features: [
      "Unlimited short links",
      "Advanced analytics & geo data",
      "Custom slugs & branded links",
      "Password-protected links",
      "QR code customization",
      "Priority email support",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    tagline: "For teams & high-traffic apps",
    monthly: 499,
    yearly: 4990,
    currency: "INR",
    limits: {
      links: "Unlimited",
      apiPerDay: "10,000 requests / day",
      storage: "50 GB",
      support: "Dedicated support",
    },
    features: [
      "Everything in Pro",
      "10,000 API requests / day",
      "Bulk link creation & CSV import",
      "Team collaboration",
      "Advanced analytics dashboard",
      "Custom domain support",
      "Dedicated support manager",
    ],
  },
};

export const PAID_PLAN_IDS: PlanId[] = ["pro", "business"];

export function getPlanPrice(planId: PlanId, cycle: BillingCycle): number {
  const plan = PLANS[planId];
  return cycle === "monthly" ? plan.monthly : plan.yearly;
}

export function computeTotals(planId: PlanId, cycle: BillingCycle) {
  const amount = getPlanPrice(planId, cycle);
  const tax = Math.round(amount * GST_RATE * 100) / 100;
  const total = Math.round((amount + tax) * 100) / 100;
  return { amount, tax, total, currency: "INR" as const };
}

export function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
