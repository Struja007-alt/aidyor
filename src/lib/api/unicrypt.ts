// Liquidity Lock Verification APIs
// Supports: Unicrypt, Team Finance, PinkSale, DXSale, and burn-address detection

export interface LockInfo {
  isLocked: boolean;
  lockPercentage: number;
  unlockDate: number | null;
  lockDuration: string | null;
  lockerPlatform: string;
  // 'unknown' means the data was too ambiguous to confidently classify —
  // distinct from 'unlocked', which means we positively identified an
  // unprotected liquidity position. Callers should not penalize 'unknown'
  // the same way as 'unlocked'.
  status?: 'burned' | 'locked' | 'protocol' | 'unlocked' | 'unknown';
}

// Keep backwards compatibility
export type UnicryptLockInfo = LockInfo;

// Chain ID mappings for different platforms
const networkToChainId: Record<string, number> = {
  'ETH': 1,
  'BSC': 56,
  'POLYGON': 137,
  'ARB': 42161,
  'BASE': 8453,
  'AVAX': 43114,
};

const networkToUnicryptChain: Record<string, string> = {
  'ETH': 'Ethereum',
  'BSC': 'BNB Chain',
  'POLYGON': 'Polygon',
  'ARB': 'Arbitrum',
  'BASE': 'Base',
  'AVAX': 'Avalanche',
};
