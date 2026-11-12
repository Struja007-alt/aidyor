DROP VIEW IF EXISTS public.api_keys_safe;

CREATE VIEW public.api_keys_safe
WITH (security_invoker = true)
AS
SELECT
  id,
  client_id,
  is_active,
  last_used_at,
  created_at,
  name,
  key_prefix
FROM public.api_keys;