-- Atomic API usage increment to fix race conditions
CREATE OR REPLACE FUNCTION public.bump_api_key_usage(_key_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.api_keys
  SET 
    requests_today = CASE 
      WHEN now() >= rate_limit_reset_at THEN 1
      ELSE requests_today + 1
    END,
    rate_limit_reset_at = CASE
      WHEN now() >= rate_limit_reset_at THEN now() + interval '24 hours'
      ELSE rate_limit_reset_at
    END,
    last_request_at = now()
  WHERE id = _key_id;
END;
$$;