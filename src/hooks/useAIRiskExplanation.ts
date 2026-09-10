/**
 * @fileoverview AI risk explanation hook
 * Generates human-readable risk explanations using Gemini AI
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RiskFactor {
  name: string;
  status: 'safe' | 'warning' | 'danger';
  description: string;
}

interface TokenData {
  name: string;
  symbol: string;
  network: string;
  riskScore: number;
  riskFactors: RiskFactor[];
  marketData?: {
    price: number;
    liquidity: number;
    volume24h: number;
    marketCap: number;
  };
  securityData?: {
    isHoneypot: boolean;
    isVerified: boolean;
    buyTax: number;
    sellTax: number;
    holderCount: number;
    isMintable: boolean;
    hasHiddenOwner: boolean;
  };
  lockInfo?: {
    isLocked: boolean;
    lockPercentage: number;
    unlockDate: string;
  };
}

interface AIExplanationResult {
  explanation: string;
  riskLevel: string;
  dangerCount: number;
  warningCount: number;
  safeCount: number;
}

export function useAIRiskExplanation() {
  const [isLoading, setIsLoading] = useState(false);
  const [explanation, setExplanation] = useState<AIExplanationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requiresPro, setRequiresPro] = useState(false);

  const generateExplanation = useCallback(async (tokenData: TokenData) => {
    setIsLoading(true);
    setError(null);
    setExplanation(null);
    setRequiresPro(false);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('ai-risk-explain', {
        body: { tokenData },
      });

      if (invokeError) {
        // Supabase's invoke() doesn't surface the JSON body on non-2xx by default.
        // Read it from the underlying Response so we can detect PRO_REQUIRED specifically.
        let body: any = null;
        try {
          const ctx = (invokeError as any)?.context;
          if (ctx && typeof ctx.json === 'function') {
            body = await ctx.json();
          }
        } catch (_e) {
          // context wasn't readable JSON, fall through to generic error
        }

        if (body?.error === 'PRO_REQUIRED') {
          setRequiresPro(true);
          setError(body.message || 'AI risk explanations are a Pro feature.');
          return null;
        }

        throw new Error(body?.message || invokeError.message || 'Failed to generate explanation');
      }

      if (data?.error) {
        if (data.error === 'PRO_REQUIRED') {
          setRequiresPro(true);
          setError(data.message || 'AI risk explanations are a Pro feature.');
          return null;
        }
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
    setRequiresPro(false);
    setIsLoading(false);
  }, []);

  return {
    generateExplanation,
    explanation,
    isLoading,
    error,
    requiresPro,
    reset,
  };
}