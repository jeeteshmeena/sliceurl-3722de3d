
-- Paytm settings (admin-managed credentials, overrides env vars)
CREATE TABLE public.paytm_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id text,
  merchant_key text,
  env text NOT NULL DEFAULT 'staging' CHECK (env IN ('staging','production')),
  website text NOT NULL DEFAULT 'WEBSTAGING',
  is_active boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.paytm_settings TO authenticated;
GRANT ALL ON public.paytm_settings TO service_role;

ALTER TABLE public.paytm_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage paytm_settings"
ON public.paytm_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_paytm_settings_updated
BEFORE UPDATE ON public.paytm_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Paytm callback + initiate logs (admin-readable audit trail)
CREATE TABLE public.paytm_callback_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,             -- 'initiate' | 'callback'
  paytm_order_id text,
  paytm_txn_id text,
  status text,                          -- received | verified | invalid_checksum | success | failed | pending | cancelled | error
  payment_status text,                  -- mapped internal status
  verification_error text,
  http_status integer,
  raw_payload jsonb,
  raw_headers jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.paytm_callback_logs TO authenticated;
GRANT ALL ON public.paytm_callback_logs TO service_role;

ALTER TABLE public.paytm_callback_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read paytm_callback_logs"
ON public.paytm_callback_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_paytm_logs_created_at ON public.paytm_callback_logs (created_at DESC);
CREATE INDEX idx_paytm_logs_order ON public.paytm_callback_logs (paytm_order_id);
