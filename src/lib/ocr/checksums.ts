/**
 * Multi-chain checksum validation utilities
 * Supports: Ethereum/EVM (EIP-55), Tron (Base58Check), Solana (Ed25519 pubkey format)
 */

import { keccak256 } from './keccak256';
import { doubleSha256 } from './sha256';
import { base58Decode, base58Encode, isValidBase58 } from './base58';

// ============================================================================
// Ethereum / EVM Chains (EIP-55 Checksum)
// Applies to: ETH, BSC, Polygon, Arbitrum, Optimism, Base, Avalanche C-Chain
// ============================================================================

/**
 * Convert an Ethereum address to EIP-55 checksummed format
 */
export function toEIP55Checksum(address: string): string {
  const addr = address.toLowerCase().replace('0x', '');
  const hash = keccak256(addr);
  
  let checksummed = '0x';
  for (let i = 0; i < addr.length; i++) {
    const char = addr[i];
    if (/[a-f]/.test(char)) {
      checksummed += parseInt(hash[i], 16) >= 8 ? char.toUpperCase() : char;
    } else {
      checksummed += char;
    }
  }
  return checksummed;
}

/**
 * Validate if an EVM address has a valid EIP-55 checksum
 */
export function isValidEIP55Checksum(address: string): boolean {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return false;
  
  const addr = address.replace('0x', '');
  // All lowercase or all uppercase is valid (no checksum applied)
  if (addr === addr.toLowerCase() || addr === addr.toUpperCase()) {
    return true;
  }
  
  // Mixed case must match checksum
  return toEIP55Checksum(address) === address;
}

/**
 * Fix an EVM address and return with proper checksum
 */
export function fixEVMAddress(address: string): { valid: boolean; checksummed: string } {
  const normalized = address.trim().toLowerCase();
  
  if (!/^0x[a-f0-9]{40}$/.test(normalized)) {
    return { valid: false, checksummed: address };
  }
  
  return { valid: true, checksummed: toEIP55Checksum(normalized) };
}

// ============================================================================
// Tron (Base58Check with double SHA-256 checksum)
// ============================================================================

/**
 * Validate a Tron address checksum (Base58Check)
 * Tron addresses: 21 bytes (1 byte prefix 0x41 + 20 bytes address + 4 bytes checksum)
 */
export function isValidTronChecksum(address: string): boolean {
  if (!address.startsWith('T') || address.length !== 34) {
    return false;
  }
  
  if (!isValidBase58(address)) {
    return false;
  }
  
  const decoded = base58Decode(address);
  if (!decoded || decoded.length !== 25) {
    return false;
  }
  
  // First byte should be 0x41 (Tron mainnet)
  if (decoded[0] !== 0x41) {
    return false;
  }
  
  // Split into address bytes and checksum
  const addressBytes = decoded.slice(0, 21);
  const checksum = decoded.slice(21, 25);
  
  // Calculate expected checksum (first 4 bytes of double SHA-256)
  const hash = doubleSha256(addressBytes);
  const expectedChecksum = hash.slice(0, 4);
  
  // Compare checksums
  for (let i = 0; i < 4; i++) {
    if (checksum[i] !== expectedChecksum[i]) {
      return false;
    }
  }
  
  return true;
}

/**
 * Convert hex address to Tron Base58Check format
 */
export function hexToTronAddress(hexAddress: string): string | null {
  // Remove 0x prefix if present, add 41 prefix
  let hex = hexAddress.replace(/^0x/i, '');
  if (hex.length !== 40) return null;
  
  // Add Tron prefix (0x41)
  hex = '41' + hex;
  
  // Convert to bytes
  const bytes = new Uint8Array(21);
  for (let i = 0; i < 21; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  
  // Calculate checksum
  const hash = doubleSha256(bytes);
  const checksum = hash.slice(0, 4);
  
  // Combine and encode
  const full = new Uint8Array(25);
  full.set(bytes);
  full.set(checksum, 21);
  
  return base58Encode(full);
}

/**
 * Convert Tron Base58 address to hex format
 */
export function tronAddressToHex(address: string): string | null {
  if (!isValidTronChecksum(address)) {
    return null;
  }
  
  const decoded = base58Decode(address);
  if (!decoded) return null;
  
  // Skip prefix (0x41), take 20 bytes of address
  const addressBytes = decoded.slice(1, 21);
  
  return '0x' + Array.from(addressBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ============================================================================
// Solana (Ed25519 public key, no traditional checksum but format validation)
// ============================================================================

/**
 * Validate a Solana address format
 * Solana uses Base58 encoded 32-byte Ed25519 public keys
 */
export function isValidSolanaAddress(address: string): boolean {
  // Must be Base58 characters only
  if (!isValidBase58(address)) {
    return false;
  }
  
  // Length should be 32-44 characters
  if (address.length < 32 || address.length > 44) {
    return false;
  }
  
  // Decode and check byte length
  const decoded = base58Decode(address);
  if (!decoded) {
    return false;
  }
  
  // Should decode to exactly 32 bytes (Ed25519 public key)
  return decoded.length === 32;
}

/**
 * Normalize a Solana address (returns null if invalid)
 */
export function normalizeSolanaAddress(address: string): string | null {
  if (!isValidSolanaAddress(address)) {
    return null;
  }
  
  // Re-encode to normalize any formatting
  const decoded = base58Decode(address);
  if (!decoded) return null;
  
  return base58Encode(decoded);
}

// ============================================================================
// Universal validator
// ============================================================================

export type NetworkType = 'ethereum' | 'bsc' | 'polygon' | 'arbitrum' | 'optimism' | 'base' | 'avalanche' | 'solana' | 'tron' | 'unknown';

export interface ChecksumResult {
  valid: boolean;
  network: NetworkType;
  checksummed: string;
  original: string;
  corrected: boolean;
}

/**
 * Validate and checksum an address for any supported network
 */
export function validateAndChecksum(address: string): ChecksumResult {
  const trimmed = address.trim();
  
  // EVM chains (0x prefix)
  if (/^0x[a-fA-F0-9]{40}$/i.test(trimmed)) {
    const result = fixEVMAddress(trimmed);
    return {
      valid: result.valid,
      network: 'ethereum', // Could be any EVM chain
      checksummed: result.checksummed,
      original: trimmed,
      corrected: result.checksummed.toLowerCase() !== trimmed.toLowerCase(),
    };
  }
  
  // Tron (T prefix, 34 chars)
  if (trimmed.startsWith('T') && trimmed.length === 34) {
    const valid = isValidTronChecksum(trimmed);
    return {
      valid,
      network: 'tron',
      checksummed: trimmed, // Tron addresses are already checksummed in Base58
      original: trimmed,
      corrected: false,
    };
  }
  
  // Solana (Base58, 32-44 chars)
  if (trimmed.length >= 32 && trimmed.length <= 44 && isValidBase58(trimmed)) {
    const valid = isValidSolanaAddress(trimmed);
    const normalized = valid ? normalizeSolanaAddress(trimmed) : null;
    return {
      valid,
      network: 'solana',
      checksummed: normalized || trimmed,
      original: trimmed,
      corrected: normalized !== null && normalized !== trimmed,
    };
  }
  
  return {
    valid: false,
    network: 'unknown',
    checksummed: trimmed,
    original: trimmed,
    corrected: false,
  };
}
