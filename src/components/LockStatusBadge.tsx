/**
 * @fileoverview LockStatusBadge component for displaying liquidity lock status
 * Shows whether token liquidity is locked and when it unlocks
 */

import { useState, useEffect } from "react";
import { Lock, Unlock, Clock, Timer, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LockInfo } from "@/lib/api/unicrypt";

/**
 * Props for the LockStatusBadge component
 * @interface LockStatusBadgeProps
 */
interface LockStatusBadgeProps {
  /** Liquidity lock information from Unicrypt/Team Finance APIs */
  lockInfo: LockInfo | null | undefined;
  /** Display in compact mode (badge only) vs full card view */
  compact?: boolean;
}

/**
 * Displays the liquidity lock status of a token with countdown timer.
 * Shows lock percentage, unlock date, and platform information.
 * Supports both compact badge and full card display modes.
 * 
 * @component
 * @example
 * ```tsx
 * // Compact badge
 * <LockStatusBadge lockInfo={lockData} compact />
 * 
 * // Full card view
 * <LockStatusBadge lockInfo={lockData} />
 * ```
 */

export const LockStatusBadge = ({ lockInfo, compact = false }: LockStatusBadgeProps) => {
  const [countdown, setCountdown] = useState<string>("");

  // Update countdown timer every minute
  useEffect(() => {
    if (!lockInfo?.unlockDate) return;

    const updateCountdown = () => {
      const now = Date.now();
      const diff = lockInfo.unlockDate! - now;

      if (diff <= 0) {
        setCountdown("Expired");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 365) {
        const years = Math.floor(days / 365);
        const remainingMonths = Math.floor((days % 365) / 30);
        setCountdown(`${years}y ${remainingMonths}mo`);
      } else if (days > 30) {
        const months = Math.floor(days / 30);
        const remainingDays = days % 30;
        setCountdown(`${months}mo ${remainingDays}d`);
      } else if (days > 0) {
        setCountdown(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m`);
      } else {
        setCountdown(`${minutes}m`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [lockInfo?.unlockDate]);

  if (!lockInfo) {
    return compact ? (
      <span 
        className="px-1.5 py-0.5 text-[10px] rounded bg-muted/50 text-muted-foreground border border-border/50 flex items-center gap-0.5"
        title="Lock status unknown"
      >
        <Lock className="w-2.5 h-2.5" />
        ?
      </span>
    ) : null;
  }

  const isExpired = lockInfo.unlockDate && lockInfo.unlockDate < Date.now();
  const isUnlockingSoon = lockInfo.unlockDate && 
    (lockInfo.unlockDate - Date.now()) < (30 * 24 * 60 * 60 * 1000); // 30 days

  if (compact) {
    if (!lockInfo.isLocked) {
      return (
        <span 
          className="px-1.5 py-0.5 text-[10px] rounded bg-danger/30 text-danger border border-danger/50 flex items-center gap-0.5"
          title="No liquidity lock detected - High risk!"
        >
          <Unlock className="w-2.5 h-2.5" />
          UNLOCKED
        </span>
      );
    }

    if (isExpired) {
      return (
        <span 
          className="px-1.5 py-0.5 text-[10px] rounded bg-danger/30 text-danger border border-danger/50 flex items-center gap-0.5"
          title="Lock has expired!"
        >
          <Timer className="w-2.5 h-2.5" />
          EXPIRED
        </span>
      );
    }

    if (isUnlockingSoon) {
      return (
        <span 
          className="px-1.5 py-0.5 text-[10px] rounded bg-warning/30 text-warning border border-warning/50 flex items-center gap-0.5"
          title={`Unlocks in ${countdown} via ${lockInfo.lockerPlatform}`}
        >
          <Clock className="w-2.5 h-2.5 animate-pulse" />
          {countdown}
        </span>
      );
    }

    return (
      <span 
        className="px-1.5 py-0.5 text-[10px] rounded bg-safe/20 text-safe border border-safe/40 flex items-center gap-0.5"
        title={`${lockInfo.lockPercentage.toFixed(0)}% locked via ${lockInfo.lockerPlatform}`}
      >
        <Lock className="w-2.5 h-2.5" />
        {lockInfo.lockPercentage.toFixed(0)}%
      </span>
    );
  }

  // Full display (non-compact)
  return (
    <div className={cn(
      "rounded-lg border p-4",
      !lockInfo.isLocked 
        ? "bg-danger/10 border-danger/30" 
        : isExpired
          ? "bg-danger/10 border-danger/30"
          : isUnlockingSoon
            ? "bg-warning/10 border-warning/30"
            : "bg-safe/10 border-safe/30"
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {!lockInfo.isLocked || isExpired ? (
            <div className="w-8 h-8 rounded-full bg-danger/20 flex items-center justify-center">
              <Unlock className="w-4 h-4 text-danger" />
            </div>
          ) : isUnlockingSoon ? (
            <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-warning animate-pulse" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-safe/20 flex items-center justify-center">
              <Lock className="w-4 h-4 text-safe" />
            </div>
          )}
          <div>
            <h4 className="font-medium text-foreground text-sm">Liquidity Lock</h4>
            <p className="text-xs text-muted-foreground">
              {lockInfo.lockerPlatform}
            </p>
          </div>
        </div>
        
        {lockInfo.isLocked && (
          <div className={cn(
            "text-right",
            isExpired ? "text-danger" : isUnlockingSoon ? "text-warning" : "text-safe"
          )}>
            <div className="font-display text-2xl">
              {lockInfo.lockPercentage.toFixed(0)}%
            </div>
            <div className="text-xs opacity-80">locked</div>
          </div>
        )}
      </div>

      {lockInfo.isLocked && lockInfo.unlockDate && (
        <div className={cn(
          "flex items-center justify-between p-2 rounded-md",
          isExpired 
            ? "bg-danger/20" 
            : isUnlockingSoon 
              ? "bg-warning/20" 
              : "bg-background/50"
        )}>
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {isExpired ? "Expired" : "Unlocks in"}
            </span>
          </div>
          <div className={cn(
            "font-mono text-sm font-medium",
            isExpired 
              ? "text-danger" 
              : isUnlockingSoon 
                ? "text-warning" 
                : "text-foreground"
          )}>
            {isExpired ? (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                Lock Expired
              </span>
            ) : (
              countdown || lockInfo.lockDuration
            )}
          </div>
        </div>
      )}

      {!lockInfo.isLocked && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-danger/20">
          <Shield className="w-4 h-4 text-danger" />
          <span className="text-xs text-danger font-medium">
            No liquidity lock detected - Developer can remove liquidity anytime!
          </span>
        </div>
      )}
    </div>
  );
};
