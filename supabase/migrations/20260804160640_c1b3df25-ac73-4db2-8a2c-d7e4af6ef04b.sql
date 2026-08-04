CREATE TABLE public.dodo_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key text,
  webhook_secret text,
  env text NOT NULL DEFAULT 'test',
  product_pro_monthly text,
  product_pro_yearly text,
  product_business_monthly text,
  product_business_yearly text,
  is_active boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dodo_settings TO authenticated;
GRANT ALL ON public.dodo_settings TO service_role;
ALTER TABLE public.dodo_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage dodo settings" ON public.dodo_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_dodo_settings_updated_at BEFORE UPDATE ON public.dodo_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.dodo_webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  dodo_payment_id text,
  dodo_subscription_id text,
  order_id uuid,
  status text,
  verification_error text,
  http_status integer,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.dodo_webhook_logs TO authenticated;
GRANT ALL ON public.dodo_webhook_logs TO service_role;
ALTER TABLE public.dodo_webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read dodo webhook logs" ON public.dodo_webhook_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dodo_session_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dodo_payment_id text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS dodo_subscription_id text;