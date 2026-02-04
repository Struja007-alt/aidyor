/**
 * Smart OCR Address Corrector
 * 
 * Uses context-aware character substitution rules and checksum validation
 * to correct common OCR misreads in blockchain addresses.
 * 
 * Supports checksums for:
 * - Ethereum/EVM chains (EIP-55)
 * - Tron (Base58Check with double SHA-256)
 * - Solana (Ed25519 public key format validation)
 */

import { 
  toEIP55Checksum, 
  isValidEIP55Checksum,
  isValidTronChecksum,
  isValidSolanaAddress,
  normalizeSolanaAddress,
  validateAndChecksum,
  type ChecksumResult 
} from './checksums';
import { isValidBase58 } from './base58';

// Character confusion matrix: what OCR commonly mistakes each character for
const OCR_CONFUSION_MAP: Record<string, string[]> = {
  // Numbers misread as letters
  '0': ['O', 'o', 'Q', 'D'],
  '1': ['l', 'I', 'i', '|', '!'],
  '2': ['Z', 'z'],
  '5': ['S', 's'],
  '6': ['G', 'b'],
  '7': ['?', 'T'],
  '8': ['B'],
  '9': ['g', 'q'],
  
  // Letters misread as numbers or other letters
  'a': ['4'],
  'A': ['4'],
  'b': ['6', 'h'],
  'B': ['8', 'R'],
  'c': ['e', '('],
  'C': ['G', '('],
  'd': ['cl', 'o'],
  'D': ['0', 'O'],
  'e': ['c'],
  'E': ['F'],
  'f': ['t'],
  'F': ['E', 'P'],
};

// Reverse map: what each misread character should be
const CHAR_CORRECTIONS: Record<string, string> = {
  // Letter O -> 0 (in hex context)
  'O': '0',
  'o': '0',
  'Q': '0',
  
  // Letter I/l -> 1 (in hex context)
  'l': '1',
  'I': '1',
  'i': '1',
  '|': '1',
  '!': '1',
  
  // Other common substitutions
  'Z': '2',
  'z': '2',
  'S': '5',
  's': '5',
  'G': '6',
  '?': '7',
  'T': '7',
  'g': '9',
  'q': '9',
  'h': 'b',
  'H': 'B',
  'R': 'B',
  'P': 'F',
};

// Valid hex characters
const HEX_CHARS = new Set('0123456789abcdefABCDEF');

/**
 * Apply basic character corrections for hex addresses
 */
export function applyBasicCorrections(text: string): string {
  let result = '';
  for (const char of text) {
    if (HEX_CHARS.has(char)) {
      result += char;
    } else if (CHAR_CORRECTIONS[char]) {
      result += CHAR_CORRECTIONS[char];
    }
    // Skip invalid characters entirely
  }
  return result;
}

/**
 * Calculate EIP-55 checksum for an Ethereum address
 * Re-exported from checksums module for backward compatibility
 */
export const toChecksumAddress = toEIP55Checksum;

/**
 * Validate if an address has a valid EIP-55 checksum
 * Re-exported from checksums module for backward compatibility
 */
export const isValidChecksumAddress = isValidEIP55Checksum;

/**
 * Validate checksum for any supported network
 */
export { validateAndChecksum, type ChecksumResult };

/**
 * Generate possible corrections for an address by trying character substitutions
 */
function* generateCandidates(rawAddress: string, maxMutations: number = 3): Generator<string> {
  const addr = rawAddress.replace('0x', '');
  
  // First yield the basic correction
  yield applyBasicCorrections(addr);
  
  // Find positions with suspicious characters
  const suspiciousPositions: number[] = [];
  for (let i = 0; i < addr.length; i++) {
    if (!HEX_CHARS.has(addr[i])) {
      suspiciousPositions.push(i);
    }
  }
  
  // If too many suspicious chars, just use basic correction
  if (suspiciousPositions.length > maxMutations) {
    return;
  }
  
  // Try all combinations of corrections for suspicious positions
  // This is a simplified approach - for production, you'd want beam search
  const chars = addr.split('');
  
  function* tryCorrections(pos: number): Generator<string> {
    if (pos >= suspiciousPositions.length) {
      yield chars.join('');
      return;
    }
    
    const idx = suspiciousPositions[pos];
    const originalChar = chars[idx];
    
    // Try the mapped correction first
    if (CHAR_CORRECTIONS[originalChar]) {
      chars[idx] = CHAR_CORRECTIONS[originalChar];
      yield* tryCorrections(pos + 1);
    }
    
    // Try keeping original if it's hex-valid
    if (HEX_CHARS.has(originalChar)) {
      chars[idx] = originalChar;
      yield* tryCorrections(pos + 1);
    }
    
    // Restore original for next iteration
    chars[idx] = originalChar;
  }
  
  yield* tryCorrections(0);
}

/**
 * Correct an Ethereum address using OCR error patterns and checksum validation
 */
export function correctEthAddress(rawAddress: string): {
  corrected: string;
  confidence: number;
  corrections: string[];
} {
  const corrections: string[] = [];
  
  // Fix common prefix issues
  let normalized = rawAddress
    .replace(/^Ox/i, '0x')
    .replace(/^\\bx(?=[a-fA-F0-9])/i, '0x');
  
  if (!normalized.startsWith('0x')) {
    normalized = '0x' + normalized;
  }
  
  const prefix = normalized.slice(0, 2);
  const body = normalized.slice(2);
  
  // Quick path: if already valid
  if (/^[a-fA-F0-9]{40}$/.test(body)) {
    return {
      corrected: prefix + body.toLowerCase(),
      confidence: 1.0,
      corrections: []
    };
  }
  
  // Try to correct the address
  for (const candidate of generateCandidates(body)) {
    if (candidate.length === 40 && /^[a-fA-F0-9]{40}$/.test(candidate)) {
      const fullAddress = '0x' + candidate.toLowerCase();
      
      // Calculate confidence based on number of changes
      const changesNeeded = countDifferences(body, candidate);
      const confidence = Math.max(0.5, 1 - (changesNeeded * 0.1));
      
      if (changesNeeded > 0) {
        corrections.push(`${changesNeeded} character(s) corrected`);
      }
      
      return {
        corrected: fullAddress,
        confidence,
        corrections
      };
    }
  }
  
  // Fallback: apply basic corrections and truncate/pad
  const basicCorrected = applyBasicCorrections(body);
  const finalAddress = basicCorrected.slice(0, 40).padEnd(40, '0').toLowerCase();
  
  return {
    corrected: '0x' + finalAddress,
    confidence: 0.3,
    corrections: ['Multiple corrections applied, low confidence']
  };
}

/**
 * Correct a Solana address (Base58, no 0, O, I, l allowed)
 * Now with proper Ed25519 public key format validation
 */
export function correctSolanaAddress(rawAddress: string): {
  corrected: string;
  confidence: number;
  corrections: string[];
  checksumValid: boolean;
} {
  const corrections: string[] = [];
  
  // Base58 alphabet (no 0, O, I, l)
  const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const BASE58_SET = new Set(BASE58_CHARS);
  
  // Corrections specific to Base58 (these chars are NOT allowed)
  const SOLANA_CORRECTIONS: Record<string, string> = {
    '0': 'o', // 0 -> o (lowercase o IS valid in Base58)
    'O': 'o', // O -> o
    'I': '1', // I -> 1 (1 IS valid)
    'l': '1', // l -> 1
  };
  
  let corrected = '';
  let changesCount = 0;
  
  for (const char of rawAddress) {
    if (BASE58_SET.has(char)) {
      corrected += char;
    } else if (SOLANA_CORRECTIONS[char]) {
      corrected += SOLANA_CORRECTIONS[char];
      changesCount++;
    }
    // Skip invalid characters
  }
  
  if (changesCount > 0) {
    corrections.push(`${changesCount} invalid Base58 character(s) corrected`);
  }
  
  // Validate using proper Solana address validation
  const isValid = isValidSolanaAddress(corrected);
  const normalized = isValid ? normalizeSolanaAddress(corrected) : null;
  
  if (isValid && normalized && normalized !== corrected) {
    corrections.push('Address normalized');
    corrected = normalized;
  }
  
  const confidence = isValid 
    ? Math.max(0.7, 1 - (changesCount * 0.1))
    : corrected.length >= 32 && corrected.length <= 44
      ? Math.max(0.4, 0.6 - (changesCount * 0.1))
      : 0.2;
  
  return {
    corrected,
    confidence,
    corrections,
    checksumValid: isValid
  };
}

/**
 * Correct a Tron address (T + 33 alphanumeric)
 * Now with proper Base58Check checksum validation
 */
export function correctTronAddress(rawAddress: string): {
  corrected: string;
  confidence: number;
  corrections: string[];
  checksumValid: boolean;
} {
  const corrections: string[] = [];
  
  // Ensure starts with T
  let normalized = rawAddress;
  if (!normalized.startsWith('T')) {
    if (normalized.startsWith('t')) {
      normalized = 'T' + normalized.slice(1);
      corrections.push('Lowercase t corrected to T');
    } else {
      return {
        corrected: rawAddress,
        confidence: 0,
        corrections: ['Invalid Tron address: must start with T'],
        checksumValid: false
      };
    }
  }
  
  // Base58 alphabet for Tron (no 0, O, I, l)
  const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const BASE58_SET = new Set(BASE58_CHARS);
  
  // Apply corrections for invalid Base58 characters
  const TRON_CORRECTIONS: Record<string, string> = {
    '0': 'o', // 0 is not in Base58, o is
    'O': 'o', // O is not in Base58, o is
    'I': '1', // I is not in Base58, 1 is
    'l': '1', // l is not in Base58, 1 is
  };
  
  let corrected = 'T';
  let changesCount = 0;
  
  for (let i = 1; i < normalized.length; i++) {
    const char = normalized[i];
    if (BASE58_SET.has(char)) {
      corrected += char;
    } else if (TRON_CORRECTIONS[char]) {
      corrected += TRON_CORRECTIONS[char];
      changesCount++;
    }
    // Skip completely invalid characters
  }
  
  if (changesCount > 0) {
    corrections.push(`${changesCount} character(s) corrected`);
  }
  
  // Validate checksum
  const checksumValid = isValidTronChecksum(corrected);
  
  if (checksumValid) {
    corrections.push('Checksum verified ✓');
  } else if (corrected.length === 34 && isValidBase58(corrected)) {
    corrections.push('Checksum invalid - address may be corrupted');
  }
  
  const isValidLength = corrected.length === 34;
  const confidence = checksumValid
    ? Math.max(0.9, 1 - (changesCount * 0.05))
    : isValidLength && isValidBase58(corrected)
      ? Math.max(0.5, 0.7 - (changesCount * 0.1))
      : 0.2;
  
  return {
    corrected,
    confidence,
    corrections,
    checksumValid
  };
}

/**
 * Auto-detect address type and apply appropriate corrections
 */
export function correctAddress(rawAddress: string): {
  type: 'ethereum' | 'solana' | 'tron' | 'unknown';
  corrected: string;
  confidence: number;
  corrections: string[];
} {
  const trimmed = rawAddress.trim();
  
  // Ethereum: starts with 0x or Ox (OCR error)
  if (/^[0O]x/i.test(trimmed)) {
    const result = correctEthAddress(trimmed);
    return { type: 'ethereum', ...result };
  }
  
  // Tron: starts with T
  if (trimmed.startsWith('T') || trimmed.startsWith('t')) {
    const result = correctTronAddress(trimmed);
    return { type: 'tron', ...result };
  }
  
  // Solana: Base58, 32-44 chars, no 0/O/I/l
  if (trimmed.length >= 32 && trimmed.length <= 50) {
    const result = correctSolanaAddress(trimmed);
    if (result.confidence > 0.3) {
      return { type: 'solana', ...result };
    }
  }
  
  return {
    type: 'unknown',
    corrected: trimmed,
    confidence: 0,
    corrections: ['Unable to determine address type']
  };
}

/**
 * Count character differences between two strings
 */
function countDifferences(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  let diff = Math.abs(a.length - b.length);
  
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i].toLowerCase() !== b[i].toLowerCase()) {
      diff++;
    }
  }
  
  return diff;
}
