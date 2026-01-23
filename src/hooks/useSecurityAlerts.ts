import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SecurityAlert {
  id: string;
  title: string;
  summary: string;
  severity: "critical" | "high" | "medium" | "info";
  category: "scam" | "hack" | "vulnerability" | "rugpull" | "warning";
  timestamp: string;
  source: string;
  link?: string;
}

interface SecurityAlertsResponse {
  alerts: SecurityAlert[];
  totalFound: number;
  sources: string[];
  timestamp: string;
}

export function useSecurityAlerts() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke<SecurityAlertsResponse>(
        "security-alerts",
        { method: "POST" }
      );

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.alerts) {
        setAlerts(data.alerts);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error("Failed to fetch security alerts:", err);
      setError("Failed to load security alerts");
      // Keep existing alerts if fetch fails
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const refresh = useCallback(async () => {
    await fetchAlerts();
  }, [fetchAlerts]);

  return {
    alerts,
    isLoading,
    error,
    lastUpdated,
    refresh
  };
}
