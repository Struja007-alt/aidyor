// DEXScreener API - Free, no auth required
// Docs: https://docs.dexscreener.com/api/reference

export interface DexToken {
  address: string;
  name: string;
  symbol: string;
}

export interface DexPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: DexToken;
  quoteToken: DexToken;
  priceNative: string;
  priceUsd: string;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  liquidity?: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv?: number;
  marketCap?: number;
  info?: {
    imageUrl?: string;
    websites?: { label: string; url: string }[];
    socials?: { type: string; url: string }[];
  };
}

export interface DexSearchResult {
  pairs: DexPair[];
}

export interface TokenSearchResult {
  pairs: DexPair[];
}

// Map DEXScreener chain IDs to our network names
export const chainIdToNetwork: Record<string, string> = {
  'ethereum': 'ETH',
  'bsc': 'BSC',
  'solana': 'SOL',
  'polygon': 'POLYGON',
  'avalanche': 'AVAX',
  'arbitrum': 'ARB',
  'base': 'BASE',
  'optimism': 'OP',
  'ton': 'TON',
};

export const networkToChainId: Record<string, string> = {
  'ETH': 'ethereum',
  'BSC': 'bsc',
  'SOL': 'solana',
  'POLYGON': 'polygon',
  'AVAX': 'avalanche',
  'ARB': 'arbitrum',
  'BASE': 'base',
  'OP': 'optimism',
  'TON': 'ton',
};

// Search tokens by name, symbol, or address with timeout and validation
export async function searchTokens(query: string): Promise<DexPair[]> {
  // Input validation
  if (!query || typeof query !== 'string') return [];
  const sanitized = query.trim().slice(0, 100); // Max 100 chars
  if (sanitized.length < 2) return [];
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
  
  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(sanitized)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error('Search failed');
    const data: DexSearchResult = await response.json();
    return data.pairs || [];
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      console.warn('DEXScreener search timed out');
      return [];
    }
    console.error('DEXScreener search error:', error);
    return [];
  }
}

// Get token by contract address with timeout and validation
export async function getTokenByAddress(address: string): Promise<DexPair[]> {
  // Input validation - addresses are typically 32-66 chars
  if (!address || typeof address !== 'string') return [];
  const sanitized = address.trim();
  if (sanitized.length < 32 || sanitized.length > 66) return [];
  // Basic format check - must be alphanumeric with possible 0x prefix
  if (!/^(0x)?[a-zA-Z0-9]+$/.test(sanitized)) return [];
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for full scan
  
  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(sanitized)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error('Token lookup failed');
    const data: TokenSearchResult = await response.json();
    return data.pairs || [];
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      console.warn('DEXScreener token lookup timed out');
      return [];
    }
    console.error('DEXScreener token lookup error:', error);
    return [];
  }
}

// Get pairs by chain
export async function getTokensByChain(chainId: string, addresses: string[]): Promise<DexPair[]> {
  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/pairs/${chainId}/${addresses.join(',')}`);
    if (!response.ok) throw new Error('Chain pairs lookup failed');
    const data = await response.json();
    return data.pairs || [];
  } catch (error) {
    console.error('DEXScreener chain lookup error:', error);
    return [];
  }
}

// Analyze token for risk factors
export function analyzeTokenRisk(pairs: DexPair[]): {
  score: number;
  factors: { name: string; status: 'safe' | 'warning' | 'danger'; description: string }[];
} {
  if (pairs.length === 0) {
    return { score: 0, factors: [] };
  }

  const factors: { name: string; status: 'safe' | 'warning' | 'danger'; description: string }[] = [];
  let score = 50; // Start at 50

  // Get the best pair (highest liquidity)
  const mainPair = pairs.reduce((best, pair) => 
    (pair.liquidity?.usd || 0) > (best.liquidity?.usd || 0) ? pair : best
  , pairs[0]);

  // Liquidity check
  const liquidity = mainPair.liquidity?.usd || 0;
  if (liquidity >= 100000) {
    factors.push({ name: 'Liquidity', status: 'safe', description: `$${(liquidity / 1000).toFixed(0)}K locked liquidity` });
    score += 15;
  } else if (liquidity >= 10000) {
    factors.push({ name: 'Liquidity', status: 'warning', description: `$${(liquidity / 1000).toFixed(0)}K liquidity - moderate` });
    score += 5;
  } else {
    factors.push({ name: 'Liquidity', status: 'danger', description: `Low liquidity: $${liquidity.toFixed(0)}` });
    score -= 15;
  }

  // Volume check
  const volume24h = mainPair.volume?.h24 || 0;
  if (volume24h >= 50000) {
    factors.push({ name: '24h Volume', status: 'safe', description: `$${(volume24h / 1000).toFixed(0)}K daily volume` });
    score += 10;
  } else if (volume24h >= 5000) {
    factors.push({ name: '24h Volume', status: 'warning', description: `$${(volume24h / 1000).toFixed(0)}K volume - low activity` });
  } else {
    factors.push({ name: '24h Volume', status: 'danger', description: `Very low volume: $${volume24h.toFixed(0)}` });
    score -= 10;
  }

  // Transaction activity
  const txns24h = (mainPair.txns?.h24?.buys || 0) + (mainPair.txns?.h24?.sells || 0);
  if (txns24h >= 100) {
    factors.push({ name: 'Activity', status: 'safe', description: `${txns24h} transactions in 24h` });
    score += 10;
  } else if (txns24h >= 20) {
    factors.push({ name: 'Activity', status: 'warning', description: `${txns24h} transactions - moderate activity` });
  } else {
    factors.push({ name: 'Activity', status: 'danger', description: `Only ${txns24h} transactions in 24h` });
    score -= 10;
  }

  // Buy/Sell ratio
  const buys24h = mainPair.txns?.h24?.buys || 0;
  const sells24h = mainPair.txns?.h24?.sells || 0;
  if (buys24h > 0 && sells24h > 0) {
    const ratio = buys24h / sells24h;
    if (ratio >= 0.7 && ratio <= 1.5) {
      factors.push({ name: 'Buy/Sell Ratio', status: 'safe', description: `Healthy ratio: ${ratio.toFixed(2)}` });
      score += 5;
    } else if (ratio < 0.3) {
      factors.push({ name: 'Buy/Sell Ratio', status: 'danger', description: `More sells than buys - caution` });
      score -= 10;
    } else {
      factors.push({ name: 'Buy/Sell Ratio', status: 'warning', description: `Ratio: ${ratio.toFixed(2)}` });
    }
  }

  // Price change
  const priceChange = mainPair.priceChange?.h24 || 0;
  if (priceChange >= -10 && priceChange <= 50) {
    factors.push({ name: 'Price Stability', status: 'safe', description: `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(1)}% (24h)` });
    score += 5;
  } else if (priceChange < -30) {
    factors.push({ name: 'Price Drop', status: 'danger', description: `${priceChange.toFixed(1)}% drop in 24h` });
    score -= 15;
  } else {
    factors.push({ name: 'Price Volatility', status: 'warning', description: `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(1)}% (24h)` });
  }

  // Has info/socials
  if (mainPair.info?.websites?.length || mainPair.info?.socials?.length) {
    factors.push({ name: 'Social Presence', status: 'safe', description: 'Has verified links' });
    score += 5;
  }

  // Normalize score
  score = Math.max(0, Math.min(100, score));

  return { score, factors };
}
