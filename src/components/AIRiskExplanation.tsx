/**
 * @fileoverview AIRiskExplanation component for AI-powered risk analysis
 * Uses Gemini AI to generate human-readable explanations of token risks
 */

import { useState, useEffect, memo } from 'react';
import { Brain, Sparkles, AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAIRiskExplanation } from '@/hooks/useAIRiskExplanation';

/**
 * Risk factor data structure
 * @interface RiskFactor
 */
interface RiskFactor {
  /** Name of the risk factor */
  name: string;
  /** Current status of the factor */
  status: 'safe' | 'warning' | 'danger';
  /** Description of the risk factor state */
  description: string;
}

/**
 * Complete token data for AI analysis
 * @interface TokenData
 */
interface TokenData {
  /** Token name */
  name: string;
  /** Token symbol/ticker */
  symbol: string;
  /** Blockchain network */
  network: string;
  /** Calculated risk score (0-100) */
  riskScore: number;
  /** Array of detected risk factors */
  riskFactors: RiskFactor[];
  /** Optional market data */
  marketData?: {
    price: number;
    liquidity: number;
    volume24h: number;
    marketCap: number;
  };
  /** Optional security analysis data */
  securityData?: {
    isHoneypot: boolean;
    isVerified: boolean;
    buyTax: number;
    sellTax: number;
    holderCount: number;
    isMintable: boolean;
    hasHiddenOwner: boolean;
  };
  /** Optional liquidity lock information */
  lockInfo?: {
    isLocked: boolean;
    lockPercentage: number;
    unlockDate: string;
  };
}

/**
 * Props for the AIRiskExplanation component
 * @interface AIRiskExplanationProps
 */
interface AIRiskExplanationProps {
  /** Token data to analyze */
  tokenData: TokenData;
  /** Auto-generate explanation on mount */
  autoGenerate?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays AI-powered risk analysis explanations for tokens.
 * Features expandable card with generation controls and loading states.
 * 
 * @component
 * @example
 * ```tsx
 * <AIRiskExplanation tokenData={tokenData} autoGenerate />
 * ```
 */

export const AIRiskExplanation = memo(function AIRiskExplanation({
  tokenData,
  autoGenerate = false,
  className,
}: AIRiskExplanationProps) {
  const { generateExplanation, explanation, isLoading, error, reset } = useAIRiskExplanation();
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Auto-generate on mount if enabled
  useEffect(() => {
    if (autoGenerate && !hasGenerated && tokenData.riskFactors.length > 0) {
      setHasGenerated(true);
      generateExplanation(tokenData);
    }
  }, [autoGenerate, hasGenerated, tokenData, generateExplanation]);

  // Reset when token changes
  useEffect(() => {
    reset();
    setHasGenerated(false);
  }, [tokenData.name, tokenData.network, reset]);

  const handleGenerate = () => {
    setHasGenerated(true);
    generateExplanation(tokenData);
  };

  const riskColor = tokenData.riskScore >= 70 
    ? 'text-safe' 
    : tokenData.riskScore >= 40 
      ? 'text-warning' 
      : 'text-danger';

  const bgGradient = tokenData.riskScore >= 70
    ? 'from-safe/10 to-safe/5'
    : tokenData.riskScore >= 40
      ? 'from-warning/10 to-warning/5'
      : 'from-danger/10 to-danger/5';

  return (
    <div className={cn(
      'rounded-xl border border-border/50 overflow-hidden',
      `bg-gradient-to-br ${bgGradient}`,
      className
    )}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            tokenData.riskScore >= 70 ? 'bg-safe/20' : tokenData.riskScore >= 40 ? 'bg-warning/20' : 'bg-danger/20'
          )}>
            <Brain className={cn('w-5 h-5', riskColor)} />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              AI Risk Analysis
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            </h3>
            <p className="text-xs text-muted-foreground">
              Powered by Gemini AI
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Not yet generated state */}
          {!hasGenerated && !isLoading && (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">
                Get an AI-powered explanation of why this token has a {tokenData.riskScore >= 70 ? 'low' : tokenData.riskScore >= 40 ? 'medium' : 'high'} risk score
              </p>
              <Button 
                onClick={handleGenerate}
                className="gap-2"
                variant="outline"
              >
                <Brain className="w-4 h-4" />
                Explain This Risk
              </Button>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center gap-3 py-8">
              <div className="relative">
                <Brain className={cn('w-8 h-8', riskColor)} />
                <div className="absolute inset-0 animate-ping">
                  <Sparkles className="w-8 h-8 text-primary opacity-50" />
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Analyzing risk factors...
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </div>
              <Button 
                onClick={handleGenerate}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
            </div>
          )}

          {/* Explanation */}
          {explanation && !isLoading && (
            <div className="space-y-4">
              {/* Stats bar */}
              <div className="flex items-center gap-2 text-xs">
                {explanation.dangerCount > 0 && (
                  <span className="px-2 py-1 rounded-full bg-danger/20 text-danger">
                    {explanation.dangerCount} Critical
                  </span>
                )}
                {explanation.warningCount > 0 && (
                  <span className="px-2 py-1 rounded-full bg-warning/20 text-warning">
                    {explanation.warningCount} Warning{explanation.warningCount > 1 ? 's' : ''}
                  </span>
                )}
                {explanation.safeCount > 0 && (
                  <span className="px-2 py-1 rounded-full bg-safe/20 text-safe">
                    {explanation.safeCount} Safe
                  </span>
                )}
              </div>

              {/* AI explanation text */}
              <div className="prose prose-sm prose-invert max-w-none">
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {explanation.explanation}
                </p>
              </div>

              {/* Regenerate button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleGenerate}
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="w-3 h-3" />
                  Regenerate
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
