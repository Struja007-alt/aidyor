-- Add INSERT policy for passkey_credentials (was missing!)
CREATE POLICY "Users can insert their own passkeys"
ON public.passkey_credentials
FOR INSERT
WITH CHECK (auth.uid() = user_id);