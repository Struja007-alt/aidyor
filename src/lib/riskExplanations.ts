// Comprehensive risk factor explanations for educating users
// Includes explanations for GoPlus EVM, GoPlus Solana, SolanaFM, RugCheck, and BSCTrace risk factors

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
  },

  // BSCTrace-specific risks
  'Self-Destruct': {
    title: 'Self-Destruct Capability',
    shortDesc: 'Contract can be destroyed',
    detailedExplanation: 'The contract contains a self-destruct function. The owner can permanently destroy the contract, making all tokens worthless and untradeable.',
    impact: 'critical',
    whatToDo: 'DO NOT invest. Self-destruct is a major scam indicator.'
  },

  'External Calls': {
    title: 'External Contract Calls',
    shortDesc: 'Contract calls unknown code',
    detailedExplanation: 'The contract makes calls to external addresses. This can hide malicious logic in other contracts that can be changed at any time.',
    impact: 'medium',
    whatToDo: 'Verify what external contracts are called and if they are upgradeable.'
  },

  'Ownership Risk': {
    title: 'Reclaimable Ownership',
    shortDesc: 'Owner can reclaim control',
    detailedExplanation: 'Even after renouncing, the contract has backdoors allowing the owner to regain control. This enables rug pulls after building false trust.',
    impact: 'critical',
    whatToDo: 'Avoid tokens where ownership can be reclaimed after renouncement.'
  },

  'Proxy': {
    title: 'Proxy Contract',
    shortDesc: 'Logic can be changed',
    detailedExplanation: 'This is an upgradeable proxy contract. The underlying logic can be changed by the owner at any time, potentially adding malicious code post-launch.',
    impact: 'medium',
    whatToDo: 'Check if upgrades require timelock or multi-sig governance.'
  },

  'Blacklist': {
    title: 'Blacklist Function',
    shortDesc: 'Wallets can be blocked',
    detailedExplanation: 'The contract can blacklist addresses, preventing them from trading or transferring tokens. Your wallet could be targeted.',
    impact: 'medium',
    whatToDo: 'Understand why blacklist exists. Some use it for anti-bot, others for control.'
  },

  'Anti-Whale': {
    title: 'Anti-Whale Protection',
    shortDesc: 'Transaction limits active',
    detailedExplanation: 'Maximum transaction and wallet limits prevent large holders from dumping. This is generally protective for smaller investors.',
    impact: 'low',
    whatToDo: 'This is usually a positive feature. Check the limit amounts are reasonable.'
  },

  'Fixed Supply': {
    title: 'Fixed Token Supply',
    shortDesc: 'No new tokens can be minted',
    detailedExplanation: 'The token supply is fixed and cannot be increased. This protects against inflation and supply manipulation.',
    impact: 'low',
    whatToDo: 'This is a positive indicator. Your tokens cannot be diluted.'
  },

  'Low Tax': {
    title: 'Low Transaction Tax',
    shortDesc: 'Minimal fees on trades',
    detailedExplanation: 'Buy and sell taxes are low (typically under 5%), meaning you keep most of your value when trading.',
    impact: 'low',
    whatToDo: 'This is favorable. Monitor for tax increases over time.'
  },

  'Moderate Tax': {
    title: 'Moderate Transaction Tax',
    shortDesc: 'Notable fees on trades',
    detailedExplanation: 'Transaction taxes are moderate (5-15%). While not extreme, they reduce your profits on each trade.',
    impact: 'medium',
    whatToDo: 'Factor tax into your profit calculations. Check if taxes can change.'
  },

  'High Tax': {
    title: 'High Transaction Tax',
    shortDesc: 'Excessive fees on trades',
    detailedExplanation: 'Very high taxes (15%+) significantly eat into your investment. Some scams use high taxes to extract value from traders.',
    impact: 'high',
    whatToDo: 'Carefully consider if potential gains outweigh the tax burden.'
  },

  'Verified': {
    title: 'Contract Verified',
    shortDesc: 'Source code is public',
    detailedExplanation: 'The contract source code is verified on the blockchain explorer, allowing anyone to audit and review the code for security issues.',
    impact: 'low',
    whatToDo: 'This is positive. Consider if the code has been professionally audited too.'
  },

  'Unverified': {
    title: 'Unverified Contract',
    shortDesc: 'Source code hidden',
    detailedExplanation: 'The contract code is not verified, hiding the actual logic. This makes it impossible to detect malicious functions.',
    impact: 'medium',
    whatToDo: 'Prefer verified contracts. Unverified code carries unknown risks.'
  },

  // RugCheck-specific risks (Solana)
  'RugCheck Score': {
    title: 'RugCheck Safety Score',
    shortDesc: 'Overall token safety rating',
    detailedExplanation: 'RugCheck analyzes Solana tokens for multiple risk factors including holder concentration, liquidity, authority settings, and known scam patterns to generate a 0-100 safety score.',
    impact: 'medium',
    whatToDo: 'Scores above 80 are safer. Below 50 indicates significant risk factors.'
  },

  'Insider Holdings': {
    title: 'Insider Token Holdings',
    shortDesc: 'Team/insider wallet concentration',
    detailedExplanation: 'A significant portion of tokens are held by wallets identified as team members, early investors, or insiders. High insider holdings increase dump risk.',
    impact: 'high',
    whatToDo: 'Be cautious if insiders hold >20%. They can dump and crash the price.'
  },

  'Holder Concentration': {
    title: 'Token Holder Concentration',
    shortDesc: 'Large holders dominate supply',
    detailedExplanation: 'The top wallets hold a large percentage of the total supply. This concentration means a few wallets can significantly impact price.',
    impact: 'medium',
    whatToDo: 'Well-distributed tokens are safer. Top 10 holding <30% is preferred.'
  },

  'Liquidity Depth': {
    title: 'Trading Liquidity Depth',
    shortDesc: 'Available liquidity for trading',
    detailedExplanation: 'The total value locked in liquidity pools. Deep liquidity means you can trade larger amounts with less price impact.',
    impact: 'medium',
    whatToDo: 'Higher liquidity = easier exits. Low liquidity makes selling difficult.'
  },

  'Copycat Token': {
    title: 'Copycat/Impersonator Token',
    shortDesc: 'Token copies a popular project',
    detailedExplanation: 'This token shares a name or branding with a well-known project. It may be an attempt to scam users into buying a fake version.',
    impact: 'critical',
    whatToDo: 'Verify the official contract address from the real project\'s website.'
  },

  'Low Liquidity': {
    title: 'Insufficient Liquidity',
    shortDesc: 'Very low trading liquidity',
    detailedExplanation: 'The liquidity pool is too small for safe trading. You may experience high slippage or be unable to sell your tokens.',
    impact: 'high',
    whatToDo: 'Only invest small amounts. Large positions will be impossible to exit.'
  },

  'Single LP': {
    title: 'Single Liquidity Provider',
    shortDesc: 'One wallet provides all liquidity',
    detailedExplanation: 'All liquidity is provided by a single wallet. If they withdraw, the token becomes untradeable - a classic rug pull setup.',
    impact: 'critical',
    whatToDo: 'Extreme risk. The LP provider can rug at any moment.'
  },

  'Unlocked Liquidity': {
    title: 'Liquidity Not Locked',
    shortDesc: 'LP tokens can be withdrawn',
    detailedExplanation: 'The liquidity pool tokens are not locked in a timelock contract. The LP provider can remove liquidity and rug pull at any time.',
    impact: 'critical',
    whatToDo: 'Verify LP lock on trusted platforms. Unlocked LP = rug risk.'
  },

  'Mutable Metadata': {
    title: 'Mutable Token Metadata',
    shortDesc: 'Token info can be changed',
    detailedExplanation: 'The token metadata (name, symbol, image) can be modified by the authority. Scammers use this to rebrand after dumping.',
    impact: 'medium',
    whatToDo: 'Not inherently dangerous but watch for sudden branding changes.'
  },

  // GoPlus Solana-specific risks
  'Trusted': {
    title: 'Trusted Token',
    shortDesc: 'Token is on a trust list',
    detailedExplanation: 'This token is listed on a recognized trust list or registry, indicating it has been vetted or is a known legitimate project.',
    impact: 'low',
    whatToDo: 'This is a positive indicator, but always do your own research.'
  },

  'Freezeable': {
    title: 'Token is Freezeable',
    shortDesc: 'Authority can freeze tokens',
    detailedExplanation: 'The token has an active freeze authority that can freeze any wallet\'s tokens, preventing transfers or sales without warning.',
    impact: 'high',
    whatToDo: 'Check if freeze authority is revoked. Some tokens legitimately need this feature.'
  },

  'Closable Program': {
    title: 'Closable Program',
    shortDesc: 'Program can be permanently closed',
    detailedExplanation: 'The Solana program that controls this token can be closed by the authority. If closed, the token becomes completely unusable - a permanent rug pull.',
    impact: 'critical',
    whatToDo: 'DO NOT invest. Closable programs are extreme rug pull risks.'
  },

  'Upgradeable': {
    title: 'Upgradeable Program',
    shortDesc: 'Program logic can be changed',
    detailedExplanation: 'The token\'s program can be upgraded by the authority, potentially adding malicious logic after you\'ve invested. The functionality could change at any time.',
    impact: 'medium',
    whatToDo: 'Check if there\'s a multisig or timelock for upgrades. Otherwise, proceed with caution.'
  },

  'Transfer Fee': {
    title: 'Transfer Fee',
    shortDesc: 'Fee charged on every transfer',
    detailedExplanation: 'Every token transfer incurs a fee that goes to the token authority. High fees significantly reduce your returns on trades.',
    impact: 'medium',
    whatToDo: 'Check the fee percentage. Fees above 5% significantly impact profitability.'
  },

  'Non-Transferable': {
    title: 'Non-Transferable Token',
    shortDesc: 'Token CANNOT be transferred',
    detailedExplanation: 'This token is marked as non-transferable. You cannot sell, trade, or move these tokens to another wallet. They are permanently locked.',
    impact: 'critical',
    whatToDo: 'DO NOT BUY. These tokens have zero liquidity by design.'
  },

  'Default Frozen': {
    title: 'Default Frozen Accounts',
    shortDesc: 'New accounts start frozen',
    detailedExplanation: 'New token accounts are frozen by default and require the authority to unfreeze them before they can transact. This gives the authority control over who can use the token.',
    impact: 'high',
    whatToDo: 'Unusual for normal tokens. Check why this restriction exists.'
  },

  'Creator Holdings': {
    title: 'High Creator Holdings',
    shortDesc: 'Creator holds large supply',
    detailedExplanation: 'The token creator wallet holds a significant percentage of the total supply. They can dump these tokens at any time, crashing the price.',
    impact: 'high',
    whatToDo: 'Creator holding >20% is risky. Check if tokens are vested or locked.'
  },

  'Holders (GoPlus)': {
    title: 'Holder Count (GoPlus)',
    shortDesc: 'Number of unique holders',
    detailedExplanation: 'The number of unique wallets holding this token as reported by GoPlus. More holders generally indicates wider adoption and distribution.',
    impact: 'medium',
    whatToDo: '1000+ holders is healthier. Under 100 holders is high risk.'
  },

  'Mintable (GoPlus)': {
    title: 'Mintable Token (GoPlus)',
    shortDesc: 'Supply can increase',
    detailedExplanation: 'GoPlus detected that more tokens can be minted by the authority. This allows infinite inflation of the supply, diluting existing holders.',
    impact: 'high',
    whatToDo: 'Check if mint authority has been revoked or if there are mint limits.'
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
