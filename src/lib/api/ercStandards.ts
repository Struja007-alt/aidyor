/**
 * @fileoverview ERC Token Standard Detection for EVM Chains
 * Detects ERC-20, ERC-721, ERC-1155 token standards via contract interface detection
 * Supports ETH, Polygon, Arbitrum, Base, Optimism, Avalanche
 */

export type ERCStandard = 'ERC-20' | 'ERC-721' | 'ERC-1155' | 'Unknown';

export interface ERCStandardResult {
  standard: ERCStandard;
  isNFT: boolean;
  isMultiToken: boolean;
  isFungible: boolean;
  confidence: 'high' | 'medium' | 'low';
  supportsMetadata: boolean;
  supportsEnumerable: boolean;
  description: string;
  network: string;
}

// Known interface IDs for ERC standards (EIP-165)
const INTERFACE_IDS = {
  ERC165: '0x01ffc9a7',
  ERC721: '0x80ac58cd',
  ERC721_METADATA: '0x5b5e139f',
  ERC721_ENUMERABLE: '0x780e9d63',
  ERC1155: '0xd9b67a26',
  ERC1155_METADATA_URI: '0x0e89341c',
} as const;

// ERC-20 function signatures (first 4 bytes of keccak256)
const ERC20_SIGNATURES = {
  totalSupply: '0x18160ddd',
  balanceOf: '0x70a08231',
  decimals: '0x313ce567',
} as const;

// RPC endpoints for different networks (using public endpoints)
const NETWORK_RPC: Record<string, string> = {
  'ETH': 'https://eth.llamarpc.com',
  'POLYGON': 'https://polygon.llamarpc.com',
  'ARB': 'https://arb1.arbitrum.io/rpc',
  'BASE': 'https://mainnet.base.org',
  'OP': 'https://mainnet.optimism.io',
  'AVAX': 'https://api.avax.network/ext/bc/C/rpc',
};

// Etherscan-like API endpoints for fallback
const EXPLORER_API: Record<string, string> = {
  'ETH': 'https://api.etherscan.io/api',
  'POLYGON': 'https://api.polygonscan.com/api',
  'ARB': 'https://api.arbiscan.io/api',
  'BASE': 'https://api.basescan.org/api',
  'OP': 'https://api-optimistic.etherscan.io/api',
  'AVAX': 'https://api.snowtrace.io/api',
};

/**
 * Detect ERC token standard by analyzing contract interface support
 */
export async function detectERCStandard(address: string, network: string): Promise<ERCStandardResult | null> {
  if (!address || !/^0x[a-f0-9]{40}$/i.test(address)) {
    return null;
  }

  // Only support EVM chains (not BSC - that uses BEP detection)
  if (!NETWORK_RPC[network]) {
    return null;
  }

  const sanitized = address.toLowerCase();
  
  try {
    // Check EIP-165 interface support for NFT standards
    const [supportsERC721, supportsERC1155, supportsMetadata, supportsEnumerable] = await Promise.all([
      checkInterfaceSupport(sanitized, INTERFACE_IDS.ERC721, network),
      checkInterfaceSupport(sanitized, INTERFACE_IDS.ERC1155, network),
      checkInterfaceSupport(sanitized, INTERFACE_IDS.ERC721_METADATA, network),
      checkInterfaceSupport(sanitized, INTERFACE_IDS.ERC721_ENUMERABLE, network),
    ]);

    // ERC-1155 (Multi-Token Standard)
    if (supportsERC1155) {
      const supportsUri = await checkInterfaceSupport(sanitized, INTERFACE_IDS.ERC1155_METADATA_URI, network);
      return {
        standard: 'ERC-1155',
        isNFT: true,
        isMultiToken: true,
        isFungible: false,
        confidence: 'high',
        supportsMetadata: supportsUri,
        supportsEnumerable: false,
        description: 'Multi-Token Standard - Can represent both fungible and non-fungible tokens in a single contract',
        network,
      };
    }

    // ERC-721 (NFT Standard)
    if (supportsERC721) {
      return {
        standard: 'ERC-721',
        isNFT: true,
        isMultiToken: false,
        isFungible: false,
        confidence: 'high',
        supportsMetadata,
        supportsEnumerable,
        description: 'Non-Fungible Token Standard - Each token is unique and not interchangeable',
        network,
      };
    }

    // Check for ERC-20 by testing common function calls
    const isERC20 = await checkERC20Support(sanitized, network);
    if (isERC20) {
      return {
        standard: 'ERC-20',
        isNFT: false,
        isMultiToken: false,
        isFungible: true,
        confidence: 'high',
        supportsMetadata: false,
        supportsEnumerable: false,
        description: 'Fungible Token Standard - All tokens are identical and interchangeable',
        network,
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
      network,
    };
  } catch (error) {
    console.error('ERC standard detection error:', error);
    return null;
  }
}

/**
 * Check if contract supports a specific EIP-165 interface via RPC
 */
async function checkInterfaceSupport(address: string, interfaceId: string, network: string): Promise<boolean> {
  const rpcUrl = NETWORK_RPC[network];
  if (!rpcUrl) return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Encode supportsInterface(bytes4) call
    const data = `0x01ffc9a7${interfaceId.slice(2).padEnd(64, '0')}`;
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to: address, data }, 'latest'],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    
    if (!response.ok) return false;
    
    const result = await response.json();
    
    // Check if result indicates support (ends with 0x01)
    if (result.result && result.result !== '0x' && result.result !== '0x0') {
      // Result should be 32 bytes with value 1 (true)
      const value = result.result.replace(/^0x/, '').replace(/^0+/, '');
      return value === '1';
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Check if contract implements ERC-20 standard functions via RPC
 */
async function checkERC20Support(address: string, network: string): Promise<boolean> {
  const rpcUrl = NETWORK_RPC[network];
  if (!rpcUrl) return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Check for totalSupply function - fundamental to ERC-20
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to: address, data: ERC20_SIGNATURES.totalSupply }, 'latest'],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    
    if (!response.ok) return false;
    
    const result = await response.json();
    
    // If totalSupply returns a valid hex number (66 chars = 0x + 64 hex), it's likely ERC-20
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
export function getERCStandardRiskFactors(result: ERCStandardResult): {
  name: string;
  status: 'safe' | 'warning' | 'danger';
  description: string;
}[] {
  const factors: { name: string; status: 'safe' | 'warning' | 'danger'; description: string }[] = [];

  switch (result.standard) {
    case 'ERC-20':
      factors.push({
        name: 'ERC-20 Token',
        status: 'safe',
        description: 'Standard fungible token - widely supported by DEXs and wallets',
      });
      break;

    case 'ERC-721':
      factors.push({
        name: 'ERC-721 NFT',
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

    case 'ERC-1155':
      factors.push({
        name: 'ERC-1155 Multi-Token',
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
export function getERCStandardScoreModifier(result: ERCStandardResult): number {
  switch (result.standard) {
    case 'ERC-20':
      return 5; // Slight bonus for standard tokens
    case 'ERC-721':
      return 0; // Neutral - NFTs have different risk profile
    case 'ERC-1155':
      return 0; // Neutral - Multi-tokens have different risk profile
    case 'Unknown':
      return -10; // Penalty for non-standard contracts
    default:
      return 0;
  }
}

/**
 * Check if network supports ERC standard detection
 */
export function supportsERCDetection(network: string): boolean {
  return network in NETWORK_RPC;
}
