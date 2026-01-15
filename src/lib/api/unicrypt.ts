// Unicrypt API - Liquidity Lock Verification
// Docs: https://docs.unicrypt.network/

export interface UnicryptLockInfo {
  isLocked: boolean;
  lockPercentage: number;
  unlockDate: number | null;
  lockDuration: string | null;
  lockerPlatform: string;
}

// Network to Unicrypt chain mapping
const networkToUnicryptChain: Record<string, string> = {
  'ETH': 'Ethereum',
  'BSC': 'BNB Chain',
  'POLYGON': 'Polygon',
  'ARB': 'Arbitrum',
  'BASE': 'Base',
  'AVAX': 'Avalanche',
};

// Check if liquidity is locked via Unicrypt or other lockers
export async function getLiquidityLockInfo(
  tokenAddress: string, 
  network: string
): Promise<UnicryptLockInfo | null> {
  const chain = networkToUnicryptChain[network];
  if (!chain) return null; // Not supported for this chain

  try {
    // Unicrypt public API endpoint
    const response = await fetch(
      `https://api.uncx.network/api/v1/locks?token_address=${tokenAddress.toLowerCase()}&chain=${encodeURIComponent(chain)}`
    );

    if (!response.ok) {
      // Try fallback check with Team Finance API
      return await checkTeamFinanceLock(tokenAddress, network);
    }

    const data = await response.json();
    
    if (!data.locks || data.locks.length === 0) {
      // Check Team Finance as fallback
      return await checkTeamFinanceLock(tokenAddress, network);
    }

    // Calculate total locked percentage
    let totalLocked = 0;
    let latestUnlock: number | null = null;

    for (const lock of data.locks) {
      totalLocked += parseFloat(lock.amount_locked_percent || '0');
      const unlockTime = parseInt(lock.unlock_time);
      if (!latestUnlock || unlockTime > latestUnlock) {
        latestUnlock = unlockTime;
      }
    }

    const lockDuration = latestUnlock 
      ? formatLockDuration(latestUnlock * 1000 - Date.now())
      : null;

    return {
      isLocked: totalLocked > 0,
      lockPercentage: Math.min(100, totalLocked),
      unlockDate: latestUnlock ? latestUnlock * 1000 : null,
      lockDuration,
      lockerPlatform: 'Unicrypt',
    };
  } catch (error) {
    console.error('Unicrypt API error:', error);
    // Try Team Finance as fallback
    return await checkTeamFinanceLock(tokenAddress, network);
  }
}

// Fallback: Check Team Finance locks
async function checkTeamFinanceLock(
  tokenAddress: string,
  network: string
): Promise<UnicryptLockInfo | null> {
  const chainIds: Record<string, number> = {
    'ETH': 1,
    'BSC': 56,
    'POLYGON': 137,
    'ARB': 42161,
    'BASE': 8453,
    'AVAX': 43114,
  };

  const chainId = chainIds[network];
  if (!chainId) return null;

  try {
    const response = await fetch(
      `https://api.teamfinance.io/v1/locks/token/${tokenAddress.toLowerCase()}?chainId=${chainId}`
    );

    if (!response.ok) {
      return getDefaultLockInfo();
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return getDefaultLockInfo();
    }

    let totalLocked = 0;
    let latestUnlock: number | null = null;

    for (const lock of data.data) {
      totalLocked += parseFloat(lock.lockedPercentage || '0');
      const unlockTime = parseInt(lock.unlockTime);
      if (!latestUnlock || unlockTime > latestUnlock) {
        latestUnlock = unlockTime;
      }
    }

    const lockDuration = latestUnlock
      ? formatLockDuration(latestUnlock * 1000 - Date.now())
      : null;

    return {
      isLocked: totalLocked > 0,
      lockPercentage: Math.min(100, totalLocked),
      unlockDate: latestUnlock ? latestUnlock * 1000 : null,
      lockDuration,
      lockerPlatform: 'Team Finance',
    };
  } catch (error) {
    console.error('Team Finance API error:', error);
    return getDefaultLockInfo();
  }
}

function getDefaultLockInfo(): UnicryptLockInfo {
  return {
    isLocked: false,
    lockPercentage: 0,
    unlockDate: null,
    lockDuration: null,
    lockerPlatform: 'Unknown',
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
export function analyzeLockSecurity(lockInfo: UnicryptLockInfo): {
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
      score -= 15; // Good sign
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
    score += 25; // Major red flag
  }

  return { score, factors };
}
