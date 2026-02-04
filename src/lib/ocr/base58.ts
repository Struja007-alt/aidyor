/**
 * Base58 encoding/decoding for Tron and Solana address validation
 */

// Base58 alphabet (Bitcoin/Tron style - no 0, O, I, l)
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const ALPHABET_MAP: Record<string, number> = {};
for (let i = 0; i < ALPHABET.length; i++) {
  ALPHABET_MAP[ALPHABET[i]] = i;
}

/**
 * Decode Base58 string to bytes
 */
export function base58Decode(str: string): Uint8Array | null {
  if (str.length === 0) return new Uint8Array(0);
  
  // Count leading '1's (they represent leading zero bytes)
  let leadingZeros = 0;
  for (let i = 0; i < str.length && str[i] === '1'; i++) {
    leadingZeros++;
  }
  
  // Allocate enough space
  const size = Math.ceil(str.length * 733 / 1000) + 1; // log(58) / log(256)
  const bytes = new Uint8Array(size);
  
  let length = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const value = ALPHABET_MAP[char];
    
    if (value === undefined) {
      return null; // Invalid character
    }
    
    let carry = value;
    for (let j = 0; j < length || carry; j++) {
      carry += 58 * (bytes[j] || 0);
      bytes[j] = carry % 256;
      carry = Math.floor(carry / 256);
      if (j >= length) length = j + 1;
    }
  }
  
  // Build result with leading zeros
  const result = new Uint8Array(leadingZeros + length);
  for (let i = 0; i < length; i++) {
    result[leadingZeros + length - 1 - i] = bytes[i];
  }
  
  return result;
}

/**
 * Encode bytes to Base58 string
 */
export function base58Encode(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';
  
  // Count leading zeros
  let leadingZeros = 0;
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    leadingZeros++;
  }
  
  // Allocate enough space for the result
  const size = Math.ceil(bytes.length * 138 / 100) + 1; // log(256) / log(58)
  const b58 = new Uint8Array(size);
  
  let length = 0;
  for (let i = 0; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < length || carry; j++) {
      carry += 256 * (b58[j] || 0);
      b58[j] = carry % 58;
      carry = Math.floor(carry / 58);
      if (j >= length) length = j + 1;
    }
  }
  
  // Build result string
  let result = '';
  for (let i = 0; i < leadingZeros; i++) {
    result += '1';
  }
  for (let i = length - 1; i >= 0; i--) {
    result += ALPHABET[b58[i]];
  }
  
  return result;
}

/**
 * Check if a string is valid Base58
 */
export function isValidBase58(str: string): boolean {
  for (const char of str) {
    if (ALPHABET_MAP[char] === undefined) {
      return false;
    }
  }
  return true;
}
