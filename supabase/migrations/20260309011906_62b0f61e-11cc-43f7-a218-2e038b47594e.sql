-- Add link_preview_enabled column to links table
-- This controls whether each individual link shows a preview page before redirecting
-- Default is FALSE (instant redirect)
ALTER TABLE public.links 
ADD COLUMN link_preview_enabled BOOLEAN NOT NULL DEFAULT false;

-- Add index for faster lookups on preview-enabled links
CREATE INDEX idx_links_preview_enabled ON public.links(link_preview_enabled) WHERE link_preview_enabled = true;

-- Add comment
COMMENT ON COLUMN public.links.link_preview_enabled IS 'Controls whether this specific link shows a preview page before redirecting. Default false = instant redirect.';