// GoPlus Security API - Free, no auth required
// Docs: https://docs.gopluslabs.io/

// SolanaFM API - Free, no auth required
// Docs: https://docs.solana.fm/

import { 
  detectERCStandard, 
  getERCStandardRiskFactors, 
  getERCStandardScoreModifier,
  supportsERCDetection,
  type ERCStandardResult 
} from './ercStandards';

// Re-export ERC standard types for convenience
export type { ERCStandardResult } from './ercStandards';
export { detectERCStandard, supportsERCDetection } from './ercStandards';

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
  ercStandard?: ERCStandardResult | null; // ERC token standard detection
}

// GoPlus Solana-specific security result
export interface GoPlusSolanaSecurityResult {
  isOpenSource: boolean;
  isMintable: boolean;
  isFreezeAuthority: boolean;
  holderCount: string;
  lpHolderCount: string;
  totalSupply: string;
  creatorAddress: string;
  creatorPercent: string;
  closableProgram: boolean;
  upgradeableProgram: boolean;
  metadataMutable: boolean;
  transferFee: string;
  transferFeeMax: string;
  defaultAccountState: string;
  nonTransferable: boolean;
  // Trust list info
  trustList: string | null;
}

export interface SolanaSecurityResult {
  holderCount: number;
  isFreezeAuthority: boolean;
  isMintAuthority: boolean;
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

// Fetch Solana token holder count from SolanaFM with timeout
export async function getSolanaTokenSecurity(mintAddress: string): Promise<SolanaSecurityResult | null> {
  // Input validation
  if (!mintAddress || typeof mintAddress !== 'string') return null;
  const sanitized = mintAddress.trim();
  if (sanitized.length < 32 || sanitized.length > 44) return null;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
  
  try {
    // Get holder count from SolanaFM
    const holdersResponse = await fetch(
      `https://api.solana.fm/v1/tokens/${encodeURIComponent(sanitized)}/holders?pageSize=1`,
      { signal: controller.signal }
    );
    
    let holderCount = 0;
    if (holdersResponse.ok) {
      const holdersData = await holdersResponse.json();
      holderCount = holdersData.totalItemCount || 0;
    }

    // Get token metadata for mint/freeze authority
    const metaResponse = await fetch(
      `https://api.solana.fm/v1/tokens/${encodeURIComponent(sanitized)}`,
      { signal: controller.signal }
    );
    
    let isFreezeAuthority = false;
    let isMintAuthority = false;
    
    if (metaResponse.ok) {
      const metaData = await metaResponse.json();
      isFreezeAuthority = !!metaData.freezeAuthority;
      isMintAuthority = !!metaData.mintAuthority;
    }

    clearTimeout(timeoutId);
    return {
      holderCount,
      isFreezeAuthority,
      isMintAuthority,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      console.warn('SolanaFM API timed out');
      return null;
    }
    console.error('SolanaFM API error:', error);
    return null;
  }
}

// Fetch Solana token security from GoPlus Solana API with timeout
export async function getGoPlusSolanaSecurity(mintAddress: string): Promise<GoPlusSolanaSecurityResult | null> {
  // Input validation
  if (!mintAddress || typeof mintAddress !== 'string') return null;
  const sanitized = mintAddress.trim();
  if (sanitized.length < 32 || sanitized.length > 44) return null;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
  
  try {
    const response = await fetch(
      `https://api.gopluslabs.io/api/v1/solana/token_security?contract_addresses=${encodeURIComponent(sanitized)}`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    
    const data = await response.json();
    const tokenData = data.result?.[sanitized];
    
    if (!tokenData) return null;

    return {
      isOpenSource: tokenData.is_open_source === '1',
      isMintable: tokenData.mintable?.status === '1',
      isFreezeAuthority: tokenData.freezeable?.status === '1',
      holderCount: tokenData.holder_count || '0',
      lpHolderCount: tokenData.lp_holder_count || '0',
      totalSupply: tokenData.total_supply || '0',
      creatorAddress: tokenData.creator_address || '',
      creatorPercent: tokenData.creator_percent || '0',
      closableProgram: tokenData.closable?.status === '1',
      upgradeableProgram: tokenData.default_account_state_upgradable === '1',
      metadataMutable: tokenData.metadata_mutable === '1',
      transferFee: tokenData.transfer_fee?.fee_rate || '0',
      transferFeeMax: tokenData.transfer_fee?.max_fee || '0',
      defaultAccountState: tokenData.default_account_state || 'initialized',
      nonTransferable: tokenData.non_transferable === '1',
      trustList: tokenData.trust_list || null,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      console.warn('GoPlus Solana API timed out');
      return null;
    }
    console.error('GoPlus Solana API error:', error);
    return null;
  }
}

// Analyze GoPlus Solana security data
export function analyzeGoPlusSolanaSecurity(security: GoPlusSolanaSecurityResult): {
  score: number;
  factors: { name: string; status: 'safe' | 'warning' | 'danger'; description: string }[];
} {
  const factors: { name: string; status: 'safe' | 'warning' | 'danger'; description: string }[] = [];
  let score = 0;

  // Trust list check
  if (security.trustList) {
    factors.push({ name: 'Trusted', status: 'safe', description: `Listed on ${security.trustList}` });
    score += 15;
  }

  // Holder count
  const holders = parseInt(security.holderCount);
  if (holders >= 10000) {
    factors.push({ name: 'Holders (GoPlus)', status: 'safe', description: `${holders.toLocaleString()} holders` });
    score += 15;
  } else if (holders >= 1000) {
    factors.push({ name: 'Holders (GoPlus)', status: 'safe', description: `${holders.toLocaleString()} holders` });
    score += 10;
  } else if (holders >= 100) {
    factors.push({ name: 'Holders (GoPlus)', status: 'warning', description: `${holders} holders - growing` });
    score += 5;
  } else if (holders > 0) {
    factors.push({ name: 'Holders (GoPlus)', status: 'danger', description: `Only ${holders} holders` });
    score -= 10;
  }

  // Freeze authority check
  if (security.isFreezeAuthority) {
    factors.push({ name: 'Freezeable', status: 'warning', description: 'Token can be frozen by authority' });
    score -= 5;
  } else {
    factors.push({ name: 'Freezeable', status: 'safe', description: 'Token cannot be frozen' });
    score += 5;
  }

  // Mint authority check
  if (security.isMintable) {
    factors.push({ name: 'Mintable (GoPlus)', status: 'warning', description: 'More tokens can be minted' });
    score -= 5;
  } else {
    factors.push({ name: 'Mintable (GoPlus)', status: 'safe', description: 'Mint disabled (fixed supply)' });
    score += 10;
  }

  // Closable program - CRITICAL (rug pull risk)
  if (security.closableProgram) {
    factors.push({ name: 'Closable Program', status: 'danger', description: 'Program can be closed - HIGH RUG RISK!' });
    score -= 25;
  }

  // Upgradeable program
  if (security.upgradeableProgram) {
    factors.push({ name: 'Upgradeable', status: 'warning', description: 'Program can be upgraded' });
    score -= 5;
  }

  // Metadata mutable
  if (security.metadataMutable) {
    factors.push({ name: 'Mutable Metadata', status: 'warning', description: 'Token metadata can be changed' });
    score -= 3;
  } else {
    factors.push({ name: 'Mutable Metadata', status: 'safe', description: 'Metadata is immutable' });
    score += 5;
  }

  // Transfer fee analysis
  const transferFee = parseFloat(security.transferFee) * 100;
  if (transferFee > 0) {
    if (transferFee > 10) {
      factors.push({ name: 'Transfer Fee', status: 'danger', description: `High transfer fee: ${transferFee.toFixed(1)}%` });
      score -= 15;
    } else if (transferFee > 2) {
      factors.push({ name: 'Transfer Fee', status: 'warning', description: `Transfer fee: ${transferFee.toFixed(1)}%` });
      score -= 5;
    } else {
      factors.push({ name: 'Transfer Fee', status: 'safe', description: `Low transfer fee: ${transferFee.toFixed(1)}%` });
    }
  }

  // Non-transferable check - CRITICAL
  if (security.nonTransferable) {
    factors.push({ name: 'Non-Transferable', status: 'danger', description: 'Token CANNOT be transferred!' });
    score -= 50;
  }

  // Default account state check
  if (security.defaultAccountState === 'frozen') {
    factors.push({ name: 'Default Frozen', status: 'warning', description: 'New accounts are frozen by default' });
    score -= 10;
  }

  // Creator concentration
  const creatorPercent = parseFloat(security.creatorPercent) * 100;
  if (creatorPercent > 50) {
    factors.push({ name: 'Creator Holdings', status: 'danger', description: `Creator holds ${creatorPercent.toFixed(1)}% of supply` });
    score -= 15;
  } else if (creatorPercent > 20) {
    factors.push({ name: 'Creator Holdings', status: 'warning', description: `Creator holds ${creatorPercent.toFixed(1)}% of supply` });
    score -= 5;
  }

  return { score, factors };
}

// Analyze Solana security data (SolanaFM)
export function analyzeSolanaSecurity(security: SolanaSecurityResult): {
  score: number;
  factors: { name: string; status: 'safe' | 'warning' | 'danger'; description: string }[];
} {
  const factors: { name: string; status: 'safe' | 'warning' | 'danger'; description: string }[] = [];
  let score = 0;

  // Holder count
  if (security.holderCount >= 10000) {
    factors.push({ name: 'Holders', status: 'safe', description: `${security.holderCount.toLocaleString()} holders` });
    score += 15;
  } else if (security.holderCount >= 1000) {
    factors.push({ name: 'Holders', status: 'safe', description: `${security.holderCount.toLocaleString()} holders` });
    score += 10;
  } else if (security.holderCount >= 100) {
    factors.push({ name: 'Holders', status: 'warning', description: `${security.holderCount} holders - growing` });
    score += 5;
  } else if (security.holderCount > 0) {
    factors.push({ name: 'Holders', status: 'danger', description: `Only ${security.holderCount} holders` });
    score -= 10;
  }

  // Freeze authority check
  if (security.isFreezeAuthority) {
    factors.push({ name: 'Freeze Authority', status: 'warning', description: 'Token can be frozen by authority' });
    score -= 5;
  } else {
    factors.push({ name: 'Freeze Authority', status: 'safe', description: 'No freeze authority' });
    score += 5;
  }

  // Mint authority check
  if (security.isMintAuthority) {
    factors.push({ name: 'Mint Authority', status: 'warning', description: 'More tokens can be minted' });
    score -= 5;
  } else {
    factors.push({ name: 'Mint Authority', status: 'safe', description: 'Mint disabled (fixed supply)' });
    score += 10;
  }

  return { score, factors };
}

export async function getTokenSecurity(address: string, network: string): Promise<GoPlusSecurityResult | null> {
  const chainId = networkToGoPlusChain[network];
  if (!chainId) return null; // Not supported for this chain (SOL uses separate function)

  // Input validation
  if (!address || typeof address !== 'string') return null;
  const sanitized = address.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/i.test(sanitized)) return null;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

  try {
    // Fetch GoPlus data and ERC standard detection in parallel (for non-BSC networks)
    const shouldDetectERC = supportsERCDetection(network) && network !== 'BSC';
    
    const [response, ercStandard] = await Promise.all([
      fetch(
        `https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${encodeURIComponent(sanitized)}`,
        { signal: controller.signal }
      ),
      shouldDetectERC ? detectERCStandard(sanitized, network).catch(() => null) : Promise.resolve(null)
    ]);
    
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    
    const data = await response.json();
    const tokenData = data.result?.[sanitized];
    
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
      ercStandard,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      console.warn('GoPlus API timed out');
      return null;
    }
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

  // ERC Token Standard analysis
  if (security.ercStandard) {
    const standardFactors = getERCStandardRiskFactors(security.ercStandard);
    factors.push(...standardFactors);
    score += getERCStandardScoreModifier(security.ercStandard);
  }

  return { score, factors };
}
