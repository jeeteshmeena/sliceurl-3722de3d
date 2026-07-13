
-- Merchant API Keys
CREATE TABLE public.merchant_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.merchant_api_keys TO authenticated;
GRANT ALL ON public.merchant_api_keys TO service_role;

ALTER TABLE public.merchant_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage merchant api keys"
ON public.merchant_api_keys
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_merchant_api_keys_updated_at
BEFORE UPDATE ON public.merchant_api_keys
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Merchant Orders (from external sites)
CREATE TABLE public.merchant_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES public.merchant_api_keys(id) ON DELETE SET NULL,
  external_order_id TEXT,
  order_number TEXT NOT NULL UNIQUE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  customer_email TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  description TEXT,
  callback_url TEXT,
  return_url TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  paytm_order_id TEXT UNIQUE,
  paytm_txn_id TEXT,
  txn_token TEXT,
  verified_at TIMESTAMPTZ,
  raw_response JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_merchant_orders_status ON public.merchant_orders(status);
CREATE INDEX idx_merchant_orders_api_key ON public.merchant_orders(api_key_id);
CREATE INDEX idx_merchant_orders_created ON public.merchant_orders(created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.merchant_orders TO authenticated;
GRANT ALL ON public.merchant_orders TO service_role;

ALTER TABLE public.merchant_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view merchant orders"
ON public.merchant_orders
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_merchant_orders_updated_at
BEFORE UPDATE ON public.merchant_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: touch last_used_at on api key
CREATE OR REPLACE FUNCTION public.touch_merchant_api_key(_key_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.merchant_api_keys SET last_used_at = now() WHERE id = _key_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.touch_merchant_api_key(uuid) FROM anon, authenticated;
