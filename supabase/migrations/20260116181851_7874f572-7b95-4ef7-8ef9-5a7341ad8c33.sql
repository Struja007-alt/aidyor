-- Add UPDATE policy for passkey_credentials table
-- This allows users to update their own passkey metadata (counter, last_used_at)
CREATE POLICY "Users can update their own passkey credentials"
ON public.passkey_credentials
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);