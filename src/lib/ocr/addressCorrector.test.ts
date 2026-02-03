/**
 * Unit tests for OCR Address Correction
 */

import { describe, it, expect } from 'vitest';
import {
  correctAddress,
  correctEthAddress,
  correctSolanaAddress,
  applyBasicCorrections,
  toChecksumAddress,
} from './addressCorrector';

describe('OCR Address Correction', () => {
  describe('correctEthAddress', () => {
    it('should correct O to 0 in Ethereum addresses', () => {
      // PEPE token with O instead of 0
      const corrupted = 'Ox6982508145454Ce325dDbE47a25d4ec3d2311933';
      const result = correctEthAddress(corrupted);
      
      expect(result.corrected).toBe('0x6982508145454ce325ddbe47a25d4ec3d2311933');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should correct l to 1 in Ethereum addresses', () => {
      // Address with l instead of 1
      const corrupted = '0x6982508l45454Ce325dDbE47a25d4ec3d23ll933';
      const result = correctEthAddress(corrupted);
      
      expect(result.corrected.startsWith('0x')).toBe(true);
      expect(result.corrected.length).toBe(42);
      // Verify l was corrected to 1
      expect(result.corrected).not.toContain('l');
      expect(result.corrections.length).toBeGreaterThan(0);
    });

    it('should handle I to 1 corrections', () => {
      const corrupted = '0x6982508I45454Ce325dDbE47a25d4ec3d23II933';
      const result = correctEthAddress(corrupted);
      
      expect(result.corrected).toContain('0x');
      expect(result.corrected.length).toBe(42);
    });

    it('should handle missing 0x prefix (standalone x)', () => {
      const corrupted = 'x6982508145454Ce325dDbE47a25d4ec3d2311933';
      const result = correctEthAddress(corrupted);
      
      expect(result.corrected.startsWith('0x')).toBe(true);
      expect(result.corrected.length).toBe(42);
    });

    it('should return valid address unchanged', () => {
      const valid = '0x6982508145454Ce325dDbE47a25d4ec3d2311933';
      const result = correctEthAddress(valid);
      
      expect(result.corrected).toBe('0x6982508145454ce325ddbe47a25d4ec3d2311933');
      expect(result.confidence).toBe(1.0);
      expect(result.corrections.length).toBe(0);
    });

    it('should handle multiple character corrections', () => {
      // Multiple O -> 0, l -> 1 corrections
      const corrupted = 'Ox6982508l45454Ce325dDbE47a25d4ec3d23ll933';
      const result = correctEthAddress(corrupted);
      
      expect(result.corrected.startsWith('0x')).toBe(true);
      expect(result.corrected.length).toBe(42);
      expect(result.confidence).toBeLessThan(1.0); // Lower confidence due to corrections
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
    it('should correct 0 to o in Solana addresses (Base58)', () => {
      // Solana addresses don't allow 0, O, I, l
      const corrupted = 'S011111111111111111111111111111112';
      const result = correctSolanaAddress(corrupted);
      
      expect(result.corrected).not.toContain('0');
      expect(result.corrections.length).toBeGreaterThan(0);
    });

    it('should correct I to 1 in Solana addresses', () => {
      const corrupted = 'SoI1111111111111111111111111111112';
      const result = correctSolanaAddress(corrupted);
      
      expect(result.corrected).not.toContain('I');
    });
  });

  describe('correctAddress (auto-detect)', () => {
    it('should detect and correct Ethereum addresses', () => {
      const result = correctAddress('Ox6982508145454Ce325dDbE47a25d4ec3d2311933');
      
      expect(result.type).toBe('ethereum');
      expect(result.corrected.startsWith('0x')).toBe(true);
    });

    it('should detect Tron addresses', () => {
      const result = correctAddress('T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb');
      
      expect(result.type).toBe('tron');
      expect(result.corrected.startsWith('T')).toBe(true);
    });

    it('should detect Solana addresses', () => {
      const result = correctAddress('So11111111111111111111111111111112');
      
      expect(result.type).toBe('solana');
    });
  });

  describe('toChecksumAddress', () => {
    it('should generate consistent EIP-55 checksum format', () => {
      const address = '0x6982508145454ce325ddbe47a25d4ec3d2311933';
      const checksummed = toChecksumAddress(address);
      
      // Should return mixed case (checksum applied)
      expect(checksummed.startsWith('0x')).toBe(true);
      expect(checksummed.length).toBe(42);
      // Should have some uppercase letters (checksum applied)
      expect(checksummed).not.toBe(checksummed.toLowerCase());
    });
  });

  describe('Full OCR Pipeline Simulation', () => {
    it('should correct corrupted PEPE address from OCR output', () => {
      // Simulated OCR output with common misreads
      const ocrOutput = 'Ox6982508l45454Ce325dDbE47a25d4ec3d23ll933';
      const result = correctEthAddress(ocrOutput);
      
      // Should correct O->0 at prefix, l->1 throughout
      expect(result.corrected).toBe('0x6982508145454ce325ddbe47a25d4ec3d2311933');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.corrections.length).toBeGreaterThan(0);
    });

    it('should handle mixed corruptions in address', () => {
      // Multiple character types corrupted
      const ocrOutput = '0xdead8eefOOOOlllI5555SSSS';
      const result = correctEthAddress(ocrOutput);
      
      // Should apply corrections
      expect(result.corrected.startsWith('0x')).toBe(true);
      expect(result.corrections.length).toBeGreaterThan(0);
    });

    it('should detect and correct Solana OCR errors', () => {
      // Solana address with OCR errors (0, O, I, l not allowed in Base58)
      const ocrOutput = 'S0111111I111111111l1111111111111l';
      const result = correctSolanaAddress(ocrOutput);
      
      // Should correct 0->o, I->1, l->1
      expect(result.corrected).not.toContain('0');
      expect(result.corrected).not.toContain('O');
      expect(result.corrected).not.toContain('I');
      expect(result.corrected).not.toContain('l');
      expect(result.corrections.length).toBeGreaterThan(0);
    });

    it('should auto-detect address type with OCR errors', () => {
      // Ethereum with O prefix (common OCR error)
      const ethResult = correctAddress('Ox1234567890abcdef1234567890abcdef12345678');
      expect(ethResult.type).toBe('ethereum');
      expect(ethResult.corrected.startsWith('0x')).toBe(true);
      
      // Tron with lowercase t
      const tronResult = correctAddress('tJCyA6vQDaVRxB8CQRdjXq3dWpz1yDpEpj');
      expect(tronResult.type).toBe('tron');
      expect(tronResult.corrected.startsWith('T')).toBe(true);
    });

    it('should provide low confidence for heavily corrupted addresses', () => {
      // Very corrupted address
      const heavilyCorrupted = 'Ox!!!OOOO????IIII----llll@@@@';
      const result = correctEthAddress(heavilyCorrupted);
      
      // Should still attempt correction but with low confidence
      expect(result.confidence).toBeLessThan(0.5);
    });
  });
});
