-- Create table for OCR analytics logging
CREATE TABLE public.ocr_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Method tracking
  method TEXT NOT NULL CHECK (method IN ('vlm', 'tesseract', 'vlm_fallback_tesseract')),
  vlm_attempted BOOLEAN NOT NULL DEFAULT false,
  vlm_succeeded BOOLEAN NOT NULL DEFAULT false,
  tesseract_attempted BOOLEAN NOT NULL DEFAULT false,
  tesseract_succeeded BOOLEAN NOT NULL DEFAULT false,
  
  -- Results
  addresses_found INTEGER NOT NULL DEFAULT 0,
  addresses_validated INTEGER NOT NULL DEFAULT 0,
  
  -- Performance metrics
  processing_time_ms INTEGER,
  image_size_bytes INTEGER,
  
  -- Accuracy tracking (when we can measure)
  -- Ground truth address if user corrects or confirms
  ground_truth_address TEXT,
  extracted_address TEXT,
  cer NUMERIC(5,4), -- Character Error Rate (0.0000 to 1.0000)
  wer NUMERIC(5,4), -- Word Error Rate (0.0000 to 1.0000)
  exact_match BOOLEAN, -- EMR tracking
  
  -- Error tracking
  error_type TEXT,
  error_message TEXT
);

-- Create index for analytics queries
CREATE INDEX idx_ocr_analytics_method ON public.ocr_analytics(method);
CREATE INDEX idx_ocr_analytics_created_at ON public.ocr_analytics(created_at DESC);

-- Enable RLS (public write for analytics, no read from client)
ALTER TABLE public.ocr_analytics ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anyone (analytics logging)
CREATE POLICY "Allow public inserts for analytics"
ON public.ocr_analytics
FOR INSERT
WITH CHECK (true);

-- No read access from client (only backend/admin)
CREATE POLICY "No public reads"
ON public.ocr_analytics
FOR SELECT
USING (false);