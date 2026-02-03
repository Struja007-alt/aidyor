-- Add new columns for enhanced OCR metrics
ALTER TABLE public.ocr_analytics
ADD COLUMN confidence NUMERIC(5,4),
ADD COLUMN char_count INTEGER,
ADD COLUMN fix_applied BOOLEAN DEFAULT false,
ADD COLUMN raw_text_length INTEGER;