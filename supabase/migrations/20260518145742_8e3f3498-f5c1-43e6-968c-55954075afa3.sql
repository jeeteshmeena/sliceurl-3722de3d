CREATE TABLE public.ip_geo_cache (
  ip_address TEXT PRIMARY KEY,
  country TEXT,
  city TEXT,
  region TEXT,
  provider TEXT,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX idx_ip_geo_cache_expires_at ON public.ip_geo_cache(expires_at);

ALTER TABLE public.ip_geo_cache ENABLE ROW LEVEL SECURITY;

-- No public policies: only service role (edge functions) accesses this cache.
-- Admins can view for debugging.
CREATE POLICY "Admins can view geo cache"
  ON public.ip_geo_cache
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));