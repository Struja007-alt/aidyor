/**
 * @fileoverview PumpDumpBadge component for displaying pump/dump market activity
 * Alerts users to unusual price movements and potential market manipulation
 */

import { Rocket, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  PumpDumpStatus, 
  PumpDumpAnalysis,
  getPumpDumpColor,
  getPumpDumpBg,
  getPumpDumpLabel,
} from "@/lib/api/pumpDump";

/**
 * Props for the PumpDumpBadge component
 * @interface PumpDumpBadgeProps
 */
interface PumpDumpBadgeProps {
  /** Analysis data containing pump/dump detection results */
  analysis: PumpDumpAnalysis | null | undefined;
  /** Display in compact badge mode */
  compact?: boolean;
  /** Show detailed signal information */
  showDetails?: boolean;
}

/**
 * Displays pump/dump market activity alerts with price change indicators.
 * Supports both compact badge and full card display with detailed signals.
 * 
 * @component
 * @example
 * ```tsx
 * // Compact badge
 * <PumpDumpBadge analysis={pumpData} compact />
 * 
 * // Full card with details
 * <PumpDumpBadge analysis={pumpData} showDetails />
 * ```
 */

export const PumpDumpBadge = ({ 
  analysis, 
  compact = false,
  showDetails = false,
}: PumpDumpBadgeProps) => {
  if (!analysis) return null;

  const { status, confidence, signals, priceChange5m, priceChange1h, volumeChange, alert } = analysis;

  const getIcon = () => {
    switch (status) {
      case 'pump':
      case 'pump_warning':
        return <Rocket className={cn("w-3 h-3", status === 'pump' && "animate-pulse")} />;
      case 'dump':
      case 'dump_warning':
        return <TrendingDown className={cn("w-3 h-3", status === 'dump' && "animate-pulse")} />;
      default:
        return <Minus className="w-3 h-3" />;
    }
  };

  if (compact) {
    if (status === 'normal') return null;
    
    return (
      <span 
        className={cn(
          "px-1.5 py-0.5 text-[10px] rounded border flex items-center gap-0.5 font-medium",
          getPumpDumpBg(status),
          getPumpDumpColor(status)
        )}
        title={alert || getPumpDumpLabel(status)}
      >
        {getIcon()}
        {getPumpDumpLabel(status)}
      </span>
    );
  }

  // Full display
  return (
    <div className={cn(
      "rounded-lg border p-4",
      getPumpDumpBg(status)
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            status === 'pump' ? "bg-[#00ff88]/30" :
            status === 'dump' ? "bg-danger/30" :
            status === 'pump_warning' || status === 'dump_warning' ? "bg-warning/30" :
            "bg-secondary/50"
          )}>
            {status === 'pump' || status === 'pump_warning' ? (
              <Rocket className={cn("w-5 h-5", getPumpDumpColor(status))} />
            ) : status === 'dump' || status === 'dump_warning' ? (
              <TrendingDown className={cn("w-5 h-5", getPumpDumpColor(status))} />
            ) : (
              <Minus className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <h4 className={cn("font-display text-lg", getPumpDumpColor(status))}>
              {getPumpDumpLabel(status)}
            </h4>
            {confidence > 0 && (
              <p className="text-xs text-muted-foreground">
                {confidence}% confidence
              </p>
            )}
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="flex gap-3 text-right">
          <div>
            <p className="text-xs text-muted-foreground">5m</p>
            <p className={cn(
              "font-mono text-sm font-medium",
              priceChange5m >= 5 ? "text-[#00ff88]" :
              priceChange5m <= -5 ? "text-danger" :
              "text-foreground"
            )}>
              {priceChange5m >= 0 ? '+' : ''}{priceChange5m.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">1h</p>
            <p className={cn(
              "font-mono text-sm font-medium",
              priceChange1h >= 10 ? "text-[#00ff88]" :
              priceChange1h <= -10 ? "text-danger" :
              "text-foreground"
            )}>
              {priceChange1h >= 0 ? '+' : ''}{priceChange1h.toFixed(1)}%
            </p>
          </div>
          {volumeChange > 1 && (
            <div>
              <p className="text-xs text-muted-foreground">Vol</p>
              <p className={cn(
                "font-mono text-sm font-medium",
                volumeChange >= 3 ? "text-warning" : "text-foreground"
              )}>
                {volumeChange.toFixed(1)}x
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div className={cn(
          "p-3 rounded-md mb-3 flex items-center gap-2",
          status === 'pump' ? "bg-[#00ff88]/20" :
          status === 'dump' ? "bg-danger/20" :
          "bg-warning/20"
        )}>
          <AlertTriangle className={cn("w-4 h-4 flex-shrink-0", getPumpDumpColor(status))} />
          <p className={cn("text-sm font-medium", getPumpDumpColor(status))}>
            {alert}
          </p>
        </div>
      )}

      {/* Signals */}
      {showDetails && signals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Detected Signals
          </p>
          {signals.map((signal, index) => (
            <div 
              key={index}
              className={cn(
                "flex items-center justify-between p-2 rounded-md text-sm",
                signal.severity === 'high' 
                  ? signal.type === 'pump' 
                    ? "bg-[#00ff88]/10" 
                    : signal.type === 'dump' 
                      ? "bg-danger/10" 
                      : "bg-secondary/30"
                  : "bg-background/30"
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  signal.severity === 'high' 
                    ? signal.type === 'pump' 
                      ? "bg-[#00ff88]" 
                      : "bg-danger"
                    : signal.severity === 'medium'
                      ? "bg-warning"
                      : "bg-muted-foreground"
                )} />
                <span className="font-medium text-foreground">{signal.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">{signal.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
