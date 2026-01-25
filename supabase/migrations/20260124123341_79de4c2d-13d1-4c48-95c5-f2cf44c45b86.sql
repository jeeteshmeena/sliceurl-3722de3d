-- Create a secure view for links that excludes password_hash
CREATE OR REPLACE VIEW public.links_safe
WITH (security_invoker=on) AS
SELECT 
  id,
  user_id,
  original_url,
  short_code,
  custom_slug,
  title,
  is_password_protected,
  -- Exclude password_hash intentionally
  expires_at,
  max_clicks,
  is_private,
  is_favorite,
  folder_id,
  facebook_pixel,
  google_pixel,
  custom_og_title,
  custom_og_description,
  custom_og_image,
  custom_favicon,
  click_count,
  last_clicked_at,
  created_at,
  updated_at,
  batch_id,
  safety_status,
  utm_enabled,
  utm_source,
  utm_medium,
  utm_campaign,
  utm_term,
  utm_content,
  final_utm_url,
  is_broken,
  last_health_check,
  health_status,
  api_source,
  api_key_id,
  is_pinned,
  order_index,
  last_scanned_at,
  slice_duration_ms,
  is_creepy,
  creepy_style,
  creepy_extension,
  notify_on_broken
FROM public.links;

-- Create a secure view for shared_analytics that excludes password_hash
CREATE OR REPLACE VIEW public.shared_analytics_safe
WITH (security_invoker=on) AS
SELECT 
  id,
  link_id,
  user_id,
  share_token,
  -- Exclude password_hash intentionally
  -- Include flag to indicate if password protected
  (password_hash IS NOT NULL) as is_password_protected,
  expires_at,
  is_active,
  views_count,
  created_at,
  updated_at
FROM public.shared_analytics;

-- Grant SELECT on views to authenticated users
GRANT SELECT ON public.links_safe TO authenticated;
GRANT SELECT ON public.shared_analytics_safe TO authenticated;

-- Add comment explaining the purpose
COMMENT ON VIEW public.links_safe IS 'Secure view of links table excluding password_hash for client-side queries';
COMMENT ON VIEW public.shared_analytics_safe IS 'Secure view of shared_analytics table excluding password_hash for client-side queries';