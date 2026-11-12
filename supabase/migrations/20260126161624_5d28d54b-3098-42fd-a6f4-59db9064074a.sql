
-- Create enum for API plan tiers
CREATE TYPE public.api_plan_tier AS ENUM ('starter', 'growth', 'enterprise');

-- Create API plans table
CREATE TABLE public.api_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier api_plan_tier NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  monthly_scan_limit INTEGER NOT NULL,
  overage_price_cents INTEGER NOT NULL DEFAULT 1, -- $0.01 per scan
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create API clients table
CREATE TABLE public.api_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  plan_tier api_plan_tier NOT NULL DEFAULT 'starter',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  billing_cycle_start DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create API keys table (stores hashed keys)
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.api_clients(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL, -- First 8 chars for identification (e.g., "aidyor_sk")
  name TEXT NOT NULL DEFAULT 'Default Key',
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create API usage tracking table
CREATE TABLE public.api_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.api_clients(id) ON DELETE CASCADE,
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  scan_count INTEGER NOT NULL DEFAULT 0,
  overage_count INTEGER NOT NULL DEFAULT 0,
  billing_period DATE NOT NULL DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, billing_period)
);

-- Enable RLS
ALTER TABLE public.api_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- API plans are publicly readable
CREATE POLICY "Anyone can view API plans"
  ON public.api_plans FOR SELECT
  USING (true);

-- Service role can manage all tables
CREATE POLICY "Service role can manage api_clients"
  ON public.api_clients FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage api_keys"
  ON public.api_keys FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage api_usage"
  ON public.api_usage FOR ALL
  USING (true)
  WITH CHECK (true);

-- Users can view their own client records
CREATE POLICY "Users can view own api_clients"
  ON public.api_clients FOR SELECT
  USING (auth.uid() = user_id);

-- Insert default plans
INSERT INTO public.api_plans (tier, name, price_cents, monthly_scan_limit, overage_price_cents, description) VALUES
  ('starter', 'Starter', 4900, 1000, 1, '1,000 API calls/month, $0.01 overage'),
  ('growth', 'Growth', 9900, 5000, 1, '5,000 API calls/month, $0.01 overage'),
  ('enterprise', 'Enterprise', 19900, 25000, 1, '25,000 API calls/month, $0.01 overage, priority support');

-- Create trigger for updated_at
CREATE TRIGGER update_api_clients_updated_at
  BEFORE UPDATE ON public.api_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_api_usage_updated_at
  BEFORE UPDATE ON public.api_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
