-- Tighten ocr_analytics INSERT policy to prevent abuse/flooding
DROP POLICY IF EXISTS "Allow public inserts for analytics" ON public.ocr_analytics;

CREATE POLICY "Validated analytics inserts"
ON public.ocr_analytics
FOR INSERT
TO public
WITH CHECK (
  -- Enforce reasonable bounds to prevent garbage/flood data
  method IN ('tesseract', 'vlm', 'hybrid', 'failed')
  AND (raw_text_length IS NULL OR (raw_text_length >= 0 AND raw_text_length <= 100000))
  AND (char_count IS NULL OR (char_count >= 0 AND char_count <= 100000))
  AND (image_size_bytes IS NULL OR (image_size_bytes >= 0 AND image_size_bytes <= 52428800))
  AND (processing_time_ms IS NULL OR (processing_time_ms >= 0 AND processing_time_ms <= 600000))
  AND (addresses_found >= 0 AND addresses_found <= 1000)
  AND (addresses_validated >= 0 AND addresses_validated <= 1000)
  AND (confidence IS NULL OR (confidence >= 0 AND confidence <= 100))
  AND (extracted_address IS NULL OR length(extracted_address) <= 200)
  AND (ground_truth_address IS NULL OR length(ground_truth_address) <= 200)
  AND (error_message IS NULL OR length(error_message) <= 2000)
  AND (error_type IS NULL OR length(error_type) <= 100)
);