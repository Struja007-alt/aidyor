/**
 * Keccak-256 hash implementation for EIP-55 checksum validation
 * 
 * This is a minimal implementation for address checksumming only.
 * For production, consider using a well-tested library.
 */

// Keccak-256 constants
const RC = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an,
  0x8000000080008000n, 0x000000000000808bn, 0x0000000080000001n,
  0x8000000080008081n, 0x8000000000008009n, 0x000000000000008an,
  0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n,
  0x8000000000008003n, 0x8000000000008002n, 0x8000000000000080n,
  0x000000000000800an, 0x800000008000000an, 0x8000000080008081n,
  0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
];

const ROTC = [
  [0, 36, 3, 41, 18],
  [1, 44, 10, 45, 2],
  [62, 6, 43, 15, 61],
  [28, 55, 25, 21, 56],
  [27, 20, 39, 8, 14],
];

function rotl64(x: bigint, n: number): bigint {
  return ((x << BigInt(n)) | (x >> BigInt(64 - n))) & 0xffffffffffffffffn;
}

function keccakF(state: bigint[]): void {
  for (let round = 0; round < 24; round++) {
    // θ step
    const C: bigint[] = [];
    for (let x = 0; x < 5; x++) {
      C[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20];
    }
    
    const D: bigint[] = [];
    for (let x = 0; x < 5; x++) {
      D[x] = C[(x + 4) % 5] ^ rotl64(C[(x + 1) % 5], 1);
    }
    
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        state[x + 5 * y] ^= D[x];
      }
    }
    
    // ρ and π steps
    const B: bigint[] = new Array(25).fill(0n);
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        B[y + 5 * ((2 * x + 3 * y) % 5)] = rotl64(state[x + 5 * y], ROTC[y][x]);
      }
    }
    
    // χ step
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        state[x + 5 * y] = B[x + 5 * y] ^ ((~B[(x + 1) % 5 + 5 * y]) & B[(x + 2) % 5 + 5 * y]);
      }
    }
    
    // ι step
    state[0] ^= RC[round];
  }
}

function bytesToLanes(bytes: Uint8Array): bigint[] {
  const lanes: bigint[] = new Array(25).fill(0n);
  for (let i = 0; i < bytes.length; i += 8) {
    const laneIndex = Math.floor(i / 8);
    if (laneIndex >= 25) break;
    
    let lane = 0n;
    for (let j = 0; j < 8 && i + j < bytes.length; j++) {
      lane |= BigInt(bytes[i + j]) << BigInt(j * 8);
    }
    lanes[laneIndex] = lane;
  }
  return lanes;
}

function lanesToBytes(lanes: bigint[], length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    const laneIndex = Math.floor(i / 8);
    const byteIndex = i % 8;
    bytes[i] = Number((lanes[laneIndex] >> BigInt(byteIndex * 8)) & 0xffn);
  }
  return bytes;
}

/**
 * Compute Keccak-256 hash of input string
 * Returns hex string without 0x prefix
 */
export function keccak256(input: string): string {
  // Convert ASCII string to bytes
  const inputBytes = new Uint8Array(input.length);
  for (let i = 0; i < input.length; i++) {
    inputBytes[i] = input.charCodeAt(i);
  }
  
  // Keccak-256 parameters
  const rate = 136; // (1600 - 256 * 2) / 8
  const outputLen = 32; // 256 bits
  
  // Pad input
  const padLen = rate - (inputBytes.length % rate);
  const padded = new Uint8Array(inputBytes.length + padLen);
  padded.set(inputBytes);
  
  // Keccak padding: 0x01 ... 0x80
  padded[inputBytes.length] = 0x01;
  padded[padded.length - 1] |= 0x80;
  
  // Initialize state
  const state: bigint[] = new Array(25).fill(0n);
  
  // Absorb
  for (let i = 0; i < padded.length; i += rate) {
    const block = padded.slice(i, i + rate);
    const lanes = bytesToLanes(block);
    for (let j = 0; j < lanes.length && j < 17; j++) {
      state[j] ^= lanes[j];
    }
    keccakF(state);
  }
  
  // Squeeze
  const output = lanesToBytes(state, outputLen);
  
  // Convert to hex
  return Array.from(output)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
