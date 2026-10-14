// Comprehensive risk factor explanations for educating users
// Includes explanations for GoPlus EVM, GoPlus Solana, SolanaFM, RugCheck, and BSCTrace risk factors

export interface RiskExplanation {
  title: string;
  shortDesc: string;
  detailedExplanation: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  whatToDo: string;
}

type Impact = RiskExplanation['impact'];

const entry = (
  title: string,
  shortDesc: string,
  impact: Impact,
  detailedExplanation: string,
  whatToDo: string
): RiskExplanation => ({ title, shortDesc, detailedExplanation, impact, whatToDo });

export const riskExplanations: Record<string, RiskExplanation> = {
  // Critical Dangers
  'Honeypot': entry(
    'Honeypot Detected', 'Cannot sell tokens', 'critical',
    'The contract blocks sell transactions while allowing buys. Once you buy, your tokens are permanently locked - you cannot sell or transfer them.',
    'DO NOT BUY. This is a confirmed scam designed to steal your money.'
  ),
  'Hidden Owner': entry(
    'Hidden Contract Owner', 'Owner can manipulate secretly', 'critical',
    'The true owner of the contract is obscured through proxy patterns or hidden variables. This owner can execute privileged functions without appearing in standard ownership checks.',
    'Avoid this token. Hidden ownership is a major red flag for rug pulls.'
  ),
  'Ownership': entry(
    'Reclaimable Ownership', 'Owner can regain control anytime', 'critical',
    'Even if ownership appears renounced, the contract has a backdoor allowing the original owner to reclaim control and execute admin functions.',
    'Do not trust "renounced" claims. Verify through contract audit.'
  ),

  // High Risk
  'Tax': entry(
    'High Transaction Tax', 'Large percentage taken on trades', 'high',
    'High buy/sell taxes significantly reduce your returns. A 10%+ tax means you lose that percentage on every transaction. Scammers often increase taxes after launch.',
    'Calculate if returns can overcome tax burden. Watch for tax increases.'
  ),
  'Mintable': entry(
    'Token is Mintable', 'Supply can be inflated', 'high',
    'The contract owner can create unlimited new tokens at any time. This dilutes existing holders and can crash the price instantly.',
    'Only invest if you trust the team and there are mint limits or timelock.'
  ),
  'Freeze Authority': entry(
    'Freeze Authority Active', 'Your tokens can be frozen', 'high',
    'The authority can freeze any wallet, preventing transfers or sales. Your tokens could become untradeable at any moment.',
    "Verify if freeze authority is needed (e.g., stablecoins) or if it's a risk."
  ),
  'Mint Authority': entry(
    'Mint Authority Active', 'More tokens can be created', 'high',
    'New tokens can be minted at any time, diluting your holdings. Common in early-stage projects but risky if misused.',
    'Check if mint authority has been revoked or if there are supply caps.'
  ),

  // Medium Risk
  'Contract': entry(
    'Unverified Contract', 'Source code not public', 'medium',
    'The contract source code is not verified on the blockchain explorer. This prevents independent security audits and hides potential malicious code.',
    'Prefer tokens with verified, audited contracts. Unverified = unknown risks.'
  ),
  'Pausable': entry(
    'Transfers Pausable', 'Trading can be halted', 'medium',
    'The owner can pause all token transfers at any time. While sometimes used legitimately (security incidents), it can trap your funds.',
    "Understand why pause functionality exists. Check if there's a timelock."
  ),
  'Holders': entry(
    'Low Holder Count', 'Few wallets hold tokens', 'medium',
    'Very few unique wallets hold this token, indicating low adoption, potential wash trading, or early-stage risk.',
    'New tokens naturally have fewer holders. But <100 holders is a warning sign.'
  ),

  // Market Risks
  'Liquidity': entry(
    'Low Liquidity', 'Hard to buy/sell without slippage', 'high',
    'Limited trading liquidity means large orders significantly impact price. You may not be able to sell at expected prices, or at all.',
    'Use small position sizes. Check if liquidity is locked or can be removed.'
  ),
  'Volume': entry(
    'Low Trading Volume', 'Little trading activity', 'medium',
    'Minimal trading volume suggests low interest or possible abandonment. It also means poor price discovery and exit difficulty.',
    'Consider the project stage. New tokens have lower volume naturally.'
  ),
  'Price Volatility': entry(
    'Extreme Price Swings', 'Price is highly unstable', 'medium',
    'Large price movements in short periods indicate manipulation, pump & dumps, or extreme speculation.',
    'Only invest what you can afford to lose. Set stop-losses if available.'
  ),

  // Lock-related
  'Lock': entry(
    'No Liquidity Lock', 'Liquidity can be removed', 'critical',
    'Liquidity is not locked in a timelock contract. The team can withdraw all liquidity at any moment, crashing the price to zero (rug pull).',
    'Verify liquidity lock on Unicrypt, Team Finance, or similar platforms.'
  ),
  'Lock Duration': entry(
    'Short Lock Duration', 'Liquidity unlocks soon', 'high',
    'The liquidity lock expires soon. When it unlocks, the team can remove liquidity and exit.',
    'Check exact unlock date. Be prepared to exit before unlock if needed.'
  ),
  'Lock Percentage': entry(
    'Partial Liquidity Lock', 'Not all liquidity is locked', 'medium',
    'Only a portion of liquidity is locked. The unlocked portion can still be removed at any time.',
    'Higher lock percentage = safer. 80%+ is preferred.'
  ),

  // BSCTrace-specific risks
  'Self-Destruct': entry(
    'Self-Destruct Capability', 'Contract can be destroyed', 'critical',
    'The contract contains a self-destruct function. The owner can permanently destroy the contract, making all tokens worthless and untradeable.',
    'DO NOT invest. Self-destruct is a major scam indicator.'
  ),
  'External Calls': entry(
    'External Contract Calls', 'Contract calls unknown code', 'medium',
    'The contract makes calls to external addresses. This can hide malicious logic in other contracts that can be changed at any time.',
    'Verify what external contracts are called and if they are upgradeable.'
  ),
  'Ownership Risk': entry(
    'Reclaimable Ownership', 'Owner can reclaim control', 'critical',
    'Even after renouncing, the contract has backdoors allowing the owner to regain control. This enables rug pulls after building false trust.',
    'Avoid tokens where ownership can be reclaimed after renouncement.'
  ),
  'Proxy': entry(
    'Proxy Contract', 'Logic can be changed', 'medium',
    'This is an upgradeable proxy contract. The underlying logic can be changed by the owner at any time, potentially adding malicious code post-launch.',
    'Check if upgrades require timelock or multi-sig governance.'
  ),
  'Blacklist': entry(
    'Blacklist Function', 'Wallets can be blocked', 'medium',
    'The contract can blacklist addresses, preventing them from trading or transferring tokens. Your wallet could be targeted.',
    'Understand why blacklist exists. Some use it for anti-bot, others for control.'
  ),
  'Anti-Whale': entry(
    'Anti-Whale Protection', 'Transaction limits active', 'low',
    'Maximum transaction and wallet limits prevent large holders from dumping. This is generally protective for smaller investors.',
    'This is usually a positive feature. Check the limit amounts are reasonable.'
  ),
  'Fixed Supply': entry(
    'Fixed Token Supply', 'No new tokens can be minted', 'low',
    'The token supply is fixed and cannot be increased. This protects against inflation and supply manipulation.',
    'This is a positive indicator. Your tokens cannot be diluted.'
  ),
  'Low Tax': entry(
    'Low Transaction Tax', 'Minimal fees on trades', 'low',
    'Buy and sell taxes are low (typically under 5%), meaning you keep most of your value when trading.',
    'This is favorable. Monitor for tax increases over time.'
  ),
  'Moderate Tax': entry(
    'Moderate Transaction Tax', 'Notable fees on trades', 'medium',
    'Transaction taxes are moderate (5-15%). While not extreme, they reduce your profits on each trade.',
    'Factor tax into your profit calculations. Check if taxes can change.'
  ),
  'High Tax': entry(
    'High Transaction Tax', 'Excessive fees on trades', 'high',
    'Very high taxes (15%+) significantly eat into your investment. Some scams use high taxes to extract value from traders.',
    'Carefully consider if potential gains outweigh the tax burden.'
  ),
  'Verified': entry(
    'Contract Verified', 'Source code is public', 'low',
    'The contract source code is verified on the blockchain explorer, allowing anyone to audit and review the code for security issues.',
    'This is positive. Consider if the code has been professionally audited too.'
  ),
  'Unverified': entry(
    'Unverified Contract', 'Source code hidden', 'medium',
    'The contract code is not verified, hiding the actual logic. This makes it impossible to detect malicious functions.',
    'Prefer verified contracts. Unverified code carries unknown risks.'
  ),

  // RugCheck-specific risks (Solana)
  'RugCheck Score': entry(
    'RugCheck Safety Score', 'Overall token safety rating', 'medium',
    'RugCheck analyzes Solana tokens for multiple risk factors including holder concentration, liquidity, authority settings, and known scam patterns to generate a 0-100 safety score.',
    'Scores above 80 are safer. Below 50 indicates significant risk factors.'
  ),
  'Insider Holdings': entry(
    'Insider Token Holdings', 'Team/insider wallet concentration', 'high',
    'A significant portion of tokens are held by wallets identified as team members, early investors, or insiders. High insider holdings increase dump risk.',
    'Be cautious if insiders hold >20%. They can dump and crash the price.'
  ),
  'Holder Concentration': entry(
    'Token Holder Concentration', 'Large holders dominate supply', 'medium',
    'The top wallets hold a large percentage of the total supply. This concentration means a few wallets can significantly impact price.',
    'Well-distributed tokens are safer. Top 10 holding <30% is preferred.'
  ),
  'Liquidity Depth': entry(
    'Trading Liquidity Depth', 'Available liquidity for trading', 'medium',
    'The total value locked in liquidity pools. Deep liquidity means you can trade larger amounts with less price impact.',
    'Higher liquidity = easier exits. Low liquidity makes selling difficult.'
  ),
  'Copycat Token': entry(
    'Copycat/Impersonator Token', 'Token copies a popular project', 'critical',
    'This token shares a name or branding with a well-known project. It may be an attempt to scam users into buying a fake version.',
    "Verify the official contract address from the real project's website."
  ),
  'Low Liquidity': entry(
    'Insufficient Liquidity', 'Very low trading liquidity', 'high',
    'The liquidity pool is too small for safe trading. You may experience high slippage or be unable to sell your tokens.',
    'Only invest small amounts. Large positions will be impossible to exit.'
  ),
  'Single LP': entry(
    'Single Liquidity Provider', 'One wallet provides all liquidity', 'critical',
    'All liquidity is provided by a single wallet. If they withdraw, the token becomes untradeable - a classic rug pull setup.',
    'Extreme risk. The LP provider can rug at any moment.'
  ),
  'Unlocked Liquidity': entry(
    'Liquidity Not Locked', 'LP tokens can be withdrawn', 'critical',
    'The liquidity pool tokens are not locked in a timelock contract. The LP provider can remove liquidity and rug pull at any time.',
    'Verify LP lock on trusted platforms. Unlocked LP = rug risk.'
  ),
  'Mutable Metadata': entry(
    'Mutable Token Metadata', 'Token info can be changed', 'medium',
    'The token metadata (name, symbol, image) can be modified by the authority. Scammers use this to rebrand after dumping.',
    'Not inherently dangerous but watch for sudden branding changes.'
  ),

  // GoPlus Solana-specific risks
  'Trusted': entry(
    'Trusted Token', 'Token is on a trust list', 'low',
    'This token is listed on a recognized trust list or registry, indicating it has been vetted or is a known legitimate project.',
    'This is a positive indicator, but always do your own research.'
  ),
  'Freezeable': entry(
    'Token is Freezeable', 'Authority can freeze tokens', 'high',
    "The token has an active freeze authority that can freeze any wallet's tokens, preventing transfers or sales without warning.",
    'Check if freeze authority is revoked. Some tokens legitimately need this feature.'
  ),
  'Closable Program': entry(
    'Closable Program', 'Program can be permanently closed', 'critical',
    'The Solana program that controls this token can be closed by the authority. If closed, the token becomes completely unusable - a permanent rug pull.',
    'DO NOT invest. Closable programs are extreme rug pull risks.'
  ),
  'Upgradeable': entry(
    'Upgradeable Program', 'Program logic can be changed', 'medium',
    "The token's program can be upgraded by the authority, potentially adding malicious logic after you've invested. The functionality could change at any time.",
    "Check if there's a multisig or timelock for upgrades. Otherwise, proceed with caution."
  ),
  'Transfer Fee': entry(
    'Transfer Fee', 'Fee charged on every transfer', 'medium',
    'Every token transfer incurs a fee that goes to the token authority. High fees significantly reduce your returns on trades.',
    'Check the fee percentage. Fees above 5% significantly impact profitability.'
  ),
  'Default Frozen': entry(
    'Default Frozen Accounts', 'New accounts start frozen', 'high',
    'New token accounts are frozen by default and require the authority to unfreeze them before they can transact. This gives the authority control over who can use the token.',
    'Unusual for normal tokens. Check why this restriction exists.'
  ),
  'Creator Holdings': entry(
    'High Creator Holdings', 'Creator holds large supply', 'high',
    'The token creator wallet holds a significant percentage of the total supply. They can dump these tokens at any time, crashing the price.',
    'Creator holding >20% is risky. Check if tokens are vested or locked.'
  ),
  'Holders (GoPlus)': entry(
    'Holder Count (GoPlus)', 'Number of unique holders', 'medium',
    'The number of unique wallets holding this token as reported by GoPlus. More holders generally indicates wider adoption and distribution.',
    '1000+ holders is healthier. Under 100 holders is high risk.'
  ),
  'Mintable (GoPlus)': entry(
    'Mintable Token (GoPlus)', 'Supply can increase', 'high',
    'GoPlus detected that more tokens can be minted by the authority. This allows infinite inflation of the supply, diluting existing holders.',
    'Check if mint authority has been revoked or if there are mint limits.'
  ),

  // Structured Security Data Format fields
  'Ownership Renounced': entry(
    'Ownership Status', 'Contract ownership has been renounced', 'low',
    'The contract owner has renounced ownership, meaning no single wallet can modify contract parameters, taxes, or perform admin functions. This is generally positive but verify it cannot be reclaimed.',
    'This is a positive sign. Verify that ownership cannot be reclaimed via backdoor.'
  ),
  'LP Lock': entry(
    'Liquidity Pool Lock', 'Liquidity lock status', 'medium',
    'Liquidity pool tokens are locked in a timelock contract, preventing the team from removing liquidity and rug pulling during the lock period.',
    'Longer lock periods (6+ months) are safer. Check the unlock date and locked percentage.'
  ),
};

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

const normalize = (s: string): string =>
  s.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// True only when `phrase` appears as whole words inside `text`
// (so "verified" does not match inside "unverified").
const containsPhrase = (text: string, phrase: string): boolean =>
  new RegExp(`(^|[^a-z0-9])${escapeRegex(phrase)}($|[^a-z0-9])`).test(text);

// Multi-word phrases that map to a specific explanation. Checked before the
// negation guard so known positive/negative phrasings resolve correctly.
const PHRASE_ALIASES: Record<string, string> = {
  'owner renounced': 'Ownership Renounced',
  'ownership renounced': 'Ownership Renounced',
  'renounced ownership': 'Ownership Renounced',
  'contract verified': 'Verified',
  'verified contract': 'Verified',
  'unverified contract': 'Unverified',
  'lp locked': 'LP Lock',
  'liquidity locked': 'LP Lock',
  'lp lock': 'Lock',
  'liquidity lock': 'Lock',
  'no liquidity lock': 'Lock',
  'liquidity not locked': 'Unlocked Liquidity',
  'lp not locked': 'Unlocked Liquidity',
};

// Single words that map to an explanation, used only in the fuzzy step.
const GENERIC_ALIASES: Record<string, string> = {
  'owner': 'Ownership',
  'ownership': 'Ownership',
};

// Keys too generic to match inside longer names (exact match only).
const EXACT_ONLY = new Set(['Contract', 'Verified', 'Lock']);

// Wording that usually means a risk is absent or resolved. A fuzzy match on
// these would show a safe factor as a warning, so no explanation is returned.
const NEGATION = /(^|[^a-z0-9])(no|not|without|none|revoked|renounced|disabled|passed|safe)($|[^a-z0-9])/;

let normalizedIndex: Map<string, string> | null = null;
const getNormalizedIndex = (): Map<string, string> => {
  if (!normalizedIndex) {
    normalizedIndex = new Map(Object.keys(riskExplanations).map((k) => [normalize(k), k]));
  }
  return normalizedIndex;
};

// Get explanation for a risk factor by name
export function getRiskExplanation(factorName: string): RiskExplanation | null {
  // 1. Exact match
  if (riskExplanations[factorName]) {
    return riskExplanations[factorName];
  }

  const name = normalize(factorName);
  if (!name) return null;

  // 2. Exact match ignoring case, hyphens and underscores
  const exactKey = getNormalizedIndex().get(name);
  if (exactKey) return riskExplanations[exactKey];

  // 3. Known multi-word phrases, longest first
  const phrases = Object.keys(PHRASE_ALIASES).sort((a, b) => b.length - a.length);
  for (const phrase of phrases) {
    if (containsPhrase(name, phrase)) {
      const target = riskExplanations[PHRASE_ALIASES[phrase]];
      if (target) return target;
    }
  }

  // 4. Negated wording: skip rather than risk showing a false warning
  if (NEGATION.test(name)) return null;

  // 5. Fuzzy match on whole words, preferring the longest matching key
  const candidates: Array<[string, string]> = [];
  for (const key of Object.keys(riskExplanations)) {
    if (!EXACT_ONLY.has(key)) candidates.push([normalize(key), key]);
  }
  for (const [alias, key] of Object.entries(GENERIC_ALIASES)) {
    candidates.push([alias, key]);
  }
  candidates.sort((a, b) => b[0].length - a[0].length);

  for (const [phrase, key] of candidates) {
    if (containsPhrase(name, phrase)) {
      return riskExplanations[key] ?? null;
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

// ---------------------------------------------------------------------------
// Token standard explanations (merged into the main map below)
// ---------------------------------------------------------------------------

// BEP Token Standard explanations
export const bepStandardExplanations: Record<string, RiskExplanation> = {
  'BEP-20 Token': entry(
    'BEP-20 Fungible Token', 'Standard fungible token on BNB Chain', 'low',
    'This token follows the BEP-20 standard, which is the BNB Chain equivalent of ERC-20. All tokens are identical and interchangeable, making it suitable for cryptocurrencies, utility tokens, and other fungible assets.',
    'Standard token type - compatible with all BNB Chain DEXs and wallets.'
  ),
  'BEP-721 NFT': entry(
    'BEP-721 Non-Fungible Token', 'NFT standard on BNB Chain', 'medium',
    'This is a BEP-721 token (NFT), where each token is unique and not interchangeable. NFTs have different trading dynamics than fungible tokens - liquidity may be limited and pricing can be subjective.',
    'Ensure you understand NFT trading risks. Verify authenticity on NFT marketplaces.'
  ),
  'BEP-1155 Multi-Token': entry(
    'BEP-1155 Multi-Token Standard', 'Hybrid token standard supporting multiple types', 'medium',
    'BEP-1155 is a multi-token standard that can represent both fungible and non-fungible tokens in a single contract. Common for gaming assets, collectibles with editions, or mixed token ecosystems.',
    'Check which token IDs represent fungible vs non-fungible assets.'
  ),
  'Unknown Standard': entry(
    'Non-Standard Token Contract', 'Contract does not follow known standards', 'high',
    'This contract does not implement recognized BEP token standards (BEP-20, BEP-721, or BEP-1155). It may use a custom implementation, which could cause compatibility issues with wallets and DEXs.',
    'Exercise extreme caution. Non-standard tokens may not work with common tools.'
  ),
  'NFT Metadata': entry(
    'NFT Metadata Extension', 'Supports token metadata', 'low',
    'This NFT contract supports the metadata extension, allowing tokens to have associated names, descriptions, and images stored on IPFS or other storage.',
    'Positive feature - tokens can display rich information in wallets and marketplaces.'
  ),
  'Enumerable NFT': entry(
    'Enumerable NFT Extension', 'Supports token enumeration', 'low',
    'This NFT contract supports enumeration, meaning all tokens can be listed and iterated. This enables complete collection browsing and easier integration with marketplaces.',
    'Positive feature - provides better transparency for collection contents.'
  ),
  'Token Metadata URI': entry(
    'Token Metadata URI Support', 'Tokens have associated metadata', 'low',
    'The contract supports metadata URIs for tokens, allowing each token type to have associated information like name, description, and image.',
    'Standard feature for multi-token contracts - tokens can display rich info.'
  ),
};

Object.assign(riskExplanations, bepStandardExplanations);

// ERC Token Standard explanations for EVM chains
export const ercStandardExplanations: Record<string, RiskExplanation> = {
  'ERC-20 Token': entry(
    'ERC-20 Fungible Token', 'Standard fungible token on EVM chains', 'low',
    'This token follows the ERC-20 standard, the most widely adopted token standard on Ethereum and EVM-compatible chains. All tokens are identical and interchangeable, making it suitable for cryptocurrencies, utility tokens, and other fungible assets.',
    'Standard token type - compatible with all major DEXs and wallets.'
  ),
  'ERC-721 NFT': entry(
    'ERC-721 Non-Fungible Token', 'NFT standard on EVM chains', 'medium',
    'This is an ERC-721 token (NFT), where each token is unique and not interchangeable. NFTs have different trading dynamics than fungible tokens - liquidity may be limited and pricing can be subjective.',
    'Ensure you understand NFT trading risks. Verify authenticity on NFT marketplaces.'
  ),
  'ERC-1155 Multi-Token': entry(
    'ERC-1155 Multi-Token Standard', 'Hybrid token standard supporting multiple types', 'medium',
    'ERC-1155 is a multi-token standard that can represent both fungible and non-fungible tokens in a single contract. Common for gaming assets, collectibles with editions, or mixed token ecosystems.',
    'Check which token IDs represent fungible vs non-fungible assets.'
  ),
};

Object.assign(riskExplanations, ercStandardExplanations);

// SPL Token Standard explanations for Solana
export const splStandardExplanations: Record<string, RiskExplanation> = {
  'SPL Token': entry(
    'SPL Fungible Token', 'Standard fungible token on Solana', 'low',
    'This token follows the SPL Token standard, the native token program on Solana. All tokens are identical and interchangeable, with wide ecosystem support across Solana DEXs, wallets, and dApps.',
    'Standard token type - compatible with all major Solana DEXs and wallets.'
  ),
  'Token-2022': entry(
    'Token-2022 (Token Extensions)', 'Enhanced token with extensions on Solana', 'medium',
    'This is a Token-2022 program token, which supports advanced features like transfer fees, confidential transfers, and other extensions. These tokens may have built-in fees or restrictions.',
    'Check for transfer fee extensions and other restrictions that may affect trading.'
  ),
  'Transfer Fee Extension': entry(
    'Token Has Transfer Fees', 'Built-in transfer fees via Token-2022', 'medium',
    'This Token-2022 token has the TransferFee extension enabled, meaning a percentage of each transfer is collected as a fee. This is different from traditional DEX trading fees.',
    'Verify the fee percentage before trading. Factor fees into your profit calculations.'
  ),
  // Note: an earlier "Non-Transferable" entry (critical) in the main map was always
  // overwritten by this one, so only this version is kept.
  'Non-Transferable': entry(
    'Non-Transferable Token', 'Soulbound or restricted token', 'high',
    'This token has the NonTransferable extension, making it a soulbound token that cannot be transferred between wallets. Common for credentials, achievements, or identity tokens.',
    'This token CANNOT be sold or transferred. Only acquire if intended as non-transferable.'
  ),
  'Permanent Delegate': entry(
    'Permanent Delegate Risk', 'A delegate can transfer tokens without approval', 'critical',
    'This Token-2022 token has a PermanentDelegate extension, meaning a designated address can transfer tokens from any holder without their approval. This is a significant security concern.',
    'HIGH RISK - A permanent delegate can drain your tokens at any time without permission.'
  ),
  'Metaplex NFT': entry(
    'Metaplex NFT', 'Non-fungible token on Solana', 'medium',
    'This is a Metaplex NFT with on-chain metadata. NFTs are unique digital assets with different trading dynamics than fungible tokens - verify authenticity and ownership before purchasing.',
    'Verify the NFT on Metaplex or marketplace. Check for proper metadata and collection verification.'
  ),
  'Compressed NFT': entry(
    'Compressed NFT (cNFT)', 'Efficient NFT using merkle trees', 'medium',
    'This is a Compressed NFT stored using merkle trees for efficient on-chain storage. While valid NFTs, some older wallets or marketplaces may have limited cNFT support.',
    'Ensure your wallet and preferred marketplace support compressed NFTs before purchasing.'
  ),
  'On-Chain Metadata': entry(
    'On-Chain Metadata Available', 'NFT has verifiable metadata', 'low',
    'The NFT has on-chain metadata through Metaplex, providing verifiable information about the asset including name, description, and attributes.',
    'Positive feature - metadata is verifiable and permanent on-chain.'
  ),
  'Master Edition': entry(
    'Master Edition NFT', 'Original 1/1 or edition parent', 'low',
    'This NFT has a Master Edition, indicating it is either an original 1/1 NFT or the parent of an edition series. Master editions control how many prints/copies can be made.',
    'Check if this is a 1/1 or if editions exist. Master editions typically have higher value.'
  ),
};

Object.assign(riskExplanations, splStandardExplanations);
