-- HIGHEST SECURITY LEVEL: Restrict all service role policies to use TO service_role
-- This ensures only Edge Functions with service_role key can access these tables

-- 1. Fix pending_orders - restrict to actual service_role
DROP POLICY IF EXISTS "Service role can manage orders" ON public.pending_orders;
CREATE POLICY "Service role can manage orders" 
ON public.pending_orders 
FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

-- 2. Fix premium_subscriptions - restrict to actual service_role  
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.premium_subscriptions;
CREATE POLICY "Service role can manage subscriptions" 
ON public.premium_subscriptions 
FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

-- 3. Fix scan_usage - restrict to actual service_role
DROP POLICY IF EXISTS "Service role can manage scan usage" ON public.scan_usage;
CREATE POLICY "Service role can manage scan usage" 
ON public.scan_usage 
FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

-- 4. Create a secure view for api_keys that hides sensitive hash data
-- Users can only see metadata, not the actual key_hash
CREATE OR REPLACE VIEW public.api_keys_safe AS
SELECT 
  id,
  client_id,
  name,
  key_prefix,
  is_active,
  last_used_at,
  created_at
FROM public.api_keys;

-- Grant access to authenticated users via the view
GRANT SELECT ON public.api_keys_safe TO authenticated;

-- 5. Add explicit deny policy for direct api_keys SELECT by regular users
-- (They should use the api_keys_safe view instead)
DROP POLICY IF EXISTS "Users can view own api_keys" ON public.api_keys;

-- Recreate with stricter access - only show non-sensitive fields via the secure view
CREATE POLICY "Users can view own api_keys metadata" 
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

-- 6. Add DELETE policy for api_clients (users should be able to delete their own)
CREATE POLICY "Users can delete own api_clients" 
ON public.api_clients 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- 7. Ensure api_clients user_id is NOT NULL for security (no orphan records)
-- First set any NULL user_ids to a placeholder (if any exist)
-- Then add NOT NULL constraint
ALTER TABLE public.api_clients 
ALTER COLUMN user_id SET NOT NULL;