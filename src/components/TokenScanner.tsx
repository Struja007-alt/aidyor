import { useState, useEffect, useCallback, ClipboardEvent } from "react";
import { Clipboard, Loader2, Star, Upload, Image, X, BadgeCheck, Copy, ExternalLink } from "lucide-react";
import { Search, Scan, AlertTriangle, CheckCircle, XCircle, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NetworkBadge } from "./NetworkBadge";
import { RiskGauge } from "./RiskGauge";
import { useWatchlist } from "@/hooks/useWatchlist";
import { cn } from "@/lib/utils";
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

  const { addToken, isInWatchlist } = useWatchlist();

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
        return;
      }

      // Group pairs by chain
      const chainGroups: Record<string, DexPair[]> = {};
      pairs.forEach(pair => {
        const chain = pair.chainId;
        if (!chainGroups[chain]) chainGroups[chain] = [];
        chainGroups[chain].push(pair);
      });

      // Build results for each chain
      const results: NetworkResult[] = Object.entries(chainGroups).map(([chainId, chainPairs]) => {
        const mainPair = chainPairs[0];
        const { score, factors } = analyzeTokenRisk(chainPairs);
        
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
            volume24h: mainPair.volume?.h24 || 0,
            liquidity: mainPair.liquidity?.usd || 0,
          },
          riskFactors: factors,
        };
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
      
      // Auto-select highest liquidity result
      if (results.length > 0) {
        const best = results.reduce((a, b) => 
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

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
      toast.info("Screenshot uploaded - paste the contract address to scan");
    };
    reader.readAsDataURL(file);
  };

  const clearUpload = () => {
    setUploadedImage(null);
    setScanResults([]);
    setSelectedResult(null);
    setTokenInfo(null);
    setDisplayAddress("");
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
            Upload a screenshot, then paste the contract address you see
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
              </div>
              
              {/* Address input for screenshot mode */}
              <div className="flex gap-3">
                <Input
                  placeholder="Paste the contract address from screenshot..."
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
      {scanResults.length === 0 && !isScanning && tokenQuery && displayAddress && isContractAddress(displayAddress) && (
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
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {scanResults.map((result) => (
                <button
                  key={result.chainId}
                  onClick={() => result.found && setSelectedResult(result)}
                  disabled={!result.found}
                  className={cn(
                    "p-4 rounded-lg border transition-all relative",
                    result.found 
                      ? selectedResult?.chainId === result.chainId
                        ? "border-primary bg-primary/20"
                        : "border-border/50 bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50"
                      : "border-border/30 bg-secondary/10 opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="text-sm font-medium text-foreground mb-1">{result.network}</div>
                  {result.found && (
                    <div className="mt-1">
                      <span className={cn(
                        "font-display text-lg",
                        result.riskScore >= 70 ? "text-safe" : 
                        result.riskScore >= 40 ? "text-warning" : "text-danger"
                      )}>
                        {result.riskScore}
                      </span>
                      <span className="text-muted-foreground text-xs ml-1">/ 100</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Network Details */}
          {selectedResult && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Risk Score */}
              <div className="glass-card p-6 flex flex-col items-center justify-center">
                <h3 className="font-display text-xl text-foreground mb-1">{tokenInfo?.name}</h3>
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

              {/* Market Data */}
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
            </div>
          )}
        </div>
      )}
    </div>
  );
};
