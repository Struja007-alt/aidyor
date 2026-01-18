import { useState, useEffect, useCallback } from "react";

type NotificationPermission = "default" | "granted" | "denied";

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if ("Notification" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn("Notifications not supported in this browser");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [isSupported]);

  const sendNotification = useCallback(
    (options: NotificationOptions): Notification | null => {
      if (!isSupported || permission !== "granted") {
        console.warn("Cannot send notification: permission not granted");
        return null;
      }

      try {
        const notification = new Notification(options.title, {
          body: options.body,
          icon: options.icon || "/icon-512.png",
          tag: options.tag,
          data: options.data,
          badge: "/icon-512.png",
          requireInteraction: false,
        });

        // Auto-close after 10 seconds
        setTimeout(() => {
          notification.close();
        }, 10000);

        return notification;
      } catch (error) {
        console.error("Error sending notification:", error);
        return null;
      }
    },
    [isSupported, permission]
  );

  const sendWhaleAlert = useCallback(
    (tokenSymbol: string, tokenName: string, amount: string, type: "buy" | "sell", network: string) => {
      const emoji = type === "buy" ? "🐋📈" : "🐋📉";
      const action = type === "buy" ? "BUY" : "SELL";
      
      return sendNotification({
        title: `${emoji} Whale ${action} Alert!`,
        body: `${tokenSymbol} (${network}): ${amount} ${action} detected on ${tokenName}`,
        tag: `whale-${tokenSymbol}-${Date.now()}`,
        data: { type: "whale-alert", tokenSymbol, tokenName, amount, action, network },
      });
    },
    [sendNotification]
  );

  return {
    permission,
    isSupported,
    isEnabled: permission === "granted",
    isDenied: permission === "denied",
    requestPermission,
    sendNotification,
    sendWhaleAlert,
  };
}
