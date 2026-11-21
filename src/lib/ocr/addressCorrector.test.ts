/**
 * Unit tests for OCR Address Correction
 *
 * Behavior under test: the corrector never fabricates an address. It repairs at
 * most 2 look-alike characters, never pads or truncates, and gives anything it
 * cannot repair safely a low confidence so the UI asks the user to confirm.
 */

import { describe, it, expect } from 'vitest';
import {
  correctAddress,
  correctEthAddress,
  correctSolanaAddress,
  applyBasicCorrections,
  toChecksumAddress,
} from './addressCorrector';

// Real, valid addresses (the Solana ones decode to exactly 32 bytes)
const PEPE = '0x6982508145454Ce325dDbE47a25d4ec3d2311933';
const PEPE_LOWER = '0x6982508145454ce325ddbe47a25d4ec3d2311933';
const WSOL = 'So11111111111111111111111111111111111111112';
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const MBTC = 'B93fZyTfwwTaKPzwH7274Yh58PtzFUE6BjzUmHqCFrVD';
const TRON_VALID = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';

describe('OCR Address Correction', () => {
  describe('correctEthAddress', () => {
    it('should correct O to 0 in the prefix', () => {
      const result = correctEthAddress('Ox6982508145454Ce325dDbE47a25d4ec3d2311933');
      expect(result.corrected).toBe(PEPE_LOWER);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should repair a single l to 1', () => {
      const result = correctEthAddress('0x6982508l45454Ce325dDbE47a25d4ec3d2311933');
      expect(result.corrected).toBe(PEPE_LOWER);
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.confidence).toBeLessThan(1.0);
      expect(result.corrections.length).toBeGreaterThan(0);
    });

    it('should repair two look-alike characters', () => {
      const result = correctEthAddress('0x6982508145454Ce325dDbE47a25d4ec3d23ll933');
      expect(result.corrected).toBe(PEPE_LOWER);
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    });

    it('should refuse to guess when more than 2 characters need repair', () => {
      const result = correctEthAddress('0x6982508l45454Ce325dDbE47a25d4ec3d23ll933');
      expect(result.confidence).toBe(0);
      expect(result.corrections).toContain('Could not repair safely');
      expect(result.corrected.length).toBe(42);
    });

    it('should not turn I into a guessed address when too many are wrong', () => {
      const result = correctEthAddress('0x6982508I45454Ce325dDbE47a25d4ec3d23II933');
      expect(result.confidence).toBe(0);
      expect(result.corrected.startsWith('0x')).toBe(true);
    });

    it('should handle missing 0x prefix (standalone x)', () => {
      const result = correctEthAddress('x6982508145454Ce325dDbE47a25d4ec3d2311933');
      expect(result.corrected).toBe(PEPE_LOWER);
    });

    it('should return a valid address unchanged', () => {
      const result = correctEthAddress(PEPE);
      expect(result.corrected).toBe(PEPE_LOWER);
      expect(result.confidence).toBe(1.0);
      expect(result.corrections.length).toBe(0);
    });

    it('should never pad a short address with zeros', () => {
      // 39 hex chars after 0x: one character was lost
      const result = correctEthAddress('0x6982508145454Ce325dDbE47a25d4ec3d231193');
      expect(result.confidence).toBe(0);
      expect(result.corrected.length).toBe(41);
      expect(result.corrected.endsWith('0')).toBe(false);
    });

    it('should never truncate a long address', () => {
      const result = correctEthAddress('0x6982508145454Ce325dDbE47a25d4ec3d23119333');
      expect(result.confidence).toBe(0);
      expect(result.corrected.length).toBe(43);
    });
  });

  describe('applyBasicCorrections', () => {
    it('should replace common OCR misreads', () => {
      expect(applyBasicCorrections('O')).toBe('0');
      expect(applyBasicCorrections('l')).toBe('1');
      expect(applyBasicCorrections('I')).toBe('1');
      expect(applyBasicCorrections('g')).toBe('9');
      expect(applyBasicCorrections('h')).toBe('b');
    });

    it('should preserve valid hex characters', () => {
      expect(applyBasicCorrections('abcdef')).toBe('abcdef');
      expect(applyBasicCorrections('ABCDEF')).toBe('ABCDEF');
      expect(applyBasicCorrections('0123456789')).toBe('0123456789');
    });
  });

  describe('correctSolanaAddress', () => {
    it('should accept real Solana addresses unchanged', () => {
      for (const addr of [WSOL, USDC, MBTC]) {
        const result = correctSolanaAddress(addr);
        expect(result.corrected).toBe(addr);
        expect(result.confidence).toBe(1.0);
        expect(result.checksumValid).toBe(true);
        expect(result.corrections.length).toBe(0);
      }
    });

    it('should replace 0 with o (0 is not Base58)', () => {
      const result = correctSolanaAddress('S011111111111111111111111111111112');
      expect(result.corrected).not.toContain('0');
      expect(result.corrections.length).toBeGreaterThan(0);
    });

    it('should replace I with 1 (I is not Base58)', () => {
      const result = correctSolanaAddress('SoI1111111111111111111111111111112');
      expect(result.corrected).not.toContain('I');
    });

    it('should cap confidence of a repaired address at 60%', () => {
      // MBTC with its 9 misread as 0: the repair (0 -> o) is a guess and wrong
      const result = correctSolanaAddress('B03fZyTfwwTaKPzwH7274Yh58PtzFUE6BjzUmHqCFrVD');
      expect(result.corrected).not.toBe(MBTC);
      expect(result.corrected).not.toContain('0');
      expect(result.confidence).toBeLessThanOrEqual(0.6);
    });

    it('should give low confidence when a character was inserted', () => {
      // T read as "i1": length becomes 45, so it can no longer be a valid address
      const result = correctSolanaAddress('B93fZyTfwwi1aKPzwH7274Yh58PtzFUE6BjzUmHqCFrVD');
      expect(result.checksumValid).toBe(false);
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('correctAddress (auto-detect)', () => {
    it('should detect and correct Ethereum addresses', () => {
      const result = correctAddress('Ox6982508145454Ce325dDbE47a25d4ec3d2311933');
      expect(result.type).toBe('ethereum');
      expect(result.corrected.startsWith('0x')).toBe(true);
    });

    it('should detect a Tron address with a valid checksum', () => {
      const result = correctAddress(TRON_VALID);
      expect(result.type).toBe('tron');
      expect(result.corrected).toBe(TRON_VALID);
      expect(result.confidence).toBe(1.0);
    });

    it('should detect Solana addresses', () => {
      const result = correctAddress(WSOL);
      expect(result.type).toBe('solana');
      expect(result.confidence).toBe(1.0);
    });

    it('should not treat a Solana address that starts with T as Tron', () => {
      // A fragment of an address is neither Tron nor Solana and must not score high
      const result = correctAddress('THwwi1aKPzwH7274YhoSPtzFUE6BjzUmHqCFrVD');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should give low confidence to the OCR misread seen in production', () => {
      // Real MBTC contract misread by OCR: 9->o, f->t, T->i1 (length changes)
      const result = correctAddress('Bo3tZyTHwwi1aKPzwH7274Yh58PtzFUE6BjzUmHqCFrVD');
      expect(result.corrected).not.toBe(MBTC);
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('toChecksumAddress', () => {
    it('should generate consistent EIP-55 checksum format', () => {
      const checksummed = toChecksumAddress(PEPE_LOWER);
      expect(checksummed.startsWith('0x')).toBe(true);
      expect(checksummed.length).toBe(42);
      expect(checksummed).not.toBe(checksummed.toLowerCase());
    });
  });

  describe('Full OCR Pipeline Simulation', () => {
    it('should correct a PEPE address with 2 look-alike errors', () => {
      const result = correctEthAddress('Ox6982508145454Ce325dDbE47a25d4ec3d23ll933');
      expect(result.corrected).toBe(PEPE_LOWER);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.corrections.length).toBeGreaterThan(0);
    });

    it('should reject an address with too many corruptions instead of guessing', () => {
      const result = correctEthAddress('Ox6982508l45454Ce325dDbE47a25d4ec3d23ll933');
      expect(result.confidence).toBe(0);
    });

    it('should handle mixed corruptions without inventing an address', () => {
      const result = correctEthAddress('0xdead8eefOOOOlllI5555SSSS');
      expect(result.corrected.startsWith('0x')).toBe(true);
      expect(result.confidence).toBe(0);
      expect(result.corrections.length).toBeGreaterThan(0);
    });

    it('should detect and correct Solana OCR errors', () => {
      const result = correctSolanaAddress('S0111111I111111111l1111111111111l');
      expect(result.corrected).not.toContain('0');
      expect(result.corrected).not.toContain('O');
      expect(result.corrected).not.toContain('I');
      expect(result.corrected).not.toContain('l');
      expect(result.corrections.length).toBeGreaterThan(0);
    });

    it('should auto-detect address type with OCR errors', () => {
      const ethResult = correctAddress('Ox1234567890abcdef1234567890abcdef12345678');
      expect(ethResult.type).toBe('ethereum');
      expect(ethResult.corrected.startsWith('0x')).toBe(true);

      // Lowercase t is fixed to T, but the checksum is invalid, so confidence stays low
      const tronResult = correctAddress('tJCyA6vQDaVRxB8CQRdjXq3dWpz1yDpEpj');
      expect(tronResult.type).toBe('tron');
      expect(tronResult.corrected.startsWith('T')).toBe(true);
      expect(tronResult.confidence).toBeLessThan(0.5);
    });

    it('should provide low confidence for heavily corrupted addresses', () => {
      const result = correctEthAddress('Ox!!!OOOO????IIII----llll@@@@');
      expect(result.confidence).toBeLessThan(0.5);
    });
  });
});
