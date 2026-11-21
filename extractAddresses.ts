/**
 * Address extraction from OCR text.
 *
 * Job: raw OCR text in, candidate contract addresses out.
 * Pure text logic: no UI, no network, no React. Safe to unit test.
 * Used by src/lib/ocr/screenshotOcr.ts.
 */

import { correctAddress, correctEthAddress } from './addressCorrector';

// Contract address patterns for OCR extraction
const ADDRESS_PATTERNS = {
  ethereum: /0x[a-fA-F0-9]{40}/g,
  tron: /T[1-9A-HJ-NP-Za-km-z]{33}/g,
};

// Normalize text for multi-line address detection
export const normalizeOcrText = (text: string): string => {
  // Remove common line-breaking characters while preserving word boundaries
  let normalized = text
    // Replace newlines that split addresses (no space between hex chars)
    .replace(/([a-fA-F0-9])\n([a-fA-F0-9])/g, '$1$2')
    // Replace newlines after 0x prefix
    .replace(/(0x)\n([a-fA-F0-9])/g, '$1$2')
    // Replace newlines in Solana addresses (Base58 chars)
    .replace(/([1-9A-HJ-NP-Za-km-z])\n([1-9A-HJ-NP-Za-km-z])/g, '$1$2')
    // Replace newlines after T for Tron
    .replace(/(T)\n([A-Za-z1-9])/g, '$1$2')
    // Remove soft hyphens and word-break characters
    .replace(/[\u00AD\u200B\u200C\u200D]/g, '')
    // Collapse multiple whitespace but keep single spaces
    .replace(/[ \t]+/g, ' ')
    // Remove spaces within potential hex sequences (addresses shown with spaces)
    .replace(/0x\s*([a-fA-F0-9])/g, '0x$1');

  // Second pass: join hex characters separated by single spaces (common in formatted addresses)
  // Match pattern like "0x ab cd ef" -> "0xabcdef"
  const hexWithSpaces = /0x(\s*[a-fA-F0-9]{2,4})+/g;
  normalized = normalized.replace(hexWithSpaces, (match) => {
    return match.replace(/\s+/g, '');
  });

  return normalized;
};

export const extractAddressesFromText = (text: string): string[] => {
  const addresses = new Set<string>();

  // First normalize the text to handle multi-line addresses
  const normalizedText = normalizeOcrText(text);

  // Extract Ethereum-style addresses from normalized text
  const ethMatches = normalizedText.match(ADDRESS_PATTERNS.ethereum);
  if (ethMatches) {
    ethMatches.forEach(addr => addresses.add(addr.toLowerCase()));
  }

  // Also check original text (in case normalization broke something)
  const ethMatchesOriginal = text.replace(/\n/g, '').match(ADDRESS_PATTERNS.ethereum);
  if (ethMatchesOriginal) {
    ethMatchesOriginal.forEach(addr => addresses.add(addr.toLowerCase()));
  }

// Fallback: Try to extract and fix corrupted ETH addresses
  // This handles OCR errors like "0xdAC17F958D2ee523a2266266994597C13D83lec?"
  if (addresses.size === 0) {
    const textVariantsForEth = [normalizedText, text.replace(/\n/g, '')];
    for (const variant of textVariantsForEth) {
      // CRITICAL: First check for standalone 'x' that should be '0x' (OCR missed the leading 0)
      const standaloneX = variant.match(/\bx([a-fA-F0-9lIoO?ghH]{38,50})/gi);
      if (standaloneX) {
        for (const match of standaloneX) {
          let cleaned = match.replace(/^x/i, '');
          cleaned = cleaned
            .replace(/[lI|]/g, '1')
            .replace(/[oO]/g, '0')
            .replace(/\?/g, '7')
            .replace(/h/g, 'b')
            .replace(/H/g, 'B')
            .replace(/g/g, '9')
            .replace(/[^a-fA-F0-9]/g, '');
          if (cleaned.length >= 40) {
            addresses.add('0x' + cleaned.substring(0, 40).toLowerCase());
          }
        }
      }

      // Look for 0x followed by hex-like chars (including common misreads)
      const potentialMatches = variant.match(/0x[a-fA-F0-9lIoO?ghH]{30,50}/gi);
      if (potentialMatches) {
        for (const match of potentialMatches) {
          let cleaned = match.replace(/0x/i, '');
          cleaned = cleaned
            .replace(/[lI|]/g, '1')
            .replace(/[oO]/g, '0')
            .replace(/\?/g, '7')
            .replace(/h/g, 'b')
            .replace(/H/g, 'B')
            .replace(/g/g, '9')
            .replace(/[^a-fA-F0-9]/g, '');

          // Take exactly 40 chars if we have enough
          if (cleaned.length >= 40) {
            addresses.add('0x' + cleaned.substring(0, 40).toLowerCase());
          }
        }
      }
    }
  }

  // Extract Solana addresses (Base58, 32-44 chars)
  // Check both normalized and line-stripped versions
  const textVariants = [normalizedText, text.replace(/\n/g, '')];
  textVariants.forEach(variant => {
    const words = variant.split(/\s+/);
    words.forEach(word => {
      // Clean the word of any remaining special chars
      const cleanWord = word.replace(/[^1-9A-HJ-NP-Za-km-z]/g, '');
      if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(cleanWord)) {
        if (cleanWord.length >= 40 && !/^[A-Za-z]+$/.test(cleanWord)) {
          addresses.add(cleanWord);
        }
      }
    });
  });

  // Extract Tron addresses from normalized text
  const tronMatches = normalizedText.match(ADDRESS_PATTERNS.tron);
  if (tronMatches) {
    tronMatches.forEach(addr => addresses.add(addr));
  }

  // Try stripping all newlines as fallback for Tron
  const tronMatchesFallback = text.replace(/\n/g, '').match(ADDRESS_PATTERNS.tron);
  if (tronMatchesFallback) {
    tronMatchesFallback.forEach(addr => addresses.add(addr));
  }

  return Array.from(addresses);
};

// Fix common OCR misreads in addresses using smart correction with checksum validation
export const fixOcrMisreads = (text: string): { text: string; corrections: number } => {
  let totalCorrections = 0;

  // Find all potential addresses and correct them
  let fixed = text;

  // Process Ethereum-like addresses (0x prefix)
  fixed = fixed.replace(/[0O]x[a-fA-F0-9lIoO?ghGH|!]{30,50}/gi, (match) => {
    const result = correctEthAddress(match);
    if (result.corrections.length > 0) {
      totalCorrections += result.corrections.length;
      console.log(`[OCR] Corrected ${match} -> ${result.corrected} (confidence: ${result.confidence.toFixed(2)})`);
    }
    return result.corrected;
  });

  // Fix standalone "x" that should be "0x" (OCR missed leading zero)
  fixed = fixed.replace(/\bx([a-fA-F0-9lIoO?ghGH|!]{38,50})/gi, (_, group) => {
    const result = correctEthAddress('0x' + group);
    totalCorrections++;
    return result.corrected;
  });

  // Process Solana addresses (Base58, 32-44 chars without 0/O/I/l)
  fixed = fixed.replace(/\b[1-9A-HJ-NP-Za-km-z0OIl]{32,50}\b/g, (match) => {
    // Only process if it looks like a corrupted Solana address
    if (/[0OIl]/.test(match)) {
      const result = correctAddress(match);
      if (result.type === 'solana' && result.corrections.length > 0) {
        totalCorrections += result.corrections.length;
        console.log(`[OCR] Corrected Solana ${match} -> ${result.corrected}`);
        return result.corrected;
      }
    }
    return match;
  });

  // Process Tron addresses (T prefix)
  fixed = fixed.replace(/\b[Tt][A-Za-z0-9lIoO]{30,40}\b/g, (match) => {
    const result = correctAddress(match);
    if (result.type === 'tron' && result.corrections.length > 0) {
      totalCorrections += result.corrections.length;
      console.log(`[OCR] Corrected Tron ${match} -> ${result.corrected}`);
      return result.corrected;
    }
    return match;
  });

  return { text: fixed, corrections: totalCorrections };
};

// Extract the best valid address from corrupted OCR text
export const extractBestEthAddress = (text: string): string | null => {
  // First try to find standalone 'x' followed by hex (missing leading 0)
  const standaloneX = text.match(/\bx([a-fA-F0-9lIoO?ghH]{38,50})/gi);
  if (standaloneX) {
    for (const match of standaloneX) {
      let cleaned = match.replace(/^x/i, '');
      cleaned = cleaned
        .replace(/[lI|]/g, '1')
        .replace(/[oO]/g, '0')
        .replace(/\?/g, '7')
        .replace(/h/g, 'b')
        .replace(/H/g, 'B')
        .replace(/g/g, '9')
        .replace(/[^a-fA-F0-9]/g, '');
      if (cleaned.length >= 40) {
        return '0x' + cleaned.substring(0, 40).toLowerCase();
      }
    }
  }

  // Look for anything starting with 0x followed by hex-like chars
  const potentialMatches = text.match(/0x[a-fA-F0-9lIoO?ghH]{30,50}/gi);
  if (!potentialMatches) return null;

  for (const match of potentialMatches) {
    // Clean and fix the address
    let cleaned = match.replace(/0x/i, '');
    cleaned = cleaned
      .replace(/[lI|]/g, '1')
      .replace(/[oO]/g, '0')
      .replace(/\?/g, '7')
      .replace(/h/g, 'b')
      .replace(/H/g, 'B')
      .replace(/g/g, '9')
      .replace(/[^a-fA-F0-9]/g, '');

    // Take exactly 40 chars if we have enough
    if (cleaned.length >= 40) {
      return '0x' + cleaned.substring(0, 40).toLowerCase();
    }
  }
  return null;
};

/**
 * Drops entries that are only a piece of a longer address, for example the
 * second line of a wrapped address that was read as a separate address.
 * Keeps the confidence list in step with the address list.
 */
export function dropFragments(
  addresses: string[],
  confidences: number[],
): { addresses: string[]; confidences: number[] } {
  const keep: number[] = [];
  addresses.forEach((a, i) => {
    const isPart = addresses.some(
      (o) => o !== a && o.length > a.length && a.length >= 20 && o.includes(a),
    );
    if (!isPart) keep.push(i);
  });
  return {
    addresses: keep.map((i) => addresses[i]),
    confidences: keep.map((i) => confidences[i]),
  };
}
