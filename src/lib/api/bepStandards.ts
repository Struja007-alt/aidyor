/**
 * @fileoverview BEP Token Standard Detection for BNB Chain
 * Detects BEP-20, BEP-721, BEP-1155 token standards via contract interface detection
 */

export type BEPStandard = 'BEP-20' | 'BEP-721' | 'BEP-1155' | 'Unknown';

export interface BEPStandardResult {
  standard: BEPStandard;
  isNFT: boolean;
  isMultiToken: boolean;
  isFungible: boolean;
  confidence: 'high' | 'medium' | 'low';
  supportsMetadata: boolean;
  supportsEnumerable: boolean;
  description: string;
}

// Known interface IDs for ERC/BEP standards (EIP-165)
const INTERFACE_IDS = {
  ERC165: '0x01ffc9a7',
  ERC721: '0x80ac58cd',
  ERC721_METADATA: '0x5b5e139f',
  ERC721_ENUMERABLE: '0x780e9d63',
  ERC1155: '0xd9b67a26',
  ERC1155_METADATA_URI: '0x0e89341c',
} as const;

// BEP-20 function signatures (first 4 bytes of keccak256)
const BEP20_SIGNATURES = {
  name: '0x06fdde03',
  symbol: '0x95d89b41',
  decimals: '0x313ce567',
  totalSupply: '0x18160ddd',
  balanceOf: '0x70a08231',
  transfer: '0xa9059cbb',
  approve: '0x095ea7b3',
  allowance: '0xdd62ed3e',
  transferFrom: '0x23b872dd',
} as const;

/**
 * Detect BEP token standard by analyzing contract bytecode and interface support
 */
export async function detectBEPStandard(address: string): Promise<BEPStandardResult | null> {
  if (!address || !/^0x[a-f0-9]{40}$/i.test(address)) {
    return null;
  }

  const sanitized = address.toLowerCase();
  
  try {
    // Check EIP-165 interface support for NFT standards
    const [supportsERC721, supportsERC1155, supportsMetadata, supportsEnumerable] = await Promise.all([
      checkInterfaceSupport(sanitized, INTERFACE_IDS.ERC721),
      checkInterfaceSupport(sanitized, INTERFACE_IDS.ERC1155),
      checkInterfaceSupport(sanitized, INTERFACE_IDS.ERC721_METADATA),
      checkInterfaceSupport(sanitized, INTERFACE_IDS.ERC721_ENUMERABLE),
    ]);

    // BEP-1155 (Multi-Token Standard)
    if (supportsERC1155) {
      return {
        standard: 'BEP-1155',
        isNFT: true,
        isMultiToken: true,
        isFungible: false,
        confidence: 'high',
        supportsMetadata: await checkInterfaceSupport(sanitized, INTERFACE_IDS.ERC1155_METADATA_URI),
        supportsEnumerable: false,
        description: 'Multi-Token Standard - Can represent both fungible and non-fungible tokens in a single contract',
      };
    }

    // BEP-721 (NFT Standard)
    if (supportsERC721) {
      return {
        standard: 'BEP-721',
        isNFT: true,
        isMultiToken: false,
        isFungible: false,
        confidence: 'high',
        supportsMetadata,
        supportsEnumerable,
        description: 'Non-Fungible Token Standard - Each token is unique and not interchangeable',
      };
    }

    // Check for BEP-20 by testing common function calls
    const isBEP20 = await checkBEP20Support(sanitized);
    if (isBEP20) {
      return {
        standard: 'BEP-20',
        isNFT: false,
        isMultiToken: false,
        isFungible: true,
        confidence: 'high',
        supportsMetadata: false,
        supportsEnumerable: false,
        description: 'Fungible Token Standard - All tokens are identical and interchangeable',
      };
    }

    return {
      standard: 'Unknown',
      isNFT: false,
      isMultiToken: false,
      isFungible: false,
      confidence: 'low',
      supportsMetadata: false,
      supportsEnumerable: false,
      description: 'Unable to determine token standard - contract may be non-standard or custom implementation',
    };
  } catch (error) {
    console.error('BEP standard detection error:', error);
    return null;
  }
}

/**
 * Check if contract supports a specific EIP-165 interface
 */
async function checkInterfaceSupport(address: string, interfaceId: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Using BSCScan API for eth_call
    const data = `0x01ffc9a7${interfaceId.slice(2).padStart(64, '0')}`;
    
    const response = await fetch(
      `https://api.bscscan.com/api?module=proxy&action=eth_call&to=${address}&data=${data}&tag=latest`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);
    
    if (!response.ok) return false;
    
    const result = await response.json();
    
    // Check if result indicates support (0x01 = true)
    if (result.result && result.result !== '0x' && result.result !== '0x0') {
      const value = BigInt(result.result);
      return value === BigInt(1);
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Check if contract implements BEP-20 standard functions
 */
async function checkBEP20Support(address: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Check for totalSupply function - fundamental to BEP-20
    const response = await fetch(
      `https://api.bscscan.com/api?module=proxy&action=eth_call&to=${address}&data=${BEP20_SIGNATURES.totalSupply}&tag=latest`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);
    
    if (!response.ok) return false;
    
    const result = await response.json();
    
    // If totalSupply returns a valid number, it's likely BEP-20
    if (result.result && result.result !== '0x' && result.result.length === 66) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Get risk implications based on token standard
 */
export function getStandardRiskFactors(result: BEPStandardResult): {
  name: string;
  status: 'safe' | 'warning' | 'danger';
  description: string;
}[] {
  const factors: { name: string; status: 'safe' | 'warning' | 'danger'; description: string }[] = [];

  switch (result.standard) {
    case 'BEP-20':
      factors.push({
        name: 'BEP-20 Token',
        status: 'safe',
        description: 'Standard fungible token - widely supported by DEXs and wallets',
      });
      break;

    case 'BEP-721':
      factors.push({
        name: 'BEP-721 NFT',
        status: 'warning',
        description: 'Non-fungible token - ensure you understand NFT trading risks',
      });
      if (result.supportsMetadata) {
        factors.push({
          name: 'NFT Metadata',
          status: 'safe',
          description: 'Supports metadata extension - can display NFT information',
        });
      }
      if (result.supportsEnumerable) {
        factors.push({
          name: 'Enumerable NFT',
          status: 'safe',
          description: 'Supports enumeration - all tokens can be listed',
        });
      }
      break;

    case 'BEP-1155':
      factors.push({
        name: 'BEP-1155 Multi-Token',
        status: 'warning',
        description: 'Multi-token standard - can represent multiple token types in one contract',
      });
      if (result.supportsMetadata) {
        factors.push({
          name: 'Token Metadata URI',
          status: 'safe',
          description: 'Supports metadata URI - tokens have associated information',
        });
      }
      break;

    case 'Unknown':
      factors.push({
        name: 'Unknown Standard',
        status: 'danger',
        description: 'Non-standard contract - may not work with wallets/DEXs properly',
      });
      break;
  }

  return factors;
}

/**
 * Get a security score modifier based on token standard
 */
export function getStandardScoreModifier(result: BEPStandardResult): number {
  switch (result.standard) {
    case 'BEP-20':
      return 5; // Slight bonus for standard tokens
    case 'BEP-721':
      return 0; // Neutral - NFTs have different risk profile
    case 'BEP-1155':
      return 0; // Neutral - Multi-tokens have different risk profile
    case 'Unknown':
      return -10; // Penalty for non-standard contracts
    default:
      return 0;
  }
}
