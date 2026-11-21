/**
 * Unit tests for address extraction from OCR text.
 * Includes the real MBTC contract from the screenshot that failed in production.
 */

import { describe, it, expect } from 'vitest';
import { extractAddressesFromText, dropFragments } from './extractAddresses';

const MBTC = 'B93fZyTfwwTaKPzwH7274Yh58PtzFUE6BjzUmHqCFrVD';
const PEPE = '0x6982508145454ce325ddbe47a25d4ec3d2311933';

describe('extractAddressesFromText', () => {
  it('finds a Solana address on its own line', () => {
    const found = extractAddressesFromText(`Contract:\n${MBTC}\n\nmynerbtc.com`);
    expect(found).toContain(MBTC);
  });

  it('joins a Solana address that wrapped across two lines', () => {
    const found = extractAddressesFromText(
      'Contract:\nB93fZyTfwwTaKPzwH7274Yh58PtzFUE6BjzU\nmHqCFrVD',
    );
    expect(found).toContain(MBTC);
  });

  it('finds a 0x address in the middle of text', () => {
    const found = extractAddressesFromText(`CA: ${PEPE} buy now`);
    expect(found).toContain(PEPE);
  });

  it('returns nothing for ordinary text', () => {
    expect(extractAddressesFromText('MBTC token arriving on major exchanges')).toEqual([]);
  });
});

describe('dropFragments', () => {
  it('drops a piece of a longer address and keeps scores in step', () => {
    const fragment = MBTC.slice(10);
    const result = dropFragments([MBTC, fragment], [90, 40]);
    expect(result.addresses).toEqual([MBTC]);
    expect(result.confidences).toEqual([90]);
  });

  it('keeps two different addresses', () => {
    const other = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    const result = dropFragments([MBTC, other], [95, 95]);
    expect(result.addresses).toEqual([MBTC, other]);
  });

  it('keeps short strings even if they appear inside a longer one', () => {
    const result = dropFragments([MBTC, 'B93fZy'], [95, 40]);
    expect(result.addresses.length).toBe(2);
  });
});
