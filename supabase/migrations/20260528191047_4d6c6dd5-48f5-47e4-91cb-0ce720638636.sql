DROP POLICY IF EXISTS "Validated analytics inserts" ON public.ocr_analytics;
REVOKE INSERT ON public.ocr_analytics FROM anon, authenticated;