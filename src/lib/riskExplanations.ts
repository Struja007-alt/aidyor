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
  },

  // Structured Security Data Format fields
  'Ownership Renounced': {
    title: 'Ownership Status',
    shortDesc: 'Contract ownership has been renounced',
    detailedExplanation: 'The contract owner has renounced ownership, meaning no single wallet can modify contract parameters, taxes, or perform admin functions. This is generally positive but verify it cannot be reclaimed.',
    impact: 'low',
    whatToDo: 'This is a positive sign. Verify that ownership cannot be reclaimed via backdoor.'
  },

  'LP Lock': {
    title: 'Liquidity Pool Lock',
    shortDesc: 'Liquidity lock status',
    detailedExplanation: 'Liquidity pool tokens are locked in a timelock contract, preventing the team from removing liquidity and rug pulling during the lock period.',
    impact: 'medium',
    whatToDo: 'Longer lock periods (6+ months) are safer. Check the unlock date and locked percentage.'
  }
};
// Get explanation for a risk factor by matching key
export function getRiskExplanation(factorName: string): RiskExplanation | null {
// Direct match
  if (riskExplanations[factorName]) {
    return riskExplanations[factorName];
  }
  
  // Check aliases for structured security data format
  const aliases: Record<string, string> = {
    'lp lock': 'Lock',
    'lp locked': 'Lock',
    'liquidity lock': 'Lock',
    'fixed supply': 'Fixed Supply',
    'holder concentration': 'Holder Concentration',
    'owner': 'Ownership',
    'ownership': 'Ownership',
    'owner renounced': 'Ownership Renounced',
  };
  
  const normalizedName = factorName.toLowerCase();
  
  // Check aliases first
  for (const [alias, targetKey] of Object.entries(aliases)) {
    if (normalizedName.includes(alias)) {
      if (riskExplanations[targetKey]) {
        return riskExplanations[targetKey];
      }
    }
  }
  
  // Partial match for compound names
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

// BEP Token Standard explanations - Added dynamically to main explanations
export const bepStandardExplanations: Record<string, RiskExplanation> = {
  'BEP-20 Token': {
    title: 'BEP-20 Fungible Token',
    shortDesc: 'Standard fungible token on BNB Chain',
    detailedExplanation: 'This token follows the BEP-20 standard, which is the BNB Chain equivalent of ERC-20. All tokens are identical and interchangeable, making it suitable for cryptocurrencies, utility tokens, and other fungible assets.',
    impact: 'low',
    whatToDo: 'Standard token type - compatible with all BNB Chain DEXs and wallets.'
  },
  
  'BEP-721 NFT': {
    title: 'BEP-721 Non-Fungible Token',
    shortDesc: 'NFT standard on BNB Chain',
    detailedExplanation: 'This is a BEP-721 token (NFT), where each token is unique and not interchangeable. NFTs have different trading dynamics than fungible tokens - liquidity may be limited and pricing can be subjective.',
    impact: 'medium',
    whatToDo: 'Ensure you understand NFT trading risks. Verify authenticity on NFT marketplaces.'
  },
  
  'BEP-1155 Multi-Token': {
    title: 'BEP-1155 Multi-Token Standard',
    shortDesc: 'Hybrid token standard supporting multiple types',
    detailedExplanation: 'BEP-1155 is a multi-token standard that can represent both fungible and non-fungible tokens in a single contract. Common for gaming assets, collectibles with editions, or mixed token ecosystems.',
    impact: 'medium',
    whatToDo: 'Check which token IDs represent fungible vs non-fungible assets.'
  },
  
  'Unknown Standard': {
    title: 'Non-Standard Token Contract',
    shortDesc: 'Contract does not follow known standards',
    detailedExplanation: 'This contract does not implement recognized BEP token standards (BEP-20, BEP-721, or BEP-1155). It may use a custom implementation, which could cause compatibility issues with wallets and DEXs.',
    impact: 'high',
    whatToDo: 'Exercise extreme caution. Non-standard tokens may not work with common tools.'
  },
  
  'NFT Metadata': {
    title: 'NFT Metadata Extension',
    shortDesc: 'Supports token metadata',
    detailedExplanation: 'This NFT contract supports the metadata extension, allowing tokens to have associated names, descriptions, and images stored on IPFS or other storage.',
    impact: 'low',
    whatToDo: 'Positive feature - tokens can display rich information in wallets and marketplaces.'
  },
  
  'Enumerable NFT': {
    title: 'Enumerable NFT Extension',
    shortDesc: 'Supports token enumeration',
    detailedExplanation: 'This NFT contract supports enumeration, meaning all tokens can be listed and iterated. This enables complete collection browsing and easier integration with marketplaces.',
    impact: 'low',
    whatToDo: 'Positive feature - provides better transparency for collection contents.'
  },
  
  'Token Metadata URI': {
    title: 'Token Metadata URI Support',
    shortDesc: 'Tokens have associated metadata',
    detailedExplanation: 'The contract supports metadata URIs for tokens, allowing each token type to have associated information like name, description, and image.',
    impact: 'low',
    whatToDo: 'Standard feature for multi-token contracts - tokens can display rich info.'
  },
};

// Merge BEP explanations into main explanations object
Object.assign(riskExplanations, bepStandardExplanations);

// ERC Token Standard explanations for EVM chains (ETH, Polygon, Arbitrum, etc.)
export const ercStandardExplanations: Record<string, RiskExplanation> = {
  'ERC-20 Token': {
    title: 'ERC-20 Fungible Token',
    shortDesc: 'Standard fungible token on EVM chains',
    detailedExplanation: 'This token follows the ERC-20 standard, the most widely adopted token standard on Ethereum and EVM-compatible chains. All tokens are identical and interchangeable, making it suitable for cryptocurrencies, utility tokens, and other fungible assets.',
    impact: 'low',
    whatToDo: 'Standard token type - compatible with all major DEXs and wallets.'
  },
  
  'ERC-721 NFT': {
    title: 'ERC-721 Non-Fungible Token',
    shortDesc: 'NFT standard on EVM chains',
    detailedExplanation: 'This is an ERC-721 token (NFT), where each token is unique and not interchangeable. NFTs have different trading dynamics than fungible tokens - liquidity may be limited and pricing can be subjective.',
    impact: 'medium',
    whatToDo: 'Ensure you understand NFT trading risks. Verify authenticity on NFT marketplaces.'
  },
  
  'ERC-1155 Multi-Token': {
    title: 'ERC-1155 Multi-Token Standard',
    shortDesc: 'Hybrid token standard supporting multiple types',
    detailedExplanation: 'ERC-1155 is a multi-token standard that can represent both fungible and non-fungible tokens in a single contract. Common for gaming assets, collectibles with editions, or mixed token ecosystems.',
    impact: 'medium',
    whatToDo: 'Check which token IDs represent fungible vs non-fungible assets.'
  },
};

// Merge ERC explanations into main explanations object
Object.assign(riskExplanations, ercStandardExplanations);

// SPL Token Standard explanations for Solana
export const splStandardExplanations: Record<string, RiskExplanation> = {
  'SPL Token': {
    title: 'SPL Fungible Token',
    shortDesc: 'Standard fungible token on Solana',
    detailedExplanation: 'This token follows the SPL Token standard, the native token program on Solana. All tokens are identical and interchangeable, with wide ecosystem support across Solana DEXs, wallets, and dApps.',
    impact: 'low',
    whatToDo: 'Standard token type - compatible with all major Solana DEXs and wallets.'
  },
  
  'Token-2022': {
    title: 'Token-2022 (Token Extensions)',
    shortDesc: 'Enhanced token with extensions on Solana',
    detailedExplanation: 'This is a Token-2022 program token, which supports advanced features like transfer fees, confidential transfers, and other extensions. These tokens may have built-in fees or restrictions.',
    impact: 'medium',
    whatToDo: 'Check for transfer fee extensions and other restrictions that may affect trading.'
  },
  
  'Transfer Fee Extension': {
    title: 'Token Has Transfer Fees',
    shortDesc: 'Built-in transfer fees via Token-2022',
    detailedExplanation: 'This Token-2022 token has the TransferFee extension enabled, meaning a percentage of each transfer is collected as a fee. This is different from traditional DEX trading fees.',
    impact: 'medium',
    whatToDo: 'Verify the fee percentage before trading. Factor fees into your profit calculations.'
  },
  
  'Non-Transferable': {
    title: 'Non-Transferable Token',
    shortDesc: 'Soulbound or restricted token',
    detailedExplanation: 'This token has the NonTransferable extension, making it a soulbound token that cannot be transferred between wallets. Common for credentials, achievements, or identity tokens.',
    impact: 'high',
    whatToDo: 'This token CANNOT be sold or transferred. Only acquire if intended as non-transferable.'
  },
  
  'Permanent Delegate': {
    title: 'Permanent Delegate Risk',
    shortDesc: 'A delegate can transfer tokens without approval',
    detailedExplanation: 'This Token-2022 token has a PermanentDelegate extension, meaning a designated address can transfer tokens from any holder without their approval. This is a significant security concern.',
    impact: 'critical',
    whatToDo: 'HIGH RISK - A permanent delegate can drain your tokens at any time without permission.'
  },
  
  'Metaplex NFT': {
    title: 'Metaplex NFT',
    shortDesc: 'Non-fungible token on Solana',
    detailedExplanation: 'This is a Metaplex NFT with on-chain metadata. NFTs are unique digital assets with different trading dynamics than fungible tokens - verify authenticity and ownership before purchasing.',
    impact: 'medium',
    whatToDo: 'Verify the NFT on Metaplex or marketplace. Check for proper metadata and collection verification.'
  },
  
  'Compressed NFT': {
    title: 'Compressed NFT (cNFT)',
    shortDesc: 'Efficient NFT using merkle trees',
    detailedExplanation: 'This is a Compressed NFT stored using merkle trees for efficient on-chain storage. While valid NFTs, some older wallets or marketplaces may have limited cNFT support.',
    impact: 'medium',
    whatToDo: 'Ensure your wallet and preferred marketplace support compressed NFTs before purchasing.'
  },
  
  'On-Chain Metadata': {
    title: 'On-Chain Metadata Available',
    shortDesc: 'NFT has verifiable metadata',
    detailedExplanation: 'The NFT has on-chain metadata through Metaplex, providing verifiable information about the asset including name, description, and attributes.',
    impact: 'low',
    whatToDo: 'Positive feature - metadata is verifiable and permanent on-chain.'
  },
  
  'Master Edition': {
    title: 'Master Edition NFT',
    shortDesc: 'Original 1/1 or edition parent',
    detailedExplanation: 'This NFT has a Master Edition, indicating it is either an original 1/1 NFT or the parent of an edition series. Master editions control how many prints/copies can be made.',
    impact: 'low',
    whatToDo: 'Check if this is a 1/1 or if editions exist. Master editions typically have higher value.'
  },
};

// Merge SPL explanations into main explanations object
Object.assign(riskExplanations, splStandardExplanations);
