// BSCTrace API - Free security analysis for BSC tokens
// Provides contract analysis, honeypot detection, and risk assessment

import { detectBEPStandard, getStandardRiskFactors, getStandardScoreModifier, type BEPStandardResult } from './bepStandards';

export interface BSCTraceResult {
  isHoneypot: boolean;
  honeypotReason: string | null;
  buyTax: number;
  sellTax: number;
  transferTax: number;
  isBlacklisted: boolean;
  isWhitelisted: boolean;
  isProxy: boolean;
  isContractVerified: boolean;
  isMintable: boolean;
  canTakeBackOwnership: boolean;
  ownerAddress: string;
  creatorAddress: string;
  holderCount: number;
  lpHolderCount: number;
  isAntiWhale: boolean;
  maxTxAmount: string | null;
  maxWalletAmount: string | null;
  tradingEnabled: boolean;
  selfDestruct: boolean;
  externalCall: boolean;
  hiddenOwner: boolean;
  bepStandard?: BEPStandardResult | null;
}

// Re-export BEP standard types for convenience
export type { BEPStandardResult } from './bepStandards';
export { detectBEPStandard } from './bepStandards';

// Fetch BSC token security data from BSCTrace with timeout and validation
export async function getBSCTraceSecurity(address: string): Promise<BSCTraceResult | null> {
  // Input validation
  if (!address || typeof address !== 'string') return null;
  const sanitized = address.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/i.test(sanitized)) return null;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
  
  try {
    // Fetch BSCTrace data and BEP standard detection in parallel
    const [honeypotResponse, bepStandard] = await Promise.all([
      fetch(
        `https://api.honeypot.is/v2/IsHoneypot?address=${encodeURIComponent(sanitized)}&chainId=56`,
        {
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        }
      ),
      detectBEPStandard(sanitized).catch(() => null)
    ]);

    clearTimeout(timeoutId);
    if (!honeypotResponse.ok) {
      console.error('BSCTrace API error:', honeypotResponse.status);
      return null;
    }

    const data = await honeypotResponse.json();
    
    // Parse honeypot.is response format
    const simulationResult = data.simulationResult || {};
    const contractCode = data.contractCode || {};
    const holderAnalysis = data.holderAnalysis || {};
    const pair = data.pair || {};
    const token = data.token || {};
    
    return {
      isHoneypot: data.honeypotResult?.isHoneypot || false,
      honeypotReason: data.honeypotResult?.honeypotReason || null,
      buyTax: simulationResult.buyTax || 0,
      sellTax: simulationResult.sellTax || 0,
      transferTax: simulationResult.transferTax || 0,
      isBlacklisted: token.isBlacklisted || false,
      isWhitelisted: token.isWhitelisted || false,
      isProxy: contractCode.isProxy || false,
      isContractVerified: contractCode.isVerified || false,
      isMintable: contractCode.isMintable || false,
      canTakeBackOwnership: contractCode.canTakeBackOwnership || false,
      ownerAddress: contractCode.ownerAddress || '',
      creatorAddress: contractCode.creatorAddress || '',
      holderCount: holderAnalysis.holders || 0,
      lpHolderCount: pair.liquidity?.holders || 0,
      isAntiWhale: token.isAntiWhale || false,
      maxTxAmount: token.maxTxAmount || null,
      maxWalletAmount: token.maxWallet || null,
      tradingEnabled: !data.honeypotResult?.isHoneypot,
      selfDestruct: contractCode.hasSelfDestruct || false,
      externalCall: contractCode.hasExternalCall || false,
      hiddenOwner: contractCode.hasHiddenOwner || false,
      bepStandard,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      console.warn('BSCTrace API timed out');
      return null;
    }
    console.error('BSCTrace API error:', error);
    return null;
  }
}

// Analyze BSCTrace security data and return risk factors
export function analyzeBSCTraceSecurity(security: BSCTraceResult): {
  score: number;
  factors: { name: string; status: 'safe' | 'warning' | 'danger'; description: string }[];
} {
  const factors: { name: string; status: 'safe' | 'warning' | 'danger'; description: string }[] = [];
  let score = 0;

  // Honeypot check - most critical
  if (security.isHoneypot) {
    factors.push({ 
      name: 'Honeypot', 
      status: 'danger', 
      description: security.honeypotReason || 'Cannot sell tokens' 
    });
    score -= 50;
  } else {
    factors.push({ name: 'Honeypot', status: 'safe', description: 'Not a honeypot' });
    score += 15;
  }

  // Contract verification
  if (security.isContractVerified) {
    factors.push({ name: 'Verified', status: 'safe', description: 'Contract source verified' });
    score += 10;
  } else {
    factors.push({ name: 'Unverified', status: 'warning', description: 'Contract source not verified' });
    score -= 10;
  }

  // Buy/Sell tax analysis
  const buyTax = security.buyTax * 100;
  const sellTax = security.sellTax * 100;
  
  if (buyTax > 25 || sellTax > 25) {
    factors.push({ 
      name: 'High Tax', 
      status: 'danger', 
      description: `Buy: ${buyTax.toFixed(1)}% / Sell: ${sellTax.toFixed(1)}%` 
    });
    score -= 25;
  } else if (buyTax > 10 || sellTax > 10) {
    factors.push({ 
      name: 'Moderate Tax', 
      status: 'warning', 
      description: `Buy: ${buyTax.toFixed(1)}% / Sell: ${sellTax.toFixed(1)}%` 
    });
    score -= 10;
  } else if (buyTax <= 5 && sellTax <= 5) {
    factors.push({ 
      name: 'Low Tax', 
      status: 'safe', 
      description: `Buy: ${buyTax.toFixed(1)}% / Sell: ${sellTax.toFixed(1)}%` 
    });
    score += 10;
  }

  // Mintable check
  if (security.isMintable) {
    factors.push({ name: 'Mintable', status: 'warning', description: 'Owner can mint new tokens' });
    score -= 10;
  } else {
    factors.push({ name: 'Fixed Supply', status: 'safe', description: 'No minting capability' });
    score += 5;
  }

  // Hidden owner
  if (security.hiddenOwner) {
    factors.push({ name: 'Hidden Owner', status: 'danger', description: 'Contract has hidden ownership' });
    score -= 20;
  }

  // Self-destruct capability
  if (security.selfDestruct) {
    factors.push({ name: 'Self-Destruct', status: 'danger', description: 'Contract can be destroyed' });
    score -= 25;
  }

  // External calls
  if (security.externalCall) {
    factors.push({ name: 'External Calls', status: 'warning', description: 'Contract makes external calls' });
    score -= 5;
  }

  // Proxy contract
  if (security.isProxy) {
    factors.push({ name: 'Proxy', status: 'warning', description: 'Upgradeable proxy contract' });
    score -= 5;
  }

  // Can take back ownership
  if (security.canTakeBackOwnership) {
    factors.push({ name: 'Ownership Risk', status: 'danger', description: 'Owner can reclaim control' });
    score -= 15;
  }

  // Blacklist capability
  if (security.isBlacklisted) {
    factors.push({ name: 'Blacklist', status: 'warning', description: 'Address blacklisting enabled' });
    score -= 5;
  }

  // Holder count analysis
  if (security.holderCount >= 5000) {
    factors.push({ 
      name: 'Holders', 
      status: 'safe', 
      description: `${security.holderCount.toLocaleString()} holders` 
    });
    score += 10;
  } else if (security.holderCount >= 500) {
    factors.push({ 
      name: 'Holders', 
      status: 'safe', 
      description: `${security.holderCount.toLocaleString()} holders` 
    });
    score += 5;
  } else if (security.holderCount > 0) {
    factors.push({ 
      name: 'Low Holders', 
      status: 'warning', 
      description: `Only ${security.holderCount} holders` 
    });
    score -= 5;
  }

  // Anti-whale protection
  if (security.isAntiWhale) {
    factors.push({ name: 'Anti-Whale', status: 'safe', description: 'Transaction limits enabled' });
    score += 3;
  }

  // BEP Token Standard analysis
  if (security.bepStandard) {
    const standardFactors = getStandardRiskFactors(security.bepStandard);
    factors.push(...standardFactors);
    score += getStandardScoreModifier(security.bepStandard);
  }

  return { score, factors };
}
