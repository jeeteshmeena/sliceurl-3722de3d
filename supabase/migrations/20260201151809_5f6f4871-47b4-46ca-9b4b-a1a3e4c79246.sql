-- Add IP tracking columns to app_reviews for one review per IP per app
ALTER TABLE public.app_reviews 
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS browser_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create unique constraint on app_id + ip_address (one review per IP per app)
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_reviews_ip_unique 
ON public.app_reviews (app_id, ip_address) 
WHERE ip_address IS NOT NULL;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_app_review_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_app_reviews_timestamp ON public.app_reviews;
CREATE TRIGGER update_app_reviews_timestamp
BEFORE UPDATE ON public.app_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_app_review_timestamp();