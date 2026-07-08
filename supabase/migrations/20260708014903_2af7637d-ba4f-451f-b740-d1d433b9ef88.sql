
-- =========================================================================
-- 1) app_listings: hide owner_id from public marketplace reads
-- =========================================================================
REVOKE SELECT (owner_id) ON public.app_listings FROM anon, authenticated;

-- =========================================================================
-- 2) app_reviews: hide reviewer PII (ip_address, browser_fingerprint)
-- =========================================================================
REVOKE SELECT (ip_address, browser_fingerprint) ON public.app_reviews FROM anon, authenticated;

-- =========================================================================
-- 3) clicks: add explicit restrictive INSERT policy blocking direct writes
--    (edge functions use service_role which bypasses RLS)
-- =========================================================================
DROP POLICY IF EXISTS "No direct client inserts on clicks" ON public.clicks;
CREATE POLICY "No direct client inserts on clicks"
  ON public.clicks
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

-- =========================================================================
-- 4) slicebox_files: only owner can SELECT via API; anonymous files are
--    accessed exclusively through the backend file-stream edge function
-- =========================================================================
DROP POLICY IF EXISTS "Users can view their own files or anonymous files" ON public.slicebox_files;
CREATE POLICY "Owners can view their own files"
  ON public.slicebox_files
  FOR SELECT
  TO authenticated
  USING (is_deleted = false AND auth.uid() = user_id);

-- =========================================================================
-- 5) slicebox storage bucket: strip public upload/delete/dup policies.
--    The bucket stays private and the backend uses service_role
--    (which bypasses RLS) for all reads/writes/deletes.
-- =========================================================================
DROP POLICY IF EXISTS "Anyone can upload to slicebox" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete from slicebox" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete from slicebox" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads to slicebox" ON storage.objects;

-- Keep anonymous uploads possible (SliceBox / LittleSlice explicitly allow
-- them) but constrain the path prefix so uploads must land under uploads/.
CREATE POLICY "SliceBox constrained uploads"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'slicebox'
    AND (storage.foldername(name))[1] = 'uploads'
  );

-- =========================================================================
-- 6) Public buckets: drop broad SELECT policies that expose bucket listing.
--    Files stay accessible via their /storage/v1/object/public/<path> URLs
--    because the buckets themselves are public.
-- =========================================================================
DROP POLICY IF EXISTS "Anyone can view feedback screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view app assets" ON storage.objects;

-- =========================================================================
-- 7) SECURITY DEFINER functions: revoke direct EXECUTE from client roles.
--    Trigger functions run under the trigger context; edge-function helpers
--    are called with service_role which is unaffected by these revokes.
--    Keep has_role executable for both roles because RLS policies invoke it,
--    and keep apply_geo_backfill executable for authenticated (admin RPC
--    whose internal has_role check gates access).
-- =========================================================================
REVOKE EXECUTE ON FUNCTION public.bump_api_key_usage(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_links_counter()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_global_counter(text, bigint)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_signup_counter()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_clicks_counter()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_app_rating()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_slicebox_update()
  FROM PUBLIC, anon, authenticated;
