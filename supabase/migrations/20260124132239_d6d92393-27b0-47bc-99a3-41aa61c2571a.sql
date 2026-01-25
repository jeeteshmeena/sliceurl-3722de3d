-- Add admin update policy for feedback_requests
-- This allows the owner/admin to update status and notes

-- First, add a policy for users to update their own feedback (in case they want to edit)
CREATE POLICY "Users can update their own feedback"
ON public.feedback_requests
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);