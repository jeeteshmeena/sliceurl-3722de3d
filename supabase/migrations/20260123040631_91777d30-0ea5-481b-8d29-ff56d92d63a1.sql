-- Create slicebox_files table for file metadata
CREATE TABLE public.slicebox_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  download_count INTEGER DEFAULT 0,
  user_id UUID,
  delete_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),
  is_deleted BOOLEAN DEFAULT false
);

-- Create indexes for performance
CREATE INDEX idx_slicebox_files_file_id ON public.slicebox_files(file_id);
CREATE INDEX idx_slicebox_files_user_id ON public.slicebox_files(user_id);
CREATE INDEX idx_slicebox_files_expires_at ON public.slicebox_files(expires_at);

-- Enable RLS
ALTER TABLE public.slicebox_files ENABLE ROW LEVEL SECURITY;

-- Anyone can read non-deleted files (for redirect)
CREATE POLICY "Anyone can read files" ON public.slicebox_files
  FOR SELECT USING (is_deleted = false);

-- Anyone can insert files (anonymous upload allowed)
CREATE POLICY "Anyone can upload files" ON public.slicebox_files
  FOR INSERT WITH CHECK (true);

-- Anyone can update download_count (for incrementing)
CREATE POLICY "Anyone can update download count" ON public.slicebox_files
  FOR UPDATE USING (true);

-- Create storage bucket for slicebox
INSERT INTO storage.buckets (id, name, public)
VALUES ('slicebox', 'slicebox', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to slicebox bucket
CREATE POLICY "Public read access for slicebox" ON storage.objects
  FOR SELECT USING (bucket_id = 'slicebox');

-- Allow authenticated and anonymous uploads to slicebox bucket
CREATE POLICY "Allow uploads to slicebox" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'slicebox');

-- Allow deletion from slicebox bucket
CREATE POLICY "Allow delete from slicebox" ON storage.objects
  FOR DELETE USING (bucket_id = 'slicebox');