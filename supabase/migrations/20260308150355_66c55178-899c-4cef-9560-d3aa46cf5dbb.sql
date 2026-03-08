
ALTER TABLE public.app_listings 
  ADD COLUMN IF NOT EXISTS age_rating text DEFAULT '4+',
  ADD COLUMN IF NOT EXISTS developer_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS short_description text DEFAULT NULL;
