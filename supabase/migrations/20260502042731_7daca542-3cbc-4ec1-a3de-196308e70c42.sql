-- 1) Allowlist of IPs approved for geo backfill
CREATE TABLE public.geo_backfill_allowlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL UNIQUE,
  city text NOT NULL,
  region text,
  country text,
  source text NOT NULL DEFAULT 'manual',
  notes text,
  approved_by uuid NOT NULL,
  approved_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz,
  rows_updated integer
);

ALTER TABLE public.geo_backfill_allowlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view allowlist"
  ON public.geo_backfill_allowlist FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert allowlist"
  ON public.geo_backfill_allowlist FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND approved_by = auth.uid());

CREATE POLICY "Admins can update allowlist"
  ON public.geo_backfill_allowlist FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete allowlist"
  ON public.geo_backfill_allowlist FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) Audit trail of backfill operations
CREATE TABLE public.geo_backfill_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  city text NOT NULL,
  region text,
  country text,
  rows_updated integer NOT NULL,
  performed_by uuid NOT NULL,
  performed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.geo_backfill_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit"
  ON public.geo_backfill_audit FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_geo_backfill_audit_ip ON public.geo_backfill_audit(ip_address);
CREATE INDEX idx_geo_backfill_audit_performed_at ON public.geo_backfill_audit(performed_at DESC);

-- 3) Secure function: only updates clicks for allowlisted IPs and logs every run
CREATE OR REPLACE FUNCTION public.apply_geo_backfill(_ip_address text)
RETURNS TABLE(rows_updated integer, city text, region text, country text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry public.geo_backfill_allowlist%ROWTYPE;
  v_count integer;
BEGIN
  -- Only admins may invoke
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- IP must be on the allowlist
  SELECT * INTO v_entry
  FROM public.geo_backfill_allowlist
  WHERE ip_address = _ip_address;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'IP % is not on the backfill allowlist', _ip_address;
  END IF;

  -- Apply the update only to rows that are currently Unknown/null
  UPDATE public.clicks
  SET city = v_entry.city,
      country = COALESCE(v_entry.country, country)
  WHERE ip_address = _ip_address
    AND (city = 'Unknown' OR city IS NULL);

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Mark the allowlist row as applied
  UPDATE public.geo_backfill_allowlist
  SET applied_at = now(), rows_updated = v_count
  WHERE id = v_entry.id;

  -- Write audit trail
  INSERT INTO public.geo_backfill_audit (ip_address, city, region, country, rows_updated, performed_by)
  VALUES (_ip_address, v_entry.city, v_entry.region, v_entry.country, v_count, auth.uid());

  RETURN QUERY SELECT v_count, v_entry.city, v_entry.region, v_entry.country;
END;
$$;

-- Lock down execution: only authenticated admins (enforced inside the function)
REVOKE ALL ON FUNCTION public.apply_geo_backfill(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_geo_backfill(text) TO authenticated;