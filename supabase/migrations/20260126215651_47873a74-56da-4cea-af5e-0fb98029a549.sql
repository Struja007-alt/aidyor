-- Fix Security Definer View issue by recreating with security_invoker=on
-- This ensures the view respects the querying user's permissions, not the creator's

DROP VIEW IF EXISTS public.api_keys_safe;

CREATE VIEW public.api_keys_safe
WITH (security_invoker=on) AS
SELECT 
  id,
  client_id,
  name,
  key_prefix,
  is_active,
  last_used_at,
  created_at
FROM public.api_keys;

-- Re-grant access
GRANT SELECT ON public.api_keys_safe TO authenticated;