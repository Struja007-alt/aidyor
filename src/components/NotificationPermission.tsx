/**
 * @fileoverview NotificationPermission component for push notification management
 * Handles browser notification permission requests and status display
 */

import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bell, BellOff, BellRing, Check, X } from "lucide-react";

/**
 * Props for the NotificationPermission component
 * @interface NotificationPermissionProps
 */
interface NotificationPermissionProps {
  /** Display in compact mode (button only) vs full card view */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Manages browser push notification permissions with visual feedback.
 * Displays current permission state and provides enable/status UI.
 * 
 * @component
 * @example
 * ```tsx
 * // Compact button mode
 * <NotificationPermission compact />
 * 
 * // Full card mode
 * <NotificationPermission />
 * ```
 * 
 * @returns The notification permission UI or null if not supported
 */

export function NotificationPermission({ compact = false, className = "" }: NotificationPermissionProps) {
  const { permission, isSupported, isEnabled, isDenied, requestPermission } = useNotifications();

  if (!isSupported) {
    return null;
  }

  if (compact) {
    if (isEnabled) {
      return (
        <div className={`flex items-center gap-2 text-xs text-green-400 ${className}`}>
          <BellRing className="w-3.5 h-3.5" />
          <span>Notifications enabled</span>
        </div>
      );
    }

    if (isDenied) {
      return (
        <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
          <BellOff className="w-3.5 h-3.5" />
          <span>Notifications blocked</span>
        </div>
      );
    }

    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={requestPermission}
        className={`text-xs gap-1.5 h-7 ${className}`}
      >
        <Bell className="w-3.5 h-3.5" />
        Enable Alerts
      </Button>
    );
  }

  // Full card view
  if (isEnabled) {
    return (
      <Card className={`glass-card p-4 border-green-500/30 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/20">
            <Check className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="font-medium text-foreground">Push Notifications Enabled</p>
            <p className="text-xs text-muted-foreground">
              You'll receive alerts for whale activity on your watchlist tokens
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (isDenied) {
    return (
      <Card className={`glass-card p-4 border-destructive/30 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/20">
            <X className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="font-medium text-foreground">Notifications Blocked</p>
            <p className="text-xs text-muted-foreground">
              Enable notifications in your browser settings to receive whale alerts
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`glass-card p-4 ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">Enable Push Notifications</p>
            <p className="text-xs text-muted-foreground">
              Get instant alerts when whales trade your watchlist tokens
            </p>
          </div>
        </div>
        <Button onClick={requestPermission} size="sm">
          Enable
        </Button>
      </div>
    </Card>
  );
}
