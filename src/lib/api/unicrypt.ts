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

// Known permanent burn / dead addresses. LP tokens sent here are
// unrecoverable forever — at least as safe as a timed lock, since a lock
// eventually expires and lets the deployer withdraw, while a burn never does.
const BURN_ADDRESSES = new Set([
  '0x000000000000000000000000000000000000dead',
  '0x0000000000000000000000000000000000dead',
  '0x0000000000000000000000000000000000000000',
]);

// Newer DEX architectures (Uniswap V4 and similar "singleton" pool managers)
// don't issue a transferable LP token at all — all pools share one contract
// that holds close to 100% of "LP supply" by design. That's normal, not a
// risk, but GoPlus has no way to flag it as such — it just looks like an
// unlocked whale. Confirmed against a live GoPlus response for PEPE, where
// this exact address held 99.7% of "LP supply" with is_locked: 0.
const KNOWN_POOL_MANAGER_ADDRESSES = new Set([
  '0x000000000004444c5dc75cb358380d2e3de08a90', // Uniswap V4 PoolManager (same address across all chains it's deployed on)
]);

type LpHolder = { address: string; percent: string; is_locked: number; tag?: string; is_contract?: number };

// Reads GoPlus's lp_holders breakdown (the actual LP/pool-token holder list —
// distinct from its general "holders" field, which covers the token itself)
// and classifies what's protecting the liquidity, if anything.
//
// Deliberately conservative: when the top holder is an unrecognized contract,
// we cannot tell a genuine unlocked risk apart from a locker GoPlus doesn't
// tag, a DEX's internal pool-accounting contract, or an aggregator holding on
// users' behalf. Rather than guess, this returns 'unknown' so the caller can
// fall back to checking the named locker platforms before concluding
// anything, instead of confidently asserting "unlocked" on ambiguous data.
function analyzeLpHolders(lpHolders?: LpHolder[]): LockInfo | null {
  if (!lpHolders || lpHolders.length === 0) return null;

  let burnedPercent = 0;
  let lockedPercent = 0;
  let protocolPercent = 0;
  let unverifiedContractPercent = 0;
  let eoaUnlockedPercent = 0;
  let lockerTag: string | null = null;

  for (const holder of lpHolders) {
    const addr = (holder.address || '').toLowerCase();
    const tag = (holder.tag || '').toLowerCase();
    const pct = (parseFloat(holder.percent) || 0) * 100;

    if (BURN_ADDRESSES.has(addr) || tag.includes('burn')) {
      burnedPercent += pct;
    } else if (holder.is_locked === 1) {
      lockedPercent += pct;
      if (holder.tag) lockerTag = holder.tag;
    } else if (KNOWN_POOL_MANAGER_ADDRESSES.has(addr)) {
      protocolPercent += pct;
    } else if (holder.is_contract === 1) {
      unverifiedContractPercent += pct; // unrecognized contract — genuinely ambiguous
    } else {
      eoaUnlockedPercent += pct; // a regular wallet holding LP tokens loose — a real, unambiguous risk
    }
  }

  if (burnedPercent >= 1) {
    return {
      status: 'burned',
      isLocked: true,
      lockPercentage: Math.min(100, Math.round(burnedPercent)),
      unlockDate: null,
      lockDuration: 'Permanent (burned)',
      lockerPlatform: 'Burned (dead address)',
    };
  }

  if (lockedPercent >= 1) {
    return {
      status: 'locked',
      isLocked: true,
      lockPercentage: Math.min(100, Math.round(lockedPercent)),
      unlockDate: null,
      lockDuration: null,
      lockerPlatform: lockerTag || 'Locked (per GoPlus)',
    };
  }

  if (protocolPercent >= 50) {
    return {
      status: 'protocol',
      isLocked: true, // treated as not-a-risk, not as "protection" per se
      lockPercentage: Math.round(protocolPercent),
      unlockDate: null,
      lockDuration: null,
      lockerPlatform: 'DEX pool contract (e.g. Uniswap V4) — no transferable LP token',
    };
  }

  if (unverifiedContractPercent >= 30) {
    return {
      status: 'unknown',
      isLocked: false,
      lockPercentage: 0,
      unlockDate: null,
      lockDuration: null,
      lockerPlatform: 'Unrecognized contract — unable to verify',
    };
  }

  if (eoaUnlockedPercent >= 30) {
    return {
      status: 'unlocked',
      isLocked: false,
      lockPercentage: 0,
      unlockDate: null,
      lockDuration: null,
      lockerPlatform: 'None detected',
    };
  }

  return null; // no single holder dominant enough to classify confidently — fall through to locker-platform checks
}

// Main function: Check burn status, then all lock platforms in parallel
export async function getLiquidityLockInfo(
  tokenAddress: string,
  network: string,
  lpHolders?: { address: string; percent: string; is_locked: number; tag?: string }[]
): Promise<LockInfo | null> {
  // Input validation
  if (!tokenAddress || typeof tokenAddress !== 'string') return null;
  const sanitized = tokenAddress.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/i.test(sanitized)) return null;

  const chainId = networkToChainId[network];
  if (!chainId) return null;

  // Check GoPlus's own LP-holder breakdown first. Burned, registered-locked,
  // and DEX-protocol-managed liquidity (e.g. Uniswap V4) are all definitive
  // signals — return immediately, no need to also hit four more APIs.
  const lpHolderResult = analyzeLpHolders(lpHolders);
  if (lpHolderResult && (lpHolderResult.status === 'burned' || lpHolderResult.status === 'locked' || lpHolderResult.status === 'protocol')) {
    return lpHolderResult;
  }
  // 'unlocked' and 'unknown' are NOT returned yet — they're provisional.
  // GoPlus flagging a holder as unlocked doesn't rule out a real lock that
  // it simply didn't tag, so we still check the four locker platforms below
  // before drawing a final conclusion.

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

    // No registered lock found on any of the four platforms. Fall back to
    // whatever GoPlus's LP-holder data suggested, if anything — a positively
    // identified EOA holding unlocked LP is a real 'unlocked' finding, but
    // an ambiguous unrecognized contract stays 'unknown' rather than being
    // upgraded to a confident danger claim just because we ran out of places
    // to check.
    if (lpHolderResult) return lpHolderResult;
    return getDefaultLockInfo();
  } catch (error) {
    console.error('Lock verification error:', error);
    if (lpHolderResult) return lpHolderResult;
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

// Only reached when there's truly no signal anywhere: no GoPlus lp_holders
// data and no hit on any of the four locker platforms. That's an absence of
// information, not positive evidence of a risk — so this is 'unknown', not
// a confident 'unlocked' danger claim.
function getDefaultLockInfo(): LockInfo {
  return {
    status: 'unknown',
    isLocked: false,
    lockPercentage: 0,
    unlockDate: null,
    lockDuration: null,
    lockerPlatform: 'Unable to verify — no data available',
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

// Analyze lock status for risk scoring.
// FIXED: scoring polarity was previously inverted — a fully locked/burned
// token was penalized (score -= 15) while a fully unlocked token was
// rewarded (score += 25). This flips it so "safe" factors add to the score
// and "danger" factors subtract, matching the convention used everywhere
// else in the app (e.g. goplus.ts).
export function analyzeLockSecurity(lockInfo: LockInfo): {
  score: number;
  factors: { name: string; status: 'safe' | 'warning' | 'danger'; description: string }[];
} {
  const factors: { name: string; status: 'safe' | 'warning' | 'danger'; description: string }[] = [];
  let score = 0;

  // 'unknown' is deliberately neutral: we could not confidently determine
  // lock status (e.g. an unrecognized contract holds the LP tokens), so we
  // say so plainly rather than defaulting to a confident danger claim.
  if (lockInfo.status === 'unknown') {
    factors.push({
      name: 'Liquidity Lock',
      status: 'warning',
      description: 'Unable to verify liquidity lock status',
    });
    return { score: 0, factors };
  }

  if (lockInfo.status === 'protocol') {
    factors.push({
      name: 'Liquidity Structure',
      status: 'safe',
      description: lockInfo.lockerPlatform,
    });
    return { score: 5, factors };
  }

  if (lockInfo.isLocked) {
    if (lockInfo.lockPercentage >= 90) {
      factors.push({
        name: lockInfo.lockerPlatform.startsWith('Burned') ? 'Liquidity Burned' : 'Liquidity Lock',
        status: 'safe',
        description: `${lockInfo.lockPercentage.toFixed(0)}% secured via ${lockInfo.lockerPlatform}`,
      });
      score += 15;
    } else if (lockInfo.lockPercentage >= 50) {
      factors.push({
        name: 'Liquidity Lock',
        status: 'warning',
        description: `Only ${lockInfo.lockPercentage.toFixed(0)}% locked via ${lockInfo.lockerPlatform}`,
      });
      score -= 5;
    } else {
      factors.push({
        name: 'Liquidity Lock',
        status: 'warning',
        description: `Low lock: ${lockInfo.lockPercentage.toFixed(0)}% via ${lockInfo.lockerPlatform}`,
      });
      score -= 10;
    }

    // Check unlock timing (not applicable to permanent burns, which have no unlockDate)
    if (lockInfo.unlockDate) {
      const daysUntilUnlock = (lockInfo.unlockDate - Date.now()) / (1000 * 60 * 60 * 24);

      if (daysUntilUnlock > 365) {
        factors.push({
          name: 'Lock Duration',
          status: 'safe',
          description: `Locked for ${lockInfo.lockDuration}`,
        });
        score += 5;
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
        score -= 10;
      } else {
        factors.push({
          name: 'Lock Duration',
          status: 'danger',
          description: 'Lock has expired',
        });
        score -= 20;
      }
    }
  } else {
    factors.push({
      name: 'Liquidity Lock',
      status: 'danger',
      description: 'No liquidity lock or burn detected',
    });
    score -= 25;
  }

  return { score, factors };
}
