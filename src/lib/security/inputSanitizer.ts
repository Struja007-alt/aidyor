// Input Sanitizer - Security Firewall for user inputs
// Prevents XSS, SQL Injection, and malicious payloads
// NOTE: client-side checks are a convenience only. Enforce the same validation
// server-side (edge functions) and use parameterized queries for the database.

import { z } from "zod";

// Dangerous patterns to detect and block.
// IMPORTANT: no `g` flag here. A global regex keeps `lastIndex` between `.test()`
// calls, which made repeated checks of the same malicious input return false.
const DANGEROUS_PATTERNS: RegExp[] = [
  // XSS patterns
  /<script[\s\S]*?>[\s\S]*?<\/script>/i,
  /<[a-z][\s\S]*?on[a-z]+=[\s\S]*?>/i,
  /javascript:/i,
  /data:text\/html/i,
  /vbscript:/i,
  /<iframe[\s\S]*?>/i,
  /<object[\s\S]*?>/i,
  /<embed[\s\S]*?>/i,
  /<svg[\s\S]*?onload[\s\S]*?>/i,
  /expression\s*\(/i,

  // SQL injection patterns
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b[\s\S]*?\b(FROM|INTO|TABLE|DATABASE|SET|WHERE)\b)/i,
  /('|")\s*(OR|AND)\s*('|"|\d)/i,
  /;\s*(DROP|DELETE|UPDATE|INSERT)/i,
  /--\s*$/m,
  /\/\*[\s\S]*?\*\//,

  // Command injection
  // Requires a shell separator, then a command as a whole word. "$" is not a
  // separator here (it caused false positives on tickers like $SHIB, $CAT, $LSD);
  // command substitution "$(...)" is covered by the next pattern.
  /[;&|`]\s*(cat|ls|rm|wget|curl|chmod|bash|sh|eval|exec)(\s|$)/i,
  /\$\([\s\S]*?\)/,
  /`[\s\S]*?`/,

  // Path traversal
  /\.\.\//,
  /\.\.\\/,
  /%2e%2e%2f/i,
  /%252e%252e%252f/i,
];

// Check if input contains dangerous patterns
export function containsDangerousPatterns(input: string): boolean {
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(input));
}

// Sanitize general text input
export function sanitizeTextInput(input: string, maxLength: number = 100): string {
  if (typeof input !== "string") return "";

  // Trim and limit length
  let sanitized = input.trim().slice(0, maxLength);

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, "");

  // Encode HTML entities to prevent XSS
  sanitized = sanitized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

  return sanitized;
}

// Validate and sanitize contract address input
export function sanitizeContractAddress(input: string): {
  isValid: boolean;
  sanitized: string;
  network: "evm" | "solana" | "tron" | "unknown";
  error?: string;
} {
  if (typeof input !== "string") {
    return { isValid: false, sanitized: "", network: "unknown", error: "Invalid input type" };
  }

  // Check for dangerous patterns first
  if (containsDangerousPatterns(input)) {
    return { isValid: false, sanitized: "", network: "unknown", error: "Potentially malicious input detected" };
  }

  const trimmed = input.trim();

  // Empty check
  if (!trimmed) {
    return { isValid: false, sanitized: "", network: "unknown", error: "Address cannot be empty" };
  }

  // Length check (max 100 chars for any address)
  if (trimmed.length > 100) {
    return { isValid: false, sanitized: "", network: "unknown", error: "Input too long" };
  }

  // EVM Address validation (EIP-55 checksum optional but format required)
  const evmPattern = /^0x[a-fA-F0-9]{40}$/;
  if (evmPattern.test(trimmed)) {
    return { isValid: true, sanitized: trimmed.toLowerCase(), network: "evm" };
  }

  // Solana Address validation (Base58, 32-44 chars)
  const solanaPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  if (solanaPattern.test(trimmed)) {
    // Additional check: must not be all letters (likely a word, not an address)
    if (/^[A-Za-z]+$/.test(trimmed)) {
      return { isValid: false, sanitized: "", network: "unknown", error: "Invalid address format" };
    }
    return { isValid: true, sanitized: trimmed, network: "solana" };
  }

  // Tron Address validation (starts with T, 34 chars)
  // Note: Tron addresses are also valid Base58 of length 34, so they are matched
  // by the Solana branch above and never reach this one.
  const tronPattern = /^T[A-Za-z1-9]{33}$/;
  if (tronPattern.test(trimmed)) {
    return { isValid: true, sanitized: trimmed, network: "tron" };
  }

  // Not a valid address format - could be a token name search
  return { isValid: false, sanitized: trimmed, network: "unknown" };
}

// Validate token name/symbol search input
export function sanitizeSearchQuery(input: string): {
  isValid: boolean;
  sanitized: string;
  error?: string;
} {
  if (typeof input !== "string") {
    return { isValid: false, sanitized: "", error: "Invalid input type" };
  }

  // Check for dangerous patterns
  if (containsDangerousPatterns(input)) {
    return { isValid: false, sanitized: "", error: "Potentially malicious input detected" };
  }

  const trimmed = input.trim();

  // Length limits
  if (trimmed.length > 100) {
    return { isValid: false, sanitized: "", error: "Search query too long" };
  }

  // Partial or full hex address entry
  if (/^0x/i.test(trimmed)) {
    if (/^0x[a-fA-F0-9]*$/i.test(trimmed)) {
      return { isValid: true, sanitized: trimmed.toLowerCase() };
    }
    // Looks like an attempted address (full length) but is not valid hex
    if (trimmed.length >= 42) {
      return { isValid: false, sanitized: "", error: "Invalid hex address format" };
    }
    // Otherwise it is a token name that starts with "0x" (e.g. 0xBTC): fall through
  }

  // For general searches, be more permissive but sanitize
  const sanitized = trimmed
    .replace(/[<>'"\\;]/g, "") // Remove potentially dangerous chars
    .slice(0, 100);

  if (!sanitized) {
    return { isValid: false, sanitized: "", error: "Invalid search query" };
  }

  return { isValid: true, sanitized };
}

// Zod schema for contract address validation
// Note: the second refine only rejects results that are invalid AND have a known
// network, which sanitizeContractAddress never returns, so names (network
// "unknown") pass through to the search path by design.
export const contractAddressSchema = z.string()
  .trim()
  .min(1, "Address is required")
  .max(100, "Address too long")
  .refine(
    (val) => !containsDangerousPatterns(val),
    "Invalid input detected"
  )
  .refine(
    (val) => {
      const result = sanitizeContractAddress(val);
      return result.isValid || result.network === "unknown";
    },
    "Invalid address format"
  );

// Zod schema for search query validation
export const searchQuerySchema = z.string()
  .trim()
  .min(1, "Search query is required")
  .max(100, "Search query too long")
  .refine(
    (val) => !containsDangerousPatterns(val),
    "Invalid input detected"
  );
