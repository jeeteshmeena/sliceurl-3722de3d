-- Create feedback_requests table
CREATE TABLE public.feedback_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT,
  product TEXT NOT NULL CHECK (product IN ('sliceurl', 'slicebox', 'littleslice', 'other')),
  request_type TEXT NOT NULL CHECK (request_type IN ('feature', 'bug', 'feedback', 'support', 'improvement')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  screenshot_url TEXT,
  page_url TEXT,
  device TEXT,
  browser TEXT,
  os TEXT,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'reviewing', 'in_progress', 'completed', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback_requests ENABLE ROW LEVEL SECURITY;

-- Users can create feedback
CREATE POLICY "Users can create feedback requests"
ON public.feedback_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
ON public.feedback_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Create storage bucket for feedback screenshots
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('feedback-screenshots', 'feedback-screenshots', true, 5242880)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for feedback screenshots
CREATE POLICY "Users can upload feedback screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'feedback-screenshots' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view feedback screenshots"
ON storage.objects
FOR SELECT
USING (bucket_id = 'feedback-screenshots');

-- Trigger for updated_at
CREATE TRIGGER update_feedback_requests_updated_at
BEFORE UPDATE ON public.feedback_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();