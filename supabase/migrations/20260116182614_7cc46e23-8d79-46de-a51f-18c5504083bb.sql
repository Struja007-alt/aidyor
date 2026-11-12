-- Create table for community token mapping submissions
CREATE TABLE public.token_network_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  original_networks TEXT[] NOT NULL,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  votes_up INTEGER NOT NULL DEFAULT 0,
  votes_down INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint on symbol to prevent duplicates
CREATE UNIQUE INDEX idx_token_network_mappings_symbol ON public.token_network_mappings(UPPER(symbol));

-- Enable RLS
ALTER TABLE public.token_network_mappings ENABLE ROW LEVEL SECURITY;

-- Everyone can view approved mappings
CREATE POLICY "Anyone can view approved mappings"
ON public.token_network_mappings
FOR SELECT
USING (status = 'approved');

-- Authenticated users can view their own submissions regardless of status
CREATE POLICY "Users can view their own submissions"
ON public.token_network_mappings
FOR SELECT
USING (auth.uid() = submitted_by);

-- Authenticated users can submit new mappings
CREATE POLICY "Authenticated users can submit mappings"
ON public.token_network_mappings
FOR INSERT
WITH CHECK (auth.uid() = submitted_by);

-- Users can update their own pending submissions
CREATE POLICY "Users can update their own pending submissions"
ON public.token_network_mappings
FOR UPDATE
USING (auth.uid() = submitted_by AND status = 'pending');

-- Users can delete their own pending submissions
CREATE POLICY "Users can delete their own pending submissions"
ON public.token_network_mappings
FOR DELETE
USING (auth.uid() = submitted_by AND status = 'pending');

-- Create votes table to track who voted
CREATE TABLE public.token_mapping_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mapping_id UUID NOT NULL REFERENCES public.token_network_mappings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mapping_id, user_id)
);

-- Enable RLS on votes
ALTER TABLE public.token_mapping_votes ENABLE ROW LEVEL SECURITY;

-- Users can view all votes
CREATE POLICY "Anyone can view votes"
ON public.token_mapping_votes
FOR SELECT
USING (true);

-- Authenticated users can vote
CREATE POLICY "Authenticated users can vote"
ON public.token_mapping_votes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can change their vote
CREATE POLICY "Users can update their own votes"
ON public.token_mapping_votes
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can remove their vote
CREATE POLICY "Users can delete their own votes"
ON public.token_mapping_votes
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_token_network_mappings_updated_at
BEFORE UPDATE ON public.token_network_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-approve mappings with 5+ net upvotes
CREATE OR REPLACE FUNCTION public.auto_approve_mapping()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.votes_up - NEW.votes_down >= 5 AND NEW.status = 'pending' THEN
    NEW.status := 'approved';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_approve_on_votes
BEFORE UPDATE ON public.token_network_mappings
FOR EACH ROW
EXECUTE FUNCTION public.auto_approve_mapping();