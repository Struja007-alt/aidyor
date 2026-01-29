-- Fix: Remove direct user SELECT access to api_keys base table
-- This prevents exposure of key_hash values
-- Users should only query via api_keys_safe view which excludes sensitive fields

-- Drop the existing user SELECT policy on api_keys that exposes key_hash
DROP POLICY IF EXISTS "Users can view own api_keys metadata" ON public.api_keys;

-- Create a restrictive policy that denies all authenticated user SELECT on base table
-- Service role still has full access for edge functions via the existing service role policy
CREATE POLICY "No direct user access to api_keys"
ON public.api_keys
FOR SELECT
TO authenticated
USING (false);