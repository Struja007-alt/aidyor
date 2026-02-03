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
} from './addressCorrector';

export { keccak256 } from './keccak256';
