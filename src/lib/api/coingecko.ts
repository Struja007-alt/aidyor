// CoinGecko API - Free public endpoints (no API key required)
// Docs: https://docs.coingecko.com/reference/introduction

export interface CoinGeckoToken {
  id: string;
  symbol: string;
  name: string;
  platforms: Record<string, string>; // network -> contract address
}

export interface CoinGeckoTokenDetail {
  id: string;
  symbol: string;
  name: string;
  asset_platform_id: string | null;
  platforms: Record<string, string>;
  detail_platforms: Record<string, { decimal_place: number | null; contract_address: string }>;
  categories: string[];
  genesis_date: string | null;
  market_cap_rank: number | null;
  coingecko_rank: number | null;
}

// Map CoinGecko platform IDs to our network names
export const platformToNetwork: Record<string, string> = {
  'ethereum': 'ethereum',
  'binance-smart-chain': 'bsc',
  'solana': 'solana',
  'polygon-pos': 'polygon',
  'avalanche': 'avalanche',
  'arbitrum-one': 'arbitrum',
  'base': 'base',
  'optimistic-ethereum': 'optimism',
  'tron': 'tron',
  'fantom': 'fantom',
  'the-open-network': 'ton',
};

// Map our network names to CoinGecko platform IDs
export const networkToPlatform: Record<string, string> = {
  'ethereum': 'ethereum',
  'bsc': 'binance-smart-chain',
  'solana': 'solana',
  'polygon': 'polygon-pos',
  'avalanche': 'avalanche',
  'arbitrum': 'arbitrum-one',
  'base': 'base',
  'optimism': 'optimistic-ethereum',
  'tron': 'tron',
  'fantom': 'fantom',
  'ton': 'the-open-network',
};

// Cache for CoinGecko token list to avoid repeated API calls
let tokenListCache: CoinGeckoToken[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Fetch the CoinGecko token list with platform addresses
 * This gives us the official list of tokens and their original platforms
 */
export async function getCoinGeckoTokenList(): Promise<CoinGeckoToken[]> {
  // Return cached data if still valid
  if (tokenListCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return tokenListCache;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/list?include_platform=true',
      { 
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn('CoinGecko API returned non-OK status:', response.status);
      return tokenListCache || [];
    }
    
    const data: CoinGeckoToken[] = await response.json();
    tokenListCache = data;
    cacheTimestamp = Date.now();
    
    console.log(`CoinGecko: Loaded ${data.length} tokens`);
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      console.warn('CoinGecko token list request timed out');
    } else {
      console.error('CoinGecko token list error:', error);
    }
    return tokenListCache || [];
  }
}

/**
 * Find a token by symbol and get its original platform(s)
 * Returns the platform IDs where this token officially exists
 */
export async function getTokenOriginalNetworks(symbol: string): Promise<string[]> {
  if (!symbol || typeof symbol !== 'string') return [];
  
  const normalizedSymbol = symbol.trim().toLowerCase();
  if (normalizedSymbol.length < 1 || normalizedSymbol.length > 20) return [];
  
  try {
    const tokenList = await getCoinGeckoTokenList();
    
    // Find all tokens matching this symbol
    const matchingTokens = tokenList.filter(
      token => token.symbol.toLowerCase() === normalizedSymbol
    );
    
    if (matchingTokens.length === 0) return [];
    
    // Get unique platforms across all matching tokens
    // Prioritize tokens with higher market presence (more platforms = more established)
    const platformCounts = new Map<string, number>();
    
    matchingTokens.forEach(token => {
      const platforms = Object.keys(token.platforms || {});
      platforms.forEach(platform => {
        const normalizedPlatform = platformToNetwork[platform];
        if (normalizedPlatform) {
          platformCounts.set(
            normalizedPlatform,
            (platformCounts.get(normalizedPlatform) || 0) + 1
          );
        }
      });
    });
    
    // Sort by frequency (most common platform first)
    const sortedPlatforms = [...platformCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([platform]) => platform);
    
    // For well-known tokens, the first platform listed is usually the original
    // Return top 2 platforms as "original" candidates
    return sortedPlatforms.slice(0, 2);
  } catch (error) {
    console.error('Error getting token original networks:', error);
    return [];
  }
}

/**
 * Get detailed info for a specific token by CoinGecko ID
 */
export async function getCoinGeckoTokenDetail(coinId: string): Promise<CoinGeckoTokenDetail | null> {
  if (!coinId || typeof coinId !== 'string') return null;
  
  const sanitized = coinId.trim().toLowerCase().slice(0, 100);
  if (sanitized.length < 1) return null;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(sanitized)}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`,
      { 
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return null;
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      console.warn('CoinGecko token detail request timed out');
    } else {
      console.error('CoinGecko token detail error:', error);
    }
    return null;
  }
}

/**
 * Search for tokens by query string
 */
export async function searchCoinGeckoTokens(query: string): Promise<{ id: string; symbol: string; name: string; market_cap_rank: number | null }[]> {
  if (!query || typeof query !== 'string') return [];
  
  const sanitized = query.trim().slice(0, 50);
  if (sanitized.length < 2) return [];
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(sanitized)}`,
      { 
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return (data.coins || []).slice(0, 10).map((coin: { id: string; symbol: string; name: string; market_cap_rank: number | null }) => ({
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      market_cap_rank: coin.market_cap_rank,
    }));
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      console.warn('CoinGecko search timed out');
    } else {
      console.error('CoinGecko search error:', error);
    }
    return [];
  }
}

/**
 * Build a mapping of symbol -> original networks from CoinGecko data
 * Focuses on top tokens by market cap rank
 */
export async function buildCoinGeckoNetworkMappings(): Promise<Record<string, string[]>> {
  const mappings: Record<string, string[]> = {};
  
  try {
    const tokenList = await getCoinGeckoTokenList();
    
    // Group tokens by symbol
    const symbolGroups = new Map<string, CoinGeckoToken[]>();
    tokenList.forEach(token => {
      const symbol = token.symbol.toUpperCase();
      if (!symbolGroups.has(symbol)) {
        symbolGroups.set(symbol, []);
      }
      symbolGroups.get(symbol)!.push(token);
    });
    
    // For each symbol, determine the original network(s)
    symbolGroups.forEach((tokens, symbol) => {
      // Skip very generic symbols that have too many matches
      if (tokens.length > 50) return;
      
      // Collect all platforms
      const platforms = new Set<string>();
      tokens.forEach(token => {
        Object.keys(token.platforms || {}).forEach(platform => {
          const normalized = platformToNetwork[platform];
          if (normalized) {
            platforms.add(normalized);
          }
        });
      });
      
      if (platforms.size > 0) {
        // Prioritize ethereum if present (most tokens originate there)
        const platformArray = [...platforms];
        if (platformArray.includes('ethereum')) {
          mappings[symbol] = ['ethereum', ...platformArray.filter(p => p !== 'ethereum').slice(0, 1)];
        } else {
          mappings[symbol] = platformArray.slice(0, 2);
        }
      }
    });
    
    console.log(`CoinGecko: Built mappings for ${Object.keys(mappings).length} tokens`);
    return mappings;
  } catch (error) {
    console.error('Error building CoinGecko network mappings:', error);
    return {};
  }
}
