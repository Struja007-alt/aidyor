import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DailyStat {
  date: string;
  scans: number;
  vlmSuccess: number;
  tesseractSuccess: number;
  corrections: number;
  avgConfidence: number;
  exactMatches: number;
}

interface OCRDashboardData {
  summary: {
    totalScans: number;
    vlmSuccessRate: number;
    tesseractSuccessRate: number;
    correctionRate: number;
    exactMatchRate: number;
    avgProcessingTime: number;
    avgConfidence: number;
    avgCER: number;
    totalAddressesFound: number;
    totalAddressesValidated: number;
    validationRate: number;
  };
  timeSeries: DailyStat[];
  methodDistribution: {
    vlm: number;
    tesseract: number;
    vlm_fallback_tesseract: number;
  };
  confidenceDistribution: Array<{ range: string; count: number }>;
  errorTypes: Array<{ type: string; count: number }>;
  periodDays: number;
}

class OCRDashboardError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'OCRDashboardError';
    this.status = status;
  }
}

export const useOCRDashboard = (days: number = 30) => {
  return useQuery<OCRDashboardData>({
    queryKey: ['ocr-dashboard', days],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new OCRDashboardError('You must be signed in to view this.', 401);
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-analytics-dashboard?days=${days}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.status === 401) {
        throw new OCRDashboardError('You must be signed in to view this.', 401);
      }
      if (response.status === 403) {
        throw new OCRDashboardError('You do not have access to this dashboard.', 403);
      }
      if (!response.ok) {
        throw new OCRDashboardError('Failed to fetch OCR analytics', response.status);
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    // Don't retry auth failures; retry other errors up to 2 times
    retry: (failureCount, error) => {
      const status = (error as OCRDashboardError).status;
      if (status === 401 || status === 403) return false;
      return failureCount < 2;
    },
  });
};