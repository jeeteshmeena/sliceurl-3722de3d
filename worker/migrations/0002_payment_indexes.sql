-- Lookups used by Dodo webhooks/reconcile and the Paytm callback
CREATE INDEX IF NOT EXISTS idx_orders_dodo_session ON orders(dodo_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_dodo_payment ON orders(dodo_payment_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status, created_at);
