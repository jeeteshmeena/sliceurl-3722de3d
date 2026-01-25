-- Create shared_analytics table for public analytics links
CREATE TABLE public.shared_analytics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    link_id UUID NOT NULL REFERENCES public.links(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    share_token TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    views_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shared_analytics ENABLE ROW LEVEL SECURITY;

-- Users can view their own shared analytics
CREATE POLICY "Users can view their own shared analytics"
ON public.shared_analytics FOR SELECT
USING (auth.uid() = user_id);

-- Users can create shared analytics for their own links
CREATE POLICY "Users can create shared analytics for their links"
ON public.shared_analytics FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.links WHERE id = link_id AND user_id = auth.uid())
);

-- Users can update their own shared analytics
CREATE POLICY "Users can update their own shared analytics"
ON public.shared_analytics FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own shared analytics
CREATE POLICY "Users can delete their own shared analytics"
ON public.shared_analytics FOR DELETE
USING (auth.uid() = user_id);

-- Create index for fast token lookups
CREATE INDEX idx_shared_analytics_token ON public.shared_analytics(share_token);
CREATE INDEX idx_shared_analytics_link_id ON public.shared_analytics(link_id);

-- Trigger to update updated_at
CREATE TRIGGER update_shared_analytics_updated_at
    BEFORE UPDATE ON public.shared_analytics
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();