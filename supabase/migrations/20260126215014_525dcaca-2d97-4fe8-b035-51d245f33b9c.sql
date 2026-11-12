-- Fix RLS policies that are incorrectly assigned to public role when they should be service_role only
-- These policies use USING (true) which is intentional for service role, but they're assigned to wrong role

-- Drop the incorrectly configured policies
DROP POLICY IF EXISTS "Service role can manage api_clients" ON public.api_clients;
DROP POLICY IF EXISTS "Service role can manage api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "Service role can manage api_usage" ON public.api_usage;

-- Recreate with proper service_role restriction (using TO service_role)
CREATE POLICY "Service role can manage api_clients" 
ON public.api_clients 
FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role can manage api_keys" 
ON public.api_keys 
FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role can manage api_usage" 
ON public.api_usage 
FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

-- Add user-level policies for api_clients (INSERT and UPDATE for authenticated users)
CREATE POLICY "Users can create api_clients" 
ON public.api_clients 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api_clients" 
ON public.api_clients 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add user-level SELECT policy for api_keys (view own keys via client ownership)
CREATE POLICY "Users can view own api_keys" 
ON public.api_keys 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.api_clients 
    WHERE api_clients.id = api_keys.client_id 
    AND api_clients.user_id = auth.uid()
  )
);

-- Add user-level SELECT policy for api_usage (view own usage via client ownership)
CREATE POLICY "Users can view own api_usage" 
ON public.api_usage 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.api_clients 
    WHERE api_clients.id = api_usage.client_id 
    AND api_clients.user_id = auth.uid()
  )
);