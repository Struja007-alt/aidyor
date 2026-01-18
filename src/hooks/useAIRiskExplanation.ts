/**
 * @fileoverview AI risk explanation hook
 * Generates human-readable risk explanations using Gemini AI
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Risk factor data structure
 * @interface RiskFactor
 */
interface RiskFactor {
  /** Name of the risk factor */
  name: string;
  /** Status classification */
  status: 'safe' | 'warning' | 'danger';
  /** Description of the risk */
  description: string;
}

/**
 * Token data for AI analysis
 * @interface TokenData
 */
interface TokenData {
  /** Token name */
  name: string;
  /** Token symbol */
  symbol: string;
  /** Blockchain network */
  network: string;
  /** Risk score (0-100) */
  riskScore: number;
  /** Detected risk factors */
  riskFactors: RiskFactor[];
  /** Optional market data */
  marketData?: {
    price: number;
    liquidity: number;
    volume24h: number;
    marketCap: number;
  };
  /** Optional security analysis */
  securityData?: {
    isHoneypot: boolean;
    isVerified: boolean;
    buyTax: number;
    sellTax: number;
    holderCount: number;
    isMintable: boolean;
    hasHiddenOwner: boolean;
  };
  /** Optional lock information */
  lockInfo?: {
    isLocked: boolean;
    lockPercentage: number;
    unlockDate: string;
  };
}

/**
 * AI explanation result structure
 * @interface AIExplanationResult
 */
interface AIExplanationResult {
  /** AI-generated explanation text */
  explanation: string;
  /** Risk level classification */
  riskLevel: string;
  /** Count of danger-level factors */
  dangerCount: number;
  /** Count of warning-level factors */
  warningCount: number;
  /** Count of safe-level factors */
  safeCount: number;
}

/**
 * Hook for generating AI-powered risk explanations.
 * Calls the ai-risk-explain edge function to generate human-readable analysis.
 * 
 * @returns {Object} AI explanation state and functions
 * @returns {Function} generateExplanation - Generate explanation for token
 * @returns {AIExplanationResult|null} explanation - Generated explanation
 * @returns {boolean} isLoading - Loading state
 * @returns {string|null} error - Error message if failed
 * @returns {Function} reset - Reset state
 * 
 * @example
 * ```tsx
 * const { generateExplanation, explanation, isLoading } = useAIRiskExplanation();
 * 
 * await generateExplanation(tokenData);
 * if (explanation) {
 *   console.log(explanation.explanation);
 * }
 * ```
 */

export function useAIRiskExplanation() {
  const [isLoading, setIsLoading] = useState(false);
  const [explanation, setExplanation] = useState<AIExplanationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateExplanation = useCallback(async (tokenData: TokenData) => {
    setIsLoading(true);
    setError(null);
    setExplanation(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('ai-risk-explain', {
        body: { tokenData },
      });

      if (invokeError) {
        throw new Error(invokeError.message || 'Failed to generate explanation');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setExplanation(data as AIExplanationResult);
      return data as AIExplanationResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate AI explanation';
      setError(message);
      console.error('AI explanation error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setExplanation(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    generateExplanation,
    explanation,
    isLoading,
    error,
    reset,
  };
}
