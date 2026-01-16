// Input Sanitizer - Security Firewall for user inputs
// Prevents XSS, SQL Injection, and malicious payloads

import { z } from "zod";

// Dangerous patterns to detect and block
const DANGEROUS_PATTERNS = [
  // XSS patterns
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /<[a-z][\s\S]*?on[a-z]+=[\s\S]*?>/gi,
  /javascript:/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
  /<iframe[\s\S]*?>/gi,
  /<object[\s\S]*?>/gi,
  /<embed[\s\S]*?>/gi,
  /<svg[\s\S]*?onload[\s\S]*?>/gi,
  /expression\s*\(/gi,
  
  // SQL injection patterns
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b[\s\S]*?\b(FROM|INTO|TABLE|DATABASE|SET|WHERE)\b)/gi,
  /('|")\s*(OR|AND)\s*('|"|\d)/gi,
  /;\s*(DROP|DELETE|UPDATE|INSERT)/gi,
  /--\s*$/gm,
  /\/\*[\s\S]*?\*\//g,
  
  // Command injection
  /[;&|`$][\s]*?(cat|ls|rm|wget|curl|chmod|bash|sh|eval|exec)/gi,
  /\$\([\s\S]*?\)/g,
  /`[\s\S]*?`/g,
  
  // Path traversal
  /\.\.\//g,
  /\.\.\\n/g,
  /%2e%2e%2f/gi,
  /%252e%252e%252f/gi,
];

// Check if input contains dangerous patterns
export function containsDangerousPatterns(input: string): boolean {
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(input));
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
  
  // Allow alphanumeric, spaces, hyphens, underscores for token searches
  // Also allow "0x" prefix for partial address entry
  const allowedPattern = /^[a-zA-Z0-9\s\-_\.]+$/;
  
  // If starts with 0x, allow hex characters
  if (trimmed.startsWith("0x")) {
    if (/^0x[a-fA-F0-9]*$/.test(trimmed)) {
      return { isValid: true, sanitized: trimmed.toLowerCase() };
    }
    return { isValid: false, sanitized: "", error: "Invalid hex address format" };
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
