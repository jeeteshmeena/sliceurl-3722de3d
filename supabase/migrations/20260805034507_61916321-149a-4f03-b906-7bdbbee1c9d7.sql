ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'cancelled';

ALTER TABLE public.dodo_settings
  ADD COLUMN IF NOT EXISTS reconciliation_token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex');

ALTER TABLE public.dodo_webhook_logs
  ADD COLUMN IF NOT EXISTS webhook_id text,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS replay_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_replayed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS dodo_webhook_logs_webhook_id_unique
  ON public.dodo_webhook_logs (webhook_id)
  WHERE webhook_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_dodo_pending
  ON public.orders (status, updated_at)
  WHERE status IN ('created', 'pending');
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status
  ON public.subscriptions (user_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_dodo_id_unique
  ON public.subscriptions (dodo_subscription_id)
  WHERE dodo_subscription_id IS NOT NULL;

REVOKE ALL ON public.dodo_settings FROM anon;
REVOKE ALL ON public.dodo_webhook_logs FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dodo_settings TO authenticated;
GRANT SELECT ON public.dodo_webhook_logs TO authenticated;
GRANT ALL ON public.dodo_settings TO service_role;
GRANT ALL ON public.dodo_webhook_logs TO service_role;

DROP POLICY IF EXISTS "Admins manage dodo settings" ON public.dodo_settings;
CREATE POLICY "Admins can read dodo settings"
ON public.dodo_settings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create dodo settings"
ON public.dodo_settings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND updated_by = auth.uid());
CREATE POLICY "Admins can update dodo settings"
ON public.dodo_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') AND updated_by = auth.uid());
CREATE POLICY "Admins can delete dodo settings"
ON public.dodo_settings FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins read dodo webhook logs" ON public.dodo_webhook_logs;
CREATE POLICY "Admins can read dodo webhook logs"
ON public.dodo_webhook_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;