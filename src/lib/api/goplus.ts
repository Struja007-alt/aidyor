// GoPlus Security API - Free, no auth required
// Docs: https://docs.gopluslabs.io/

export interface GoPlusSecurityResult {
  isHoneypot: boolean;
  isOpenSource: boolean;
  isProxy: boolean;
  isMintable: boolean;
  canTakeBackOwnership: boolean;
  ownerChangeBalance: boolean;
  hiddenOwner: boolean;
  selfDestruct: boolean;
  externalCall: boolean;
  buyTax: string;
  sellTax: string;
  holderCount: string;
  lpHolderCount: string;
  totalSupply: string;
  creatorAddress: string;
  creatorPercent: string;
  lpTotalSupplyPercent: string;
  isAntiWhale: boolean;
  isBlacklisted: boolean;
  tradingCooldown: boolean;
  transferPausable: boolean;
}

// Map our network names to GoPlus chain IDs
const networkToGoPlusChain: Record<string, string> = {
  'ETH': '1',
  'BSC': '56',
  'POLYGON': '137',
  'AVAX': '43114',
  'ARB': '42161',
  'BASE': '8453',
  'OP': '10',
};

export async function getTokenSecurity(address: string, network: string): Promise<GoPlusSecurityResult | null> {
  const chainId = networkToGoPlusChain[network];
  if (!chainId) return null; // Not supported for this chain (e.g., SOL, TON)

  try {
    const response = await fetch(
      `https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${address.toLowerCase()}`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const tokenData = data.result?.[address.toLowerCase()];
    
    if (!tokenData) return null;

    return {
      isHoneypot: tokenData.is_honeypot === '1',
      isOpenSource: tokenData.is_open_source === '1',
      isProxy: tokenData.is_proxy === '1',
      isMintable: tokenData.is_mintable === '1',
      canTakeBackOwnership: tokenData.can_take_back_ownership === '1',
      ownerChangeBalance: tokenData.owner_change_balance === '1',
      hiddenOwner: tokenData.hidden_owner === '1',
      selfDestruct: tokenData.selfdestruct === '1',
      externalCall: tokenData.external_call === '1',
      buyTax: tokenData.buy_tax || '0',
      sellTax: tokenData.sell_tax || '0',
      holderCount: tokenData.holder_count || '0',
      lpHolderCount: tokenData.lp_holder_count || '0',
      totalSupply: tokenData.total_supply || '0',
      creatorAddress: tokenData.creator_address || '',
      creatorPercent: tokenData.creator_percent || '0',
      lpTotalSupplyPercent: tokenData.lp_total_supply_percent || '0',
      isAntiWhale: tokenData.is_anti_whale === '1',
      isBlacklisted: tokenData.is_blacklisted === '1',
      tradingCooldown: tokenData.trading_cooldown === '1',
      transferPausable: tokenData.transfer_pausable === '1',
    };
  } catch (error) {
    console.error('GoPlus API error:', error);
    return null;
  }
}

// Analyze GoPlus data for additional risk factors
export function analyzeGoPlusSecurity(security: GoPlusSecurityResult): {
  score: number;
  factors: { name: string; status: 'safe' | 'warning' | 'danger'; description: string }[];
} {
  const factors: { name: string; status: 'safe' | 'warning' | 'danger'; description: string }[] = [];
  let score = 0;

  // Honeypot detection - CRITICAL
  if (security.isHoneypot) {
    factors.push({ name: 'Honeypot', status: 'danger', description: '⚠️ HONEYPOT DETECTED - Cannot sell!' });
    score -= 50;
  } else {
    factors.push({ name: 'Honeypot', status: 'safe', description: 'Not a honeypot' });
    score += 15;
  }

  // Contract verification
  if (security.isOpenSource) {
    factors.push({ name: 'Contract', status: 'safe', description: 'Verified source code' });
    score += 10;
  } else {
    factors.push({ name: 'Contract', status: 'warning', description: 'Unverified contract' });
    score -= 5;
  }

  // Tax analysis
  const buyTax = parseFloat(security.buyTax) * 100;
  const sellTax = parseFloat(security.sellTax) * 100;
  if (sellTax > 10 || buyTax > 10) {
    factors.push({ name: 'Tax', status: 'danger', description: `High tax: Buy ${buyTax.toFixed(0)}% / Sell ${sellTax.toFixed(0)}%` });
    score -= 15;
  } else if (sellTax > 5 || buyTax > 5) {
    factors.push({ name: 'Tax', status: 'warning', description: `Tax: Buy ${buyTax.toFixed(0)}% / Sell ${sellTax.toFixed(0)}%` });
    score -= 5;
  } else {
    factors.push({ name: 'Tax', status: 'safe', description: `Low tax: ${buyTax.toFixed(0)}% / ${sellTax.toFixed(0)}%` });
    score += 5;
  }

  // Holder count
  const holders = parseInt(security.holderCount);
  if (holders >= 1000) {
    factors.push({ name: 'Holders', status: 'safe', description: `${holders.toLocaleString()} holders` });
    score += 10;
  } else if (holders >= 100) {
    factors.push({ name: 'Holders', status: 'warning', description: `${holders} holders - growing` });
  } else if (holders > 0) {
    factors.push({ name: 'Holders', status: 'danger', description: `Only ${holders} holders` });
    score -= 10;
  }

  // Dangerous contract features
  if (security.isMintable) {
    factors.push({ name: 'Mintable', status: 'warning', description: 'Owner can mint tokens' });
    score -= 5;
  }
  if (security.hiddenOwner) {
    factors.push({ name: 'Hidden Owner', status: 'danger', description: 'Contract has hidden owner' });
    score -= 10;
  }
  if (security.canTakeBackOwnership) {
    factors.push({ name: 'Ownership', status: 'danger', description: 'Owner can reclaim ownership' });
    score -= 10;
  }
  if (security.transferPausable) {
    factors.push({ name: 'Pausable', status: 'warning', description: 'Transfers can be paused' });
    score -= 5;
  }

  return { score, factors };
}
