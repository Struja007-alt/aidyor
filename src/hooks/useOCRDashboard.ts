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

export const useOCRDashboard = (days: number = 30) => {
  return useQuery<OCRDashboardData>({
    queryKey: ['ocr-dashboard', days],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('You must be signed in to view this.');
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
        throw new Error('You must be signed in to view this.');
      }
      if (response.status === 403) {
        throw new Error('You do not have access to this dashboard.');
      }
      if (!response.ok) {
        throw new Error('Failed to fetch OCR analytics');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
};