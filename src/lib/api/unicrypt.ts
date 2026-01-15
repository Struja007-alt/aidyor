// Liquidity Lock Verification APIs
// Supports: Unicrypt, Team Finance, PinkSale, DXSale

export interface LockInfo {
  isLocked: boolean;
  lockPercentage: number;
  unlockDate: number | null;
  lockDuration: string | null;
  lockerPlatform: string;
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

// Main function: Check all lock platforms in parallel
export async function getLiquidityLockInfo(
  tokenAddress: string, 
  network: string
): Promise<LockInfo | null> {
  const chainId = networkToChainId[network];
  if (!chainId) return null;

  try {
    // Check all platforms in parallel for speed
    const [unicryptResult, teamFinanceResult, pinkSaleResult, dxSaleResult] = await Promise.allSettled([
      checkUnicryptLock(tokenAddress, network),
      checkTeamFinanceLock(tokenAddress, network),
      checkPinkSaleLock(tokenAddress, network),
      checkDxSaleLock(tokenAddress, network),
    ]);

    // Collect successful results
    const results: LockInfo[] = [];
    
    if (unicryptResult.status === 'fulfilled' && unicryptResult.value?.isLocked) {
      results.push(unicryptResult.value);
    }
    if (teamFinanceResult.status === 'fulfilled' && teamFinanceResult.value?.isLocked) {
      results.push(teamFinanceResult.value);
    }
    if (pinkSaleResult.status === 'fulfilled' && pinkSaleResult.value?.isLocked) {
      results.push(pinkSaleResult.value);
    }
    if (dxSaleResult.status === 'fulfilled' && dxSaleResult.value?.isLocked) {
      results.push(dxSaleResult.value);
    }

    // Return the best lock (highest percentage, longest duration)
    if (results.length > 0) {
      return results.reduce((best, current) => {
        if (current.lockPercentage > best.lockPercentage) return current;
        if (current.lockPercentage === best.lockPercentage && 
            (current.unlockDate || 0) > (best.unlockDate || 0)) return current;
        return best;
      });
    }

    // No locks found
    return getDefaultLockInfo();
  } catch (error) {
    console.error('Lock verification error:', error);
    return getDefaultLockInfo();
  }
}

// Unicrypt (UNCX) lock check
async function checkUnicryptLock(
  tokenAddress: string,
  network: string
): Promise<LockInfo | null> {
  const chain = networkToUnicryptChain[network];
  if (!chain) return null;

  try {
    const response = await fetch(
      `https://api.uncx.network/api/v1/locks?token_address=${tokenAddress.toLowerCase()}&chain=${encodeURIComponent(chain)}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) return null;

    const data = await response.json();
    
    if (!data.locks || data.locks.length === 0) return null;

    let totalLocked = 0;
    let latestUnlock: number | null = null;

    for (const lock of data.locks) {
      totalLocked += parseFloat(lock.amount_locked_percent || '0');
      const unlockTime = parseInt(lock.unlock_time);
      if (!latestUnlock || unlockTime > latestUnlock) {
        latestUnlock = unlockTime;
      }
    }

    return {
      isLocked: totalLocked > 0,
      lockPercentage: Math.min(100, totalLocked),
      unlockDate: latestUnlock ? latestUnlock * 1000 : null,
      lockDuration: latestUnlock ? formatLockDuration(latestUnlock * 1000 - Date.now()) : null,
      lockerPlatform: 'Unicrypt',
    };
  } catch (error) {
    console.error('Unicrypt API error:', error);
    return null;
  }
}

// Team Finance lock check
async function checkTeamFinanceLock(
  tokenAddress: string,
  network: string
): Promise<LockInfo | null> {
  const chainId = networkToChainId[network];
  if (!chainId) return null;

  try {
    const response = await fetch(
      `https://api.teamfinance.io/v1/locks/token/${tokenAddress.toLowerCase()}?chainId=${chainId}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) return null;

    const data = await response.json();

    if (!data.data || data.data.length === 0) return null;

    let totalLocked = 0;
    let latestUnlock: number | null = null;

    for (const lock of data.data) {
      totalLocked += parseFloat(lock.lockedPercentage || '0');
      const unlockTime = parseInt(lock.unlockTime);
      if (!latestUnlock || unlockTime > latestUnlock) {
        latestUnlock = unlockTime;
      }
    }

    return {
      isLocked: totalLocked > 0,
      lockPercentage: Math.min(100, totalLocked),
      unlockDate: latestUnlock ? latestUnlock * 1000 : null,
      lockDuration: latestUnlock ? formatLockDuration(latestUnlock * 1000 - Date.now()) : null,
      lockerPlatform: 'Team Finance',
    };
  } catch (error) {
    console.error('Team Finance API error:', error);
    return null;
  }
}

// PinkSale lock check
async function checkPinkSaleLock(
  tokenAddress: string,
  network: string
): Promise<LockInfo | null> {
  const chainId = networkToChainId[network];
  if (!chainId) return null;

  try {
    // PinkSale API endpoint
    const response = await fetch(
      `https://api.pinksale.finance/api/v1/lock/token/${tokenAddress.toLowerCase()}?chainId=${chainId}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) {
      // Try alternative PinkSale endpoint
      return await checkPinkSaleAlternative(tokenAddress, chainId);
    }

    const data = await response.json();

    if (!data.data || !data.data.locks || data.data.locks.length === 0) {
      return await checkPinkSaleAlternative(tokenAddress, chainId);
    }

    let totalLocked = 0;
    let latestUnlock: number | null = null;

    for (const lock of data.data.locks) {
      const lockPercent = parseFloat(lock.percent || lock.amount_percent || '0');
      totalLocked += lockPercent;
      const unlockTime = parseInt(lock.unlock_date || lock.tge_date || '0');
      if (unlockTime && (!latestUnlock || unlockTime > latestUnlock)) {
        latestUnlock = unlockTime;
      }
    }

    return {
      isLocked: totalLocked > 0,
      lockPercentage: Math.min(100, totalLocked),
      unlockDate: latestUnlock ? latestUnlock * 1000 : null,
      lockDuration: latestUnlock ? formatLockDuration(latestUnlock * 1000 - Date.now()) : null,
      lockerPlatform: 'PinkSale',
    };
  } catch (error) {
    console.error('PinkSale API error:', error);
    return null;
  }
}

// PinkSale alternative endpoint
async function checkPinkSaleAlternative(
  tokenAddress: string,
  chainId: number
): Promise<LockInfo | null> {
  try {
    const response = await fetch(
      `https://api.pinksale.finance/api/v2/locks?address=${tokenAddress.toLowerCase()}&chain_id=${chainId}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) return null;

    const data = await response.json();

    if (!data.locks || data.locks.length === 0) return null;

    let totalLocked = 0;
    let latestUnlock: number | null = null;

    for (const lock of data.locks) {
      totalLocked += parseFloat(lock.locked_percent || '0');
      const unlockTime = parseInt(lock.unlock_time || '0');
      if (unlockTime && (!latestUnlock || unlockTime > latestUnlock)) {
        latestUnlock = unlockTime;
      }
    }

    return {
      isLocked: totalLocked > 0,
      lockPercentage: Math.min(100, totalLocked),
      unlockDate: latestUnlock ? latestUnlock * 1000 : null,
      lockDuration: latestUnlock ? formatLockDuration(latestUnlock * 1000 - Date.now()) : null,
      lockerPlatform: 'PinkSale',
    };
  } catch (error) {
    console.error('PinkSale alternative API error:', error);
    return null;
  }
}

// DXSale lock check
async function checkDxSaleLock(
  tokenAddress: string,
  network: string
): Promise<LockInfo | null> {
  const chainId = networkToChainId[network];
  if (!chainId) return null;

  // DXSale chain slug mapping
  const dxSaleChains: Record<number, string> = {
    1: 'eth',
    56: 'bsc',
    137: 'polygon',
    42161: 'arbitrum',
    43114: 'avax',
  };

  const chainSlug = dxSaleChains[chainId];
  if (!chainSlug) return null;

  try {
    // DXSale API endpoint
    const response = await fetch(
      `https://api.dxsale.network/v1/locks/${chainSlug}/${tokenAddress.toLowerCase()}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) {
      // Try alternative DXLocker endpoint
      return await checkDxLockerAlternative(tokenAddress, chainId);
    }

    const data = await response.json();

    if (!data.locks || data.locks.length === 0) {
      return await checkDxLockerAlternative(tokenAddress, chainId);
    }

    let totalLocked = 0;
    let latestUnlock: number | null = null;

    for (const lock of data.locks) {
      totalLocked += parseFloat(lock.locked_percent || lock.percentage || '0');
      const unlockTime = parseInt(lock.unlock_date || lock.end_time || '0');
      if (unlockTime && (!latestUnlock || unlockTime > latestUnlock)) {
        latestUnlock = unlockTime;
      }
    }

    return {
      isLocked: totalLocked > 0,
      lockPercentage: Math.min(100, totalLocked),
      unlockDate: latestUnlock ? latestUnlock * 1000 : null,
      lockDuration: latestUnlock ? formatLockDuration(latestUnlock * 1000 - Date.now()) : null,
      lockerPlatform: 'DXSale',
    };
  } catch (error) {
    console.error('DXSale API error:', error);
    return null;
  }
}

// DXLocker alternative endpoint
async function checkDxLockerAlternative(
  tokenAddress: string,
  chainId: number
): Promise<LockInfo | null> {
  try {
    const response = await fetch(
      `https://api.dxlock.io/api/v1/token-locks?token=${tokenAddress.toLowerCase()}&chainId=${chainId}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) return null;

    const data = await response.json();

    if (!data.data || data.data.length === 0) return null;

    let totalLocked = 0;
    let latestUnlock: number | null = null;

    for (const lock of data.data) {
      totalLocked += parseFloat(lock.lockedPercent || '0');
      const unlockTime = parseInt(lock.unlockTime || '0');
      if (unlockTime && (!latestUnlock || unlockTime > latestUnlock)) {
        latestUnlock = unlockTime;
      }
    }

    return {
      isLocked: totalLocked > 0,
      lockPercentage: Math.min(100, totalLocked),
      unlockDate: latestUnlock ? latestUnlock * 1000 : null,
      lockDuration: latestUnlock ? formatLockDuration(latestUnlock * 1000 - Date.now()) : null,
      lockerPlatform: 'DXLocker',
    };
  } catch (error) {
    console.error('DXLocker alternative API error:', error);
    return null;
  }
}

function getDefaultLockInfo(): LockInfo {
  return {
    isLocked: false,
    lockPercentage: 0,
    unlockDate: null,
    lockDuration: null,
    lockerPlatform: 'None detected',
  };
}

function formatLockDuration(ms: number): string {
  if (ms <= 0) return 'Unlocked';
  
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) {
    return `${years} year${years > 1 ? 's' : ''}`;
  } else if (months > 0) {
    return `${months} month${months > 1 ? 's' : ''}`;
  } else if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  } else {
    return 'Less than 1 day';
  }
}

// Analyze lock status for risk scoring
export function analyzeLockSecurity(lockInfo: LockInfo): {
  score: number;
  factors: { name: string; status: 'safe' | 'warning' | 'danger'; description: string }[];
} {
  const factors: { name: string; status: 'safe' | 'warning' | 'danger'; description: string }[] = [];
  let score = 0;

  if (lockInfo.isLocked) {
    if (lockInfo.lockPercentage >= 90) {
      factors.push({
        name: 'Liquidity Lock',
        status: 'safe',
        description: `${lockInfo.lockPercentage.toFixed(0)}% locked via ${lockInfo.lockerPlatform}`,
      });
      score -= 15;
    } else if (lockInfo.lockPercentage >= 50) {
      factors.push({
        name: 'Liquidity Lock',
        status: 'warning',
        description: `Only ${lockInfo.lockPercentage.toFixed(0)}% locked via ${lockInfo.lockerPlatform}`,
      });
      score += 5;
    } else {
      factors.push({
        name: 'Liquidity Lock',
        status: 'warning',
        description: `Low lock: ${lockInfo.lockPercentage.toFixed(0)}% via ${lockInfo.lockerPlatform}`,
      });
      score += 10;
    }

    // Check unlock timing
    if (lockInfo.unlockDate) {
      const daysUntilUnlock = (lockInfo.unlockDate - Date.now()) / (1000 * 60 * 60 * 24);
      
      if (daysUntilUnlock > 365) {
        factors.push({
          name: 'Lock Duration',
          status: 'safe',
          description: `Locked for ${lockInfo.lockDuration}`,
        });
        score -= 5;
      } else if (daysUntilUnlock > 90) {
        factors.push({
          name: 'Lock Duration',
          status: 'safe',
          description: `Unlocks in ${lockInfo.lockDuration}`,
        });
      } else if (daysUntilUnlock > 0) {
        factors.push({
          name: 'Lock Duration',
          status: 'warning',
          description: `Unlocks soon: ${lockInfo.lockDuration}`,
        });
        score += 10;
      } else {
        factors.push({
          name: 'Lock Duration',
          status: 'danger',
          description: 'Lock has expired',
        });
        score += 20;
      }
    }
  } else {
    factors.push({
      name: 'Liquidity Lock',
      status: 'danger',
      description: 'No liquidity lock detected',
    });
    score += 25;
  }

  return { score, factors };
}
