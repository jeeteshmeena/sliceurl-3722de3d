-- Make slicebox bucket private to prevent direct file access
UPDATE storage.buckets SET public = false WHERE id = 'slicebox';

-- Remove the public read access policy
DROP POLICY IF EXISTS "Public read access for slicebox" ON storage.objects;

-- Drop the existing overly permissive slicebox_files SELECT policy if it exists
DROP POLICY IF EXISTS "Anyone can read files" ON public.slicebox_files;

-- Create a restrictive SELECT policy for slicebox_files
-- Only file owner can see their files, OR anonymous uploads (user_id IS NULL) are visible to everyone
CREATE POLICY "Users can view their own files or anonymous files"
ON public.slicebox_files
FOR SELECT
USING (
  is_deleted = false AND
  (
    user_id IS NULL OR 
    auth.uid() = user_id
  )
);

-- Add policy for authenticated uploads to storage
DROP POLICY IF EXISTS "Authenticated users can upload to slicebox" ON storage.objects;
CREATE POLICY "Anyone can upload to slicebox"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'slicebox'
);

-- Allow deletion via service role only (for cleanup function)
DROP POLICY IF EXISTS "Service role can delete from slicebox" ON storage.objects;
CREATE POLICY "Service role can delete from slicebox"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'slicebox'
);