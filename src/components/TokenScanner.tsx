import { useState, useEffect, useCallback, ClipboardEvent } from "react";
import { Clipboard, Loader2, Star, Upload, Image, X, BadgeCheck, Copy, ExternalLink, ShieldCheck, ShieldAlert, ArrowRightLeft, FileText, TrendingUp, TrendingDown, Activity, BarChart3, Layers, Droplets, Users, MessageCircle, Link as LinkIcon, Twitter } from "lucide-react";
import { Search, Scan, AlertTriangle, CheckCircle, XCircle, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NetworkBadge } from "./NetworkBadge";
import { RiskGauge } from "./RiskGauge";
import { useWatchlist } from "@/hooks/useWatchlist";
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

export type Network = "ETH" | "BSC" | "SOL" | "POLYGON" | "AVAX" | "ARB" | "BASE" | "OP" | "TON";

type ScanMode = "address" | "screenshot";

interface RiskFactor {
  name: string;
  status: "safe" | "warning" | "danger";
  description: string;
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

  const { addToken, isInWatchlist } = useWatchlist();

  // Contract address patterns for OCR extraction
  const ADDRESS_PATTERNS = {
    ethereum: /0x[a-fA-F0-9]{40}/g,
    tron: /T[A-Za-z1-9]{33}/g,
  };

  const extractAddressesFromText = useCallback((text: string): string[] => {
    const addresses = new Set<string>();
    
    // Extract Ethereum-style addresses
    const ethMatches = text.match(ADDRESS_PATTERNS.ethereum);
    if (ethMatches) {
      ethMatches.forEach(addr => addresses.add(addr));
    }
    
    // Extract Solana addresses (Base58, 32-44 chars)
    const words = text.split(/\s+/);
    words.forEach(word => {
      if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(word)) {
        if (word.length >= 40 && !/^[A-Za-z]+$/.test(word)) {
          addresses.add(word);
        }
      }
    });
    
    // Extract Tron addresses
    const tronMatches = text.match(ADDRESS_PATTERNS.tron);
    if (tronMatches) {
      tronMatches.forEach(addr => addresses.add(addr));
    }
    
    return Array.from(addresses);
  }, []);

  // Image preprocessing for better OCR accuracy
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

        // Set canvas size
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Get image data for processing
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Convert to grayscale and enhance contrast
        for (let i = 0; i < data.length; i += 4) {
          // Grayscale conversion using luminance formula
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          
          // Contrast enhancement (increase by 40%)
          const contrast = 1.4;
          const factor = (259 * (contrast * 128 + 255)) / (255 * (259 - contrast * 128));
          let enhanced = factor * (gray - 128) + 128;
          
          // Clamp values
          enhanced = Math.max(0, Math.min(255, enhanced));
          
          // Apply threshold to sharpen text (binarization for text)
          const threshold = 140;
          const final = enhanced < threshold ? 0 : 255;
          
          data[i] = final;     // R
          data[i + 1] = final; // G
          data[i + 2] = final; // B
          // Keep alpha unchanged
        }

        ctx.putImageData(imgData, 0, 0);

        // Apply slight sharpening using unsharp mask technique
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          
          // Slight blur
          tempCtx.filter = 'blur(1px)';
          tempCtx.drawImage(canvas, 0, 0);
          
          // Composite for sharpening effect
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 0.3;
          ctx.drawImage(tempCanvas, 0, 0);
          ctx.globalAlpha = 1.0;
        }

        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(imageData);
      img.src = imageData;
    });
  };

  // Fix common OCR misreads in addresses
  const fixOcrMisreads = (text: string): string => {
    // Common OCR errors: O<->0, l<->1, I<->1, S<->5, B<->8
    return text
      // Fix Ethereum addresses: Ox -> 0x (capital O to zero)
      .replace(/Ox([a-fA-F0-9]{40})/g, '0x$1')
      .replace(/0X([a-fA-F0-9]{40})/g, '0x$1')
      // Fix partial matches where O appears at start
      .replace(/\bOx([a-fA-F0-9])/g, '0x$1')
      // Fix common letter/number confusions in hex
      .replace(/0x([a-fA-F0-9]*[oO][a-fA-F0-9]*)/g, (match, group) => 
        '0x' + group.replace(/[oO]/g, '0')
      );
  };

  const performOCR = async (imageData: string): Promise<string[]> => {
    try {
      setIsOcrProcessing(true);
      setOcrProgress(0);
      
      // Preprocess image for better OCR accuracy
      setOcrProgress(5);
      const processedImage = await preprocessImage(imageData);
      setOcrProgress(15);
      
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            // Scale progress from 15-95%
            setOcrProgress(15 + Math.round(m.progress * 80));
          }
        },
      });
      
      const { data: { text } } = await worker.recognize(processedImage);
      await worker.terminate();
      
      // Apply OCR error corrections
      const correctedText = fixOcrMisreads(text);
      console.log("OCR Text (corrected):", correctedText);
      
      // Also try with original image if preprocessed yields no results
      let addresses = extractAddressesFromText(correctedText);
      
      if (addresses.length === 0) {
        // Fallback: try original image without preprocessing
        const fallbackWorker = await createWorker('eng', 1);
        const { data: { text: fallbackText } } = await fallbackWorker.recognize(imageData);
        await fallbackWorker.terminate();
        
        const correctedFallback = fixOcrMisreads(fallbackText);
        addresses = extractAddressesFromText(correctedFallback);
      }
      
      setExtractedAddresses(addresses);
      setOcrProgress(100);
      
      return addresses;
    } catch (error) {
      console.error("OCR Error:", error);
      toast.error("Failed to process image");
      return [];
    } finally {
      setIsOcrProcessing(false);
    }
  };

  // Check if input looks like a contract address
  const isContractAddress = useCallback((query: string): boolean => {
    // Ethereum-like address (0x...)
    if (/^0x[a-fA-F0-9]{40}$/i.test(query)) return true;
    // Solana address (base58, 32-44 chars)
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(query)) return true;
    return false;
  }, []);

  // Debounced search for real-time suggestions
  const searchTokensDebounced = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    
    try {
      const results = await searchTokens(query);
      // Filter to unique tokens by address and take top 10
      const seen = new Set<string>();
      const unique = results.filter(pair => {
        const key = `${pair.chainId}-${pair.baseToken.address}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 10);
      
      setSuggestions(unique);
      setShowSuggestions(unique.length > 0);
    } catch (error) {
      console.error('Search error:', error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    // Don't search if it looks like an address - user should click scan
    if (isContractAddress(tokenQuery)) {
      setDisplayAddress(tokenQuery);
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(() => {
      searchTokensDebounced(tokenQuery);
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

  // Scan for token data
  const handleScanWithAddress = async (address: string) => {
    if (!address) return;
    
    setIsScanning(true);
    setScanResults([]);
    setSelectedResult(null);
    
    try {
      const pairs = await getTokenByAddress(address);
      
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

      // Build results for each chain with market data
      const resultsWithData = Object.entries(chainGroups).map(([chainId, chainPairs]) => {
        const mainPair = chainPairs[0];
        const { score, factors } = analyzeTokenRisk(chainPairs);
        const liquidity = mainPair.liquidity?.usd || 0;
        const volume24h = mainPair.volume?.h24 || 0;
        const hasSocials = !!(mainPair.info?.websites?.length || mainPair.info?.socials?.length);
        
        return {
          network: chainIdToNetwork[chainId] || chainId.toUpperCase(),
          chainId,
          found: true,
          riskScore: score,
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
          riskFactors: factors,
          // Temp values for status calculation
          _liquidity: liquidity,
          _volume: volume24h,
          _hasSocials: hasSocials,
          _score: score,
        };
      });

      // Determine original vs bridged/suspicious
      // Original = highest liquidity + volume + has socials + good score
      // Bridged = similar token on different chain
      // Suspicious = low liquidity, no socials, poor score
      const maxLiquidity = Math.max(...resultsWithData.map(r => r._liquidity));
      const maxVolume = Math.max(...resultsWithData.map(r => r._volume));
      
      const results: NetworkResult[] = resultsWithData.map(r => {
        let tokenStatus: "original" | "bridged" | "suspicious";
        
        // Check if this is the original (highest liquidity + volume, has socials)
        const isHighestLiquidity = r._liquidity === maxLiquidity && maxLiquidity > 0;
        const hasGoodLiquidity = r._liquidity >= 10000;
        const hasGoodVolume = r._volume >= 1000;
        
        if (r._score < 30) {
          // Very low score = suspicious
          tokenStatus = "suspicious";
        } else if (isHighestLiquidity && hasGoodLiquidity && hasGoodVolume) {
          // Best metrics = original
          tokenStatus = "original";
        } else if (r._liquidity < 1000 || r._score < 40) {
          // Low liquidity or poor score = suspicious
          tokenStatus = "suspicious";
        } else {
          // Decent metrics but not the best = bridged
          tokenStatus = "bridged";
        }
        
        // Remove temp properties and add status
        const { _liquidity, _volume, _hasSocials, _score, ...rest } = r;
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

      setScanResults(results);
      
      // Auto-select original or highest liquidity result
      if (results.length > 0) {
        const original = results.find(r => r.tokenStatus === "original");
        const best = original || results.reduce((a, b) => 
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
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
        
        // Auto-trigger scan with the first extracted address - call directly instead of setTimeout
        handleScanWithAddress(firstAddress);
      } else {
        toast.warning("No contract addresses found. Try pasting manually.");
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read image file");
    };
    reader.readAsDataURL(file);
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

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(2)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    if (value >= 1) return `$${value.toFixed(2)}`;
    if (value >= 0.0001) return `$${value.toFixed(4)}`;
    return `$${value.toFixed(8)}`;
  };

  const formatPrice = (value: number) => {
    if (value >= 1) return `$${value.toFixed(2)}`;
    if (value >= 0.0001) return `$${value.toFixed(6)}`;
    return `$${value.toFixed(10)}`;
  };

  const getStatusIcon = (status: RiskFactor["status"]) => {
    switch (status) {
      case "safe": return <CheckCircle className="w-5 h-5 text-safe" />;
      case "warning": return <AlertTriangle className="w-5 h-5 text-warning" />;
      case "danger": return <XCircle className="w-5 h-5 text-danger" />;
    }
  };

  const getTokenStatusBadge = (status: "original" | "bridged" | "suspicious") => {
    switch (status) {
      case "original":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-safe/20 text-safe text-xs font-medium border border-safe/30">
            <ShieldCheck className="w-3 h-3" />
            Original
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

  const handleAddToWatchlist = () => {
    if (!selectedResult || !tokenInfo) return;
    
    addToken({
      address: selectedResult.address,
      name: tokenInfo.name,
      network: selectedResult.network as Network,
      riskScore: selectedResult.riskScore,
    });
    
    toast.success(`${tokenInfo.name} added to watchlist!`);
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
                  {suggestions.map((pair, index) => (
                    <button
                      key={`${pair.chainId}-${pair.pairAddress}-${index}`}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-primary/10 transition-colors text-left border-b border-border/20 last:border-b-0"
                      onMouseDown={() => handleSelectSuggestion(pair)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {pair.info?.imageUrl && (
                          <img 
                            src={pair.info.imageUrl} 
                            alt={pair.baseToken.symbol}
                            className="w-9 h-9 rounded-full bg-secondary ring-2 ring-border/30"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground truncate">{pair.baseToken.name}</span>
                            <span className="text-muted-foreground text-sm">({pair.baseToken.symbol})</span>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono truncate">
                            {truncateAddress(pair.baseToken.address)}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium shrink-0 ml-2">
                        {chainIdToNetwork[pair.chainId] || pair.chainId}
                      </span>
                    </button>
                  ))}
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
                      </div>
                      <div className="space-y-1.5">
                        {selectedResult.riskFactors
                          .filter(f => f.status === "danger" || f.status === "warning")
                          .slice(0, 3)
                          .map((factor, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              {factor.status === "danger" ? (
                                <XCircle className="w-3.5 h-3.5 text-danger shrink-0 mt-0.5" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                              )}
                              <span className={factor.status === "danger" ? "text-danger" : "text-warning"}>
                                {factor.name}: {factor.description}
                              </span>
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
                          .slice(0, 3)
                          .map((factor, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              <CheckCircle className="w-3.5 h-3.5 text-safe shrink-0 mt-0.5" />
                              <span className="text-safe">{factor.name}</span>
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
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-primary" />
                    <h4 className="font-display text-sm text-primary uppercase">
                      Extracted Addresses ({extractedAddresses.length})
                    </h4>
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
              {scanResults.map((result) => (
                <div
                  key={result.chainId}
                  className={cn(
                    "p-4 rounded-lg border transition-all relative",
                    result.found 
                      ? selectedResult?.chainId === result.chainId
                        ? "border-primary bg-primary/20"
                        : "border-border/50 bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50"
                      : "border-border/30 bg-secondary/10 opacity-50"
                  )}
                >
                  {/* Clickable area for selection */}
                  <button
                    onClick={() => result.found && setSelectedResult(result)}
                    disabled={!result.found}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-foreground">{result.network}</div>
                      {result.found && getTokenStatusBadge(result.tokenStatus)}
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
                  </button>
                  
                  {/* Watchlist button */}
                  {result.found && tokenInfo && (
                    <div className="mt-3 pt-3 border-t border-border/30">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          const added = addToken({
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
              ))}
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
                <p className="text-sm text-primary mb-4">
                  {selectedResult.network} Network
                </p>
                <RiskGauge score={selectedResult.riskScore} />
                
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

              {/* Risk Factors */}
              <div className="glass-card p-6">
                <h3 className="font-display text-lg text-foreground mb-4">Risk Analysis</h3>
                <div className="space-y-3">
                  {selectedResult.riskFactors.map((factor, index) => (
                    <div 
                      key={factor.name}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border/30",
                        "animate-fade-in"
                      )}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {getStatusIcon(factor.status)}
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{factor.name}</p>
                        <p className="text-sm text-muted-foreground">{factor.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

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
                          {social.type === "twitter" && <Twitter className="w-4 h-4 text-muted-foreground group-hover:text-primary" />}
                          {social.type === "telegram" && <MessageCircle className="w-4 h-4 text-muted-foreground group-hover:text-primary" />}
                          {social.type === "discord" && <Users className="w-4 h-4 text-muted-foreground group-hover:text-primary" />}
                          {!["twitter", "telegram", "discord"].includes(social.type) && <LinkIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary" />}
                          <span className="text-sm text-foreground capitalize">{social.type}</span>
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
