/**
 * OCR Address Correction Module
 * 
 * Exports utilities for correcting OCR errors in blockchain addresses
 */

export {
  correctAddress,
  correctEthAddress,
  correctSolanaAddress,
  correctTronAddress,
  applyBasicCorrections,
  toChecksumAddress,
  isValidChecksumAddress,
  validateAndChecksum,
  type ChecksumResult,
} from './addressCorrector';

// Re-export checksum utilities for direct access
export {
  toEIP55Checksum,
  isValidEIP55Checksum,
  isValidTronChecksum,
  isValidSolanaAddress,
  normalizeSolanaAddress,
  hexToTronAddress,
  tronAddressToHex,
} from './checksums';

export { isValidBase58, base58Decode, base58Encode } from './base58';
export { sha256, doubleSha256 } from './sha256';
export { keccak256 } from './keccak256';

export { keccak256 } from './keccak256';
