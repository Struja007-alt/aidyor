import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface WhaleAlert {
  id: string;
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  network: string;
  transactionType: "buy" | "sell";
  amountUsd: number;
  timestamp: string;
  txHash?: string;
  walletAddress?: string;
}

interface WhaleAlertsResponse {
  alerts: WhaleAlert[];
  totalFound: number;
  minAmountUsd: number;
  timestamp: string;
}

export function useWhaleAlerts() {
  const [alerts, setAlerts] = useState<WhaleAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAlerts = useCallback(async (minAmountUsd = 50000, limit = 20) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke<WhaleAlertsResponse>(
        "whale-alerts",
        {
          body: { minAmountUsd, limit },
        }
      );

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.alerts) {
        setAlerts(data.alerts);
        setLastUpdated(new Date());
      }

      return data?.alerts || [];
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch whale alerts";
      setError(message);
      console.error("Whale alerts error:", err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setAlerts([]);
    setError(null);
    setLastUpdated(null);
  }, []);

  return {
    alerts,
    isLoading,
    error,
    lastUpdated,
    fetchAlerts,
    reset,
  };
}
