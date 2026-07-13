
-- Drop broad public read on feedback-screenshots if present
DROP POLICY IF EXISTS "Public read access for feedback-screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view feedback-screenshots" ON storage.objects;
DROP POLICY IF EXISTS "feedback-screenshots public read" ON storage.objects;

-- Only the owner of the linked feedback_request can read their screenshot
DROP POLICY IF EXISTS "Feedback screenshots: owner read" ON storage.objects;
CREATE POLICY "Feedback screenshots: owner read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'feedback-screenshots'
  AND EXISTS (
    SELECT 1 FROM public.feedback_requests fr
    WHERE fr.user_id = auth.uid()
      AND fr.screenshot_url IS NOT NULL
      AND position(storage.objects.name in fr.screenshot_url) > 0
  )
);

DROP POLICY IF EXISTS "Feedback screenshots: admin read" ON storage.objects;
CREATE POLICY "Feedback screenshots: admin read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'feedback-screenshots'
  AND public.has_role(auth.uid(), 'admin')
);

-- SliceBox uploads: constrain path format + tie authenticated uploads to owner
DROP POLICY IF EXISTS "SliceBox constrained uploads" ON storage.objects;
CREATE POLICY "SliceBox constrained uploads"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'slicebox'
  AND name ~ '^uploads/[a-zA-Z0-9]+/[a-zA-Z0-9._-]+$'
  AND (auth.uid() IS NULL OR owner = auth.uid())
);

-- app_reviews: stop exposing PII / fingerprint publicly
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.app_reviews;

CREATE OR REPLACE VIEW public.app_reviews_public
WITH (security_invoker = true) AS
SELECT id, app_id, user_id, rating, review_text, created_at, updated_at
FROM public.app_reviews;

GRANT SELECT ON public.app_reviews_public TO anon, authenticated;

DROP POLICY IF EXISTS "Users can view their own reviews" ON public.app_reviews;
CREATE POLICY "Users can view their own reviews"
ON public.app_reviews
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all reviews" ON public.app_reviews;
CREATE POLICY "Admins can view all reviews"
ON public.app_reviews
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Lock down SECURITY DEFINER function EXECUTE grants
REVOKE EXECUTE ON FUNCTION public.bump_api_key_usage(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_links_counter() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_global_counter(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_signup_counter() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_clicks_counter() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_app_rating() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_geo_backfill(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_slicebox_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_app_review_timestamp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_app_shortcode(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_app_slug(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_slicebox_shortcode(integer) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
