/**
 * Smart OCR Address Corrector
 *
 * Conservative corrections for blockchain addresses read by OCR.
 * Rule: never fabricate an address. A repair is only accepted when nothing was
 * dropped, the length is exactly right and only a few look-alike characters
 * were swapped. Anything else gets confidence 0 so the UI asks the user.
 *
 * Note: Solana has no checksum. A misread that is still valid Base58 cannot be
 * detected here, so confidence is capped and on-chain verification is required.
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

// A repaired address may differ from the OCR read by at most this many characters.
const MAX_REPAIRS = 2;

// Letters that OCR confuses with hex digits (EVM context only)
const CHAR_CORRECTIONS: Record<string, string> = {
  'O': '0', 'o': '0', 'Q': '0',
  'l': '1', 'I': '1', 'i': '1', '|': '1', '!': '1',
  'Z': '2', 'z': '2',
  'S': '5', 's': '5',
  'G': '6',
  '?': '7', 'T': '7',
  'g': '9', 'q': '9',
  'h': 'b', 'H': 'B', 'R': 'B',
  'P': 'F',
};

const HEX_CHARS = new Set('0123456789abcdefABCDEF');
const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_SET = new Set(BASE58_CHARS);

// Characters that are NOT in Base58 and their only sensible replacements.
// Capital O is not Base58, lowercase o is.
const BASE58_FIXES: Record<string, string> = {
  '0': 'o',
  'O': 'o',
  'I': '1',
  'l': '1',
};

/**
 * Apply look-alike corrections for hex addresses.
 * Characters with no known correction are skipped.
 */
export function applyBasicCorrections(text: string): string {
  let result = '';
  for (const char of text) {
    if (HEX_CHARS.has(char)) {
      result += char;
    } else if (CHAR_CORRECTIONS[char]) {
      result += CHAR_CORRECTIONS[char];
    }
  }
  return result;
}

/** Re-exported from checksums module for backward compatibility */
export const toChecksumAddress = toEIP55Checksum;
export const isValidChecksumAddress = isValidEIP55Checksum;
export { validateAndChecksum, type ChecksumResult };

/**
 * Correct an Ethereum address. Never pads or truncates.
 */
export function correctEthAddress(rawAddress: string): {
  corrected: string;
  confidence: number;
  corrections: string[];
} {
  let normalized = rawAddress
    .replace(/^Ox/i, '0x')
    .replace(/^\bx(?=[a-fA-F0-9])/i, '0x');

  if (!normalized.startsWith('0x')) {
    normalized = '0x' + normalized;
  }

  const prefix = normalized.slice(0, 2);
  const body = normalized.slice(2);

  if (/^[a-fA-F0-9]{40}$/.test(body)) {
    return { corrected: prefix + body.toLowerCase(), confidence: 1.0, corrections: [] };
  }

  let fixed = '';
  let fixes = 0;
  let dropped = 0;
  for (const char of body) {
    if (HEX_CHARS.has(char)) {
      fixed += char;
    } else if (CHAR_CORRECTIONS[char]) {
      fixed += CHAR_CORRECTIONS[char];
      fixes++;
    } else {
      dropped++;
    }
  }

  if (dropped === 0 && fixes > 0 && fixes <= MAX_REPAIRS && /^[a-fA-F0-9]{40}$/.test(fixed)) {
    return {
      corrected: '0x' + fixed.toLowerCase(),
      confidence: Math.max(0.5, 1 - fixes * 0.15),
      corrections: [`${fixes} character(s) corrected`]
    };
  }

  return {
    corrected: prefix + body.toLowerCase(),
    confidence: 0,
    corrections: ['Could not repair safely']
  };
}

/**
 * Correct a Solana address (Base58: no 0, O, I, l).
 * Confidence is capped below 1 for anything that was changed, and a valid
 * format is NOT proof the address is right (no checksum exists).
 */
export function correctSolanaAddress(rawAddress: string): {
  corrected: string;
  confidence: number;
  corrections: string[];
  checksumValid: boolean;
} {
  const corrections: string[] = [];
  let corrected = '';
  let changesCount = 0;
  let dropped = 0;

  for (const char of rawAddress) {
    if (BASE58_SET.has(char)) {
      corrected += char;
    } else if (BASE58_FIXES[char]) {
      corrected += BASE58_FIXES[char];
      changesCount++;
    } else {
      dropped++;
    }
  }

  if (changesCount > 0) {
    corrections.push(`${changesCount} invalid Base58 character(s) corrected`);
  }
  if (dropped > 0) {
    corrections.push(`${dropped} unreadable character(s) dropped`);
  }

  const isValid = isValidSolanaAddress(corrected);
  const normalized = isValid ? normalizeSolanaAddress(corrected) : null;
  if (isValid && normalized && normalized !== corrected) {
    corrections.push('Address normalized');
    corrected = normalized;
  }

  const safe = isValid && dropped === 0 && changesCount <= MAX_REPAIRS;
  // A repaired character is a guess (0 could be 9, D, o...), so repaired
  // addresses never rise above 60% and must be confirmed by the user.
  const confidence = !safe
    ? 0.2
    : changesCount > 0
      ? Math.min(0.6, 1 - changesCount * 0.15)
      : 1.0;

  return { corrected, confidence, corrections, checksumValid: isValid };
}

/**
 * Correct a Tron address (T + 33 Base58 chars) with Base58Check validation.
 */
export function correctTronAddress(rawAddress: string): {
  corrected: string;
  confidence: number;
  corrections: string[];
  checksumValid: boolean;
} {
  const corrections: string[] = [];

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

  let corrected = 'T';
  let changesCount = 0;
  let dropped = 0;

  for (let i = 1; i < normalized.length; i++) {
    const char = normalized[i];
    if (BASE58_SET.has(char)) {
      corrected += char;
    } else if (BASE58_FIXES[char]) {
      corrected += BASE58_FIXES[char];
      changesCount++;
    } else {
      dropped++;
    }
  }

  if (changesCount > 0) corrections.push(`${changesCount} character(s) corrected`);
  if (dropped > 0) corrections.push(`${dropped} unreadable character(s) dropped`);

  const checksumValid = isValidTronChecksum(corrected);
  if (checksumValid) {
    corrections.push('Checksum verified ✓');
  } else if (corrected.length === 34 && isValidBase58(corrected)) {
    corrections.push('Checksum invalid - address may be corrupted');
  }

  const safe = dropped === 0 && changesCount <= MAX_REPAIRS;
  // Tron has a real checksum, so a passing checksum is strong evidence.
  const confidence = checksumValid && safe
    ? Math.max(0.9, 1 - changesCount * 0.05)
    : 0.2;

  return { corrected, confidence, corrections, checksumValid };
}

/**
 * Auto-detect address type and apply the matching corrections.
 */
export function correctAddress(rawAddress: string): {
  type: 'ethereum' | 'solana' | 'tron' | 'unknown';
  corrected: string;
  confidence: number;
  corrections: string[];
  checksumValid?: boolean;
} {
  const trimmed = rawAddress.trim();

  // Ethereum: starts with 0x or Ox (OCR error)
  if (/^[0O]x/i.test(trimmed)) {
    const result = correctEthAddress(trimmed);
    const checksumValid = isValidChecksumAddress(result.corrected);
    if (checksumValid && result.confidence > 0) {
      result.corrections.push('EIP-55 checksum verified ✓');
    }
    return { type: 'ethereum', ...result, checksumValid };
  }

  // Valid Base58 of Tron length that passes the Tron checksum is Tron.
  // A Solana address can also start with T, so the checksum decides.
  if (trimmed.length === 34 && trimmed.startsWith('T') && isValidTronChecksum(trimmed)) {
    return {
      type: 'tron',
      corrected: trimmed,
      confidence: 1.0,
      corrections: ['Checksum verified ✓'],
      checksumValid: true
    };
  }

  // Solana: Base58, 32-44 chars
  if (trimmed.length >= 32 && trimmed.length <= 50) {
    const result = correctSolanaAddress(trimmed);
    if (result.confidence > 0.3) {
      return {
        type: 'solana',
        corrected: result.corrected,
        confidence: result.confidence,
        corrections: result.corrections,
        checksumValid: result.checksumValid
      };
    }
  }

  // Tron with OCR damage
  if ((trimmed.startsWith('T') || trimmed.startsWith('t')) && trimmed.length >= 30 && trimmed.length <= 38) {
    const result = correctTronAddress(trimmed);
    return {
      type: 'tron',
      corrected: result.corrected,
      confidence: result.confidence,
      corrections: result.corrections,
      checksumValid: result.checksumValid
    };
  }

  return {
    type: 'unknown',
    corrected: trimmed,
    confidence: 0,
    corrections: ['Unable to determine address type'],
    checksumValid: false
  };
}
