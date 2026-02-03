import { useQuery } from '@tanstack/react-query';

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
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-analytics-dashboard?days=${days}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch OCR analytics');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
