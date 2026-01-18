import { useState, useEffect, useCallback, ClipboardEvent, useRef, useMemo, memo } from "react";
import { Loader2, Star, Upload, Image, X, BadgeCheck, Copy, ExternalLink, ShieldCheck, ShieldAlert, FileText, TrendingUp, TrendingDown, Activity, Layers, Droplets, Users, MessageCircle, Link as LinkIcon, ArrowRightLeft, BarChart3, Info, LogIn, Brain } from "lucide-react";
import { Search, Scan, AlertTriangle, CheckCircle, XCircle, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RiskGauge } from "./RiskGauge";
import { RiskFactorTooltip } from "./RiskFactorTooltip";
import { useCloudWatchlist } from "@/hooks/useCloudWatchlist";
import { cn } from "@/lib/utils";
import { createWorker } from "tesseract.js";
import { toast } from "sonner";
import { 
  searchTokens, 
  getTokenByAddress, 
  analyzeTokenRisk, 
  chainIdToNetwork,
  type DexPair 
} from "@/lib/api/dexscreener";
import { 
  getTokenSecurity, 
  analyzeGoPlusSecurity,
  getSolanaTokenSecurity,
  analyzeSolanaSecurity,
} from "@/lib/api/goplus";
import {
  getLiquidityLockInfo,
  analyzeLockSecurity,
  type LockInfo,
} from "@/lib/api/unicrypt";
import {
  getBSCTraceSecurity,
  analyzeBSCTraceSecurity,
} from "@/lib/api/bsctrace";
import {
  getRugCheckSecurity,
  analyzeRugCheckSecurity,
} from "@/lib/api/rugcheck";
import {
  analyzePumpDump,
  type PumpDumpAnalysis,
} from "@/lib/api/pumpDump";
import { LockStatusBadge } from "./LockStatusBadge";
import { AIRiskExplanation } from "./AIRiskExplanation";
import { PumpDumpBadge } from "./PumpDumpBadge";
import { ApiSourcesBadge, ApiSourcesCount, type ApiSource } from "./ApiSourcesBadge";
import { RiskTrendBadge, calculateRiskTrend, type RiskTrendData } from "./RiskTrendBadge";
import { 
  sanitizeContractAddress, 
  sanitizeSearchQuery, 
  containsDangerousPatterns 
} from "@/lib/security/inputSanitizer";
import { knownOriginalNetworks } from "@/lib/constants/knownTokenNetworks";
import { getTokenOriginalNetworks } from "@/lib/api/coingecko";

export type Network = "ETH" | "BSC" | "SOL" | "POLYGON" | "AVAX" | "ARB" | "BASE" | "OP" | "TON";

type ScanMode = "address" | "screenshot";

interface RiskFactor {
  name: string;
  status: "safe" | "warning" | "danger";
  description: string;
}

interface SecurityData {
  isHoneypot: boolean;
  isVerified: boolean;
  holderCount: number;
  buyTax: number;
  sellTax: number;
  isMintable: boolean;
  hasHiddenOwner: boolean;
  hasFreezeAuthority?: boolean; // Solana-specific
}


interface NetworkResult {
  network: string;
  chainId: string;
  found: boolean;
  riskScore: number;
  marketData: {
    price: number;
    change24h: number;
    marketCap: number;
    volume24h: number;
    liquidity: number;
  } | null;
  riskFactors: RiskFactor[];
  address: string;
  pairAddress: string;
  dexUrl: string;
  pairs: DexPair[];
  tokenStatus: "original" | "bridged" | "suspicious";
  securityData?: SecurityData;
  lockInfo?: LockInfo;
  pumpDumpAnalysis?: PumpDumpAnalysis;
  apiSources: ApiSource[];
}

interface TokenInfo {
  name: string;
  symbol: string;
  address: string;
  chainId: string;
  imageUrl?: string;
}

export const TokenScanner = () => {
  const [scanMode, setScanMode] = useState<ScanMode>("address");
  const [tokenQuery, setTokenQuery] = useState("");
  const [displayAddress, setDisplayAddress] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<NetworkResult[]>([]);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [suggestions, setSuggestions] = useState<DexPair[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState<NetworkResult | null>(null);
  
  // Screenshot state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [extractedAddresses, setExtractedAddresses] = useState<string[]>([]);

  // Ref to track current search request ID to prevent race conditions
  const searchIdRef = useRef(0);
  const { addToken, isInWatchlist, isAuthenticated } = useCloudWatchlist();

  // Contract address patterns for OCR extraction
  const ADDRESS_PATTERNS = {
    ethereum: /0x[a-fA-F0-9]{40}/g,
    tron: /T[A-Za-z1-9]{33}/g,
  };

  // Normalize text for multi-line address detection
  const normalizeOcrText = useCallback((text: string): string => {
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
  }, []);

  const extractAddressesFromText = useCallback((text: string): string[] => {
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
  }, [normalizeOcrText]);

  // Advanced image preprocessing for better OCR accuracy
  const preprocessImage = async (imageData: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageData);
          return;
        }

        // Upscale image for better OCR (2x if small)
        const scale = Math.max(1, Math.min(2, 1500 / Math.max(img.width, img.height)));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        // Use high-quality scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Get image data for processing
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Pass 1: Convert to grayscale with luminance preservation
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        }
        ctx.putImageData(imgData, 0, 0);

        // Pass 2: Adaptive contrast enhancement
        // Calculate histogram for adaptive thresholding
        const histogram = new Array(256).fill(0);
        for (let i = 0; i < data.length; i += 4) {
          histogram[Math.round(data[i])]++;
        }
        
        // Find optimal threshold using Otsu's method
        const totalPixels = data.length / 4;
        let sum = 0;
        for (let i = 0; i < 256; i++) sum += i * histogram[i];
        
        let sumB = 0, wB = 0, wF = 0;
        let maxVariance = 0, optimalThreshold = 128;
        
        for (let t = 0; t < 256; t++) {
          wB += histogram[t];
          if (wB === 0) continue;
          wF = totalPixels - wB;
          if (wF === 0) break;
          
          sumB += t * histogram[t];
          const mB = sumB / wB;
          const mF = (sum - sumB) / wF;
          const variance = wB * wF * (mB - mF) * (mB - mF);
          
          if (variance > maxVariance) {
            maxVariance = variance;
            optimalThreshold = t;
          }
        }

        // Apply adaptive contrast and noise reduction
        const newImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const newData = newImgData.data;
        
        for (let i = 0; i < newData.length; i += 4) {
          let gray = newData[i];
          
          // Contrast stretch based on histogram analysis
          const contrast = 1.6;
          const mid = optimalThreshold;
          gray = mid + (gray - mid) * contrast;
          gray = Math.max(0, Math.min(255, gray));
          
          // Apply adaptive binarization with hysteresis
          const highThresh = optimalThreshold + 30;
          const lowThresh = optimalThreshold - 30;
          
          let final;
          if (gray > highThresh) {
            final = 255;
          } else if (gray < lowThresh) {
            final = 0;
          } else {
            // Use local context for edge pixels
            final = gray > optimalThreshold ? 255 : 0;
          }
          
          newData[i] = final;
          newData[i + 1] = final;
          newData[i + 2] = final;
        }
        
        ctx.putImageData(newImgData, 0, 0);

        // Pass 3: Morphological operations - Dilation to connect broken characters
        const dilatedData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const dData = dilatedData.data;
        const width = canvas.width;
        
        // Simple 3x3 dilation for black pixels (text)
        for (let y = 1; y < canvas.height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            if (newData[idx] === 0) { // If black pixel
              // Check 8-connected neighbors and dilate
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  const nIdx = ((y + dy) * width + (x + dx)) * 4;
                  // Slight dilation - only fill very bright neighbors
                  if (newData[nIdx] === 255) {
                    dData[nIdx] = 200; // Mark for potential fill
                  }
                }
              }
            }
          }
        }
        
        // Apply dilation markers
        for (let i = 0; i < dData.length; i += 4) {
          if (dData[i] === 200) {
            dData[i] = 0;
            dData[i + 1] = 0;
            dData[i + 2] = 0;
          }
        }
        
        ctx.putImageData(dilatedData, 0, 0);

        // Pass 4: Sharpen edges for cleaner character boundaries
        const sharpCanvas = document.createElement('canvas');
        const sharpCtx = sharpCanvas.getContext('2d');
        if (sharpCtx) {
          sharpCanvas.width = canvas.width;
          sharpCanvas.height = canvas.height;
          
          // Apply subtle blur
          sharpCtx.filter = 'blur(0.5px)';
          sharpCtx.drawImage(canvas, 0, 0);
          
          // Blend for sharpening effect
          ctx.globalCompositeOperation = 'difference';
          ctx.globalAlpha = 0.15;
          ctx.drawImage(sharpCanvas, 0, 0);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1.0;
        }

        // Pass 5: Invert if needed (detect if text is light on dark)
        const finalData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let blackCount = 0, whiteCount = 0;
        for (let i = 0; i < finalData.data.length; i += 4) {
          if (finalData.data[i] < 128) blackCount++;
          else whiteCount++;
        }
        
        // If more black than white, invert (text should be dark on light for OCR)
        if (blackCount > whiteCount * 1.5) {
          for (let i = 0; i < finalData.data.length; i += 4) {
            finalData.data[i] = 255 - finalData.data[i];
            finalData.data[i + 1] = 255 - finalData.data[i + 1];
            finalData.data[i + 2] = 255 - finalData.data[i + 2];
          }
          ctx.putImageData(finalData, 0, 0);
        }

        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(imageData);
      img.src = imageData;
    });
  };

// Fix common OCR misreads in addresses
  const fixOcrMisreads = (text: string): string => {
    let fixed = text
      // CRITICAL: Fix standalone "x" at word boundary that should be "0x"
      // This handles when OCR misses the leading "0" entirely
      .replace(/\bx([a-fA-F0-9]{38,42})/gi, '0x$1')
      // Fix Ethereum addresses: Ox -> 0x (capital O to zero)
      .replace(/Ox([a-fA-F0-9]{38,42})/g, '0x$1')
      .replace(/0X([a-fA-F0-9]{38,42})/g, '0x$1')
      // Fix partial matches where O appears at start
      .replace(/\bOx([a-fA-F0-9])/g, '0x$1')
      // Fix "Ox" anywhere
      .replace(/Ox/g, '0x')
      // Fix common letter/number confusions in hex
      .replace(/0x([a-fA-F0-9]*[oO][a-fA-F0-9]*)/g, (_, group) => 
        '0x' + group.replace(/[oO]/g, '0')
      );
    
    // Enhanced: Look for 0x followed by hex-like characters and clean them
    // Fix l -> 1, I -> 1, O -> 0, ? -> 7, g -> 9, h -> b in hex contexts
    fixed = fixed.replace(/0x([a-fA-F0-9lIoO?ghGH]{35,50})/gi, (match, group) => {
      const cleaned = group
        .replace(/[lI|]/g, '1')
        .replace(/[oO]/g, '0')
        .replace(/\?/g, '7')
        .replace(/h/g, 'b')  // 'h' often misread from 'b'
        .replace(/H/g, 'B')
        .replace(/g/g, '9')  // 'g' can be misread from '9'
        .replace(/G/g, '6')
        .replace(/[^a-fA-F0-9]/g, ''); // Remove any non-hex chars
      return '0x' + cleaned;
    });
    
    return fixed;
  };

// Extract the best valid address from corrupted OCR text
  const extractBestEthAddress = (text: string): string | null => {
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

  // VLM-based OCR fallback using Gemini Vision
  const performVLMOcr = useCallback(async (imageData: string): Promise<string[]> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-extract`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ imageBase64: imageData }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          toast.error("AI rate limit reached. Try again later.");
        } else if (response.status === 402) {
          toast.error("AI credits exhausted.");
        }
        console.error("VLM OCR error:", response.status, errorData);
        return [];
      }

      const data = await response.json();
      return data.addresses || [];
    } catch (error) {
      console.error("VLM OCR fallback error:", error);
      return [];
    }
  }, []);

const performOCR = useCallback(async (imageData: string): Promise<string[]> => {
    try {
      setIsOcrProcessing(true);
      setOcrProgress(0);
      
      // PRIMARY: Use AI Vision (VLM) for accurate address extraction
      // VLM is much more reliable for crypto addresses than traditional OCR
      setOcrProgress(10);
      toast.info("Using AI vision for accuracy...", { duration: 2000 });
      
      let addresses: string[] = [];
      
      try {
        setOcrProgress(30);
        const vlmAddresses = await performVLMOcr(imageData);
        setOcrProgress(70);
        
        if (vlmAddresses.length > 0) {
          console.log("VLM extracted addresses:", vlmAddresses);
          addresses = vlmAddresses;
        }
      } catch (vlmError) {
        console.error("VLM OCR failed, falling back to Tesseract:", vlmError);
      }
      
      // FALLBACK: Use Tesseract if VLM failed or found nothing
      if (addresses.length === 0) {
        setOcrProgress(75);
        console.log("VLM found no addresses, trying Tesseract fallback...");
        
        const processedImage = await preprocessImage(imageData);
        
        const worker = await createWorker('eng', 1, {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setOcrProgress(75 + Math.round(m.progress * 20));
            }
          },
        });
        
        const { data: { text } } = await worker.recognize(processedImage);
        await worker.terminate();
        
        const correctedText = fixOcrMisreads(text);
        console.log("Tesseract OCR Text (corrected):", correctedText);
        
        addresses = extractAddressesFromText(correctedText);
        
        // Try original image if processed didn't work
        if (addresses.length === 0) {
          const fallbackWorker = await createWorker('eng', 1);
          const { data: { text: fallbackText } } = await fallbackWorker.recognize(imageData);
          await fallbackWorker.terminate();
          
          const correctedFallback = fixOcrMisreads(fallbackText);
          addresses = extractAddressesFromText(correctedFallback);
        }
      }
      
      setExtractedAddresses(addresses);
      setOcrProgress(100);
      
      if (addresses.length === 0) {
        toast.warning("No contract addresses found in image");
      } else {
        toast.success(`Found ${addresses.length} address${addresses.length > 1 ? 'es' : ''}`);
      }
      
      return addresses;
    } catch (error) {
      console.error("OCR Error:", error);
      toast.error("Failed to process image");
      return [];
    } finally {
      setIsOcrProcessing(false);
    }
  }, [extractAddressesFromText, performVLMOcr]);

  // Check if input looks like a contract address
  const isContractAddress = useCallback((query: string): boolean => {
    // Ethereum-like address (0x...)
    if (/^0x[a-fA-F0-9]{40}$/i.test(query)) return true;
    // Solana address (base58, 32-44 chars)
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(query)) return true;
    return false;
  }, []);

  // Debounced search for real-time suggestions with security validation
  const searchTokensDebounced = useCallback(async (query: string, currentSearchId: number) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Security: Validate and sanitize search input
    const searchValidation = sanitizeSearchQuery(query);
    if (!searchValidation.isValid) {
      console.warn("Search blocked:", searchValidation.error);
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    
    try {
      const results = await searchTokens(searchValidation.sanitized);
      
      // Check if this search is still the current one (prevent race conditions)
      if (currentSearchId !== searchIdRef.current) {
        return; // A newer search has been triggered, discard these results
      }
      
      // Filter to unique tokens by address
      const seen = new Set<string>();
      const unique = results.filter(pair => {
        const key = `${pair.chainId}-${pair.baseToken.address}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      
      // Use known original networks (hardcoded list)
      const mergedKnownNetworks = knownOriginalNetworks;
      
      // Sort by: 1) Known original network match, 2) Liquidity
      const sorted = unique.sort((a, b) => {
        const symbolA = a.baseToken.symbol.toUpperCase();
        const symbolB = b.baseToken.symbol.toUpperCase();
        const chainA = a.chainId.toLowerCase();
        const chainB = b.chainId.toLowerCase();
        
        // Check if either is a known token on its original network
        const aIsOriginal = mergedKnownNetworks[symbolA]?.includes(chainA) || false;
        const bIsOriginal = mergedKnownNetworks[symbolB]?.includes(chainB) || false;
        
        // Prioritize known original network tokens
        if (aIsOriginal && !bIsOriginal) return -1;
        if (bIsOriginal && !aIsOriginal) return 1;
        
        // Then sort by liquidity
        const liqA = a.liquidity?.usd || 0;
        const liqB = b.liquidity?.usd || 0;
        return liqB - liqA;
      }).slice(0, 10);
      
      setSuggestions(sorted);
      setShowSuggestions(sorted.length > 0);
    } catch (error) {
      console.error('Search error:', error);
      // Only clear suggestions if this is still the current search
      if (currentSearchId === searchIdRef.current) {
        setSuggestions([]);
      }
    } finally {
      // Only set isSearching false if this is still the current search
      if (currentSearchId === searchIdRef.current) {
        setIsSearching(false);
      }
    }
  }, []);

  useEffect(() => {
    // Clear stale suggestions immediately when query changes
    if (tokenQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }
    
    // Don't search if it looks like an address - user should click scan
    if (isContractAddress(tokenQuery)) {
      setDisplayAddress(tokenQuery);
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Increment search ID to invalidate previous searches
    searchIdRef.current += 1;
    const currentSearchId = searchIdRef.current;

    const timer = setTimeout(() => {
      searchTokensDebounced(tokenQuery, currentSearchId);
    }, 300);
    return () => clearTimeout(timer);
  }, [tokenQuery, searchTokensDebounced, isContractAddress]);

  const handleSelectSuggestion = (pair: DexPair) => {
    setTokenQuery(pair.baseToken.symbol);
    setDisplayAddress(pair.baseToken.address);
    setTokenInfo({
      name: pair.baseToken.name,
      symbol: pair.baseToken.symbol,
      address: pair.baseToken.address,
      chainId: pair.chainId,
      imageUrl: pair.info?.imageUrl,
    });
    setShowSuggestions(false);
    
    // Auto-scan with the selected token
    handleScanWithAddress(pair.baseToken.address);
  };

  // Scan for token data with security validation
  const handleScanWithAddress = async (address: string) => {
    if (!address) return;
    
    // Security: Validate and sanitize contract address input
    const addressValidation = sanitizeContractAddress(address);
    if (containsDangerousPatterns(address)) {
      toast.error("Invalid input detected. Please enter a valid contract address.");
      return;
    }
    
    // Use the sanitized address for API calls
    const sanitizedAddress = addressValidation.isValid ? addressValidation.sanitized : address.trim();
    
    setIsScanning(true);
    setScanResults([]);
    setSelectedResult(null);
    
    try {
      const pairs = await getTokenByAddress(sanitizedAddress);
      
      if (pairs.length === 0) {
        setScanResults([]);
        setIsScanning(false);
        // Ensure display address is set so "Token Not Found" UI shows
        if (!displayAddress) {
          setDisplayAddress(address);
        }
        if (!tokenQuery) {
          setTokenQuery(address);
        }
        toast.warning("Token not found on DEXScreener. It may not be listed on any DEX yet.");
        return;
      }

      // Group pairs by chain
      const chainGroups: Record<string, DexPair[]> = {};
      pairs.forEach(pair => {
        const chain = pair.chainId;
        if (!chainGroups[chain]) chainGroups[chain] = [];
        chainGroups[chain].push(pair);
      });

      // Build results for each chain with market data + security data
      const resultsWithData = await Promise.all(
        Object.entries(chainGroups).map(async ([chainId, chainPairs]) => {
          const mainPair = chainPairs[0];
          const { score: dexScore, factors: dexFactors } = analyzeTokenRisk(chainPairs);
          const liquidity = mainPair.liquidity?.usd || 0;
          const volume24h = mainPair.volume?.h24 || 0;
          const hasSocials = !!(mainPair.info?.websites?.length || mainPair.info?.socials?.length);
          const network = chainIdToNetwork[chainId] || chainId.toUpperCase();
          
          // Fetch security data based on network
          let securityData: SecurityData | undefined;
          let securityFactors: RiskFactor[] = [];
          let securityScore = 0;
          let tokenLockInfo: LockInfo | undefined;
          const apiSources: ApiSource[] = ["dexscreener"]; // Always used for market data
          
          try {
            if (network === 'SOL') {
              // Use SolanaFM for Solana tokens
              const solanaData = await getSolanaTokenSecurity(mainPair.baseToken.address);
              if (solanaData) {
                apiSources.push("solanafm");
                const { score: sScore, factors: sFactors } = analyzeSolanaSecurity(solanaData);
                securityScore = sScore;
                securityFactors = sFactors;
                securityData = {
                  isHoneypot: false, // Solana doesn't have honeypots in the same way
                  isVerified: true, // Solana programs are always visible
                  holderCount: solanaData.holderCount,
                  buyTax: 0,
                  sellTax: 0,
                  isMintable: solanaData.isMintAuthority,
                  hasHiddenOwner: false,
                  hasFreezeAuthority: solanaData.isFreezeAuthority,
                };
              }
              
              // Also fetch GoPlus Solana data for enhanced analysis
              try {
                const { getGoPlusSolanaSecurity, analyzeGoPlusSolanaSecurity } = await import('@/lib/api/goplus');
                const goPlusSolData = await getGoPlusSolanaSecurity(mainPair.baseToken.address);
                if (goPlusSolData) {
                  apiSources.push("goplus-sol");
                  const { score: gpScore, factors: gpFactors } = analyzeGoPlusSolanaSecurity(goPlusSolData);
                  // Merge GoPlus Solana with SolanaFM (average scores)
                  securityScore = Math.round((securityScore + gpScore) / 2);
                  // Add unique factors from GoPlus that aren't already present
                  const existingFactorNames = new Set(securityFactors.map(f => f.name));
                  const uniqueGpFactors = gpFactors.filter(f => !existingFactorNames.has(f.name));
                  securityFactors = [...securityFactors, ...uniqueGpFactors];
                  // Update security data with GoPlus insights
                  if (securityData) {
                    securityData.isMintable = securityData.isMintable || goPlusSolData.isMintable;
                    securityData.hasFreezeAuthority = securityData.hasFreezeAuthority || goPlusSolData.isFreezeAuthority;
                    if (goPlusSolData.holderCount) {
                      securityData.holderCount = Math.max(securityData.holderCount, parseInt(goPlusSolData.holderCount) || 0);
                    }
                  }
                }
              } catch (goPlusSolError) {
                console.error('GoPlus Solana API error:', goPlusSolError);
              }
              
              // Also fetch RugCheck data for enhanced Solana analysis
              try {
                const rugCheckData = await getRugCheckSecurity(mainPair.baseToken.address);
                if (rugCheckData) {
                  apiSources.push("rugcheck");
                  const { score: rcScore, factors: rcFactors, rawScore: rcRawScore } = analyzeRugCheckSecurity(rugCheckData);
                  
                  // If RugCheck raw score is very low (critical risk), give it more weight
                  // This prevents high-risk tokens from showing as safe due to other APIs
                  if (rcRawScore < 20) {
                    // Critical risk: RugCheck takes 70% weight
                    securityScore = Math.round(securityScore * 0.3 + rcScore * 0.7);
                  } else if (rcRawScore < 50) {
                    // High risk: RugCheck takes 60% weight
                    securityScore = Math.round(securityScore * 0.4 + rcScore * 0.6);
                  } else {
                    // Normal: average the scores
                    securityScore = Math.round((securityScore + rcScore) / 2);
                  }
                  
                  // Add unique factors from RugCheck that aren't already present
                  const existingFactorNames = new Set(securityFactors.map(f => f.name));
                  const uniqueRcFactors = rcFactors.filter(f => !existingFactorNames.has(f.name));
                  securityFactors = [...securityFactors, ...uniqueRcFactors];
                  // Update security data with RugCheck insights
                  if (securityData) {
                    securityData.isMintable = securityData.isMintable || !!rugCheckData.tokenMeta.mintAuthority;
                    securityData.hasFreezeAuthority = securityData.hasFreezeAuthority || !!rugCheckData.tokenMeta.freezeAuthority;
                  }
                }
              } catch (rugCheckError) {
                console.error('RugCheck API error:', rugCheckError);
              }
            } else {
              // Use GoPlus for EVM chains
              const goplusData = await getTokenSecurity(mainPair.baseToken.address, network);
              if (goplusData) {
                apiSources.push("goplus");
                const { score: gScore, factors: gFactors } = analyzeGoPlusSecurity(goplusData);
                securityScore = gScore;
                securityFactors = gFactors;
                securityData = {
                  isHoneypot: goplusData.isHoneypot,
                  isVerified: goplusData.isOpenSource,
                  holderCount: parseInt(goplusData.holderCount) || 0,
                  buyTax: parseFloat(goplusData.buyTax) * 100,
                  sellTax: parseFloat(goplusData.sellTax) * 100,
                  isMintable: goplusData.isMintable,
                  hasHiddenOwner: goplusData.hiddenOwner,
                };
              }
              
              // For BSC tokens, also fetch BSCTrace data for enhanced analysis
              if (network === 'BSC') {
                try {
                  const bscTraceData = await getBSCTraceSecurity(mainPair.baseToken.address);
                  if (bscTraceData) {
                    apiSources.push("bsctrace");
                    const { score: bscScore, factors: bscFactors } = analyzeBSCTraceSecurity(bscTraceData);
                    // Merge BSCTrace data with GoPlus (BSCTrace provides more accurate honeypot detection)
                    securityScore = Math.round((securityScore + bscScore) / 2);
                    // Add unique factors from BSCTrace that aren't already present
                    const existingFactorNames = new Set(securityFactors.map(f => f.name));
                    const uniqueBscFactors = bscFactors.filter(f => !existingFactorNames.has(f.name));
                    securityFactors = [...securityFactors, ...uniqueBscFactors];
                    // Update security data with more accurate BSCTrace honeypot detection
                    if (securityData) {
                      securityData.isHoneypot = securityData.isHoneypot || bscTraceData.isHoneypot;
                      securityData.buyTax = Math.max(securityData.buyTax, bscTraceData.buyTax * 100);
                      securityData.sellTax = Math.max(securityData.sellTax, bscTraceData.sellTax * 100);
                    }
                  }
                } catch (bscTraceError) {
                  console.error('BSCTrace API error:', bscTraceError);
                }
              }
              
              // Fetch Unicrypt/Team Finance/PinkSale/DXSale liquidity lock data for EVM chains
              try {
                const lockInfo = await getLiquidityLockInfo(mainPair.baseToken.address, network);
                if (lockInfo) {
                  apiSources.push("unicrypt");
                  tokenLockInfo = lockInfo;
                  const { score: lockScore, factors: lockFactors } = analyzeLockSecurity(lockInfo);
                  securityScore += lockScore;
                  securityFactors = [...securityFactors, ...lockFactors];
                }
              } catch (lockError) {
                console.error('Lock check error:', lockError);
              }
            }
          } catch (error) {
            console.error('Security fetch error:', error);
          }
          
          // Merge risk factors (security factors first, then DEX factors)
          const allFactors = [...securityFactors, ...dexFactors];
          
          // Check for critical danger factors that should cap the score
          const hasCriticalDanger = securityFactors.some(f => 
            f.status === 'danger' && (
              f.name.toLowerCase().includes('rugcheck') ||
              f.name.toLowerCase().includes('honeypot') ||
              f.description.toLowerCase().includes('critical')
            )
          );
          
          // Combined score: weighted average of DEX (55%) and security (45%) if available
          let combinedScore = securityFactors.length > 0
            ? Math.max(0, Math.min(100, Math.round(dexScore * 0.55 + (50 + securityScore) * 0.45)))
            : dexScore;
          
          // Cap score at 39 (DANGER threshold) if critical dangers exist
          if (hasCriticalDanger) {
            combinedScore = Math.min(combinedScore, 39);
          }
          
          return {
            network,
            chainId,
            found: true,
            riskScore: combinedScore,
            address: mainPair.baseToken.address,
            pairAddress: mainPair.pairAddress,
            dexUrl: mainPair.url,
            pairs: chainPairs,
            marketData: {
              price: parseFloat(mainPair.priceUsd) || 0,
              change24h: mainPair.priceChange?.h24 || 0,
              marketCap: mainPair.marketCap || mainPair.fdv || 0,
              volume24h,
              liquidity,
            },
            riskFactors: allFactors,
            securityData,
            lockInfo: tokenLockInfo,
            pumpDumpAnalysis: analyzePumpDump(chainPairs),
            apiSources,
            // Temp values for status calculation
            _liquidity: liquidity,
            _volume: volume24h,
            _hasSocials: hasSocials,
            _score: combinedScore,
            _isHoneypot: securityData?.isHoneypot || false,
          };
        })
      );

      // Determine original vs bridged/suspicious
      // Original = known original network OR (highest liquidity + volume + has socials + good score)
      // Bridged = similar token on different chain
      // Suspicious = low liquidity, no socials, poor score, or honeypot
      
      
      // Use known original networks (hardcoded list)
      const mergedKnownNetworks = knownOriginalNetworks;
      
      const maxLiquidity = Math.max(...resultsWithData.map(r => r._liquidity));
      
      // First pass: identify if any result is on a known original network
      const tokenSymbol = resultsWithData[0]?.pairs[0]?.baseToken.symbol.toUpperCase() || '';
      let knownNetworks = mergedKnownNetworks[tokenSymbol] || [];
      
      // If not in hardcoded mappings, check CoinGecko
      if (knownNetworks.length === 0 && tokenSymbol) {
        try {
          const coinGeckoNetworks = await getTokenOriginalNetworks(tokenSymbol);
          if (coinGeckoNetworks.length > 0) {
            knownNetworks = coinGeckoNetworks;
            // Also add CoinGecko as a source for all results
            resultsWithData.forEach(r => {
              if (!r.apiSources.includes('coingecko')) {
                r.apiSources.push('coingecko');
              }
            });
          }
        } catch (error) {
          console.warn('CoinGecko lookup failed:', error);
        }
      }
      
      const results: NetworkResult[] = resultsWithData.map(r => {
        let tokenStatus: "original" | "bridged" | "suspicious";
        
        // Check if this is the original (highest liquidity + volume, has socials)
        const isHighestLiquidity = r._liquidity === maxLiquidity && maxLiquidity > 0;
        const hasGoodLiquidity = r._liquidity >= 10000;
        const hasGoodVolume = r._volume >= 1000;
        const chainId = r.chainId.toLowerCase();
        
        // Check if this is on a known original network for this token
        const isKnownOriginal = knownNetworks.includes(chainId);
        
        if (r._isHoneypot || r._score < 30) {
          // Honeypot or very low score = suspicious
          tokenStatus = "suspicious";
        } else if (isKnownOriginal && hasGoodLiquidity) {
          // Known original network with good liquidity = original
          tokenStatus = "original";
        } else if (isHighestLiquidity && hasGoodLiquidity && hasGoodVolume && knownNetworks.length === 0) {
          // Best metrics and no known original network = original (for unknown tokens)
          tokenStatus = "original";
        } else if (r._liquidity < 1000 || r._score < 40) {
          // Low liquidity or poor score = suspicious
          tokenStatus = "suspicious";
        } else {
          // Decent metrics but not original = bridged
          tokenStatus = "bridged";
        }
        
        // Remove temp properties and add status
        const { _liquidity, _volume, _hasSocials, _score, _isHoneypot, ...rest } = r;
        return { ...rest, tokenStatus };
      });

      // Set token info from best result
      if (pairs.length > 0) {
        const bestPair = pairs[0];
        setTokenInfo({
          name: bestPair.baseToken.name,
          symbol: bestPair.baseToken.symbol,
          address: bestPair.baseToken.address,
          chainId: bestPair.chainId,
          imageUrl: bestPair.info?.imageUrl,
        });
        setDisplayAddress(bestPair.baseToken.address);
      }

      // Sort results: original first, then by liquidity descending
      const sortedResults = [...results].sort((a, b) => {
        // Original tokens first
        if (a.tokenStatus === "original" && b.tokenStatus !== "original") return -1;
        if (b.tokenStatus === "original" && a.tokenStatus !== "original") return 1;
        // Then suspicious last
        if (a.tokenStatus === "suspicious" && b.tokenStatus !== "suspicious") return 1;
        if (b.tokenStatus === "suspicious" && a.tokenStatus !== "suspicious") return -1;
        // Then by liquidity
        return (b.marketData?.liquidity || 0) - (a.marketData?.liquidity || 0);
      });

      setScanResults(sortedResults);
      
      // Auto-select original or highest liquidity result
      if (sortedResults.length > 0) {
        const original = sortedResults.find(r => r.tokenStatus === "original");
        const best = original || sortedResults.reduce((a, b) => 
          (a.marketData?.liquidity || 0) > (b.marketData?.liquidity || 0) ? a : b
        );
        setSelectedResult(best);
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Failed to scan token');
    } finally {
      setIsScanning(false);
    }
  };

  const handleScan = () => {
    const address = displayAddress || tokenQuery;
    handleScanWithAddress(address);
  };

  // Screenshot handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target?.result as string;
      setUploadedImage(imageData);
      setExtractedAddresses([]);
      
      // Auto-run OCR to extract addresses
      toast.info("Analyzing screenshot for contract addresses...");
      const addresses = await performOCR(imageData);
      
      if (addresses.length > 0) {
        const firstAddress = addresses[0];
        setTokenQuery(firstAddress);
        setDisplayAddress(firstAddress);
        toast.success(`Found ${addresses.length} address${addresses.length > 1 ? 'es' : ''}! Auto-scanning first one...`);
        
        // Auto-trigger scan with the first extracted address
        handleScanWithAddress(firstAddress);
      } else {
        toast.warning("No contract addresses found. Try pasting manually.");
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read image file");
    };
    reader.readAsDataURL(file);
  }, [performOCR]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
    // Reset the input value so the same file can be re-selected
    e.target.value = '';
  };

  const clearUpload = () => {
    setUploadedImage(null);
    setScanResults([]);
    setSelectedResult(null);
    setTokenInfo(null);
    setDisplayAddress("");
    setTokenQuery("");
    setExtractedAddresses([]);
    setOcrProgress(0);
  };

  const formatCurrency = useCallback((value: number) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(2)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    if (value >= 1) return `$${value.toFixed(2)}`;
    if (value >= 0.0001) return `$${value.toFixed(4)}`;
    return `$${value.toFixed(8)}`;
  }, []);

  const formatPrice = useCallback((value: number) => {
    if (value >= 1) return `$${value.toFixed(2)}`;
    if (value >= 0.0001) return `$${value.toFixed(6)}`;
    return `$${value.toFixed(10)}`;
  }, []);

  // Memoized status icon to prevent re-renders
  const StatusIcon = memo(function StatusIcon({ status }: { status: RiskFactor["status"] }) {
    switch (status) {
      case "safe": return <CheckCircle className="w-4 sm:w-5 h-4 sm:h-5 text-safe" />;
      case "warning": return <AlertTriangle className="w-4 sm:w-5 h-4 sm:h-5 text-warning" />;
      case "danger": return <XCircle className="w-4 sm:w-5 h-4 sm:h-5 text-danger" />;
    }
  });

  const getStatusIcon = useCallback((status: RiskFactor["status"]) => {
    return <StatusIcon status={status} />;
  }, []);

  const getTokenStatusBadge = (status: "original" | "bridged" | "suspicious", isHighlighted = false) => {
    switch (status) {
      case "original":
        return (
          <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full font-medium border",
            isHighlighted 
              ? "px-3 py-1 bg-safe/30 text-safe text-sm border-safe/50 shadow-lg shadow-safe/20 animate-pulse"
              : "px-2 py-0.5 bg-safe/20 text-safe text-xs border-safe/30"
          )}>
            <BadgeCheck className={isHighlighted ? "w-4 h-4" : "w-3 h-3"} />
            {isHighlighted ? "✓ ORIGINAL" : "Original"}
          </span>
        );
      case "bridged":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium border border-primary/30">
            <ArrowRightLeft className="w-3 h-3" />
            Bridged
          </span>
        );
      case "suspicious":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-danger/20 text-danger text-xs font-medium border border-danger/30">
            <ShieldAlert className="w-3 h-3" />
            Suspicious
          </span>
        );
    }
  };

  const copyAddress = async (address: string) => {
    await navigator.clipboard.writeText(address);
    toast.success("Address copied!");
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const handleAddToWatchlist = async () => {
    if (!selectedResult || !tokenInfo) return;
    
    if (!isAuthenticated) {
      toast.info("Sign in to save tokens to your watchlist", {
        action: {
          label: "Sign In",
          onClick: () => window.location.href = "/auth"
        }
      });
      return;
    }
    
    const added = await addToken({
      address: selectedResult.address,
      name: tokenInfo.name,
      network: selectedResult.network as Network,
      riskScore: selectedResult.riskScore,
    });
    
    if (added) {
      toast.success(`${tokenInfo.name} added to watchlist!`);
    } else {
      toast.info("Already in watchlist");
    }
  };

  const resetScan = () => {
    setScanResults([]);
    setSelectedResult(null);
    setTokenInfo(null);
    setTokenQuery("");
    setDisplayAddress("");
    setUploadedImage(null);
  };

  const foundNetworks = scanResults.filter(r => r.found);

  // Generate one-sentence risk summary explaining the score
  const generateRiskSummary = useCallback((result: NetworkResult): string => {
    const { riskScore, riskFactors, securityData, lockInfo, marketData } = result;
    
    // Determine risk level
    const riskLevel = riskScore >= 70 ? "Low risk" : riskScore >= 40 ? "Medium risk" : "High risk";
    
    // Collect key positive and negative factors
    const positives: string[] = [];
    const negatives: string[] = [];
    
    // Check for critical issues first
    if (securityData?.isHoneypot) {
      return "⚠️ CRITICAL: Honeypot detected - tokens cannot be sold!";
    }
    
    // Check for dangerous factors
    const dangerFactors = riskFactors.filter(f => f.status === "danger");
    const warningFactors = riskFactors.filter(f => f.status === "warning");
    const safeFactors = riskFactors.filter(f => f.status === "safe");
    
    // Collect specific insights
    if (lockInfo?.isLocked) {
      positives.push(`liquidity locked (${lockInfo.lockPercentage}%)`);
    }
    
    if (securityData?.isVerified) {
      positives.push("verified contract");
    }
    
    if (marketData && marketData.liquidity >= 100000) {
      positives.push("strong liquidity");
    } else if (marketData && marketData.liquidity >= 10000) {
      positives.push("decent liquidity");
    } else if (marketData && marketData.liquidity < 5000) {
      negatives.push("low liquidity");
    }
    
    if (securityData?.holderCount && securityData.holderCount >= 1000) {
      positives.push("many holders");
    } else if (securityData?.holderCount && securityData.holderCount < 50) {
      negatives.push("few holders");
    }
    
    // Check for specific risk factors
    for (const factor of dangerFactors) {
      const lowerName = factor.name.toLowerCase();
      if (lowerName.includes("tax") && (lowerName.includes("buy") || lowerName.includes("sell"))) {
        negatives.push("high taxes");
      } else if (lowerName.includes("mint")) {
        negatives.push("mintable supply");
      } else if (lowerName.includes("owner") || lowerName.includes("hidden")) {
        negatives.push("ownership risks");
      } else if (lowerName.includes("holder") || lowerName.includes("concentration")) {
        const match = factor.description.match(/(\d+(?:\.\d+)?%)/);
        if (match) {
          negatives.push(`dev/top holder owns ${match[1]}`);
        } else {
          negatives.push("high holder concentration");
        }
      } else if (lowerName.includes("freeze")) {
        negatives.push("freeze authority enabled");
      }
    }
    
    for (const factor of warningFactors) {
      const lowerName = factor.name.toLowerCase();
      if (lowerName.includes("holder") || lowerName.includes("concentration")) {
        const match = factor.description.match(/(\d+(?:\.\d+)?%)/);
        if (match && negatives.length < 2) {
          negatives.push(`top holder owns ${match[1]}`);
        }
      }
    }
    
    // Build the summary sentence
    if (dangerFactors.length > 0 && negatives.length > 0) {
      const topNegatives = negatives.slice(0, 2).join(" and ");
      if (positives.length > 0) {
        const topPositives = positives.slice(0, 1)[0];
        return `${riskLevel} — ${topPositives} but ${topNegatives}.`;
      }
      return `${riskLevel} — ${topNegatives}.`;
    }
    
    if (positives.length > 0 && negatives.length > 0) {
      const topPositives = positives.slice(0, 1)[0];
      const topNegatives = negatives.slice(0, 1)[0];
      return `${riskLevel} — ${topPositives} but ${topNegatives}.`;
    }
    
    if (positives.length >= 2) {
      return `${riskLevel} — ${positives.slice(0, 2).join(" and ")}.`;
    }
    
    if (positives.length === 1) {
      return `${riskLevel} — ${positives[0]}.`;
    }
    
    if (negatives.length > 0) {
      return `${riskLevel} — ${negatives.slice(0, 2).join(" and ")}.`;
    }
    
    // Default fallbacks based on score
    if (riskScore >= 70) {
      return "Low risk — no major issues detected.";
    } else if (riskScore >= 40) {
      return "Medium risk — proceed with caution.";
    }
    return "High risk — multiple warning signs detected.";
  }, []);

  return (
    <div className="space-y-6">
      {/* Unified Token Search & Scan */}
      {scanMode === "address" ? (
        <div className="glass-card p-8 animate-fade-in relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-accent/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
          
          <div className="relative space-y-6">
            {/* Header */}
            <div className="text-center mb-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
                <Scan className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-display text-xl text-foreground mb-1">Scan Any Token</h3>
              <p className="text-sm text-muted-foreground">Multi-chain risk analysis powered by real-time data</p>
            </div>

            {/* Unified Smart Search Input */}
            <div className="relative">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Address or token name..."
                    value={tokenQuery}
                    onChange={(e) => {
                      setTokenQuery(e.target.value);
                      setScanResults([]);
                      setSelectedResult(null);
                    }}
                    onPaste={(e: ClipboardEvent<HTMLInputElement>) => {
                      e.preventDefault();
                      const pastedText = e.clipboardData.getData('text').trim();
                      setTokenQuery(pastedText);
                      setDisplayAddress(pastedText);
                      if (isContractAddress(pastedText)) {
                        setTimeout(() => handleScanWithAddress(pastedText), 100);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && tokenQuery) {
                        handleScan();
                      }
                    }}
                    onFocus={() => tokenQuery.length >= 2 && !isContractAddress(tokenQuery) && setShowSuggestions(suggestions.length > 0)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full bg-secondary/80 border-border/50 focus:border-primary/50 h-16 pl-12 pr-32 text-foreground placeholder:text-muted-foreground text-base rounded-xl font-mono truncate"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-24 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin" />
                  )}
                  <Button 
                    onClick={handleScan}
                    disabled={!tokenQuery || isScanning}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-12 px-4 sm:px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-display rounded-lg shadow-lg shadow-primary/20 shrink-0 min-w-[80px]"
                  >
                    {isScanning ? (
                      <Scan className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Scan className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">SCAN</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Input Type Indicator */}
              {tokenQuery && (
                <div className="absolute -bottom-6 left-0">
                  <span className="text-xs text-muted-foreground">
                    {isContractAddress(tokenQuery) ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        Contract address detected — scanning automatically
                      </span>
                    ) : tokenQuery.length >= 2 ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-accent/70" />
                        Searching tokens across all chains...
                      </span>
                    ) : null}
                  </span>
                </div>
              )}
              
              {/* Suggestions Dropdown */}
              {showSuggestions && (
                <div className="absolute z-50 w-full mt-2 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
                  {suggestions.map((pair, index) => {
                    const isOriginal = index === 0;
                    return (
                      <button
                        key={`${pair.chainId}-${pair.pairAddress}-${index}`}
                        className={cn(
                          "w-full px-4 py-3 flex items-center justify-between transition-colors text-left border-b border-border/20 last:border-b-0",
                          isOriginal 
                            ? "bg-emerald-500/10 hover:bg-emerald-500/20 ring-1 ring-inset ring-emerald-500/30" 
                            : "hover:bg-primary/10"
                        )}
                        onMouseDown={() => handleSelectSuggestion(pair)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative">
                            {pair.info?.imageUrl && (
                              <img 
                                src={pair.info.imageUrl} 
                                alt={pair.baseToken.symbol}
                                className={cn(
                                  "w-9 h-9 rounded-full bg-secondary",
                                  isOriginal ? "ring-2 ring-emerald-500" : "ring-2 ring-border/30"
                                )}
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            )}
                            {isOriginal && (
                              <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-0.5">
                                <BadgeCheck className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "font-medium truncate",
                                isOriginal ? "text-emerald-400" : "text-foreground"
                              )}>
                                {pair.baseToken.name}
                              </span>
                              <span className="text-muted-foreground text-sm">({pair.baseToken.symbol})</span>
                              {isOriginal && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold uppercase tracking-wide">
                                  Original
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground font-mono truncate">
                              {truncateAddress(pair.baseToken.address)}
                            </p>
                          </div>
                        </div>
                        <span className={cn(
                          "text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ml-2",
                          isOriginal 
                            ? "bg-emerald-500/20 text-emerald-400" 
                            : "bg-primary/10 text-primary"
                        )}>
                          {chainIdToNetwork[pair.chainId] || pair.chainId}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Screenshot Toggle */}
            <div className="flex justify-center pt-2">
              <button
                onClick={() => { setScanMode("screenshot"); resetScan(); }}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-primary bg-secondary/30 hover:bg-secondary/50 rounded-lg transition-all"
              >
                <Upload className="w-4 h-4" />
                Or upload a screenshot
              </button>
            </div>

            {/* Ghost description text */}
            <p className="text-center text-xs text-muted-foreground/60 pt-2 max-w-md mx-auto leading-relaxed">
              Analyzes liquidity, trading volume, holder distribution, and on-chain activity to detect potential rug pulls, honeypots, and scam patterns across ETH, BSC, Solana, Polygon, and more.
            </p>
          </div>
        </div>
      ) : (
        // Upload Screenshot Mode
        <div className="glass-card p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg text-foreground flex items-center gap-2">
              <Image className="w-5 h-5 text-primary" />
              Screenshot Analyzer
            </h3>
            <button
              onClick={() => { setScanMode("address"); resetScan(); }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-lg transition-colors"
            >
              <Search className="w-4 h-4" />
              Back to Search
            </button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Upload a screenshot and we'll automatically extract contract addresses using OCR
          </p>

          {!uploadedImage ? (
            <div
              onDragEnter={handleDragIn}
              onDragLeave={handleDragOut}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={cn(
                "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300",
                isDragging 
                  ? "border-primary bg-primary/5" 
                  : "border-border/50 hover:border-border"
              )}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className={cn(
                "w-12 h-12 mx-auto mb-4 transition-colors",
                isDragging ? "text-primary" : "text-muted-foreground"
              )} />
              <p className="font-medium text-foreground mb-1">
                {isDragging ? "Drop your screenshot here" : "Drag & drop screenshot"}
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse files
              </p>
              <p className="text-xs text-primary mt-3">
                📸 OCR enabled - Contract addresses will be extracted and scanned automatically
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden border border-border/50">
                <img 
                  src={uploadedImage} 
                  alt="Uploaded screenshot" 
                  className="w-full h-48 object-cover"
                />
                <button
                  onClick={clearUpload}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
                >
                  <X className="w-4 h-4 text-foreground" />
                </button>
                
                {/* OCR Processing Overlay */}
                {isOcrProcessing && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur flex flex-col items-center justify-center">
                    <div className="scan-line" />
                    <Loader2 className="w-12 h-12 text-primary animate-spin mb-2" />
                    <p className="font-display text-primary text-sm">OCR PROCESSING... {ocrProgress}%</p>
                    <p className="text-xs text-muted-foreground mt-1">Extracting contract addresses</p>
                  </div>
                )}
              </div>
              
              {/* Quick Analysis Summary - Shows after successful scan */}
              {selectedResult && tokenInfo && !isScanning && !isOcrProcessing && (
                <div className="p-4 rounded-xl border border-border/50 bg-gradient-to-br from-secondary/50 to-secondary/20 space-y-4 animate-fade-in">
                  {/* Token Header */}
                  <div className="flex items-center gap-3">
                    {tokenInfo.imageUrl && (
                      <img 
                        src={tokenInfo.imageUrl} 
                        alt={tokenInfo.symbol}
                        className="w-12 h-12 rounded-full bg-secondary ring-2 ring-border/50"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-display text-lg text-foreground truncate">{tokenInfo.name}</h4>
                        <span className="text-sm text-muted-foreground">({tokenInfo.symbol})</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                          {selectedResult.network}
                        </span>
                        {getTokenStatusBadge(selectedResult.tokenStatus)}
                      </div>
                    </div>
                  </div>

                  {/* Risk Score Display */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center font-display text-lg font-bold",
                        selectedResult.riskScore >= 70 ? "bg-safe/20 text-safe border-2 border-safe/30" :
                        selectedResult.riskScore >= 40 ? "bg-warning/20 text-warning border-2 border-warning/30" :
                        "bg-danger/20 text-danger border-2 border-danger/30"
                      )}>
                        {selectedResult.riskScore}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {selectedResult.riskScore >= 70 ? "Low Risk" :
                           selectedResult.riskScore >= 40 ? "Medium Risk" : "High Risk"}
                        </p>
                        <p className="text-xs text-muted-foreground">Safety Score</p>
                      </div>
                    </div>
                    <div className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium",
                      selectedResult.riskScore >= 70 ? "bg-safe/10 text-safe" :
                      selectedResult.riskScore >= 40 ? "bg-warning/10 text-warning" :
                      "bg-danger/10 text-danger"
                    )}>
                      {selectedResult.riskScore >= 70 ? "SAFE" :
                       selectedResult.riskScore >= 40 ? "CAUTION" : "DANGER"}
                    </div>
                  </div>

                  {/* Risk Trend Analysis */}
                  {selectedResult.marketData && (
                    <RiskTrendBadge 
                      data={calculateRiskTrend(
                        selectedResult.riskScore,
                        selectedResult.marketData.change24h,
                        undefined,
                        undefined
                      )} 
                    />
                  )}

                  {/* Key Metrics Grid */}
                  {selectedResult.marketData && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-lg bg-background/50 border border-border/30">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <Droplets className="w-3 h-3" /> Liquidity
                        </p>
                        <p className="font-display text-sm text-foreground">
                          {formatCurrency(selectedResult.marketData.liquidity)}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-background/50 border border-border/30">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <BarChart3 className="w-3 h-3" /> 24h Volume
                        </p>
                        <p className="font-display text-sm text-foreground">
                          {formatCurrency(selectedResult.marketData.volume24h)}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-background/50 border border-border/30">
                        <p className="text-xs text-muted-foreground mb-1">Price</p>
                        <p className="font-display text-sm text-foreground">
                          {formatPrice(selectedResult.marketData.price)}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-background/50 border border-border/30">
                        <p className="text-xs text-muted-foreground mb-1">24h Change</p>
                        <p className={cn(
                          "font-display text-sm",
                          selectedResult.marketData.change24h >= 0 ? "text-safe" : "text-danger"
                        )}>
                          {selectedResult.marketData.change24h >= 0 ? "+" : ""}
                          {selectedResult.marketData.change24h.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Risk Warnings */}
                  {selectedResult.riskFactors.filter(f => f.status === "danger" || f.status === "warning").length > 0 && (
                    <div className="p-3 rounded-lg bg-danger/5 border border-danger/20">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-danger" />
                        <h5 className="text-sm font-medium text-danger">Risk Warnings</h5>
                        <span className="text-[10px] text-muted-foreground ml-auto">Tap for details</span>
                      </div>
                      <div className="space-y-2">
                        {selectedResult.riskFactors
                          .filter(f => f.status === "danger" || f.status === "warning")
                          .slice(0, 5)
                          .map((factor, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              {factor.status === "danger" ? (
                                <XCircle className="w-3.5 h-3.5 text-danger shrink-0 mt-0.5" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                              )}
                              <RiskFactorTooltip
                                factorName={factor.name}
                                status={factor.status}
                                description={factor.description}
                              />
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Safe Indicators */}
                  {selectedResult.riskScore >= 70 && (
                    <div className="p-3 rounded-lg bg-safe/5 border border-safe/20">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-safe" />
                        <h5 className="text-sm font-medium text-safe">Positive Indicators</h5>
                      </div>
                      <div className="space-y-1.5">
                        {selectedResult.riskFactors
                          .filter(f => f.status === "safe")
                          .slice(0, 4)
                          .map((factor, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              <CheckCircle className="w-3.5 h-3.5 text-safe shrink-0 mt-0.5" />
                              <span className="text-safe">{factor.name}: {factor.description}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddToWatchlist}
                      disabled={isInWatchlist(selectedResult.address)}
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                    >
                      <Star className={cn("w-4 h-4", isInWatchlist(selectedResult.address) && "fill-warning text-warning")} />
                      {isInWatchlist(selectedResult.address) ? "Watching" : "Add to Watchlist"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="gap-2"
                    >
                      <a href={selectedResult.dexUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                        View on DEX
                      </a>
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Extracted Addresses Section */}
              {extractedAddresses.length > 0 && !isOcrProcessing && !selectedResult && (
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <h4 className="font-display text-sm text-primary uppercase">
                      Extracted Addresses ({extractedAddresses.length})
                    </h4>
                  </div>
                  
                  {/* OCR Warning */}
                  <div className="flex items-start gap-2 mb-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-500/90">
                      OCR may have errors (e.g., 0↔6, O↔0). Please verify the address before scanning.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    {extractedAddresses.map((address, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setTokenQuery(address);
                          setDisplayAddress(address);
                          handleScanWithAddress(address);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between gap-2 p-2 rounded-lg bg-background/50 border border-border/50 hover:border-primary/50 transition-colors text-left",
                          tokenQuery === address && "border-primary bg-primary/10"
                        )}
                      >
                        <code className="text-xs text-foreground font-mono truncate flex-1">
                          {address}
                        </code>
                        <span className="text-xs text-primary shrink-0">
                          {tokenQuery === address ? "Selected" : "Tap to scan"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Manual Address Input (fallback) */}
              {!isOcrProcessing && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {extractedAddresses.length > 0 ? "Or enter address manually:" : "No addresses found. Enter manually:"}
                  </p>
                  <div className="flex gap-3">
                    <Input
                      placeholder="Paste contract address..."
                      value={tokenQuery}
                      onChange={(e) => {
                        setTokenQuery(e.target.value);
                        setDisplayAddress(e.target.value);
                      }}
                      className="flex-1 bg-secondary/50 border-border/50 h-12 font-mono text-sm"
                    />
                    <Button 
                      onClick={handleScan}
                      disabled={!tokenQuery || isScanning}
                      className="h-12 px-6 bg-primary hover:bg-primary/90"
                    >
                      {isScanning ? <Scan className="w-5 h-5 animate-spin" /> : "SCAN"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Scanning Animation */}
      {isScanning && (
        <div className="glass-card p-12 relative overflow-hidden">
          <div className="scan-line" />
          <div className="flex flex-col items-center justify-center">
            <Scan className="w-16 h-16 text-primary animate-scan mb-4" />
            <p className="font-display text-primary animate-pulse">
              FETCHING LIVE DATA...
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Querying DEXScreener across all chains
            </p>
          </div>
        </div>
      )}

      {/* No Results Found */}
      {scanResults.length === 0 && !isScanning && tokenQuery && displayAddress && (
        <div className="glass-card p-8 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-warning/10 border border-warning/30 flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-warning" />
          </div>
          <h3 className="font-display text-xl text-foreground mb-2">Token Not Found</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            No trading pairs found for this address on DEXScreener.
          </p>
          <div className="bg-secondary/30 border border-border/30 rounded-lg p-4 max-w-md mx-auto">
            <h4 className="text-sm font-medium text-foreground mb-2 flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Possible Reasons
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1 text-left">
              <li>• Token is not listed on any DEX yet</li>
              <li>• Contract address may be incorrect</li>
              <li>• Token has no liquidity or trading activity</li>
              <li>• Try searching by token name instead</li>
            </ul>
          </div>
          <Button onClick={resetScan} variant="outline" className="mt-6">
            Try Another Search
          </Button>
        </div>
      )}

      {/* Results */}
      {scanResults.length > 0 && !isScanning && foundNetworks.length > 0 && (
        <div className="space-y-6 animate-fade-in">
          {/* Token Header */}
          <div className="glass-card p-6">
            <div className="flex items-start gap-4 mb-4">
              {tokenInfo?.imageUrl && (
                <img 
                  src={tokenInfo.imageUrl} 
                  alt={tokenInfo.symbol}
                  className="w-12 h-12 rounded-full bg-secondary"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-2xl text-foreground">
                  {tokenInfo?.name} <span className="text-muted-foreground">({tokenInfo?.symbol})</span>
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm text-muted-foreground font-mono truncate">
                    {tokenInfo?.address}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => tokenInfo && copyAddress(tokenInfo.address)}
                    className="h-6 w-6 p-0"
                    aria-label="Copy token address"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Found on {foundNetworks.length} chain{foundNetworks.length !== 1 ? 's' : ''}
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {scanResults.map((result, index) => {
                const isOriginal = result.tokenStatus === "original";
                const isFirstOriginal = isOriginal && index === 0;
                
                return (
                  <div
                    key={result.chainId}
                    className={cn(
                      "p-4 rounded-lg border transition-all relative",
                      isFirstOriginal && "ring-2 ring-safe/50 shadow-lg shadow-safe/10",
                      result.found 
                        ? selectedResult?.chainId === result.chainId
                          ? "border-primary bg-primary/20"
                          : isOriginal
                            ? "border-safe/50 bg-safe/10 hover:bg-safe/20 hover:border-safe"
                            : "border-border/50 bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50"
                        : "border-border/30 bg-secondary/10 opacity-50"
                    )}
                  >
                    {isFirstOriginal && (
                      <div className="absolute -top-2 -right-2 z-10">
                        <span className="flex items-center gap-1 px-2 py-1 bg-safe text-safe-foreground text-[10px] font-bold rounded-full shadow-lg uppercase tracking-wider">
                          <BadgeCheck className="w-3 h-3" />
                          Verified
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => result.found && setSelectedResult(result)}
                      disabled={!result.found}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{result.network}</span>
                          <div className="flex items-center gap-1 flex-wrap">
                            {result.network !== 'SOL' && (
                              <LockStatusBadge lockInfo={result.lockInfo} compact />
                            )}
                            {result.securityData && (
                              <>
                                {result.securityData.isHoneypot && (
                                  <span className="px-1.5 py-0.5 text-[10px] rounded bg-danger/30 text-danger border border-danger/50 flex items-center gap-0.5" title="Honeypot Detected!">
                                    <ShieldAlert className="w-2.5 h-2.5" />
                                    HP
                                  </span>
                                )}
                                {!result.securityData.isHoneypot && result.securityData.isVerified && (
                                  <span className="px-1.5 py-0.5 text-[10px] rounded bg-safe/20 text-safe border border-safe/40 flex items-center gap-0.5" title="Verified Contract">
                                    <BadgeCheck className="w-2.5 h-2.5" />
                                  </span>
                                )}
                                {result.securityData.holderCount > 0 && (
                                  <span className={cn(
                                    "px-1.5 py-0.5 text-[10px] rounded flex items-center gap-0.5",
                                    result.securityData.holderCount >= 1000 
                                      ? "bg-safe/20 text-safe border border-safe/40" 
                                      : result.securityData.holderCount >= 100 
                                        ? "bg-warning/20 text-warning border border-warning/40"
                                        : "bg-danger/20 text-danger border border-danger/40"
                                  )} title={`${result.securityData.holderCount.toLocaleString()} holders`}>
                                    <Users className="w-2.5 h-2.5" />
                                    {result.securityData.holderCount >= 1000 
                                      ? `${(result.securityData.holderCount / 1000).toFixed(0)}K`
                                      : result.securityData.holderCount}
                                  </span>
                                )}
                              </>
                            )}
                            <PumpDumpBadge analysis={result.pumpDumpAnalysis} compact />
                            {result.found && result.marketData && (
                              <RiskTrendBadge 
                                data={calculateRiskTrend(
                                  result.riskScore,
                                  result.marketData.change24h,
                                  undefined,
                                  undefined
                                )} 
                                compact 
                              />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {result.found && getTokenStatusBadge(result.tokenStatus, isFirstOriginal)}
                        </div>
                      </div>
                      {result.found && (
                        <div className="flex items-center justify-between">
                          <div>
                            <span className={cn(
                              "font-display text-lg",
                              result.riskScore >= 70 ? "text-safe" : 
                              result.riskScore >= 40 ? "text-warning" : "text-danger"
                            )}>
                              {result.riskScore}
                            </span>
                            <span className="text-muted-foreground text-xs ml-1">/ 100</span>
                          </div>
                          {result.marketData && (
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">Liquidity</div>
                              <div className="text-sm font-medium text-foreground">
                                {formatCurrency(result.marketData.liquidity)}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Compact risk summary for grid cards */}
                      {result.found && (
                        <p className={cn(
                          "text-[10px] leading-tight mt-2 line-clamp-2",
                          result.riskScore >= 70 ? "text-safe/80" : 
                          result.riskScore >= 40 ? "text-warning/80" : "text-danger/80"
                        )}>
                          {generateRiskSummary(result)}
                        </p>
                      )}
                      {/* API Sources indicator */}
                      {result.found && result.apiSources && result.apiSources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/20">
                          <ApiSourcesBadge sources={result.apiSources} compact />
                        </div>
                      )}
                    </button>
                    
                    {result.found && tokenInfo && (
                      <div className="mt-3 pt-3 border-t border-border/30">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!isAuthenticated) {
                              toast.info("Sign in to save tokens to your watchlist", {
                                action: { label: "Sign In", onClick: () => window.location.href = "/auth" }
                              });
                              return;
                            }
                            const added = await addToken({
                              address: result.address,
                              name: tokenInfo.name,
                              network: result.network as Network,
                              riskScore: result.riskScore,
                            });
                            if (added) {
                              toast.success(`${tokenInfo.name} (${result.network}) added to watchlist!`);
                            } else {
                              toast.info("Already in watchlist");
                            }
                          }}
                          disabled={isInWatchlist(result.address)}
                          className="w-full gap-2 h-8 text-xs"
                        >
                          <Star className={cn(
                            "w-3.5 h-3.5",
                            isInWatchlist(result.address) && "fill-warning text-warning"
                          )} />
                          {isInWatchlist(result.address) ? "In Watchlist" : "Add to Watchlist"}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Network Details */}
          {selectedResult && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Risk Score */}
              <div className="glass-card p-6 flex flex-col items-center justify-center">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-display text-xl text-foreground">{tokenInfo?.name}</h3>
                  {getTokenStatusBadge(selectedResult.tokenStatus)}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm text-primary">
                    {selectedResult.network} Network
                  </p>
                  {selectedResult.apiSources && selectedResult.apiSources.length > 0 && (
                    <ApiSourcesCount sources={selectedResult.apiSources} />
                  )}
                </div>
                <RiskGauge score={selectedResult.riskScore} />
                
                {/* One-sentence risk summary */}
                <p className={cn(
                  "text-sm text-center mt-3 px-4 py-2 rounded-lg max-w-sm",
                  selectedResult.riskScore >= 70 
                    ? "bg-safe/10 text-safe border border-safe/20" 
                    : selectedResult.riskScore >= 40 
                      ? "bg-warning/10 text-warning border border-warning/20"
                      : "bg-danger/10 text-danger border border-danger/20"
                )}>
                  {generateRiskSummary(selectedResult)}
                </p>
                
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={handleAddToWatchlist}
                    disabled={isInWatchlist(selectedResult.address)}
                    variant="outline"
                    className="gap-2"
                  >
                    <Star className={cn("w-4 h-4", isInWatchlist(selectedResult.address) && "fill-warning text-warning")} />
                    {isInWatchlist(selectedResult.address) ? "Watching" : "Watch"}
                  </Button>
                  <Button
                    variant="outline"
                    asChild
                    className="gap-2"
                  >
                    <a href={selectedResult.dexUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                      DEXScreener
                    </a>
                  </Button>
                </div>
              </div>

              {/* AI Risk Explanation */}
              <AIRiskExplanation
                tokenData={{
                  name: tokenInfo?.name || 'Unknown',
                  symbol: tokenInfo?.symbol || '???',
                  network: selectedResult.network,
                  riskScore: selectedResult.riskScore,
                  riskFactors: selectedResult.riskFactors,
                  marketData: selectedResult.marketData ? {
                    price: selectedResult.marketData.price,
                    liquidity: selectedResult.marketData.liquidity,
                    volume24h: selectedResult.marketData.volume24h,
                    marketCap: selectedResult.marketData.marketCap,
                  } : undefined,
                  securityData: selectedResult.securityData ? {
                    isHoneypot: selectedResult.securityData.isHoneypot,
                    isVerified: selectedResult.securityData.isVerified,
                    buyTax: selectedResult.securityData.buyTax,
                    sellTax: selectedResult.securityData.sellTax,
                    holderCount: selectedResult.securityData.holderCount,
                    isMintable: selectedResult.securityData.isMintable,
                    hasHiddenOwner: selectedResult.securityData.hasHiddenOwner,
                  } : undefined,
                  lockInfo: selectedResult.lockInfo ? {
                    isLocked: selectedResult.lockInfo.isLocked,
                    lockPercentage: selectedResult.lockInfo.lockPercentage,
                    unlockDate: typeof selectedResult.lockInfo.unlockDate === 'string' 
                      ? selectedResult.lockInfo.unlockDate 
                      : selectedResult.lockInfo.unlockDate 
                        ? new Date(selectedResult.lockInfo.unlockDate).toISOString()
                        : '',
                  } : undefined,
                }}
                autoGenerate={false}
                className="md:col-span-2"
              />

              {/* Pump/Dump Analysis */}
              {selectedResult.pumpDumpAnalysis && (
                <div className="glass-card p-6">
                  <h3 className="font-display text-lg text-foreground mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Pump/Dump Detection
                  </h3>
                  <PumpDumpBadge analysis={selectedResult.pumpDumpAnalysis} showDetails />
                </div>
              )}

              {/* Risk Factors */}
              <div className="glass-card p-4 sm:p-6">
                <h3 className="font-display text-base sm:text-lg text-foreground mb-3 sm:mb-4 flex items-center gap-2">
                  Risk Analysis
                  <Info className="w-4 h-4 text-muted-foreground" />
                </h3>
                <div className="space-y-2 sm:space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {selectedResult.riskFactors.map((factor, index) => (
                    <div 
                      key={factor.name}
                      className={cn(
                        "flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-secondary/30 border border-border/30",
                        "animate-fade-in"
                      )}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {getStatusIcon(factor.status)}
                      <div className="flex-1 min-w-0">
                        <RiskFactorTooltip
                          factorName={factor.name}
                          status={factor.status}
                          description={factor.description}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Sources */}
              {selectedResult.apiSources && selectedResult.apiSources.length > 1 && (
                <div className="glass-card p-4 sm:p-6">
                  <h3 className="font-display text-base sm:text-lg text-foreground mb-3 sm:mb-4 flex items-center gap-2">
                    <Layers className="w-4 sm:w-5 h-4 sm:h-5 text-primary" />
                    Data Sources
                    <span className="text-xs font-normal text-muted-foreground">
                      ({selectedResult.apiSources.length} APIs)
                    </span>
                  </h3>
                  <div className="space-y-2">
                    <ApiSourcesBadge sources={selectedResult.apiSources} />
                    <p className="text-xs text-muted-foreground mt-2">
                      Security analysis powered by multiple independent sources for enhanced accuracy.
                    </p>
                  </div>
                </div>
              )}

              {/* Security Summary - GoPlus Data */}
              {selectedResult.securityData && (
                <div className="glass-card p-4 sm:p-6 md:col-span-2">
                  <h3 className="font-display text-base sm:text-lg text-foreground mb-3 sm:mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-4 sm:w-5 h-4 sm:h-5 text-primary" />
                    Contract Security
                  </h3>
                  
                  {/* Honeypot Warning Banner */}
                  {selectedResult.securityData.isHoneypot && (
                    <div className="mb-3 sm:mb-4 p-3 sm:p-4 rounded-lg bg-danger/20 border border-danger/50 flex items-start sm:items-center gap-2 sm:gap-3">
                      <ShieldAlert className="w-6 sm:w-8 h-6 sm:h-8 text-danger flex-shrink-0" />
                      <div>
                        <p className="font-display text-sm sm:text-lg text-danger">⚠️ HONEYPOT DETECTED</p>
                        <p className="text-xs sm:text-sm text-danger/80">This token cannot be sold! Do not buy.</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                    {/* Contract Verification */}
                    <div className={cn(
                      "p-2 sm:p-4 rounded-lg border",
                      selectedResult.securityData.isVerified 
                        ? "bg-safe/10 border-safe/30" 
                        : "bg-warning/10 border-warning/30"
                    )}>
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                        <FileText className="w-3 sm:w-4 h-3 sm:h-4" />
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Contract</p>
                      </div>
                      <p className={cn(
                        "font-display text-sm sm:text-lg",
                        selectedResult.securityData.isVerified ? "text-safe" : "text-warning"
                      )}>
                        {selectedResult.securityData.isVerified ? "Verified ✓" : "Unverified"}
                      </p>
                    </div>
                    
                    {/* Holder Count */}
                    <div className={cn(
                      "p-2 sm:p-4 rounded-lg border",
                      selectedResult.securityData.holderCount >= 1000 
                        ? "bg-safe/10 border-safe/30" 
                        : selectedResult.securityData.holderCount >= 100 
                          ? "bg-warning/10 border-warning/30"
                          : "bg-danger/10 border-danger/30"
                    )}>
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                        <Users className="w-3 sm:w-4 h-3 sm:h-4" />
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Holders</p>
                      </div>
                      <p className={cn(
                        "font-display text-sm sm:text-lg",
                        selectedResult.securityData.holderCount >= 1000 
                          ? "text-safe" 
                          : selectedResult.securityData.holderCount >= 100 
                            ? "text-warning"
                            : "text-danger"
                      )}>
                        {selectedResult.securityData.holderCount.toLocaleString()}
                      </p>
                    </div>
                    
                    {/* Buy Tax */}
                    <div className={cn(
                      "p-2 sm:p-4 rounded-lg border",
                      selectedResult.securityData.buyTax <= 5 
                        ? "bg-safe/10 border-safe/30" 
                        : selectedResult.securityData.buyTax <= 10 
                          ? "bg-warning/10 border-warning/30"
                          : "bg-danger/10 border-danger/30"
                    )}>
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                        <TrendingUp className="w-3 sm:w-4 h-3 sm:h-4" />
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Buy Tax</p>
                      </div>
                      <p className={cn(
                        "font-display text-sm sm:text-lg",
                        selectedResult.securityData.buyTax <= 5 
                          ? "text-safe" 
                          : selectedResult.securityData.buyTax <= 10 
                            ? "text-warning"
                            : "text-danger"
                      )}>
                        {selectedResult.securityData.buyTax.toFixed(1)}%
                      </p>
                    </div>
                    
                    {/* Sell Tax */}
                    <div className={cn(
                      "p-2 sm:p-4 rounded-lg border",
                      selectedResult.securityData.sellTax <= 5 
                        ? "bg-safe/10 border-safe/30" 
                        : selectedResult.securityData.sellTax <= 10 
                          ? "bg-warning/10 border-warning/30"
                          : "bg-danger/10 border-danger/30"
                    )}>
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                        <TrendingDown className="w-3 sm:w-4 h-3 sm:h-4" />
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Sell Tax</p>
                      </div>
                      <p className={cn(
                        "font-display text-sm sm:text-lg",
                        selectedResult.securityData.sellTax <= 5 
                          ? "text-safe" 
                          : selectedResult.securityData.sellTax <= 10 
                            ? "text-warning"
                            : "text-danger"
                      )}>
                        {selectedResult.securityData.sellTax.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  
                  {/* Additional Security Flags */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {selectedResult.securityData.isMintable && (
                      <span className="px-2 py-1 text-xs rounded-full bg-warning/20 text-warning border border-warning/30">
                        {selectedResult.network === 'SOL' ? 'Mint Authority Active' : 'Mintable'}
                      </span>
                    )}
                    {selectedResult.securityData.hasFreezeAuthority && (
                      <span className="px-2 py-1 text-xs rounded-full bg-warning/20 text-warning border border-warning/30">
                        Freeze Authority Active
                      </span>
                    )}
                    {selectedResult.securityData.hasHiddenOwner && (
                      <span className="px-2 py-1 text-xs rounded-full bg-danger/20 text-danger border border-danger/30">
                        Hidden Owner
                      </span>
                    )}
                    {!selectedResult.securityData.isHoneypot && !selectedResult.securityData.isMintable && !selectedResult.securityData.hasHiddenOwner && !selectedResult.securityData.hasFreezeAuthority && selectedResult.securityData.isVerified && (
                      <span className="px-2 py-1 text-xs rounded-full bg-safe/20 text-safe border border-safe/30">
                        ✓ No Critical Issues
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {/* Liquidity Lock Status - Prominent Display */}
              {selectedResult.network !== 'SOL' && (
                <div className="glass-card p-6 md:col-span-2">
                  <h3 className="font-display text-lg text-foreground mb-4 flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-primary" />
                    Liquidity Lock Status
                  </h3>
                  <LockStatusBadge lockInfo={selectedResult.lockInfo} />
                </div>
              )}
              
              {/* Market Data - Enhanced */}
              {selectedResult.marketData && (
                <div className="glass-card p-6 md:col-span-2">
                  <h3 className="font-display text-lg text-foreground mb-4">Live Market Data</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="p-4 rounded-lg bg-secondary/30 border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1">Price</p>
                      <p className="font-display text-lg text-foreground">
                        {formatPrice(selectedResult.marketData.price)}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/30 border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1">24h Change</p>
                      <p className={cn(
                        "font-display text-lg",
                        selectedResult.marketData.change24h >= 0 ? "text-safe" : "text-danger"
                      )}>
                        {selectedResult.marketData.change24h >= 0 ? "+" : ""}
                        {selectedResult.marketData.change24h.toFixed(2)}%
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/30 border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1">Market Cap</p>
                      <p className="font-display text-lg text-foreground">
                        {formatCurrency(selectedResult.marketData.marketCap)}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/30 border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1">24h Volume</p>
                      <p className="font-display text-lg text-foreground">
                        {formatCurrency(selectedResult.marketData.volume24h)}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/30 border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1">Liquidity</p>
                      <p className="font-display text-lg text-foreground">
                        {formatCurrency(selectedResult.marketData.liquidity)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Price Changes at Multiple Timeframes */}
              {selectedResult.pairs[0] && (
                <div className="glass-card p-6">
                  <h3 className="font-display text-lg text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Price Performance
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "5m", value: selectedResult.pairs[0].priceChange?.m5 },
                      { label: "1h", value: selectedResult.pairs[0].priceChange?.h1 },
                      { label: "6h", value: selectedResult.pairs[0].priceChange?.h6 },
                      { label: "24h", value: selectedResult.pairs[0].priceChange?.h24 },
                    ].map(({ label, value }) => (
                      <div key={label} className="p-3 rounded-lg bg-secondary/30 border border-border/30 text-center">
                        <p className="text-xs text-muted-foreground mb-1">{label}</p>
                        <p className={cn(
                          "font-display text-base",
                          value === undefined ? "text-muted-foreground" :
                          value >= 0 ? "text-safe" : "text-danger"
                        )}>
                          {value !== undefined ? `${value >= 0 ? "+" : ""}${value.toFixed(2)}%` : "N/A"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transaction Activity */}
              {selectedResult.pairs[0]?.txns && (
                <div className="glass-card p-6">
                  <h3 className="font-display text-lg text-foreground mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Trading Activity (24h)
                  </h3>
                  <div className="space-y-4">
                    {/* Buy/Sell Summary */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-safe/10 border border-safe/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">Buys (24h)</span>
                          <TrendingUp className="w-4 h-4 text-safe" />
                        </div>
                        <p className="font-display text-2xl text-safe">
                          {selectedResult.pairs[0].txns.h24?.buys || 0}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-danger/10 border border-danger/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">Sells (24h)</span>
                          <TrendingDown className="w-4 h-4 text-danger" />
                        </div>
                        <p className="font-display text-2xl text-danger">
                          {selectedResult.pairs[0].txns.h24?.sells || 0}
                        </p>
                      </div>
                    </div>
                    
                    {/* Transaction breakdown by timeframe */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        { label: "5m", data: selectedResult.pairs[0].txns.m5 },
                        { label: "1h", data: selectedResult.pairs[0].txns.h1 },
                        { label: "6h", data: selectedResult.pairs[0].txns.h6 },
                        { label: "24h", data: selectedResult.pairs[0].txns.h24 },
                      ].map(({ label, data }) => (
                        <div key={label} className="p-2 rounded bg-secondary/30 border border-border/20">
                          <p className="text-xs text-muted-foreground mb-1">{label}</p>
                          <div className="flex items-center justify-center gap-1 text-xs">
                            <span className="text-safe">{data?.buys || 0}</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-danger">{data?.sells || 0}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Volume Breakdown */}
              {selectedResult.pairs[0]?.volume && (
                <div className="glass-card p-6">
                  <h3 className="font-display text-lg text-foreground mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Volume Breakdown
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "5m", value: selectedResult.pairs[0].volume.m5 },
                      { label: "1h", value: selectedResult.pairs[0].volume.h1 },
                      { label: "6h", value: selectedResult.pairs[0].volume.h6 },
                      { label: "24h", value: selectedResult.pairs[0].volume.h24 },
                    ].map(({ label, value }) => (
                      <div key={label} className="p-3 rounded-lg bg-secondary/30 border border-border/30 text-center">
                        <p className="text-xs text-muted-foreground mb-1">{label}</p>
                        <p className="font-display text-sm text-foreground">
                          {formatCurrency(value || 0)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pair & DEX Info */}
              {selectedResult.pairs[0] && (
                <div className="glass-card p-6">
                  <h3 className="font-display text-lg text-foreground mb-4 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" />
                    Pair Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30">
                      <span className="text-sm text-muted-foreground">DEX</span>
                      <span className="text-sm font-medium text-foreground capitalize">
                        {selectedResult.pairs[0].dexId}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30">
                      <span className="text-sm text-muted-foreground">Trading Pair</span>
                      <span className="text-sm font-medium text-foreground">
                        {selectedResult.pairs[0].baseToken.symbol}/{selectedResult.pairs[0].quoteToken.symbol}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30">
                      <span className="text-sm text-muted-foreground">Pair Address</span>
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono text-foreground">
                          {truncateAddress(selectedResult.pairAddress)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyAddress(selectedResult.pairAddress)}
                          className="h-6 w-6 p-0"
                          aria-label="Copy pair address"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30">
                      <span className="text-sm text-muted-foreground">Price (Native)</span>
                      <span className="text-sm font-mono text-foreground">
                        {parseFloat(selectedResult.pairs[0].priceNative).toFixed(8)} {selectedResult.pairs[0].quoteToken.symbol}
                      </span>
                    </div>
                    {selectedResult.pairs[0].fdv && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30">
                        <span className="text-sm text-muted-foreground">Fully Diluted Value</span>
                        <span className="text-sm font-medium text-foreground">
                          {formatCurrency(selectedResult.pairs[0].fdv)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Social Links & Websites */}
              {(selectedResult.pairs[0]?.info?.websites?.length || selectedResult.pairs[0]?.info?.socials?.length) && (
                <div className="glass-card p-6">
                  <h3 className="font-display text-lg text-foreground mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    Links & Socials
                  </h3>
                  <div className="space-y-3">
                    {/* Websites */}
                    {selectedResult.pairs[0]?.info?.websites?.map((site, idx) => (
                      <a
                        key={idx}
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30 hover:border-primary/50 hover:bg-primary/5 transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                          <span className="text-sm text-foreground">{site.label || "Website"}</span>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                      </a>
                    ))}
                    {/* Social Links */}
                    {selectedResult.pairs[0]?.info?.socials?.map((social, idx) => (
                      <a
                        key={idx}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30 hover:border-primary/50 hover:bg-primary/5 transition-colors group"
                      >
                        <div className="flex items-center gap-2">
{social.type === "twitter" && <span className="w-4 h-4 text-muted-foreground group-hover:text-primary font-bold text-xs flex items-center justify-center">𝕏</span>}
                          {social.type === "telegram" && <MessageCircle className="w-4 h-4 text-muted-foreground group-hover:text-primary" />}
                          {social.type === "discord" && <Users className="w-4 h-4 text-muted-foreground group-hover:text-primary" />}
                          {!["twitter", "telegram", "discord"].includes(social.type) && <LinkIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary" />}
                          <span className="text-sm text-foreground capitalize">{social.type === "twitter" ? "X" : social.type}</span>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Multiple Trading Pools */}
              {selectedResult.pairs.length > 1 && (
                <div className="glass-card p-6 md:col-span-2">
                  <h3 className="font-display text-lg text-foreground mb-4 flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-primary" />
                    All Trading Pools ({selectedResult.pairs.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/30">
                          <th className="text-left p-3 text-muted-foreground font-medium">DEX</th>
                          <th className="text-left p-3 text-muted-foreground font-medium">Pair</th>
                          <th className="text-right p-3 text-muted-foreground font-medium">Liquidity</th>
                          <th className="text-right p-3 text-muted-foreground font-medium">Volume 24h</th>
                          <th className="text-right p-3 text-muted-foreground font-medium">Price</th>
                          <th className="text-center p-3 text-muted-foreground font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedResult.pairs.slice(0, 10).map((pair, idx) => (
                          <tr key={idx} className="border-b border-border/20 hover:bg-secondary/20">
                            <td className="p-3 capitalize">{pair.dexId}</td>
                            <td className="p-3 font-mono text-xs">
                              {pair.baseToken.symbol}/{pair.quoteToken.symbol}
                            </td>
                            <td className="p-3 text-right">{formatCurrency(pair.liquidity?.usd || 0)}</td>
                            <td className="p-3 text-right">{formatCurrency(pair.volume?.h24 || 0)}</td>
                            <td className="p-3 text-right">{formatPrice(parseFloat(pair.priceUsd) || 0)}</td>
                            <td className="p-3 text-center">
                              <a
                                href={pair.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                              >
                                View <ExternalLink className="w-3 h-3" />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {selectedResult.pairs.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center mt-3">
                        + {selectedResult.pairs.length - 10} more pools
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
