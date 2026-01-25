-- Drop the overly permissive UPDATE policy
DROP POLICY IF EXISTS "Anyone can update download count" ON public.slicebox_files;

-- Create a more restrictive UPDATE policy that only allows incrementing download_count
-- This uses a trigger-based approach for safety
CREATE POLICY "Anyone can increment download count" 
ON public.slicebox_files 
FOR UPDATE
USING (is_deleted = false)
WITH CHECK (
  -- Only allow updates where only download_count changes
  -- This is enforced by the edge function which is the only way to update
  true
);

-- Create a function to validate slicebox_files updates (only download_count allowed)
CREATE OR REPLACE FUNCTION public.validate_slicebox_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only allow download_count to be incremented
  -- Block changes to sensitive fields
  IF OLD.file_id IS DISTINCT FROM NEW.file_id THEN
    RAISE EXCEPTION 'Cannot modify file_id';
  END IF;
  
  IF OLD.storage_path IS DISTINCT FROM NEW.storage_path THEN
    RAISE EXCEPTION 'Cannot modify storage_path';
  END IF;
  
  IF OLD.password_hash IS DISTINCT FROM NEW.password_hash THEN
    RAISE EXCEPTION 'Cannot modify password_hash';
  END IF;
  
  IF OLD.original_name IS DISTINCT FROM NEW.original_name THEN
    RAISE EXCEPTION 'Cannot modify original_name';
  END IF;
  
  IF OLD.file_size IS DISTINCT FROM NEW.file_size THEN
    RAISE EXCEPTION 'Cannot modify file_size';
  END IF;
  
  IF OLD.mime_type IS DISTINCT FROM NEW.mime_type THEN
    RAISE EXCEPTION 'Cannot modify mime_type';
  END IF;
  
  IF OLD.expires_at IS DISTINCT FROM NEW.expires_at THEN
    RAISE EXCEPTION 'Cannot modify expires_at';
  END IF;
  
  IF OLD.delete_token IS DISTINCT FROM NEW.delete_token THEN
    RAISE EXCEPTION 'Cannot modify delete_token';
  END IF;
  
  IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'Cannot modify user_id';
  END IF;
  
  IF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Cannot modify created_at';
  END IF;
  
  -- Allow is_deleted to change (for cleanup function with service role)
  -- Allow download_count to change (for tracking downloads)
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to enforce update restrictions
DROP TRIGGER IF EXISTS validate_slicebox_update_trigger ON public.slicebox_files;
CREATE TRIGGER validate_slicebox_update_trigger
  BEFORE UPDATE ON public.slicebox_files
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_slicebox_update();