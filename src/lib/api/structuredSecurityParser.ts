// Structured Security Data Parser
// Parses and analyzes security data in the standardized JSON format

export interface StructuredSecurityData {
  owner_renounced: boolean;
  mint_function: boolean;
  blacklist_function: boolean;
  lp_locked: boolean;
  lp_lock_duration_days: number;
  holder_concentration_top10: number;
  // Optional extended fields
  pausable?: boolean;
  proxy_contract?: boolean;
  hidden_owner?: boolean;
  honeypot?: boolean;
  buy_tax_percent?: number;
  sell_tax_percent?: number;
  verified_contract?: boolean;
}

export interface ParsedSecurityResult {
  score: number;
  factors: { name: string; status: 'safe' | 'warning' | 'danger'; description: string }[];
  securityData: {
    isHoneypot: boolean;
    isVerified: boolean;
    holderCount: number;
    buyTax: number;
    sellTax: number;
    isMintable: boolean;
    hasHiddenOwner: boolean;
    ownerRenounced: boolean;
    lpLocked: boolean;
    lpLockDays: number;
    holderConcentration: number;
    hasBlacklist: boolean;
  };
  criticalIssues: string[];
  warnings: string[];
}

/**
 * Validates if an object matches the StructuredSecurityData format
 */
export function isStructuredSecurityData(data: unknown): data is StructuredSecurityData {
  if (!data || typeof data !== 'object') return false;
  
  const obj = data as Record<string, unknown>;
  
  // Required fields check
  const requiredFields = [
    'owner_renounced',
    'mint_function',
    'blacklist_function',
    'lp_locked',
    'lp_lock_duration_days',
    'holder_concentration_top10'
  ];
  
  for (const field of requiredFields) {
    if (!(field in obj)) return false;
  }
  
  // Type validation
  if (typeof obj.owner_renounced !== 'boolean') return false;
  if (typeof obj.mint_function !== 'boolean') return false;
  if (typeof obj.blacklist_function !== 'boolean') return false;
  if (typeof obj.lp_locked !== 'boolean') return false;
  if (typeof obj.lp_lock_duration_days !== 'number') return false;
  if (typeof obj.holder_concentration_top10 !== 'number') return false;
  
  return true;
}

/**
 * Parse and analyze structured security data
 * Returns comprehensive risk analysis with score, factors, and formatted security data
 */
export function parseStructuredSecurityData(data: StructuredSecurityData): ParsedSecurityResult {
  const factors: { name: string; status: 'safe' | 'warning' | 'danger'; description: string }[] = [];
  const criticalIssues: string[] = [];
  const warnings: string[] = [];
  let score = 50; // Start neutral

  // === CRITICAL FACTORS ===

  // Honeypot check (if provided)
  if (data.honeypot === true) {
    factors.push({ 
      name: 'Honeypot', 
      status: 'danger', 
      description: '⚠️ HONEYPOT DETECTED - Cannot sell!' 
    });
    score -= 50;
    criticalIssues.push('Verified honeypot - tokens cannot be sold');
  }

  // Ownership status
  if (data.owner_renounced) {
    factors.push({ 
      name: 'Ownership', 
      status: 'safe', 
      description: 'Ownership renounced - no admin control' 
    });
    score += 15;
  } else {
    factors.push({ 
      name: 'Ownership', 
      status: 'warning', 
      description: 'Owner not renounced - can modify contract' 
    });
    score -= 10;
    warnings.push('Owner has not renounced - contract can be modified');
  }

  // Mint function
  if (data.mint_function) {
    factors.push({ 
      name: 'Mintable', 
      status: 'danger', 
      description: 'Supply can be inflated at any time' 
    });
    score -= 15;
    criticalIssues.push('Mint function enabled - supply can be inflated');
  } else {
    factors.push({ 
      name: 'Fixed Supply', 
      status: 'safe', 
      description: 'No mint function - fixed supply' 
    });
    score += 10;
  }

  // === LIQUIDITY FACTORS ===

  // Liquidity lock status
  if (data.lp_locked) {
    if (data.lp_lock_duration_days >= 365) {
      factors.push({ 
        name: 'LP Lock', 
        status: 'safe', 
        description: `Liquidity locked for ${data.lp_lock_duration_days} days` 
      });
      score += 15;
    } else if (data.lp_lock_duration_days >= 90) {
      factors.push({ 
        name: 'LP Lock', 
        status: 'safe', 
        description: `Liquidity locked for ${data.lp_lock_duration_days} days` 
      });
      score += 10;
    } else if (data.lp_lock_duration_days >= 30) {
      factors.push({ 
        name: 'LP Lock', 
        status: 'warning', 
        description: `Liquidity locked for only ${data.lp_lock_duration_days} days` 
      });
      score += 5;
      warnings.push(`LP lock duration is short (${data.lp_lock_duration_days} days)`);
    } else {
      factors.push({ 
        name: 'LP Lock', 
        status: 'warning', 
        description: `Very short LP lock: ${data.lp_lock_duration_days} days` 
      });
      warnings.push(`LP lock expires very soon (${data.lp_lock_duration_days} days)`);
    }
  } else {
    factors.push({ 
      name: 'LP Lock', 
      status: 'danger', 
      description: 'No liquidity lock - rug pull risk!' 
    });
    score -= 20;
    criticalIssues.push('Liquidity is not locked - can be pulled at any time');
  }

  // === HOLDER CONCENTRATION ===

  const concentration = data.holder_concentration_top10;
  if (concentration >= 80) {
    factors.push({ 
      name: 'Holder Concentration', 
      status: 'danger', 
      description: `Top 10 hold ${concentration}% - extreme centralization` 
    });
    score -= 25;
    criticalIssues.push(`Extremely centralized: top 10 wallets hold ${concentration}%`);
  } else if (concentration >= 60) {
    factors.push({ 
      name: 'Holder Concentration', 
      status: 'danger', 
      description: `Top 10 hold ${concentration}% - high dump risk` 
    });
    score -= 15;
    criticalIssues.push(`High concentration: top 10 wallets hold ${concentration}%`);
  } else if (concentration >= 40) {
    factors.push({ 
      name: 'Holder Concentration', 
      status: 'warning', 
      description: `Top 10 hold ${concentration}% - moderate concentration` 
    });
    score -= 5;
    warnings.push(`Moderate concentration: top 10 wallets hold ${concentration}%`);
  } else if (concentration >= 20) {
    factors.push({ 
      name: 'Holder Concentration', 
      status: 'safe', 
      description: `Top 10 hold ${concentration}% - good distribution` 
    });
    score += 5;
  } else {
    factors.push({ 
      name: 'Holder Concentration', 
      status: 'safe', 
      description: `Top 10 hold ${concentration}% - excellent distribution` 
    });
    score += 10;
  }

  // === OPTIONAL FACTORS ===

  // Blacklist function
  if (data.blacklist_function) {
    factors.push({ 
      name: 'Blacklist', 
      status: 'warning', 
      description: 'Wallets can be blacklisted from trading' 
    });
    score -= 5;
    warnings.push('Blacklist function exists - wallets can be blocked');
  } else {
    factors.push({ 
      name: 'Blacklist', 
      status: 'safe', 
      description: 'No blacklist function' 
    });
    score += 5;
  }

  // Pausable (if provided)
  if (data.pausable === true) {
    factors.push({ 
      name: 'Pausable', 
      status: 'warning', 
      description: 'Trading can be paused by owner' 
    });
    score -= 5;
    warnings.push('Contract is pausable - trading can be halted');
  }

  // Proxy contract (if provided)
  if (data.proxy_contract === true) {
    factors.push({ 
      name: 'Proxy', 
      status: 'warning', 
      description: 'Upgradeable proxy - logic can change' 
    });
    score -= 5;
    warnings.push('Proxy contract - code can be modified');
  }

  // Hidden owner (if provided)
  if (data.hidden_owner === true) {
    factors.push({ 
      name: 'Hidden Owner', 
      status: 'danger', 
      description: 'Contract has hidden ownership!' 
    });
    score -= 15;
    criticalIssues.push('Hidden owner detected - secret control possible');
  }

  // Tax rates (if provided)
  const buyTax = data.buy_tax_percent ?? 0;
  const sellTax = data.sell_tax_percent ?? 0;
  if (buyTax > 0 || sellTax > 0) {
    const maxTax = Math.max(buyTax, sellTax);
    if (maxTax > 10) {
      factors.push({ 
        name: 'Tax', 
        status: 'danger', 
        description: `High tax: Buy ${buyTax}% / Sell ${sellTax}%` 
      });
      score -= 10;
      criticalIssues.push(`High taxes: ${buyTax}% buy / ${sellTax}% sell`);
    } else if (maxTax > 5) {
      factors.push({ 
        name: 'Tax', 
        status: 'warning', 
        description: `Tax: Buy ${buyTax}% / Sell ${sellTax}%` 
      });
      score -= 5;
      warnings.push(`Moderate taxes: ${buyTax}% buy / ${sellTax}% sell`);
    } else {
      factors.push({ 
        name: 'Tax', 
        status: 'safe', 
        description: `Low tax: Buy ${buyTax}% / Sell ${sellTax}%` 
      });
    }
  }

  // Contract verification (if provided)
  if (data.verified_contract === false) {
    factors.push({ 
      name: 'Contract', 
      status: 'warning', 
      description: 'Contract source not verified' 
    });
    score -= 5;
    warnings.push('Contract is not verified - hidden code');
  } else if (data.verified_contract === true) {
    factors.push({ 
      name: 'Contract', 
      status: 'safe', 
      description: 'Contract source verified' 
    });
    score += 5;
  }

  // Clamp score between 0-100
  score = Math.max(0, Math.min(100, score));

  // If critical issues exist, cap score at danger threshold
  if (criticalIssues.length >= 2 || data.honeypot === true) {
    score = Math.min(score, 25);
  } else if (criticalIssues.length >= 1) {
    score = Math.min(score, 39);
  }

  return {
    score,
    factors,
    securityData: {
      isHoneypot: data.honeypot ?? false,
      isVerified: data.verified_contract ?? true,
      holderCount: 0, // Not provided in this format
      buyTax: buyTax,
      sellTax: sellTax,
      isMintable: data.mint_function,
      hasHiddenOwner: data.hidden_owner ?? false,
      ownerRenounced: data.owner_renounced,
      lpLocked: data.lp_locked,
      lpLockDays: data.lp_lock_duration_days,
      holderConcentration: data.holder_concentration_top10,
      hasBlacklist: data.blacklist_function,
    },
    criticalIssues,
    warnings,
  };
}

/**
 * Generate a human-readable risk summary from parsed data
 */
export function generateStructuredRiskSummary(result: ParsedSecurityResult): string {
  const { score, criticalIssues, warnings, securityData } = result;
  
  // Determine risk level
  let riskLevel: string;
  if (score >= 70) riskLevel = 'Low risk';
  else if (score >= 50) riskLevel = 'Medium risk';
  else if (score >= 30) riskLevel = 'High risk';
  else riskLevel = 'Critical risk';

  // Build summary components
  const components: string[] = [];
  
  if (securityData.lpLocked) {
    components.push(`LP locked for ${securityData.lpLockDays} days`);
  } else {
    components.push('no LP lock');
  }
  
  if (securityData.holderConcentration > 50) {
    components.push(`top 10 hold ${securityData.holderConcentration}%`);
  }
  
  if (securityData.isMintable) {
    components.push('mintable supply');
  }
  
  if (!securityData.ownerRenounced) {
    components.push('owner not renounced');
  }

  // Construct final summary
  if (criticalIssues.length > 0) {
    return `${riskLevel} - ${criticalIssues[0]}.`;
  } else if (components.length > 0) {
    return `${riskLevel} - ${components.slice(0, 2).join(', ')}.`;
  } else {
    return `${riskLevel} - no major issues detected.`;
  }
}

/**
 * Try to parse JSON input as structured security data
 * Returns null if parsing fails or data doesn't match expected format
 */
export function tryParseStructuredSecurityJson(input: string): StructuredSecurityData | null {
  try {
    const parsed = JSON.parse(input);
    if (isStructuredSecurityData(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
