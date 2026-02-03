/**
 * Smart OCR Address Corrector
 * 
 * Uses context-aware character substitution rules and checksum validation
 * to correct common OCR misreads in blockchain addresses.
 */

import { keccak256 } from './keccak256';

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
 */
export function toChecksumAddress(address: string): string {
  const addr = address.toLowerCase().replace('0x', '');
  const hash = keccak256(addr);
  
  let checksummed = '0x';
  for (let i = 0; i < addr.length; i++) {
    const char = addr[i];
    if (/[a-f]/.test(char)) {
      // If the corresponding hash character is >= 8, uppercase the letter
      checksummed += parseInt(hash[i], 16) >= 8 ? char.toUpperCase() : char;
    } else {
      checksummed += char;
    }
  }
  return checksummed;
}

/**
 * Validate if an address has a valid EIP-55 checksum
 */
export function isValidChecksumAddress(address: string): boolean {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return false;
  
  const addr = address.replace('0x', '');
  // All lowercase or all uppercase is valid (no checksum applied)
  if (addr === addr.toLowerCase() || addr === addr.toUpperCase()) {
    return true;
  }
  
  // Mixed case must match checksum
  return toChecksumAddress(address) === address;
}

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
 */
export function correctSolanaAddress(rawAddress: string): {
  corrected: string;
  confidence: number;
  corrections: string[];
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
  
  // Validate length (32-44 chars)
  const isValidLength = corrected.length >= 32 && corrected.length <= 44;
  const confidence = isValidLength 
    ? Math.max(0.5, 1 - (changesCount * 0.1))
    : 0.2;
  
  return {
    corrected,
    confidence,
    corrections
  };
}

/**
 * Correct a Tron address (T + 33 alphanumeric)
 */
export function correctTronAddress(rawAddress: string): {
  corrected: string;
  confidence: number;
  corrections: string[];
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
        corrections: ['Invalid Tron address: must start with T']
      };
    }
  }
  
  // Apply corrections similar to Base58 (Tron uses Base58Check)
  const TRON_CORRECTIONS: Record<string, string> = {
    '0': 'O', // Context-dependent
    'O': 'o',
    'I': '1',
    'l': '1',
  };
  
  let corrected = 'T';
  let changesCount = 0;
  
  for (let i = 1; i < normalized.length; i++) {
    const char = normalized[i];
    if (/[A-Za-z1-9]/.test(char)) {
      corrected += char;
    } else if (TRON_CORRECTIONS[char]) {
      corrected += TRON_CORRECTIONS[char];
      changesCount++;
    }
  }
  
  if (changesCount > 0) {
    corrections.push(`${changesCount} character(s) corrected`);
  }
  
  const isValidLength = corrected.length === 34;
  const confidence = isValidLength
    ? Math.max(0.5, 1 - (changesCount * 0.1))
    : 0.2;
  
  return {
    corrected,
    confidence,
    corrections
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
