-- Drop community mapping tables (feature removed)
DROP TABLE IF EXISTS public.token_mapping_votes CASCADE;
DROP TABLE IF EXISTS public.token_network_mappings CASCADE;

-- Drop the auto-approval function
DROP FUNCTION IF EXISTS public.auto_approve_mapping() CASCADE;