
-- 1. Fix links_safe view: enable security_invoker so it respects underlying RLS
ALTER VIEW public.links_safe SET (security_invoker = true);

-- 2. Fix shared_analytics_safe view: enable security_invoker
ALTER VIEW public.shared_analytics_safe SET (security_invoker = true);

-- 3. Create a safe view for slicebox_files that excludes delete_token and password_hash
CREATE OR REPLACE VIEW public.slicebox_files_safe AS
SELECT
  id, file_id, short_code, original_name, file_size, mime_type,
  storage_path, download_count, user_id, created_at, expires_at,
  is_deleted, is_encrypted, encryption_iv, service_type,
  (password_hash IS NOT NULL) AS is_password_protected
FROM public.slicebox_files;

-- Make the safe view respect RLS of the underlying table
ALTER VIEW public.slicebox_files_safe SET (security_invoker = true);
