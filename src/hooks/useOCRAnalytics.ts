import { useCallback } from 'react';

interface OCRAnalyticsData {
  method: 'vlm' | 'tesseract' | 'vlm_fallback_tesseract';
  vlmAttempted: boolean;
  vlmSucceeded: boolean;
  tesseractAttempted: boolean;
  tesseractSucceeded: boolean;
  addressesFound: number;
  addressesValidated: number;
  processingTimeMs: number;
  imageSizeBytes?: number;
  groundTruthAddress?: string;
  extractedAddress?: string;
  errorType?: string;
  errorMessage?: string;
}

export const useOCRAnalytics = () => {
  const logOCRAnalytics = useCallback(async (data: OCRAnalyticsData) => {
    try {
      // Fire and forget - don't block UI for analytics
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          method: data.method,
          vlm_attempted: data.vlmAttempted,
          vlm_succeeded: data.vlmSucceeded,
          tesseract_attempted: data.tesseractAttempted,
          tesseract_succeeded: data.tesseractSucceeded,
          addresses_found: data.addressesFound,
          addresses_validated: data.addressesValidated,
          processing_time_ms: data.processingTimeMs,
          image_size_bytes: data.imageSizeBytes,
          ground_truth_address: data.groundTruthAddress,
          extracted_address: data.extractedAddress,
          error_type: data.errorType,
          error_message: data.errorMessage,
        }),
      }).catch((err) => {
        console.warn('[OCR Analytics] Failed to log:', err);
      });
    } catch (error) {
      // Silent fail for analytics
      console.warn('[OCR Analytics] Error:', error);
    }
  }, []);

  // Log when user confirms/corrects an address (for accuracy tracking)
  const logAddressConfirmation = useCallback(async (
    extractedAddress: string,
    confirmedAddress: string,
    method: 'vlm' | 'tesseract' | 'vlm_fallback_tesseract'
  ) => {
    try {
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          method: method,
          vlm_attempted: method === 'vlm' || method === 'vlm_fallback_tesseract',
          vlm_succeeded: method === 'vlm',
          tesseract_attempted: method === 'tesseract' || method === 'vlm_fallback_tesseract',
          tesseract_succeeded: method === 'tesseract' || method === 'vlm_fallback_tesseract',
          addresses_found: 1,
          addresses_validated: 1,
          processing_time_ms: 0,
          ground_truth_address: confirmedAddress,
          extracted_address: extractedAddress,
        }),
      }).catch((err) => {
        console.warn('[OCR Analytics] Failed to log confirmation:', err);
      });
    } catch (error) {
      console.warn('[OCR Analytics] Error logging confirmation:', error);
    }
  }, []);

  return { logOCRAnalytics, logAddressConfirmation };
};
