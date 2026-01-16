// Detailed explanations for why each risk factor is dangerous
// These help users understand the implications of each warning

export interface RiskExplanation {
  title: string;
  shortDesc: string;
  detailedExplanation: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  whatToDo: string;
}

export const riskExplanations: Record<string, RiskExplanation> = {
  // Critical Dangers
  'Honeypot': {
    title: 'Honeypot Detected',
    shortDesc: 'Cannot sell tokens',
    detailedExplanation: 'The contract blocks sell transactions while allowing buys. Once you buy, your tokens are permanently locked - you cannot sell or transfer them.',
    impact: 'critical',
    whatToDo: 'DO NOT BUY. This is a confirmed scam designed to steal your money.'
  },
  
  'Hidden Owner': {
    title: 'Hidden Contract Owner',
    shortDesc: 'Owner can manipulate secretly',
    detailedExplanation: 'The true owner of the contract is obscured through proxy patterns or hidden variables. This owner can execute privileged functions without appearing in standard ownership checks.',
    impact: 'critical',
    whatToDo: 'Avoid this token. Hidden ownership is a major red flag for rug pulls.'
  },
  
  'Ownership': {
    title: 'Reclaimable Ownership',
    shortDesc: 'Owner can regain control anytime',
    detailedExplanation: 'Even if ownership appears renounced, the contract has a backdoor allowing the original owner to reclaim control and execute admin functions.',
    impact: 'critical',
    whatToDo: 'Do not trust "renounced" claims. Verify through contract audit.'
  },

  // High Risk
  'Tax': {
    title: 'High Transaction Tax',
    shortDesc: 'Large percentage taken on trades',
    detailedExplanation: 'High buy/sell taxes significantly reduce your returns. A 10%+ tax means you lose that percentage on every transaction. Scammers often increase taxes after launch.',
    impact: 'high',
    whatToDo: 'Calculate if returns can overcome tax burden. Watch for tax increases.'
  },
  
  'Mintable': {
    title: 'Token is Mintable',
    shortDesc: 'Supply can be inflated',
    detailedExplanation: 'The contract owner can create unlimited new tokens at any time. This dilutes existing holders and can crash the price instantly.',
    impact: 'high',
    whatToDo: 'Only invest if you trust the team and there are mint limits or timelock.'
  },
  
  'Freeze Authority': {
    title: 'Freeze Authority Active',
    shortDesc: 'Your tokens can be frozen',
    detailedExplanation: 'The authority can freeze any wallet, preventing transfers or sales. Your tokens could become untradeable at any moment.',
    impact: 'high',
    whatToDo: 'Verify if freeze authority is needed (e.g., stablecoins) or if it\'s a risk.'
  },
  
  'Mint Authority': {
    title: 'Mint Authority Active',
    shortDesc: 'More tokens can be created',
    detailedExplanation: 'New tokens can be minted at any time, diluting your holdings. Common in early-stage projects but risky if misused.',
    impact: 'high',
    whatToDo: 'Check if mint authority has been revoked or if there are supply caps.'
  },

  // Medium Risk
  'Contract': {
    title: 'Unverified Contract',
    shortDesc: 'Source code not public',
    detailedExplanation: 'The contract source code is not verified on the blockchain explorer. This prevents independent security audits and hides potential malicious code.',
    impact: 'medium',
    whatToDo: 'Prefer tokens with verified, audited contracts. Unverified = unknown risks.'
  },
  
  'Pausable': {
    title: 'Transfers Pausable',
    shortDesc: 'Trading can be halted',
    detailedExplanation: 'The owner can pause all token transfers at any time. While sometimes used legitimately (security incidents), it can trap your funds.',
    impact: 'medium',
    whatToDo: 'Understand why pause functionality exists. Check if there\'s a timelock.'
  },
  
  'Holders': {
    title: 'Low Holder Count',
    shortDesc: 'Few wallets hold tokens',
    detailedExplanation: 'Very few unique wallets hold this token, indicating low adoption, potential wash trading, or early-stage risk.',
    impact: 'medium',
    whatToDo: 'New tokens naturally have fewer holders. But <100 holders is a warning sign.'
  },

  // Market Risks
  'Liquidity': {
    title: 'Low Liquidity',
    shortDesc: 'Hard to buy/sell without slippage',
    detailedExplanation: 'Limited trading liquidity means large orders significantly impact price. You may not be able to sell at expected prices, or at all.',
    impact: 'high',
    whatToDo: 'Use small position sizes. Check if liquidity is locked or can be removed.'
  },
  
  'Volume': {
    title: 'Low Trading Volume',
    shortDesc: 'Little trading activity',
    detailedExplanation: 'Minimal trading volume suggests low interest or possible abandonment. It also means poor price discovery and exit difficulty.',
    impact: 'medium',
    whatToDo: 'Consider the project stage. New tokens have lower volume naturally.'
  },
  
  'Price Volatility': {
    title: 'Extreme Price Swings',
    shortDesc: 'Price is highly unstable',
    detailedExplanation: 'Large price movements in short periods indicate manipulation, pump & dumps, or extreme speculation.',
    impact: 'medium',
    whatToDo: 'Only invest what you can afford to lose. Set stop-losses if available.'
  },

  // Lock-related
  'Lock': {
    title: 'No Liquidity Lock',
    shortDesc: 'Liquidity can be removed',
    detailedExplanation: 'Liquidity is not locked in a timelock contract. The team can withdraw all liquidity at any moment, crashing the price to zero (rug pull).',
    impact: 'critical',
    whatToDo: 'Verify liquidity lock on Unicrypt, Team Finance, or similar platforms.'
  },
  
  'Lock Duration': {
    title: 'Short Lock Duration',
    shortDesc: 'Liquidity unlocks soon',
    detailedExplanation: 'The liquidity lock expires soon. When it unlocks, the team can remove liquidity and exit.',
    impact: 'high',
    whatToDo: 'Check exact unlock date. Be prepared to exit before unlock if needed.'
  },
  
  'Lock Percentage': {
    title: 'Partial Liquidity Lock',
    shortDesc: 'Not all liquidity is locked',
    detailedExplanation: 'Only a portion of liquidity is locked. The unlocked portion can still be removed at any time.',
    impact: 'medium',
    whatToDo: 'Higher lock percentage = safer. 80%+ is preferred.'
  }
};

// Get explanation for a risk factor by matching key
export function getRiskExplanation(factorName: string): RiskExplanation | null {
  // Direct match
  if (riskExplanations[factorName]) {
    return riskExplanations[factorName];
  }
  
  // Partial match for compound names
  const normalizedName = factorName.toLowerCase();
  for (const [key, explanation] of Object.entries(riskExplanations)) {
    if (normalizedName.includes(key.toLowerCase())) {
      return explanation;
    }
  }
  
  return null;
}

// Get impact color for styling
export function getImpactColor(impact: RiskExplanation['impact']): string {
  switch (impact) {
    case 'critical': return 'text-danger';
    case 'high': return 'text-danger';
    case 'medium': return 'text-warning';
    case 'low': return 'text-muted-foreground';
  }
}

// Get impact badge text
export function getImpactLabel(impact: RiskExplanation['impact']): string {
  switch (impact) {
    case 'critical': return 'CRITICAL';
    case 'high': return 'HIGH RISK';
    case 'medium': return 'MEDIUM';
    case 'low': return 'LOW';
  }
}
