-- Create table to track daily scan usage for freemium limits
CREATE TABLE public.scan_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id BIGINT NOT NULL,
  scan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  scan_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(telegram_user_id, scan_date)
);

-- Enable RLS
ALTER TABLE public.scan_usage ENABLE ROW LEVEL SECURITY;

-- Service role can manage scan usage (edge functions)
CREATE POLICY "Service role can manage scan usage"
  ON public.scan_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index for fast lookups
CREATE INDEX idx_scan_usage_user_date ON public.scan_usage(telegram_user_id, scan_date);

-- Add trigger for updated_at
CREATE TRIGGER update_scan_usage_updated_at
  BEFORE UPDATE ON public.scan_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();