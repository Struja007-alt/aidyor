// Merge Structured JSON Security Data with Live API Results
// Combines user-provided JSON analysis with real-time API data for comprehensive assessment

import type { ParsedSecurityResult } from "./structuredSecurityParser";

export interface LiveSecurityData {
  isHoneypot: boolean;
  isVerified: boolean;
  holderCount: number;
  buyTax: number;
  sellTax: number;
  isMintable: boolean;
  hasHiddenOwner: boolean;
  hasFreezeAuthority?: boolean;
}

export interface LiveMarketData {
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  liquidity: number;
}

export interface RiskFactor {
  name: string;
  status: "safe" | "warning" | "danger";
  description: string;
  source?: "json" | "api" | "merged";
}

export interface MergedSecurityResult {
  // Overall merged score
  mergedScore: number;
  confidenceLevel: "high" | "medium" | "low";
  
  // Individual scores
  jsonScore: number;
  apiScore: number;
  
  // Merged security data (API takes precedence for real-time data, JSON for static analysis)
  securityData: {
    isHoneypot: boolean;
    isVerified: boolean;
    holderCount: number;
    buyTax: number;
    sellTax: number;
    isMintable: boolean;
    hasHiddenOwner: boolean;
    hasFreezeAuthority: boolean;
    ownerRenounced: boolean;
    lpLocked: boolean;
    lpLockDays: number;
    holderConcentration: number;
    hasBlacklist: boolean;
  };
  
  // Market data (from live API)
  marketData?: LiveMarketData;
  
  // All factors from both sources, deduplicated
  factors: RiskFactor[];
  
  // Issues and warnings
  criticalIssues: string[];
  warnings: string[];
  
  // Discrepancies between sources
  discrepancies: {
    field: string;
    jsonValue: unknown;
    apiValue: unknown;
    severity: "info" | "warning" | "critical";
  }[];
  
  // Data sources used
  sources: string[];
}

/**
 * Merge JSON security data with live API results
 * Provides comprehensive analysis combining both data sources
 */
export function mergeSecurityData(
  jsonResult: ParsedSecurityResult,
  liveSecurityData: LiveSecurityData | undefined,
  liveRiskFactors: RiskFactor[],
  liveScore: number,
  marketData?: LiveMarketData,
  apiSources?: string[]
): MergedSecurityResult {
  const discrepancies: MergedSecurityResult["discrepancies"] = [];
  const sources = ["json-input"];
  if (apiSources) sources.push(...apiSources);

  // Check for discrepancies between JSON and API data
  if (liveSecurityData) {
    // Honeypot discrepancy (critical)
    if (jsonResult.securityData.isHoneypot !== liveSecurityData.isHoneypot) {
      discrepancies.push({
        field: "Honeypot Status",
        jsonValue: jsonResult.securityData.isHoneypot,
        apiValue: liveSecurityData.isHoneypot,
        severity: "critical",
      });
    }

    // Mintable discrepancy
    if (jsonResult.securityData.isMintable !== liveSecurityData.isMintable) {
      discrepancies.push({
        field: "Mint Function",
        jsonValue: jsonResult.securityData.isMintable,
        apiValue: liveSecurityData.isMintable,
        severity: "warning",
      });
    }

    // Tax discrepancy
    const jsonMaxTax = Math.max(jsonResult.securityData.buyTax, jsonResult.securityData.sellTax);
    const apiMaxTax = Math.max(liveSecurityData.buyTax, liveSecurityData.sellTax);
    if (Math.abs(jsonMaxTax - apiMaxTax) > 2) {
      discrepancies.push({
        field: "Tax Rates",
        jsonValue: `${jsonResult.securityData.buyTax}%/${jsonResult.securityData.sellTax}%`,
        apiValue: `${liveSecurityData.buyTax.toFixed(1)}%/${liveSecurityData.sellTax.toFixed(1)}%`,
        severity: Math.abs(jsonMaxTax - apiMaxTax) > 10 ? "warning" : "info",
      });
    }

    // Holder count (if JSON had any)
    if (jsonResult.securityData.holderCount > 0 && liveSecurityData.holderCount > 0) {
      const diff = Math.abs(jsonResult.securityData.holderCount - liveSecurityData.holderCount);
      if (diff / Math.max(jsonResult.securityData.holderCount, liveSecurityData.holderCount) > 0.2) {
        discrepancies.push({
          field: "Holder Count",
          jsonValue: jsonResult.securityData.holderCount,
          apiValue: liveSecurityData.holderCount,
          severity: "info",
        });
      }
    }
  }

  // Merge security data: Use live API data where available, fall back to JSON
  const mergedSecurityData = {
    // Live API takes precedence for real-time verification
    isHoneypot: liveSecurityData?.isHoneypot ?? jsonResult.securityData.isHoneypot,
    isVerified: liveSecurityData?.isVerified ?? jsonResult.securityData.isVerified,
    holderCount: liveSecurityData?.holderCount || jsonResult.securityData.holderCount,
    buyTax: liveSecurityData?.buyTax ?? jsonResult.securityData.buyTax,
    sellTax: liveSecurityData?.sellTax ?? jsonResult.securityData.sellTax,
    isMintable: liveSecurityData?.isMintable ?? jsonResult.securityData.isMintable,
    hasHiddenOwner: liveSecurityData?.hasHiddenOwner ?? jsonResult.securityData.hasHiddenOwner,
    hasFreezeAuthority: liveSecurityData?.hasFreezeAuthority ?? false,
    // JSON-specific fields (not in live API)
    ownerRenounced: jsonResult.securityData.ownerRenounced,
    lpLocked: jsonResult.securityData.lpLocked,
    lpLockDays: jsonResult.securityData.lpLockDays,
    holderConcentration: jsonResult.securityData.holderConcentration,
    hasBlacklist: jsonResult.securityData.hasBlacklist,
  };

  // Merge and deduplicate risk factors
  const factorMap = new Map<string, RiskFactor>();
  
  // Add JSON factors with source tag
  jsonResult.factors.forEach(f => {
    factorMap.set(f.name.toLowerCase(), { ...f, source: "json" });
  });
  
  // Add/merge API factors (API takes precedence for matching factors)
  liveRiskFactors.forEach(f => {
    const key = f.name.toLowerCase();
    if (factorMap.has(key)) {
      // Merge: Use more severe status, combine descriptions
      const existing = factorMap.get(key)!;
      const statusPriority = { danger: 3, warning: 2, safe: 1 };
      const mergedStatus = statusPriority[f.status] > statusPriority[existing.status] 
        ? f.status 
        : existing.status;
      factorMap.set(key, {
        name: f.name,
        status: mergedStatus,
        description: f.description,
        source: "merged",
      });
    } else {
      factorMap.set(key, { ...f, source: "api" });
    }
  });

  const mergedFactors = Array.from(factorMap.values());

  // Calculate merged score with weighted approach
  // If both sources agree on critical issues, weight heavily
  // If they disagree, add uncertainty penalty
  let mergedScore: number;
  let confidenceLevel: "high" | "medium" | "low";
  
  const scoreDiff = Math.abs(jsonResult.score - liveScore);
  
  if (scoreDiff <= 10) {
    // Sources agree - high confidence, average scores
    mergedScore = Math.round((jsonResult.score + liveScore) / 2);
    confidenceLevel = "high";
  } else if (scoreDiff <= 25) {
    // Moderate disagreement - medium confidence, weighted average favoring API
    mergedScore = Math.round(jsonResult.score * 0.4 + liveScore * 0.6);
    confidenceLevel = "medium";
  } else {
    // Major disagreement - low confidence, use lower score for safety
    mergedScore = Math.min(jsonResult.score, liveScore);
    confidenceLevel = "low";
  }

  // Apply critical discrepancy penalties
  const criticalDiscrepancies = discrepancies.filter(d => d.severity === "critical");
  if (criticalDiscrepancies.length > 0) {
    mergedScore = Math.min(mergedScore, 35);
    confidenceLevel = "low";
  }

  // Ensure score stays in valid range
  mergedScore = Math.max(0, Math.min(100, mergedScore));

  // Merge critical issues and warnings
  const allCriticalIssues = new Set([
    ...jsonResult.criticalIssues,
  ]);
  const allWarnings = new Set([
    ...jsonResult.warnings,
  ]);

  // Add discrepancy-based warnings
  criticalDiscrepancies.forEach(d => {
    allCriticalIssues.add(`Data conflict: ${d.field} differs between sources`);
  });

  return {
    mergedScore,
    confidenceLevel,
    jsonScore: jsonResult.score,
    apiScore: liveScore,
    securityData: mergedSecurityData,
    marketData,
    factors: mergedFactors,
    criticalIssues: Array.from(allCriticalIssues),
    warnings: Array.from(allWarnings),
    discrepancies,
    sources,
  };
}

/**
 * Generate a summary of the merged analysis
 */
export function generateMergedRiskSummary(result: MergedSecurityResult): string {
  const { mergedScore, confidenceLevel, discrepancies, criticalIssues } = result;
  
  let riskLevel: string;
  if (mergedScore >= 70) riskLevel = "Low risk";
  else if (mergedScore >= 50) riskLevel = "Medium risk";
  else if (mergedScore >= 30) riskLevel = "High risk";
  else riskLevel = "Critical risk";

  const confidenceText = confidenceLevel === "high" 
    ? "High confidence" 
    : confidenceLevel === "medium" 
      ? "Moderate confidence" 
      : "Low confidence";

  if (criticalIssues.length > 0) {
    return `${riskLevel} (${confidenceText}) - ${criticalIssues[0]}`;
  }

  if (discrepancies.length > 0) {
    return `${riskLevel} (${confidenceText}) - ${discrepancies.length} data discrepancy(ies) found`;
  }

  return `${riskLevel} (${confidenceText}) - Combined analysis from ${result.sources.length} sources`;
}
