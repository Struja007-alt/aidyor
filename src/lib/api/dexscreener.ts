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
  pairCreatedAt?: number;
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

// ---------------------------------------------------------------------------
// Ranked search: real tokens first, lookalikes grouped and flagged below
// ---------------------------------------------------------------------------

export type TrustLevel = 'verified' | 'established' | 'lookalike' | 'unverified';

export interface TokenSuggestion {
  token: DexToken; // the token the user would scan (may be a pair's quote side)
  chainId: string;
  pair: DexPair; // highest-liquidity pair seen for this token
  liquidityUsd: number; // summed across the pairs returned by the search
  trust: TrustLevel;
  reason: string;
}

export interface RankedSearchResult {
  primary: TokenSuggestion[]; // verified + established: show first, highlighted
  warned: TokenSuggestion[]; // unverified + lookalikes: show below, collapsed
}

// Curated allowlist of well-known tokens (chainId from DexScreener).
// Extend this list over time; anything not listed is still ranked by
// liquidity and age, so the list does not have to be complete.
const KNOWN_TOKENS: { symbol: string; chainId: string; address: string }[] = [
  { symbol: 'USDT', chainId: 'ethereum', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
  { symbol: 'USDT', chainId: 'bsc', address: '0x55d398326f99059fF775485246999027B3197955' },
  { symbol: 'USDT', chainId: 'solana', address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' },
  { symbol: 'USDC', chainId: 'ethereum', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
  { symbol: 'USDC', chainId: 'solana', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
  { symbol: 'DAI', chainId: 'ethereum', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' },
  { symbol: 'WETH', chainId: 'ethereum', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
  { symbol: 'WBTC', chainId: 'ethereum', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' },
  { symbol: 'LINK', chainId: 'ethereum', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA' },
  { symbol: 'UNI', chainId: 'ethereum', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' },
  { symbol: 'PEPE', chainId: 'ethereum', address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933' },
  { symbol: 'SHIB', chainId: 'ethereum', address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE' },
  { symbol: 'SOL', chainId: 'solana', address: 'So11111111111111111111111111111111111111112' },
  { symbol: 'BONK', chainId: 'solana', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
  { symbol: 'JUP', chainId: 'solana', address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN' },
];

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

// EVM addresses are case-insensitive; Solana (base58) is case-sensitive.
function tokenKey(chainId: string, address: string): string {
  const addr = EVM_ADDRESS.test(address) ? address.toLowerCase() : address;
  return `${chainId.toLowerCase()}:${addr}`;
}

// Strips lookalike characters (e.g. the Tether sign) and punctuation so
// "₮ETHER", "USDT" and "usdt." compare as the same symbol.
function normalizeSymbol(value: string): string {
  return (value || '')
    .replace(/[₮Ŧŧ]/g, 'T')
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
}

const KNOWN_BY_KEY = new Map(
  KNOWN_TOKENS.map((t) => [tokenKey(t.chainId, t.address), t] as const)
);

const ESTABLISHED_MIN_LIQUIDITY_USD = 250_000;
const ESTABLISHED_MIN_AGE_DAYS = 30;

interface Candidate {
  token: DexToken;
  chainId: string;
  bestPair: DexPair;
  liquidityUsd: number;
}

// Both sides of a pair are considered: the real USDT usually appears as the
// QUOTE token (SOL/USDT), so listing only baseToken hides it and surfaces clones.
function collectCandidates(
  pairs: DexPair[],
  query: string,
  forcedKeys: Set<string>
): Candidate[] {
  const q = query.trim().toLowerCase();
  const qSymbol = normalizeSymbol(query);
  const map = new Map<string, Candidate>();

  for (const pair of pairs) {
    if (!pair?.chainId) continue;
    const liquidity = pair.liquidity?.usd || 0;

    for (const token of [pair.baseToken, pair.quoteToken]) {
      if (!token?.address) continue;
      const key = tokenKey(pair.chainId, token.address);

      const matches =
        forcedKeys.has(key) ||
        token.address.toLowerCase() === q ||
        (qSymbol.length > 0 && normalizeSymbol(token.symbol) === qSymbol) ||
        (token.symbol || '').toLowerCase().includes(q) ||
        (token.name || '').toLowerCase().includes(q);
      if (!matches) continue;

      const existing = map.get(key);
      if (!existing) {
        map.set(key, { token, chainId: pair.chainId, bestPair: pair, liquidityUsd: liquidity });
      } else {
        existing.liquidityUsd += liquidity;
        if (liquidity > (existing.bestPair.liquidity?.usd || 0)) existing.bestPair = pair;
      }
    }
  }

  return [...map.values()];
}

function classify(candidates: Candidate[]): TokenSuggestion[] {
  const suggestions: TokenSuggestion[] = candidates.map((c) => ({
    token: c.token,
    chainId: c.chainId,
    pair: c.bestPair,
    liquidityUsd: c.liquidityUsd,
    trust: 'unverified' as TrustLevel,
    reason: 'Not a recognised token - check the address before scanning',
  }));

  // 1) Allowlist
  for (const s of suggestions) {
    if (KNOWN_BY_KEY.has(tokenKey(s.chainId, s.token.address))) {
      s.trust = 'verified';
      s.reason = 'Verified token';
    }
  }

  // 2) Within each chain + symbol group, the leader decides who is real.
  const groups = new Map<string, TokenSuggestion[]>();
  for (const s of suggestions) {
    const groupKey = `${s.chainId.toLowerCase()}|${normalizeSymbol(s.token.symbol)}`;
    const list = groups.get(groupKey) || [];
    list.push(s);
    groups.set(groupKey, list);
  }

  for (const list of groups.values()) {
    list.sort((a, b) => {
      if ((a.trust === 'verified') !== (b.trust === 'verified')) {
        return a.trust === 'verified' ? -1 : 1;
      }
      return b.liquidityUsd - a.liquidityUsd;
    });

    const leader = list[0];

    if (leader.trust !== 'verified') {
      const created = leader.pair.pairCreatedAt;
      const ageDays =
        typeof created === 'number' && created > 0
          ? (Date.now() - created) / 86_400_000
          : 0;
      if (
        leader.liquidityUsd >= ESTABLISHED_MIN_LIQUIDITY_USD &&
        ageDays >= ESTABLISHED_MIN_AGE_DAYS
      ) {
        leader.trust = 'established';
        leader.reason = 'Highest liquidity for this symbol, trading 30+ days';
      }
    }

    if (leader.trust === 'verified' || leader.trust === 'established') {
      for (const other of list.slice(1)) {
        if (other.trust === 'verified') continue;
        other.trust = 'lookalike';
        other.reason = `Same symbol as ${leader.token.name || leader.token.symbol}, different address - likely a copy`;
      }
    }
  }

  const rank: Record<TrustLevel, number> = {
    verified: 0,
    established: 1,
    unverified: 2,
    lookalike: 3,
  };

  return suggestions.sort(
    (a, b) => rank[a.trust] - rank[b.trust] || b.liquidityUsd - a.liquidityUsd
  );
}

// Use this for the search dropdown instead of searchTokens().
export async function searchTokensRanked(query: string): Promise<RankedSearchResult> {
  const searchPairs = await searchTokens(query);

  // If the query is a known symbol, fetch the real token directly so it can
  // never be missing from the list.
  const qSymbol = normalizeSymbol(query);
  const forced = qSymbol
    ? KNOWN_TOKENS.filter((t) => normalizeSymbol(t.symbol) === qSymbol)
    : [];

  const forcedKeys = new Set(forced.map((t) => tokenKey(t.chainId, t.address)));
  const forcedPairs = (
    await Promise.all(forced.map((t) => getTokenByAddress(t.address)))
  ).flat();

  const seen = new Set<string>();
  const allPairs = [...forcedPairs, ...searchPairs].filter((p) => {
    const id = `${p.chainId}:${p.pairAddress}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  const ranked = classify(collectCandidates(allPairs, query, forcedKeys));

  return {
    primary: ranked.filter((s) => s.trust === 'verified' || s.trust === 'established'),
    warned: ranked.filter((s) => s.trust === 'unverified' || s.trust === 'lookalike'),
  };
}

// Analyze token for risk factors.
// IMPORTANT: this only sees market data. It cannot detect honeypots, mint
// rights, taxes or hidden owners, so it must never produce a "safe" rating.
// The score is hard-capped at 49 (MEDIUM at best). Use the full scan
// (risk-orchestrator) for a real safety verdict.
export function analyzeTokenRisk(pairs: DexPair[]): {
  score: number;
  marketOnly: boolean;
  factors: { name: string; status: 'safe' | 'warning' | 'danger'; description: string }[];
} {
  if (pairs.length === 0) {
    return { score: 0, marketOnly: true, factors: [] };
  }

  const factors: { name: string; status: 'safe' | 'warning' | 'danger'; description: string }[] = [];
  let score = 50; // Start at 50
  let cap = 49; // market data alone can never reach LOW risk

  // Get the best pair (highest liquidity)
  const mainPair = pairs.reduce((best, pair) =>
    (pair.liquidity?.usd || 0) > (best.liquidity?.usd || 0) ? pair : best
  , pairs[0]);

  // Liquidity check
  const liquidity = mainPair.liquidity?.usd || 0;
  if (liquidity >= 100000) {
    factors.push({ name: 'Liquidity', status: 'safe', description: `$${(liquidity / 1000).toFixed(0)}K liquidity` });
    score += 15;
  } else if (liquidity >= 10000) {
    factors.push({ name: 'Liquidity', status: 'warning', description: `$${(liquidity / 1000).toFixed(0)}K liquidity - moderate` });
    score += 5;
  } else {
    factors.push({ name: 'Liquidity', status: 'danger', description: `Low liquidity: $${liquidity.toFixed(0)}` });
    score -= 15;
    cap = Math.min(cap, 39);
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
  const buys24h = mainPair.txns?.h24?.buys || 0;
  const sells24h = mainPair.txns?.h24?.sells || 0;
  const txns24h = buys24h + sells24h;
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
  if (buys24h >= 20 && sells24h === 0) {
    // Classic honeypot signature: people can buy, nobody can sell
    factors.push({ name: 'No Sells Recorded', status: 'danger', description: `${buys24h} buys and 0 sells in 24h - possible honeypot` });
    score -= 30;
    cap = Math.min(cap, 25);
  } else if (buys24h > 0 && sells24h > 0) {
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

  // Price change (missing data is unknown, not "stable")
  const rawChange = mainPair.priceChange?.h24;
  if (typeof rawChange === 'number' && Number.isFinite(rawChange)) {
    if (rawChange >= -10 && rawChange <= 50) {
      factors.push({ name: 'Price Stability', status: 'safe', description: `${rawChange >= 0 ? '+' : ''}${rawChange.toFixed(1)}% (24h)` });
      score += 5;
    } else if (rawChange < -30) {
      factors.push({ name: 'Price Drop', status: 'danger', description: `${rawChange.toFixed(1)}% drop in 24h` });
      score -= 15;
    } else {
      factors.push({ name: 'Price Volatility', status: 'warning', description: `${rawChange >= 0 ? '+' : ''}${rawChange.toFixed(1)}% (24h)` });
    }
  }

  // Pair age: brand-new pairs are the classic rug window
  const created = mainPair.pairCreatedAt;
  if (typeof created === 'number' && created > 0) {
    const ageHours = (Date.now() - created) / 3_600_000;
    if (ageHours < 24) {
      factors.push({ name: 'Very New Pair', status: 'danger', description: `Trading pair created ${Math.max(1, Math.round(ageHours))}h ago` });
      cap = Math.min(cap, 35);
    } else if (ageHours < 168) {
      factors.push({ name: 'New Pair', status: 'warning', description: `Trading pair is ${Math.round(ageHours / 24)} days old` });
    }
  }

  // Has info/socials (a website is easy to fake, so it only adds a little)
  if (mainPair.info?.websites?.length || mainPair.info?.socials?.length) {
    factors.push({ name: 'Social Presence', status: 'safe', description: 'Has listed links' });
    score += 5;
  }

  // Always tell the user what this score does NOT cover
  factors.push({
    name: 'Security Checks',
    status: 'warning',
    description: 'Market data only - contract not checked for honeypots, mint rights or taxes. Run a full scan.',
  });

  // Normalize and cap
  score = Math.max(0, Math.min(cap, score));

  return { score, marketOnly: true, factors };
}
