// Known tokens with their original/home networks (verified contracts)
// These tokens originated on specific chains and copies elsewhere are bridged/wrapped

export const knownOriginalNetworks: Record<string, string[]> = {
  // Major meme coins - originated on Ethereum
  'PEPE': ['ethereum'],
  'SHIB': ['ethereum'],
  'DOGE': ['ethereum'], // Wrapped DOGE on DEXs
  'FLOKI': ['ethereum', 'bsc'],
  'WOJAK': ['ethereum'],
  'MEME': ['ethereum'],
  'ELON': ['ethereum'],
  'KISHU': ['ethereum'],
  'LEASH': ['ethereum'],
  'BONE': ['ethereum'],
  'AKITA': ['ethereum'],
  'HOGE': ['ethereum'],
  'SAMO': ['solana'],
  'MYRO': ['solana'],
  'POPCAT': ['solana'],
  'MEW': ['solana'],
  'BOME': ['solana'],
  'SLERF': ['solana'],
  'GOAT': ['solana'],
  'MOODENG': ['solana'],
  'PNUT': ['solana'],
  'BABYDOGE': ['bsc'],
  'SAFEMOON': ['bsc'],
  // Major stablecoins - multi-chain native but ETH is primary
  'USDT': ['ethereum', 'tron'],
  'USDC': ['ethereum'],
  'DAI': ['ethereum'],
  'BUSD': ['bsc'],
  'FRAX': ['ethereum'],
  'TUSD': ['ethereum'],
  'LUSD': ['ethereum'],
  // Major DeFi tokens - Ethereum
  'UNI': ['ethereum'],
  'AAVE': ['ethereum'],
  'LINK': ['ethereum'],
  'WBTC': ['ethereum'],
  'WETH': ['ethereum'],
  'MKR': ['ethereum'],
  'SNX': ['ethereum'],
  'COMP': ['ethereum'],
  'CRV': ['ethereum'],
  'LDO': ['ethereum'],
  'RPL': ['ethereum'],
  'ENS': ['ethereum'],
  'GRT': ['ethereum'],
  'FXS': ['ethereum'],
  'CVX': ['ethereum'],
  'BAL': ['ethereum'],
  'SUSHI': ['ethereum'],
  '1INCH': ['ethereum'],
  'DYDX': ['ethereum'],
  'YFI': ['ethereum'],
  'REN': ['ethereum'],
  'LQTY': ['ethereum'],
  'SPELL': ['ethereum'],
  // Layer 2 tokens
  'OP': ['optimism'],
  'STRK': ['ethereum'], // Starknet token on ETH
  'IMX': ['ethereum'],
  'LRC': ['ethereum'],
  'ZK': ['ethereum'],
  'METIS': ['ethereum'],
  // Infrastructure & Oracle tokens
  'FET': ['ethereum'],
  'OCEAN': ['ethereum'],
  'BAND': ['ethereum'],
  'API3': ['ethereum'],
  'TRB': ['ethereum'],
  // Gaming & Metaverse - Ethereum
  'SAND': ['ethereum'],
  'MANA': ['ethereum'],
  'AXS': ['ethereum'],
  'APE': ['ethereum'],
  'GALA': ['ethereum'],
  'ILV': ['ethereum'],
  'ENJ': ['ethereum'],
  'BLUR': ['ethereum'],
  // Solana native tokens
  'SOL': ['solana'],
  'BONK': ['solana'],
  'WIF': ['solana'],
  'JUP': ['solana'],
  'PYTH': ['solana'],
  'RAY': ['solana'],
  'ORCA': ['solana'],
  'MNDE': ['solana'],
  'MSOL': ['solana'],
  'JITO': ['solana'],
  'TENSOR': ['solana'],
  'W': ['solana'],
  'RENDER': ['solana', 'ethereum'],
  'HNT': ['solana'],
  // BSC native tokens
  'CAKE': ['bsc'],
  'BNB': ['bsc'],
  'XVS': ['bsc'],
  'ALPACA': ['bsc'],
  'BAKE': ['bsc'],
  'TWT': ['bsc'],
  // Polygon native
  'MATIC': ['polygon', 'ethereum'],
  'POL': ['polygon'],
  'QUICK': ['polygon'],
  // Arbitrum native
  'ARB': ['arbitrum'],
  'GMX': ['arbitrum', 'avalanche'],
  'MAGIC': ['arbitrum'],
  'RDNT': ['arbitrum'],
  'PENDLE': ['arbitrum', 'ethereum'],
  'GNS': ['arbitrum'],
  // Base native
  'BRETT': ['base'],
  'DEGEN': ['base'],
  'TOSHI': ['base'],
  'AERO': ['base'],
  // Avalanche native
  'AVAX': ['avalanche'],
  'JOE': ['avalanche'],
  'PNG': ['avalanche'],
  // Other major L1 tokens (for cross-chain detection)
  'FTM': ['fantom'],
  'NEAR': ['near'],
  'ATOM': ['cosmos'],
  'DOT': ['polkadot'],
  'ADA': ['cardano'],
  'XRP': ['xrp'],
  'TRX': ['tron'],
  'TON': ['ton'],
};

/**
 * Get merged known networks including community mappings
 * Community mappings take precedence over hardcoded values
 */
export function getMergedKnownNetworks(
  communityMappings: Record<string, string[]>
): Record<string, string[]> {
  return { ...knownOriginalNetworks, ...communityMappings };
}

/**
 * Check if a token is on its known original network
 */
export function isOnOriginalNetwork(
  symbol: string,
  chainId: string,
  communityMappings: Record<string, string[]> = {}
): boolean {
  const merged = getMergedKnownNetworks(communityMappings);
  const networks = merged[symbol.toUpperCase()];
  return networks?.includes(chainId.toLowerCase()) || false;
}
