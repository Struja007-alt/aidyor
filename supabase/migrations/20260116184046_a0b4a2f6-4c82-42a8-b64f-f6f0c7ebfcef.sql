-- Fix security issue: Remove public visibility of individual votes
-- Users should only see their own votes, not other users' voting patterns
DROP POLICY IF EXISTS "Anyone can view votes" ON public.token_mapping_votes;

-- Create new policy: Users can only see their own votes
CREATE POLICY "Users can view their own votes" 
ON public.token_mapping_votes 
FOR SELECT 
USING (auth.uid() = user_id);

-- Fix security issue: Ensure rejected mappings are not publicly visible
-- Update the SELECT policy to be more explicit about status filtering
DROP POLICY IF EXISTS "Anyone can view approved mappings" ON public.token_network_mappings;

-- Recreate with explicit approved-only condition
CREATE POLICY "Anyone can view approved mappings" 
ON public.token_network_mappings 
FOR SELECT 
USING (status = 'approved' OR auth.uid() = submitted_by);