-- Add encryption metadata columns to slicebox_files
ALTER TABLE public.slicebox_files 
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS encryption_iv TEXT DEFAULT NULL;

-- Add comment explaining the encryption approach
COMMENT ON COLUMN public.slicebox_files.is_encrypted IS 'Whether the file is client-side encrypted with AES-256-GCM';
COMMENT ON COLUMN public.slicebox_files.encryption_iv IS 'Base64-encoded IV for AES-256-GCM decryption. The key is stored in URL fragment (never on server).';