-- Add short_code and service_type columns to slicebox_files
-- short_code: 4-6 character alphanumeric code for short URLs
-- service_type: 'sb' for SliceBox (permanent) or 'ls' for LittleSlice (temporary)

-- Add columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'slicebox_files' AND column_name = 'short_code') THEN
        ALTER TABLE public.slicebox_files ADD COLUMN short_code TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'slicebox_files' AND column_name = 'service_type') THEN
        ALTER TABLE public.slicebox_files ADD COLUMN service_type TEXT DEFAULT 'sb';
    END IF;
END $$;

-- Create unique index on short_code for fast lookups and collision prevention
CREATE UNIQUE INDEX IF NOT EXISTS idx_slicebox_files_short_code ON public.slicebox_files(short_code) WHERE short_code IS NOT NULL AND is_deleted = false;

-- Create index for service_type to quickly filter by service
CREATE INDEX IF NOT EXISTS idx_slicebox_files_service_type ON public.slicebox_files(service_type);

-- Update existing records to have short codes (4-char alphanumeric)
-- Generate short codes for existing files that don't have one
UPDATE public.slicebox_files 
SET short_code = substring(encode(gen_random_bytes(3), 'base64') for 4),
    service_type = CASE WHEN expires_at IS NULL THEN 'sb' ELSE 'ls' END
WHERE short_code IS NULL;

-- Function to generate short code with collision handling
CREATE OR REPLACE FUNCTION public.generate_slicebox_shortcode(target_length INTEGER DEFAULT 4)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
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
        IF NOT EXISTS (SELECT 1 FROM public.slicebox_files WHERE short_code = result AND is_deleted = false) THEN
            RETURN result;
        END IF;
        
        attempt := attempt + 1;
        IF attempt >= max_attempts THEN
            -- Increase length and reset attempts
            current_length := current_length + 1;
            attempt := 0;
            IF current_length > 6 THEN
                -- Fallback to UUID prefix if all else fails
                RETURN substring(replace(gen_random_uuid()::text, '-', '') for 6);
            END IF;
        END IF;
    END LOOP;
END;
$$;