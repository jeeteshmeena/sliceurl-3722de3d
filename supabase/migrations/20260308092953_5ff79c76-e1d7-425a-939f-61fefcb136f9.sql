
-- 1. links: prevent user_id spoofing on INSERT
DROP POLICY "Users can create links" ON public.links;
CREATE POLICY "Users can create links" ON public.links
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 2. clicks: remove permissive INSERT (edge functions use service role, bypass RLS)
DROP POLICY "Anyone can record clicks" ON public.clicks;

-- 3. slicebox_files: prevent user_id spoofing on INSERT
DROP POLICY "Anyone can upload files" ON public.slicebox_files;
CREATE POLICY "Users can upload files" ON public.slicebox_files
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 4. slicebox_files: restrict UPDATE to file owners only (edge functions use service role for download count)
DROP POLICY "Anyone can increment download count" ON public.slicebox_files;
CREATE POLICY "Owners can update their files" ON public.slicebox_files
  FOR UPDATE
  USING (is_deleted = false AND auth.uid() = user_id)
  WITH CHECK (is_deleted = false AND auth.uid() = user_id);

-- 5. app_reviews: prevent user_id spoofing on INSERT
DROP POLICY "Anyone can create reviews (even anonymous)" ON public.app_reviews;
CREATE POLICY "Users can create reviews" ON public.app_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
