-- Add short_code column to app_listings for human-friendly URLs
ALTER TABLE public.app_listings 
ADD COLUMN short_code TEXT UNIQUE;

-- Create index for fast lookup by short_code
CREATE INDEX idx_app_listings_short_code ON public.app_listings(short_code);

-- Create function to generate unique short code for app listings
CREATE OR REPLACE FUNCTION public.generate_app_shortcode(target_length integer DEFAULT 4)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    result TEXT := '';
    i INTEGER;
    max_attempts INTEGER := 10;
    attempt INTEGER := 0;
    current_length INTEGER := target_length;
BEGIN
    LOOP
        -- Generate random code
        result := '';
        FOR i IN 1..current_length LOOP
            result := result || substr(chars, floor(random() * 62)::int + 1, 1);
        END LOOP;
        
        -- Check for collision
        IF NOT EXISTS (SELECT 1 FROM public.app_listings WHERE short_code = result) THEN
            RETURN result;
        END IF;
        
        attempt := attempt + 1;
        IF attempt >= max_attempts THEN
            -- Increase length and reset attempts
            current_length := current_length + 1;
            attempt := 0;
            IF current_length > 8 THEN
                -- Fallback to UUID prefix if all else fails
                RETURN substring(replace(gen_random_uuid()::text, '-', '') for 8);
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- Create function to generate URL-safe slug from app name
CREATE OR REPLACE FUNCTION public.generate_app_slug(app_name text)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    slug TEXT;
BEGIN
    -- Convert to lowercase and replace spaces/special chars with hyphens
    slug := lower(regexp_replace(app_name, '[^a-zA-Z0-9]+', '-', 'g'));
    -- Remove leading/trailing hyphens
    slug := trim(both '-' from slug);
    -- Limit length
    slug := substring(slug for 50);
    
    -- Check if slug is unique
    IF NOT EXISTS (SELECT 1 FROM public.app_listings WHERE short_code = slug) THEN
        RETURN slug;
    END IF;
    
    -- If not unique, return NULL (caller will use random code)
    RETURN NULL;
END;
$$;