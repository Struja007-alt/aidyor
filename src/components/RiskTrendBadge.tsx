/**
 * @fileoverview RiskTrendBadge component for displaying risk level trends
 * Shows the current risk level and whether it's improving, stable, or worsening
 */

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Risk level classifications */
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/** Trend direction for risk changes */
export type TrendDirection = "IMPROVING" | "STABLE" | "WORSENING";

/**
 * Data structure for risk trend analysis
 * @interface RiskTrendData
 */
export interface RiskTrendData {
  /** Current risk score (0-100) */
  riskScore: number;
  /** Classified risk level */
  riskLevel: RiskLevel;
  /** Confidence in the assessment (0-1) */
  confidence: number;
  /** Current trend direction */
  trend: TrendDirection;
}

/**
 * Props for the RiskTrendBadge component
 * @interface RiskTrendBadgeProps
 */
interface RiskTrendBadgeProps {
  /** Risk trend data to display */
  data: RiskTrendData;
  /** Display in compact badge mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Calculates risk trend based on market metrics
 * 
 * @param riskScore - Current risk score (0-100)
 * @param change24h - 24-hour price change percentage
 * @param volumeChange - Optional volume change percentage
 * @param liquidityChange - Optional liquidity change percentage
 * @returns Calculated risk trend data
 * 
 * @example
 * ```ts
 * const trend = calculateRiskTrend(75, -5.2, 120, 10);
 * // { riskScore: 75, riskLevel: "LOW", confidence: 0.85, trend: "STABLE" }
 * ```
 */

export function calculateRiskTrend(
  riskScore: number,
  change24h: number,
  volumeChange?: number,
  liquidityChange?: number
): RiskTrendData {
  // Calculate risk level
  let riskLevel: RiskLevel;
  if (riskScore >= 70) {
    riskLevel = "LOW";
  } else if (riskScore >= 40) {
    riskLevel = "MEDIUM";
  } else if (riskScore >= 20) {
    riskLevel = "HIGH";
  } else {
    riskLevel = "CRITICAL";
  }

  // Calculate confidence based on data availability and stability
  let confidence = 0.5; // Base confidence
  
  // More data points = higher confidence
  if (typeof volumeChange === 'number') confidence += 0.15;
  if (typeof liquidityChange === 'number') confidence += 0.15;
  
  // Stable metrics = higher confidence
  const volatility = Math.abs(change24h);
  if (volatility < 10) confidence += 0.1;
  else if (volatility > 50) confidence -= 0.1;
  
  // Extreme scores = higher confidence
  if (riskScore > 80 || riskScore < 20) confidence += 0.1;
  
  confidence = Math.min(0.99, Math.max(0.3, confidence));

  // Calculate trend direction
  let trend: TrendDirection = "STABLE";
  
  // Combine signals for trend analysis
  let trendSignal = 0;
  
  // Price change impact (negative price = potential dump = worsening)
  if (change24h < -20) trendSignal -= 2;
  else if (change24h < -10) trendSignal -= 1;
  else if (change24h > 50) trendSignal -= 1; // Pump can be risky too
  else if (change24h > 10 && change24h <= 30) trendSignal += 1;
  
  // Volume change impact
  if (typeof volumeChange === 'number') {
    if (volumeChange < -50) trendSignal -= 1; // Declining interest
    else if (volumeChange > 100) trendSignal += 1; // Growing interest
  }
  
  // Liquidity change impact
  if (typeof liquidityChange === 'number') {
    if (liquidityChange < -20) trendSignal -= 2; // Rug risk
    else if (liquidityChange > 20) trendSignal += 1; // Improving safety
  }

  if (trendSignal >= 2) trend = "IMPROVING";
  else if (trendSignal <= -2) trend = "WORSENING";

  return {
    riskScore,
    riskLevel,
    confidence: Math.round(confidence * 100) / 100,
    trend,
  };
}

export function RiskTrendBadge({ data, compact = false, className }: RiskTrendBadgeProps) {
  const { riskLevel, confidence, trend } = data;

  const levelStyles = useMemo(() => {
    switch (riskLevel) {
      case "LOW":
        return {
          bg: "bg-safe/20",
          text: "text-safe",
          border: "border-safe/40",
          glow: "shadow-safe/20",
        };
      case "MEDIUM":
        return {
          bg: "bg-warning/20",
          text: "text-warning",
          border: "border-warning/40",
          glow: "shadow-warning/20",
        };
      case "HIGH":
        return {
          bg: "bg-danger/20",
          text: "text-danger",
          border: "border-danger/40",
          glow: "shadow-danger/20",
        };
      case "CRITICAL":
        return {
          bg: "bg-danger/30",
          text: "text-danger",
          border: "border-danger/60",
          glow: "shadow-danger/30",
        };
    }
  }, [riskLevel]);

  const trendIcon = useMemo(() => {
    switch (trend) {
      case "IMPROVING":
        return <TrendingUp className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />;
      case "WORSENING":
        return <TrendingDown className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />;
      case "STABLE":
        return <Minus className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />;
    }
  }, [trend, compact]);

  const trendColor = useMemo(() => {
    switch (trend) {
      case "IMPROVING":
        return "text-safe";
      case "WORSENING":
        return "text-danger";
      case "STABLE":
        return "text-muted-foreground";
    }
  }, [trend]);

  const confidenceLabel = useMemo(() => {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Medium";
    return "Low";
  }, [confidence]);

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border",
                levelStyles.bg,
                levelStyles.text,
                levelStyles.border,
                className
              )}
            >
              <Activity className="w-2.5 h-2.5" />
              {riskLevel}
              <span className={trendColor}>{trendIcon}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Risk Level:</span>
                <span className={levelStyles.text}>{riskLevel}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Trend:</span>
                <span className={cn("flex items-center gap-1", trendColor)}>
                  {trendIcon}
                  {trend}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Confidence:</span>
                <span>{Math.round(confidence * 100)}% ({confidenceLabel})</span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-2",
        levelStyles.bg,
        levelStyles.border,
        "shadow-lg",
        levelStyles.glow,
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className={cn("w-4 h-4", levelStyles.text)} />
          <span className={cn("text-sm font-semibold", levelStyles.text)}>
            {riskLevel} RISK
          </span>
        </div>
        <div className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
          {trendIcon}
          {trend}
        </div>
      </div>

      {/* Confidence bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Confidence</span>
          <span className="font-medium">{Math.round(confidence * 100)}%</span>
        </div>
        <div className="h-1.5 bg-background/50 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              confidence >= 0.8 ? "bg-safe" : confidence >= 0.6 ? "bg-warning" : "bg-muted-foreground"
            )}
            style={{ width: `${confidence * 100}%` }}
          />
        </div>
      </div>

      {/* Quick insights */}
      <p className="text-[10px] text-muted-foreground">
        {trend === "IMPROVING" && "Positive signals detected in recent activity."}
        {trend === "WORSENING" && "Negative patterns emerging. Monitor closely."}
        {trend === "STABLE" && "No significant changes in risk profile."}
      </p>
    </div>
  );
}
