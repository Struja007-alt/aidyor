-- Create whale_subscriptions table for the $49/mo Whale Pro add-on
CREATE TABLE public.whale_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  telegram_user_id BIGINT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whale_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own subscription
CREATE POLICY "Users can view own whale subscription"
ON public.whale_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Service role only for insert/update/delete (managed by edge functions)
CREATE POLICY "Service role manages whale subscriptions"
ON public.whale_subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_whale_subscriptions_updated_at
BEFORE UPDATE ON public.whale_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_whale_subscriptions_user_id ON public.whale_subscriptions(user_id);
CREATE INDEX idx_whale_subscriptions_telegram_user_id ON public.whale_subscriptions(telegram_user_id);