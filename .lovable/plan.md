## Overview
Upgrade the static Pricing page into a full subscription system: config-driven plans, monthly/yearly toggle, auth-gated checkout, Paytm gateway scaffold, and a "Coming Soon" fallback until Paytm credentials are configured. Preserve existing design language (flat minimal, 14px radius, no gradients per project memory — note: request mentions "glassmorphism" but project rules forbid gradients/overlaps, so I'll stay consistent with the established SliceURL flat aesthetic and only use subtle motion/hover).

## 1. Navigation
- Add "Pricing" link to `Header.tsx` (desktop nav + mobile menu) with active-state highlight via `NavLink`.
- Route already exists at `/pricing`.

## 2. Plan Configuration
Create `src/config/plans.ts` — single source of truth:
```ts
export const PLANS = {
  pro: {
    id: 'pro',
    name: 'Pro',
    monthly: 199, yearly: 1990, // ₹, yearly ~2 months free
    limits: { links: 'Unlimited', apiPerDay: 1000, storageGB: 5 },
    features: [...],
    popular: true,
  },
  business: { id: 'business', name: 'Business', monthly: 499, yearly: 4990, ... },
}
```

## 3. Pricing Page (`src/pages/Pricing.tsx`)
- Rebuild with Monthly/Yearly `SlidingToggle` (existing component style).
- Animate price with framer-motion-style fade/slide (CSS transitions, 180ms per animation memory).
- "Most Popular" badge on Pro.
- "Choose Plan" button:
  - If not logged in → `navigate('/login?redirect=/checkout?plan=pro&cycle=monthly')`.
  - If logged in → `navigate('/checkout?plan=pro&cycle=monthly')`.
- Free tier stays as informational card (current plan for all users).

## 4. Login redirect support
- `Auth.tsx`: read `?redirect=` query param; after successful sign-in, navigate to that path instead of `/dashboard`.
- `AuthGuard`: preserve `location` and pass through redirect for `/checkout`.

## 5. Checkout Page (`src/pages/Checkout.tsx`, route `/checkout`)
Auth-guarded. Reads `?plan=&cycle=` query.
Sections:
- Order Summary (plan, cycle, features list, price, GST 18% line, total)
- Customer info (name/email pre-filled from profile, editable name)
- Payment section (single "Pay with Paytm" button, security note)
- Terms & Conditions checkbox (required to enable Pay)
- Links to `/refund-policy`, `/privacy`
- "Change Plan" (back to `/pricing`) + Back button

On "Pay Now":
1. Call edge function `create-order` → creates row in `orders`, returns `order_id`.
2. Call edge function `paytm-initiate` → returns either `{ status: 'coming_soon' }` or `{ txnToken, orderId }`.
3. If `coming_soon`, open **ComingSoonModal** (dialog with title/message/Back/Notify Me Later).
4. Else, launch Paytm checkout JS (scaffolded, activates when creds present).

## 6. Backend

### Migration `subscriptions_and_orders`
```sql
CREATE TYPE public.subscription_status AS ENUM ('active','expired','cancelled','pending','failed');
CREATE TYPE public.billing_cycle AS ENUM ('monthly','yearly');
CREATE TYPE public.payment_status AS ENUM ('created','pending','success','failed','refunded');

CREATE TABLE public.subscriptions (
  id uuid PK, user_id uuid FK auth.users, plan_id text,
  status subscription_status, billing_cycle billing_cycle,
  current_period_start timestamptz, current_period_end timestamptz,
  cancel_at_period_end bool, created_at, updated_at
);

CREATE TABLE public.orders (
  id uuid PK, order_number text UNIQUE, user_id uuid FK,
  plan_id text, billing_cycle billing_cycle,
  amount numeric, tax numeric, total numeric, currency text default 'INR',
  status payment_status, created_at, updated_at
);

CREATE TABLE public.payments (
  id uuid PK, order_id uuid FK orders, user_id uuid FK,
  provider text default 'paytm', provider_txn_id text, provider_order_id text,
  amount numeric, status payment_status, raw_response jsonb,
  created_at, updated_at
);
```
+ GRANTs (authenticated select on own rows; service_role all)
+ RLS policies (users see own; only service_role writes payments/subscriptions)
+ update triggers

### Edge functions (all Deno, CORS, JWT-validated for user ones)
- `create-order` — validates plan/cycle, computes amount+tax, inserts `orders` row, returns order id + total.
- `paytm-initiate` — checks for `PAYTM_MERCHANT_ID`/`PAYTM_MERCHANT_KEY`; if missing, returns `{ status: 'coming_soon' }`. Else builds Paytm initiateTransaction request with checksum, returns `txnToken`.
- `paytm-callback` — public (verify_jwt=false); validates checksum, marks payment/order/subscription accordingly, idempotent by `provider_txn_id`.
- `paytm-verify` — server-side status query used after callback.

Config in `supabase/config.toml` sets `verify_jwt=false` on `paytm-callback` only.

### Paytm credentials
Store via `add_secret`: `PAYTM_MERCHANT_ID`, `PAYTM_MERCHANT_KEY`, `PAYTM_WEBSITE`, `PAYTM_ENV` (Staging/Production), `PAYTM_CALLBACK_URL`. All optional at first — absence triggers Coming Soon mode. Won't request until user asks to go live.

### Security
- Server computes price from `PLANS` config, never trusts client amounts.
- Unique `order_number` via `gen_random_uuid()`.
- Duplicate-guard: reject new order if user has `orders.status='pending'` <5 min old for same plan.
- All payment state changes only in edge functions (service role).

## 7. Coming Soon modal
`src/components/ComingSoonModal.tsx` — standard 420px dialog per memory, text "Close"/"Back"/"Notify Me Later" buttons (Notify Me Later is a toast placeholder).

## 8. Dashboard integration
Add `SubscriptionCard` to `Dashboard.tsx` top: current plan name, status, renewal date, "Upgrade" button → `/pricing`. Query `subscriptions` table; falls back to "Free plan" if no row.

## 9. Files

**New**
- `src/config/plans.ts`
- `src/pages/Checkout.tsx`
- `src/components/ComingSoonModal.tsx`
- `src/components/SubscriptionCard.tsx`
- `src/hooks/useSubscription.tsx`
- `supabase/migrations/<ts>_subscriptions.sql`
- `supabase/functions/create-order/index.ts`
- `supabase/functions/paytm-initiate/index.ts`
- `supabase/functions/paytm-callback/index.ts`
- `supabase/functions/paytm-verify/index.ts`

**Edited**
- `src/App.tsx` (+ `/checkout` route)
- `src/components/Header.tsx` (+ Pricing nav item)
- `src/pages/Pricing.tsx` (rebuild with toggle + config)
- `src/pages/Auth.tsx` (redirect param)
- `src/pages/Dashboard.tsx` (subscription card)
- `supabase/config.toml` (paytm-callback jwt=false)

## 10. Design notes
Project memory forbids gradients, overlapping elements, and decorative icons. I'll use the established flat 14px-radius style with subtle 150–200ms transitions and clean hover states — this is the "premium" look for this codebase. If you specifically want translucent glass surfaces on Pricing/Checkout only, say so and I'll add it as a scoped exception.

## Out of scope for this iteration
- Real Paytm production go-live (needs your credentials).
- Refund automation UI (policy link only).
- Prorated upgrade/downgrade math (schema supports; UI later).