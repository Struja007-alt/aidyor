/**
 * @fileoverview Whale alerts hook for tracking large transactions
 * Fetches and manages large cryptocurrency transaction data
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Whale alert transaction data
 * @interface WhaleAlert
 */
export interface WhaleAlert {
  /** Unique alert ID */
  id: string;
  /** Token contract address */
  tokenAddress: string;
  /** Token name */
  tokenName: string;
  /** Token symbol */
  tokenSymbol: string;
  /** Blockchain network */
  network: string;
  /** Transaction type */
  transactionType: "buy" | "sell";
  /** Transaction amount in USD */
  amountUsd: number;
  /** Transaction timestamp */
  timestamp: string;
  /** Optional transaction hash */
  txHash?: string;
  /** Optional wallet address */
  walletAddress?: string;
}

/**
 * API response structure for whale alerts
 * @interface WhaleAlertsResponse
 * @internal
 */
interface WhaleAlertsResponse {
  alerts: WhaleAlert[];
  totalFound: number;
  minAmountUsd: number;
  timestamp: string;
}

/**
 * Hook for fetching and managing whale alert data.
 * Calls the whale-alerts edge function to retrieve large transactions.
 * 
 * @returns {Object} Whale alerts state and functions
 * @returns {WhaleAlert[]} alerts - Array of whale transactions
 * @returns {boolean} isLoading - Loading state
 * @returns {string|null} error - Error message if failed
 * @returns {Date|null} lastUpdated - Last successful fetch time
 * @returns {Function} fetchAlerts - Fetch alerts with optional filters
 * @returns {Function} reset - Reset state
 * 
 * @example
 * ```tsx
 * const { alerts, fetchAlerts, isLoading } = useWhaleAlerts();
 * 
 * // Fetch alerts with $100K minimum
 * await fetchAlerts(100000, 50);
 * ```
 */

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
