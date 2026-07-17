/**
 * @fileoverview MergedSecurityDisplay component for combined security analysis
 * Displays merged results from JSON input and live API data with discrepancy detection
 */

import { memo, useMemo } from "react";
import { 
  ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle, XCircle, 
  Lock, Unlock, Users, Coins, Eye, Percent, AlertCircle, 
  GitMerge, TrendingUp, TrendingDown, DollarSign, BarChart3, Droplets
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RiskFactorTooltip } from "./RiskFactorTooltip";
import type { MergedSecurityResult } from "@/lib/api/mergeSecurityData";
import { Badge } from "@/components/ui/badge";
import { TrezorAffiliateCard } from "./TrezorAffiliateCard";

/**
 * Props for the MergedSecurityDisplay component
 * @interface MergedSecurityDisplayProps
 */
interface MergedSecurityDisplayProps {
  /** Merged security result combining JSON and API data */
  result: MergedSecurityResult;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays comprehensive merged security analysis from JSON and live API data.
 * Shows score comparison, data discrepancies, market data, and unified risk factors.
 * 
 * @component
 * @example
 * ```tsx
 * <MergedSecurityDisplay result={mergedResult} />
 * ```
 */

export const MergedSecurityDisplay = memo(function MergedSecurityDisplay({
  result,
  className
}: MergedSecurityDisplayProps) {
  const { 
    mergedScore, confidenceLevel, jsonScore, apiScore,
    securityData, marketData, factors, 
    criticalIssues, warnings, discrepancies, sources 
  } = result;

  // Determine risk level styling
  const riskLevel = useMemo(() => {
    if (mergedScore >= 70) return { label: "LOW RISK", bgClass: "bg-safe/20", textClass: "text-safe", borderClass: "border-safe/30" };
    if (mergedScore >= 50) return { label: "MEDIUM RISK", bgClass: "bg-warning/20", textClass: "text-warning", borderClass: "border-warning/30" };
    if (mergedScore >= 30) return { label: "HIGH RISK", bgClass: "bg-danger/20", textClass: "text-danger", borderClass: "border-danger/30" };
    return { label: "CRITICAL", bgClass: "bg-danger/30", textClass: "text-danger", borderClass: "border-danger/50" };
  }, [mergedScore]);

  const confidenceStyle = useMemo(() => {
    if (confidenceLevel === "high") return { bgClass: "bg-safe/10", textClass: "text-safe", label: "High Confidence" };
    if (confidenceLevel === "medium") return { bgClass: "bg-warning/10", textClass: "text-warning", label: "Medium Confidence" };
    return { bgClass: "bg-danger/10", textClass: "text-danger", label: "Low Confidence" };
  }, [confidenceLevel]);

  const dangerFactors = factors.filter(f => f.status === "danger");
  const warningFactors = factors.filter(f => f.status === "warning");
  const safeFactors = factors.filter(f => f.status === "safe");

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with Merged Score */}
      <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center font-display text-2xl font-bold border-2",
              riskLevel.bgClass,
              riskLevel.textClass,
              riskLevel.borderClass
            )}>
              {mergedScore}
            </div>
            <div>
              <p className={cn("font-display font-semibold text-lg", riskLevel.textClass)}>
                {riskLevel.label}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <GitMerge className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Merged Analysis</span>
              </div>
            </div>
          </div>
          <Badge variant="outline" className={cn("text-xs", confidenceStyle.bgClass, confidenceStyle.textClass)}>
            {confidenceStyle.label}
          </Badge>
        </div>

        {/* Score Comparison */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/30">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-primary/60"></div>
            <span className="text-muted-foreground">JSON Score:</span>
            <span className="font-medium">{jsonScore}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-accent"></div>
            <span className="text-muted-foreground">API Score:</span>
            <span className="font-medium">{apiScore}</span>
          </div>
        </div>

        {/* Data Sources */}
        <div className="flex flex-wrap gap-1 mt-3">
          {sources.map((source, i) => (
            <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
              {source}
            </Badge>
          ))}
        </div>
      </div>

      {/* Market Data (if available) */}
      {marketData && (
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Price</span>
            </div>
            <p className="text-sm font-medium">
              ${marketData.price < 0.001 ? marketData.price.toExponential(4) : marketData.price.toFixed(6)}
            </p>
            <p className={cn(
              "text-xs flex items-center gap-1",
              marketData.change24h >= 0 ? "text-safe" : "text-danger"
            )}>
              {marketData.change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {marketData.change24h.toFixed(2)}%
            </p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Volume 24h</span>
            </div>
            <p className="text-sm font-medium">{formatNumber(marketData.volume24h)}</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
            <div className="flex items-center gap-2 mb-1">
              <Droplets className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Liquidity</span>
            </div>
            <p className="text-sm font-medium">{formatNumber(marketData.liquidity)}</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Market Cap</span>
            </div>
            <p className="text-sm font-medium">{formatNumber(marketData.marketCap)}</p>
          </div>
        </div>
      )}

      {/* Data Discrepancies Alert */}
      {discrepancies.length > 0 && (
        <div className={cn(
          "p-3 rounded-lg border",
          discrepancies.some(d => d.severity === "critical") 
            ? "bg-danger/5 border-danger/30" 
            : "bg-warning/5 border-warning/30"
        )}>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className={cn(
              "w-4 h-4",
              discrepancies.some(d => d.severity === "critical") ? "text-danger" : "text-warning"
            )} />
            <h5 className={cn(
              "text-sm font-medium",
              discrepancies.some(d => d.severity === "critical") ? "text-danger" : "text-warning"
            )}>
              Data Discrepancies Detected
            </h5>
          </div>
          <div className="space-y-1.5">
            {discrepancies.map((d, i) => (
              <div key={i} className="flex items-start gap-2 text-xs bg-background/50 rounded p-2">
                <AlertTriangle className={cn(
                  "w-3.5 h-3.5 shrink-0 mt-0.5",
                  d.severity === "critical" ? "text-danger" : d.severity === "warning" ? "text-warning" : "text-muted-foreground"
                )} />
                <div className="flex-1">
                  <span className="font-medium">{d.field}:</span>
                  <div className="flex gap-2 mt-0.5">
                    <span className="text-muted-foreground">JSON: <span className="text-foreground">{String(d.jsonValue)}</span></span>
                    <span className="text-muted-foreground">API: <span className="text-foreground">{String(d.apiValue)}</span></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Security Metrics */}
      <div className="grid grid-cols-2 gap-2">
        {/* Ownership Status */}
        <div className={cn(
          "p-3 rounded-lg border",
          securityData.ownerRenounced ? "bg-safe/5 border-safe/20" : "bg-warning/5 border-warning/20"
        )}>
          <div className="flex items-center gap-2 mb-1">
            {securityData.ownerRenounced ? (
              <ShieldCheck className="w-4 h-4 text-safe" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-warning" />
            )}
            <span className="text-xs text-muted-foreground">Ownership</span>
          </div>
          <p className={cn("text-sm font-medium", securityData.ownerRenounced ? "text-safe" : "text-warning")}>
            {securityData.ownerRenounced ? "Renounced" : "Active"}
          </p>
        </div>

        {/* Mint Function */}
        <div className={cn(
          "p-3 rounded-lg border",
          securityData.isMintable ? "bg-danger/5 border-danger/20" : "bg-safe/5 border-safe/20"
        )}>
          <div className="flex items-center gap-2 mb-1">
            <Coins className={cn("w-4 h-4", securityData.isMintable ? "text-danger" : "text-safe")} />
            <span className="text-xs text-muted-foreground">Mint Function</span>
          </div>
          <p className={cn("text-sm font-medium", securityData.isMintable ? "text-danger" : "text-safe")}>
            {securityData.isMintable ? "Enabled" : "Disabled"}
          </p>
        </div>

        {/* LP Lock Status */}
        <div className={cn(
          "p-3 rounded-lg border",
          securityData.lpLocked ? "bg-safe/5 border-safe/20" : "bg-danger/5 border-danger/20"
        )}>
          <div className="flex items-center gap-2 mb-1">
            {securityData.lpLocked ? <Lock className="w-4 h-4 text-safe" /> : <Unlock className="w-4 h-4 text-danger" />}
            <span className="text-xs text-muted-foreground">LP Lock</span>
          </div>
          <p className={cn("text-sm font-medium", securityData.lpLocked ? "text-safe" : "text-danger")}>
            {securityData.lpLocked ? `${securityData.lpLockDays}d` : "Not Locked"}
          </p>
        </div>

        {/* Holder Concentration */}
        <div className={cn(
          "p-3 rounded-lg border",
          securityData.holderConcentration >= 60 
            ? "bg-danger/5 border-danger/20" 
            : securityData.holderConcentration >= 40 ? "bg-warning/5 border-warning/20" : "bg-safe/5 border-safe/20"
        )}>
          <div className="flex items-center gap-2 mb-1">
            <Users className={cn(
              "w-4 h-4",
              securityData.holderConcentration >= 60 ? "text-danger" : securityData.holderConcentration >= 40 ? "text-warning" : "text-safe"
            )} />
            <span className="text-xs text-muted-foreground">Top 10</span>
          </div>
          <p className={cn(
            "text-sm font-medium",
            securityData.holderConcentration >= 60 ? "text-danger" : securityData.holderConcentration >= 40 ? "text-warning" : "text-safe"
          )}>
            {securityData.holderConcentration}%
          </p>
        </div>

        {/* Holder Count */}
        {securityData.holderCount > 0 && (
          <div className="p-3 rounded-lg border bg-secondary/30 border-border/30">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Holders</span>
            </div>
            <p className="text-sm font-medium">{securityData.holderCount.toLocaleString()}</p>
          </div>
        )}

        {/* Taxes */}
        {(securityData.buyTax > 0 || securityData.sellTax > 0) && (
          <div className={cn(
            "p-3 rounded-lg border",
            Math.max(securityData.buyTax, securityData.sellTax) > 10 
              ? "bg-danger/5 border-danger/20" 
              : Math.max(securityData.buyTax, securityData.sellTax) > 5 ? "bg-warning/5 border-warning/20" : "bg-safe/5 border-safe/20"
          )}>
            <div className="flex items-center gap-2 mb-1">
              <Percent className={cn(
                "w-4 h-4",
                Math.max(securityData.buyTax, securityData.sellTax) > 10 
                  ? "text-danger" 
                  : Math.max(securityData.buyTax, securityData.sellTax) > 5 ? "text-warning" : "text-safe"
              )} />
              <span className="text-xs text-muted-foreground">Tax B/S</span>
            </div>
            <p className={cn(
              "text-sm font-medium",
              Math.max(securityData.buyTax, securityData.sellTax) > 10 
                ? "text-danger" 
                : Math.max(securityData.buyTax, securityData.sellTax) > 5 ? "text-warning" : "text-safe"
            )}>
              {securityData.buyTax.toFixed(1)}% / {securityData.sellTax.toFixed(1)}%
            </p>
          </div>
        )}
      </div>

      {/* Critical Issues */}
      {criticalIssues.length > 0 && (
        <div className="p-3 rounded-lg bg-danger/5 border border-danger/20">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-danger" />
            <h5 className="text-sm font-medium text-danger">Critical Issues</h5>
          </div>
          <div className="space-y-1.5">
            {criticalIssues.map((issue, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <XCircle className="w-3.5 h-3.5 text-danger shrink-0 mt-0.5" />
                <span className="text-danger">{issue}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <h5 className="text-sm font-medium text-warning">Warnings</h5>
          </div>
          <div className="space-y-1.5">
            {warnings.map((warning, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                <span className="text-warning">{warning}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Factors by Status */}
      <div className="space-y-3">
        {dangerFactors.length > 0 && (
          <div className="p-3 rounded-lg bg-danger/5 border border-danger/20">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-4 h-4 text-danger" />
              <h5 className="text-sm font-medium text-danger">Risk Factors</h5>
              <span className="text-[10px] text-muted-foreground ml-auto">Tap for details</span>
            </div>
            <div className="space-y-2">
              {dangerFactors.map((factor, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <XCircle className="w-3.5 h-3.5 text-danger shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <RiskFactorTooltip factorName={factor.name} status={factor.status} description={factor.description} />
                    {factor.source && (
                      <Badge variant="outline" className="ml-1.5 text-[9px] px-1 py-0">{factor.source}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {warningFactors.length > 0 && (
          <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <h5 className="text-sm font-medium text-warning">Caution</h5>
            </div>
            <div className="space-y-2">
              {warningFactors.map((factor, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <RiskFactorTooltip factorName={factor.name} status={factor.status} description={factor.description} />
                    {factor.source && (
                      <Badge variant="outline" className="ml-1.5 text-[9px] px-1 py-0">{factor.source}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {safeFactors.length > 0 && (
          <div className="p-3 rounded-lg bg-safe/5 border border-safe/20">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-safe" />
              <h5 className="text-sm font-medium text-safe">Positive Indicators</h5>
            </div>
            <div className="space-y-1.5">
              {safeFactors.slice(0, 6).map((factor, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <CheckCircle className="w-3.5 h-3.5 text-safe shrink-0 mt-0.5" />
                  <span className="text-safe">{factor.name}</span>
                  {factor.source && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0">{factor.source}</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <TrezorAffiliateCard mergedScore={mergedScore} />
    </div>
  );
});