REVOKE ALL ON FUNCTION public.touch_merchant_api_key(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.touch_merchant_api_key(uuid) TO service_role;