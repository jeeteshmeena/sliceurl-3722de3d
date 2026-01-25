-- Add columns for CreepyURL functionality
ALTER TABLE public.links
ADD COLUMN IF NOT EXISTS is_creepy boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS creepy_style text,
ADD COLUMN IF NOT EXISTS creepy_extension text;

-- Create index for creepy links
CREATE INDEX IF NOT EXISTS idx_links_is_creepy ON public.links(is_creepy) WHERE is_creepy = true;

-- Update RLS policy to allow anonymous inserts for creepy links
DROP POLICY IF EXISTS "Users can create links" ON public.links;

CREATE POLICY "Users can create links" 
ON public.links 
FOR INSERT 
WITH CHECK (true);