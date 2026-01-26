/**
 * @fileoverview Hook for sending alerts to Telegram
 * Provides functions to send whale, security, and scan alerts
 */

import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface WhaleAlertData {
  symbol: string;
  network: string;
  amount: string;
  type: "buy" | "sell";
  description?: string;
}

interface SecurityAlertData {
  title: string;
  summary: string;
  severity: "critical" | "high" | "medium" | "info";
  source: string;
  link?: string;
}

interface TelegramSettings {
  whaleAlerts: boolean;
  securityAlerts: boolean;
  watchlistAlerts: boolean;
}

/**
 * Hook for sending alerts to a user's connected Telegram chat
 * 
 * @example
 * ```tsx
 * const { sendWhaleAlert, sendSecurityAlert } = useTelegramAlerts();
 * 
 * // Send a whale alert
 * await sendWhaleAlert({
 *   symbol: "ETH",
 *   network: "Ethereum",
 *   amount: "$500K",
 *   type: "buy"
 * });
 * ```
 */
export function useTelegramAlerts() {
  const getChatId = useCallback((): string | null => {
    return localStorage.getItem("telegram_chat_id");
  }, []);

  const getSettings = useCallback((): TelegramSettings | null => {
    const saved = localStorage.getItem("telegram_settings");
    if (!saved) return null;
    
    try {
      return JSON.parse(saved) as TelegramSettings;
    } catch {
      return null;
    }
  }, []);

  const isConnected = useCallback((): boolean => {
    return !!getChatId();
  }, [getChatId]);

  const sendAlert = useCallback(
    async (alertType: "whale" | "security" | "scan", data: any): Promise<boolean> => {
      const chatId = getChatId();
      if (!chatId) {
        console.log("[TelegramAlerts] Not connected, skipping alert");
        return false;
      }

      const settings = getSettings();
      
      // Check if this alert type is enabled
      if (settings) {
        if (alertType === "whale" && !settings.whaleAlerts) return false;
        if (alertType === "security" && !settings.securityAlerts) return false;
      }

      try {
        const { data: response, error } = await supabase.functions.invoke("telegram-webhook", {
          body: {
            action: "send_alert",
            chatId,
            alertType,
            data,
          },
        });

        if (error) {
          console.error("[TelegramAlerts] Failed to send alert:", error);
          return false;
        }

        return response?.success || false;
      } catch (error) {
        console.error("[TelegramAlerts] Error sending alert:", error);
        return false;
      }
    },
    [getChatId, getSettings]
  );

  const sendWhaleAlert = useCallback(
    async (data: WhaleAlertData): Promise<boolean> => {
      return sendAlert("whale", data);
    },
    [sendAlert]
  );

  const sendSecurityAlert = useCallback(
    async (data: SecurityAlertData): Promise<boolean> => {
      return sendAlert("security", data);
    },
    [sendAlert]
  );

  const sendScanResult = useCallback(
    async (scanResult: any): Promise<boolean> => {
      return sendAlert("scan", scanResult);
    },
    [sendAlert]
  );

  return {
    isConnected,
    getChatId,
    getSettings,
    sendWhaleAlert,
    sendSecurityAlert,
    sendScanResult,
  };
}
