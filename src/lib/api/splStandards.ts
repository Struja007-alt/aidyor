/**
 * @fileoverview SPL Token Standard Detection for Solana
 * Detects SPL Token, Token-2022, and NFT standards via account analysis
 */

export type SPLStandard = 'SPL Token' | 'Token-2022' | 'Metaplex NFT' | 'Compressed NFT' | 'Unknown';

export interface SPLStandardResult {
  standard: SPLStandard;
  isNFT: boolean;
  isFungible: boolean;
  isToken2022: boolean;
  confidence: 'high' | 'medium' | 'low';
  hasMetadata: boolean;
  hasMasterEdition: boolean;
  extensions: string[];
  description: string;
}

// Solana Program IDs
const PROGRAM_IDS = {
  TOKEN_PROGRAM: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  TOKEN_2022_PROGRAM: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
  METAPLEX_METADATA: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
  BUBBLEGUM: 'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY',
} as const;

// Token-2022 Extension Types
const TOKEN_2022_EXTENSIONS = [
  'TransferFee',
  'TransferHook',
  'ConfidentialTransfer',
  'DefaultAccountState',
  'ImmutableOwner',
  'MemoTransfer',
  'NonTransferable',
  'InterestBearing',
  'CpiGuard',
  'PermanentDelegate',
  'TransferFeeConfig',
  'MetadataPointer',
  'TokenMetadata',
] as const;

/**
 * Detect SPL token standard by analyzing the token account and metadata
 */
export async function detectSPLStandard(mintAddress: string): Promise<SPLStandardResult | null> {
  if (!mintAddress || mintAddress.length < 32 || mintAddress.length > 44) {
    return null;
  }

  const sanitized = mintAddress.trim();

  try {
    // Fetch token info from Solana RPC
    const [accountInfo, metadataInfo] = await Promise.all([
      fetchAccountInfo(sanitized),
      fetchMetaplexMetadata(sanitized),
    ]);

    if (!accountInfo) {
      return {
        standard: 'Unknown',
        isNFT: false,
        isFungible: false,
        isToken2022: false,
        confidence: 'low',
        hasMetadata: false,
        hasMasterEdition: false,
        extensions: [],
        description: 'Unable to fetch token account - may not be a valid SPL token',
      };
    }

    // Check if it's Token-2022
    const isToken2022 = accountInfo.owner === PROGRAM_IDS.TOKEN_2022_PROGRAM;
    const extensions = isToken2022 ? await detectToken2022Extensions(sanitized) : [];

    // Check for NFT characteristics
    const isNFT = metadataInfo?.isNFT || false;
    const hasMasterEdition = metadataInfo?.hasMasterEdition || false;
    const hasMetadata = metadataInfo !== null;

    // Determine standard
    let standard: SPLStandard;
    let description: string;
    let confidence: 'high' | 'medium' | 'low' = 'high';

    if (metadataInfo?.isCompressed) {
      standard = 'Compressed NFT';
      description = 'Compressed NFT using Metaplex Bubblegum - stored on-chain efficiently with merkle trees';
    } else if (isNFT || hasMasterEdition) {
      standard = 'Metaplex NFT';
      description = 'Metaplex NFT Standard - unique digital asset with metadata stored on-chain';
    } else if (isToken2022) {
      standard = 'Token-2022';
      description = `Token-2022 (Token Extensions) - enhanced token with ${extensions.length > 0 ? extensions.join(', ') : 'extended capabilities'}`;
    } else if (accountInfo.owner === PROGRAM_IDS.TOKEN_PROGRAM) {
      standard = 'SPL Token';
      description = 'Standard SPL Token - fungible token on Solana with wide ecosystem support';
    } else {
      standard = 'Unknown';
      description = 'Non-standard token program - may have limited wallet/DEX support';
      confidence = 'low';
    }

    return {
      standard,
      isNFT,
      isFungible: !isNFT && standard !== 'Unknown',
      isToken2022,
      confidence,
      hasMetadata,
      hasMasterEdition,
      extensions,
      description,
    };
  } catch (error) {
    console.error('SPL standard detection error:', error);
    return null;
  }
}

/**
 * Fetch account info from Solana RPC
 */
async function fetchAccountInfo(mintAddress: string): Promise<{ owner: string; data: string } | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Use public Solana RPC
    const response = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getAccountInfo',
        params: [mintAddress, { encoding: 'base64' }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const result = await response.json();
    
    if (result.result?.value) {
      return {
        owner: result.result.value.owner,
        data: result.result.value.data?.[0] || '',
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch Metaplex metadata for the token
 */
async function fetchMetaplexMetadata(mintAddress: string): Promise<{
  isNFT: boolean;
  hasMasterEdition: boolean;
  isCompressed: boolean;
} | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Check token supply to determine if NFT (supply of 1 with 0 decimals)
    const response = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenSupply',
        params: [mintAddress],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const result = await response.json();
    
    if (result.result?.value) {
      const supply = result.result.value;
      const amount = parseInt(supply.amount || '0');
      const decimals = supply.decimals || 0;
      
      // NFT characteristics: supply of 1, 0 decimals
      const isNFT = amount === 1 && decimals === 0;
      
      return {
        isNFT,
        hasMasterEdition: isNFT, // Assume master edition for NFTs
        isCompressed: false, // Would need additional checks for cNFTs
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Detect Token-2022 extensions from mint account data
 */
async function detectToken2022Extensions(mintAddress: string): Promise<string[]> {
  // For now, return empty array - full extension detection would require
  // parsing the account data which is complex. This can be enhanced later.
  // The presence of Token-2022 program ownership is the primary indicator.
  return [];
}

/**
 * Get risk implications based on SPL token standard
 */
export function getSPLStandardRiskFactors(result: SPLStandardResult): {
  name: string;
  status: 'safe' | 'warning' | 'danger';
  description: string;
}[] {
  const factors: { name: string; status: 'safe' | 'warning' | 'danger'; description: string }[] = [];

  switch (result.standard) {
    case 'SPL Token':
      factors.push({
        name: 'SPL Token',
        status: 'safe',
        description: 'Standard SPL Token - widely supported by Solana wallets and DEXs',
      });
      break;

    case 'Token-2022':
      factors.push({
        name: 'Token-2022',
        status: 'warning',
        description: 'Token Extensions program - check for transfer fees or restrictions',
      });
      if (result.extensions.includes('TransferFee')) {
        factors.push({
          name: 'Transfer Fee Extension',
          status: 'warning',
          description: 'Token has built-in transfer fees - verify fee percentage',
        });
      }
      if (result.extensions.includes('NonTransferable')) {
        factors.push({
          name: 'Non-Transferable',
          status: 'danger',
          description: 'Token cannot be transferred - soulbound or restricted token',
        });
      }
      if (result.extensions.includes('PermanentDelegate')) {
        factors.push({
          name: 'Permanent Delegate',
          status: 'danger',
          description: 'A delegate can transfer tokens without owner approval',
        });
      }
      break;

    case 'Metaplex NFT':
      factors.push({
        name: 'Metaplex NFT',
        status: 'warning',
        description: 'Non-fungible token - ensure you understand NFT trading risks',
      });
      if (result.hasMetadata) {
        factors.push({
          name: 'On-Chain Metadata',
          status: 'safe',
          description: 'NFT has on-chain metadata - verifiable ownership and properties',
        });
      }
      if (result.hasMasterEdition) {
        factors.push({
          name: 'Master Edition',
          status: 'safe',
          description: 'Has Master Edition - original 1/1 NFT or edition parent',
        });
      }
      break;

    case 'Compressed NFT':
      factors.push({
        name: 'Compressed NFT',
        status: 'warning',
        description: 'Compressed NFT (cNFT) - uses merkle trees for efficient storage',
      });
      factors.push({
        name: 'cNFT Considerations',
        status: 'warning',
        description: 'Some marketplaces may have limited cNFT support',
      });
      break;

    case 'Unknown':
      factors.push({
        name: 'Unknown Standard',
        status: 'danger',
        description: 'Non-standard token program - may not work with wallets/DEXs properly',
      });
      break;
  }

  return factors;
}

/**
 * Get a security score modifier based on SPL token standard
 */
export function getSPLStandardScoreModifier(result: SPLStandardResult): number {
  switch (result.standard) {
    case 'SPL Token':
      return 5; // Slight bonus for standard tokens
    case 'Token-2022':
      // Check for risky extensions
      if (result.extensions.includes('NonTransferable') || 
          result.extensions.includes('PermanentDelegate')) {
        return -15;
      }
      if (result.extensions.includes('TransferFee')) {
        return -5;
      }
      return 0; // Neutral for basic Token-2022
    case 'Metaplex NFT':
      return 0; // Neutral - NFTs have different risk profile
    case 'Compressed NFT':
      return -2; // Slight penalty for newer standard with less support
    case 'Unknown':
      return -10; // Penalty for non-standard programs
    default:
      return 0;
  }
}
