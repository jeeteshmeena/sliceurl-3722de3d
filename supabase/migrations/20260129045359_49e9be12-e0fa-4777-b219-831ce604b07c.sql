-- Add short_code and service_type columns to slicebox_files
ALTER TABLE public.slicebox_files 
ADD COLUMN IF NOT EXISTS short_code text,
ADD COLUMN IF NOT EXISTS service_type text DEFAULT 'sb';

-- Create unique index on short_code for fast lookups and collision detection
CREATE UNIQUE INDEX IF NOT EXISTS idx_slicebox_files_short_code 
ON public.slicebox_files(short_code) 
WHERE short_code IS NOT NULL;

-- Create index on service_type for filtering
CREATE INDEX IF NOT EXISTS idx_slicebox_files_service_type 
ON public.slicebox_files(service_type);

-- Update existing records to have short codes (using first 4 chars of file_id)
UPDATE public.slicebox_files 
SET short_code = LEFT(file_id, 4),
    service_type = 'sb'
WHERE short_code IS NULL;