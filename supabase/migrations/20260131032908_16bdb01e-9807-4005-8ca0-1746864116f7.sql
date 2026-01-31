-- Create app_listings table for SliceAPPs
CREATE TABLE public.app_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES public.slicebox_files(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  app_name TEXT NOT NULL,
  short_description TEXT,
  full_description TEXT,
  icon_url TEXT,
  promo_banner_url TEXT,
  screenshots TEXT[] DEFAULT '{}',
  category TEXT DEFAULT 'Other',
  version_name TEXT DEFAULT '1.0',
  version_code TEXT DEFAULT '1',
  developer_name TEXT,
  whats_new TEXT,
  release_date DATE DEFAULT CURRENT_DATE,
  total_downloads BIGINT DEFAULT 0,
  rating_avg NUMERIC(2,1) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create app_reviews table
CREATE TABLE public.app_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id UUID NOT NULL REFERENCES public.app_listings(id) ON DELETE CASCADE,
  user_id UUID,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_app_listings_file_id ON public.app_listings(file_id);
CREATE INDEX idx_app_reviews_app_id ON public.app_reviews(app_id);
CREATE INDEX idx_app_reviews_rating ON public.app_reviews(rating);

-- Enable RLS
ALTER TABLE public.app_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for app_listings
CREATE POLICY "Anyone can view published app listings"
  ON public.app_listings FOR SELECT
  USING (is_published = true);

CREATE POLICY "Owners can view their own listings"
  ON public.app_listings FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own listings"
  ON public.app_listings FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their listings"
  ON public.app_listings FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their listings"
  ON public.app_listings FOR DELETE
  USING (auth.uid() = owner_id);

-- RLS Policies for app_reviews
CREATE POLICY "Anyone can view reviews"
  ON public.app_reviews FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create reviews (even anonymous)"
  ON public.app_reviews FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own reviews"
  ON public.app_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON public.app_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger for app_listings
CREATE TRIGGER update_app_listings_updated_at
  BEFORE UPDATE ON public.app_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update rating average when review is added
CREATE OR REPLACE FUNCTION public.update_app_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.app_listings
    SET 
      rating_avg = (SELECT COALESCE(AVG(rating)::NUMERIC(2,1), 0) FROM public.app_reviews WHERE app_id = NEW.app_id),
      rating_count = (SELECT COUNT(*) FROM public.app_reviews WHERE app_id = NEW.app_id)
    WHERE id = NEW.app_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.app_listings
    SET 
      rating_avg = (SELECT COALESCE(AVG(rating)::NUMERIC(2,1), 0) FROM public.app_reviews WHERE app_id = OLD.app_id),
      rating_count = (SELECT COUNT(*) FROM public.app_reviews WHERE app_id = OLD.app_id)
    WHERE id = OLD.app_id;
    RETURN OLD;
  END IF;
END;
$$;

-- Create trigger for rating updates
CREATE TRIGGER update_rating_on_review
  AFTER INSERT OR UPDATE OR DELETE ON public.app_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_app_rating();

-- Create storage bucket for app assets (icons, screenshots)
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-assets', 'app-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for app-assets bucket
CREATE POLICY "Anyone can view app assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'app-assets');

CREATE POLICY "Authenticated users can upload app assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'app-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own app assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'app-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own app assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'app-assets' AND auth.uid()::text = (storage.foldername(name))[1]);