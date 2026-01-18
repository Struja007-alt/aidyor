/**
 * @fileoverview StructuredSecurityDisplay component for JSON security data visualization
 * Displays parsed structured security data from user-provided JSON input
 */

import { memo, useMemo } from "react";
import { 
  ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle, XCircle, 
  Lock, Unlock, Users, Coins, PauseCircle, Eye, FileCode, Percent
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RiskFactorTooltip } from "./RiskFactorTooltip";
import type { ParsedSecurityResult } from "@/lib/api/structuredSecurityParser";

/**
 * Props for the StructuredSecurityDisplay component
 * @interface StructuredSecurityDisplayProps
 */
interface StructuredSecurityDisplayProps {
  /** Parsed security result from JSON input */
  result: ParsedSecurityResult;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays structured security analysis from parsed JSON data.
 * Shows key security metrics, risk factors, and warnings in a grid layout.
 * 
 * @component
 * @example
 * ```tsx
 * <StructuredSecurityDisplay result={parsedResult} />
 * ```
 */

export const StructuredSecurityDisplay = memo(function StructuredSecurityDisplay({
  result,
  className
}: StructuredSecurityDisplayProps) {
  const { score, factors, securityData, criticalIssues, warnings } = result;

  // Determine risk level styling
  const riskLevel = useMemo(() => {
    if (score >= 70) return { label: "LOW RISK", color: "safe", bgClass: "bg-safe/20", textClass: "text-safe", borderClass: "border-safe/30" };
    if (score >= 50) return { label: "MEDIUM RISK", color: "warning", bgClass: "bg-warning/20", textClass: "text-warning", borderClass: "border-warning/30" };
    if (score >= 30) return { label: "HIGH RISK", color: "danger", bgClass: "bg-danger/20", textClass: "text-danger", borderClass: "border-danger/30" };
    return { label: "CRITICAL", color: "danger", bgClass: "bg-danger/30", textClass: "text-danger", borderClass: "border-danger/50" };
  }, [score]);

  const dangerFactors = factors.filter(f => f.status === "danger");
  const warningFactors = factors.filter(f => f.status === "warning");
  const safeFactors = factors.filter(f => f.status === "safe");

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with Score */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border/50">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center font-display text-xl font-bold border-2",
            riskLevel.bgClass,
            riskLevel.textClass,
            riskLevel.borderClass
          )}>
            {score}
          </div>
          <div>
            <p className={cn("font-display font-medium", riskLevel.textClass)}>
              {riskLevel.label}
            </p>
            <p className="text-xs text-muted-foreground">Structured Security Analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <FileCode className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">JSON Data</span>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Ownership Status */}
        <div className={cn(
          "p-3 rounded-lg border",
          securityData.ownerRenounced 
            ? "bg-safe/5 border-safe/20" 
            : "bg-warning/5 border-warning/20"
        )}>
          <div className="flex items-center gap-2 mb-1">
            {securityData.ownerRenounced ? (
              <ShieldCheck className="w-4 h-4 text-safe" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-warning" />
            )}
            <span className="text-xs text-muted-foreground">Ownership</span>
          </div>
          <p className={cn(
            "text-sm font-medium",
            securityData.ownerRenounced ? "text-safe" : "text-warning"
          )}>
            {securityData.ownerRenounced ? "Renounced" : "Not Renounced"}
          </p>
        </div>

        {/* Mint Function */}
        <div className={cn(
          "p-3 rounded-lg border",
          securityData.isMintable 
            ? "bg-danger/5 border-danger/20" 
            : "bg-safe/5 border-safe/20"
        )}>
          <div className="flex items-center gap-2 mb-1">
            <Coins className={cn(
              "w-4 h-4",
              securityData.isMintable ? "text-danger" : "text-safe"
            )} />
            <span className="text-xs text-muted-foreground">Mint Function</span>
          </div>
          <p className={cn(
            "text-sm font-medium",
            securityData.isMintable ? "text-danger" : "text-safe"
          )}>
            {securityData.isMintable ? "Enabled" : "Disabled"}
          </p>
        </div>

        {/* LP Lock Status */}
        <div className={cn(
          "p-3 rounded-lg border",
          securityData.lpLocked 
            ? "bg-safe/5 border-safe/20" 
            : "bg-danger/5 border-danger/20"
        )}>
          <div className="flex items-center gap-2 mb-1">
            {securityData.lpLocked ? (
              <Lock className="w-4 h-4 text-safe" />
            ) : (
              <Unlock className="w-4 h-4 text-danger" />
            )}
            <span className="text-xs text-muted-foreground">Liquidity Lock</span>
          </div>
          <p className={cn(
            "text-sm font-medium",
            securityData.lpLocked ? "text-safe" : "text-danger"
          )}>
            {securityData.lpLocked 
              ? `Locked (${securityData.lpLockDays}d)` 
              : "Not Locked"}
          </p>
        </div>

        {/* Holder Concentration */}
        <div className={cn(
          "p-3 rounded-lg border",
          securityData.holderConcentration >= 60 
            ? "bg-danger/5 border-danger/20" 
            : securityData.holderConcentration >= 40
              ? "bg-warning/5 border-warning/20"
              : "bg-safe/5 border-safe/20"
        )}>
          <div className="flex items-center gap-2 mb-1">
            <Users className={cn(
              "w-4 h-4",
              securityData.holderConcentration >= 60 
                ? "text-danger" 
                : securityData.holderConcentration >= 40
                  ? "text-warning"
                  : "text-safe"
            )} />
            <span className="text-xs text-muted-foreground">Top 10 Holders</span>
          </div>
          <p className={cn(
            "text-sm font-medium",
            securityData.holderConcentration >= 60 
              ? "text-danger" 
              : securityData.holderConcentration >= 40
                ? "text-warning"
                : "text-safe"
          )}>
            {securityData.holderConcentration}%
          </p>
        </div>

        {/* Blacklist */}
        <div className={cn(
          "p-3 rounded-lg border",
          securityData.hasBlacklist 
            ? "bg-warning/5 border-warning/20" 
            : "bg-safe/5 border-safe/20"
        )}>
          <div className="flex items-center gap-2 mb-1">
            <Eye className={cn(
              "w-4 h-4",
              securityData.hasBlacklist ? "text-warning" : "text-safe"
            )} />
            <span className="text-xs text-muted-foreground">Blacklist</span>
          </div>
          <p className={cn(
            "text-sm font-medium",
            securityData.hasBlacklist ? "text-warning" : "text-safe"
          )}>
            {securityData.hasBlacklist ? "Has Function" : "None"}
          </p>
        </div>

        {/* Taxes (if any) */}
        {(securityData.buyTax > 0 || securityData.sellTax > 0) && (
          <div className={cn(
            "p-3 rounded-lg border",
            Math.max(securityData.buyTax, securityData.sellTax) > 10 
              ? "bg-danger/5 border-danger/20" 
              : Math.max(securityData.buyTax, securityData.sellTax) > 5
                ? "bg-warning/5 border-warning/20"
                : "bg-safe/5 border-safe/20"
          )}>
            <div className="flex items-center gap-2 mb-1">
              <Percent className={cn(
                "w-4 h-4",
                Math.max(securityData.buyTax, securityData.sellTax) > 10 
                  ? "text-danger" 
                  : Math.max(securityData.buyTax, securityData.sellTax) > 5
                    ? "text-warning"
                    : "text-safe"
              )} />
              <span className="text-xs text-muted-foreground">Taxes</span>
            </div>
            <p className={cn(
              "text-sm font-medium",
              Math.max(securityData.buyTax, securityData.sellTax) > 10 
                ? "text-danger" 
                : Math.max(securityData.buyTax, securityData.sellTax) > 5
                  ? "text-warning"
                  : "text-safe"
            )}>
              {securityData.buyTax}% / {securityData.sellTax}%
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

      {/* All Risk Factors */}
      <div className="space-y-3">
        {/* Danger Factors */}
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
                  <RiskFactorTooltip
                    factorName={factor.name}
                    status={factor.status}
                    description={factor.description}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warning Factors */}
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
                  <RiskFactorTooltip
                    factorName={factor.name}
                    status={factor.status}
                    description={factor.description}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Safe Factors */}
        {safeFactors.length > 0 && (
          <div className="p-3 rounded-lg bg-safe/5 border border-safe/20">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-safe" />
              <h5 className="text-sm font-medium text-safe">Positive Indicators</h5>
            </div>
            <div className="space-y-1.5">
              {safeFactors.slice(0, 5).map((factor, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <CheckCircle className="w-3.5 h-3.5 text-safe shrink-0 mt-0.5" />
                  <span className="text-safe">{factor.name}: {factor.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
