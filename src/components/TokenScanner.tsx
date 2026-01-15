import { useState, useEffect, useCallback, ClipboardEvent } from "react";
import { Clipboard, Loader2, Star, Upload, Image, X } from "lucide-react";
import { Search, Scan, AlertTriangle, CheckCircle, XCircle, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NetworkBadge } from "./NetworkBadge";
import { RiskGauge } from "./RiskGauge";
import { useWatchlist } from "@/hooks/useWatchlist";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type Network = "ETH" | "BSC" | "SOL" | "POLYGON" | "AVAX";

type ScanMode = "address" | "screenshot";

interface RiskFactor {
  name: string;
  status: "safe" | "warning" | "danger";
  description: string;
}

interface MarketData {
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
}

interface TokenSuggestion {
  name: string;
  symbol: string;
  address: string;
  network: Network;
}

interface NetworkResult {
  network: Network;
  found: boolean;
  riskScore: number;
  marketData: MarketData | null;
  riskFactors: RiskFactor[];
  address: string;
}

const mockRiskFactors: RiskFactor[] = [
  { name: "Contract Verified", status: "safe", description: "Source code is verified on explorer" },
  { name: "Liquidity Locked", status: "safe", description: "LP tokens locked for 6 months" },
  { name: "Ownership Renounced", status: "warning", description: "Owner still has control" },
  { name: "Honeypot Check", status: "safe", description: "Token can be sold freely" },
  { name: "Tax Analysis", status: "warning", description: "Buy: 5% | Sell: 8%" },
  { name: "Holder Distribution", status: "danger", description: "Top holder owns 45%" },
];

// Mock token database for real-time search - tokens exist on multiple networks
const mockTokenDatabase: TokenSuggestion[] = [
  { name: "Pepe", symbol: "PEPE", address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933", network: "ETH" },
  { name: "Pepe", symbol: "PEPE", address: "0x25d887Ce7a35172C62FeBFD67a1856F20FaEbB00", network: "BSC" },
  { name: "Shiba Inu", symbol: "SHIB", address: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE", network: "ETH" },
  { name: "Shiba Inu", symbol: "SHIB", address: "0x2859e4544C4bB03966803b044A93563Bd2D0DD4D", network: "BSC" },
  { name: "Dogecoin", symbol: "DOGE", address: "0xbA2aE424d960c26247Dd6c32edC70B295c744C43", network: "BSC" },
  { name: "Bonk", symbol: "BONK", address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", network: "SOL" },
  { name: "Floki Inu", symbol: "FLOKI", address: "0xcf0C122c6b73ff809C693DB761e7BaeBe62b6a2E", network: "ETH" },
  { name: "Floki Inu", symbol: "FLOKI", address: "0xfb5B838b6cfEEdC2873aB27866079AC55363D37E", network: "BSC" },
  { name: "Wojak", symbol: "WOJAK", address: "0x5026F006B85729a8b14553FAE6af249aD16c9aaB", network: "ETH" },
  { name: "SafeMoon", symbol: "SFM", address: "0x42981d0bfbAf196529376EE702F2a9Eb9092fcB5", network: "BSC" },
  { name: "Baby Doge", symbol: "BabyDoge", address: "0xc748673057861a797275CD8A068AbB95A902e8de", network: "BSC" },
  { name: "Polygon", symbol: "MATIC", address: "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0", network: "ETH" },
  { name: "Polygon", symbol: "MATIC", address: "0x0000000000000000000000000000000000001010", network: "POLYGON" },
  { name: "Avalanche", symbol: "AVAX", address: "0x85f138bfEE4ef8e540890CFb48F620571d67Eda3", network: "BSC" },
  { name: "Avalanche", symbol: "AVAX", address: "FvwEAhmxKfeiG8SnEvq42hc6whRyY3EFYAvebMqDNDGC", network: "AVAX" },
];

const ALL_NETWORKS: Network[] = ["ETH", "BSC", "SOL", "POLYGON", "AVAX"];

export const TokenScanner = () => {
  const [scanMode, setScanMode] = useState<ScanMode>("address");
  const [tokenQuery, setTokenQuery] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<NetworkResult[]>([]);
  const [tokenName, setTokenName] = useState<string>("");
  const [tokenSymbol, setTokenSymbol] = useState<string>("");
  const [suggestions, setSuggestions] = useState<TokenSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState<NetworkResult | null>(null);
  
  // Screenshot state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Debounced search for real-time suggestions
  const searchTokens = useCallback((query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    
    setTimeout(() => {
      const lowerQuery = query.toLowerCase();
      const filtered = mockTokenDatabase.filter(
        token =>
          token.name.toLowerCase().includes(lowerQuery) ||
          token.symbol.toLowerCase().includes(lowerQuery)
      );
      
      const uniqueTokens = filtered.reduce((acc, token) => {
        const key = `${token.name}-${token.symbol}`;
        if (!acc.find(t => `${t.name}-${t.symbol}` === key)) {
          acc.push(token);
        }
        return acc;
      }, [] as TokenSuggestion[]);
      
      setSuggestions(uniqueTokens);
      setShowSuggestions(uniqueTokens.length > 0);
      setIsSearching(false);
    }, 300);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchTokens(tokenQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [tokenQuery, searchTokens]);

  const handleSelectSuggestion = (suggestion: TokenSuggestion) => {
    setTokenQuery(suggestion.name);
    setTokenName(suggestion.name);
    setTokenSymbol(suggestion.symbol);
    setShowSuggestions(false);
  };

  // Scan across ALL networks for the token
  const handleScan = async () => {
    if (!tokenQuery) return;
    
    setIsScanning(true);
    setScanResults([]);
    setSelectedResult(null);
    
    const lowerQuery = tokenQuery.toLowerCase();
    const matchingTokens = mockTokenDatabase.filter(
      token =>
        token.name.toLowerCase().includes(lowerQuery) ||
        token.symbol.toLowerCase().includes(lowerQuery) ||
        token.address.toLowerCase() === lowerQuery
    );

    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const results: NetworkResult[] = ALL_NETWORKS.map(network => {
      const tokenOnNetwork = matchingTokens.find(t => t.network === network);
      
      if (tokenOnNetwork) {
        const riskScore = Math.floor(Math.random() * 60) + 30;
        return {
          network,
          found: true,
          riskScore,
          address: tokenOnNetwork.address,
          marketData: {
            price: Math.random() * 100,
            change24h: (Math.random() - 0.5) * 40,
            marketCap: Math.random() * 10000000000,
            volume24h: Math.random() * 500000000,
          },
          riskFactors: mockRiskFactors.map(f => ({
            ...f,
            status: Math.random() > 0.7 ? "warning" : Math.random() > 0.5 ? "safe" : f.status,
          })) as RiskFactor[],
        };
      }
      
      return { network, found: false, riskScore: 0, marketData: null, riskFactors: [], address: "" };
    });

    if (matchingTokens.length > 0) {
      setTokenName(matchingTokens[0].name);
      setTokenSymbol(matchingTokens[0].symbol);
    } else {
      setTokenName(tokenQuery);
      setTokenSymbol("");
    }

    setScanResults(results);
    
    const foundResults = results.filter(r => r.found);
    if (foundResults.length > 0) {
      const safest = foundResults.reduce((a, b) => a.riskScore > b.riskScore ? a : b);
      setSelectedResult(safest);
    }
    
    setIsScanning(false);
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
      analyzeScreenshot();
    };
    reader.readAsDataURL(file);
  };

  const analyzeScreenshot = () => {
    setIsScanning(true);
    setScanResults([]);
    setSelectedResult(null);
    
    setTimeout(() => {
      // Randomly select a token for demo purposes
      const randomToken = mockTokenDatabase[Math.floor(Math.random() * mockTokenDatabase.length)];
      const riskScore = Math.floor(Math.random() * 60) + 30;
      
      setTokenName(randomToken.name);
      setTokenSymbol(randomToken.symbol);
      
      const results: NetworkResult[] = ALL_NETWORKS.map(network => {
        if (network === randomToken.network) {
          return {
            network,
            found: true,
            riskScore,
            address: randomToken.address,
            marketData: {
              price: Math.random() * 100,
              change24h: (Math.random() - 0.5) * 40,
              marketCap: Math.random() * 10000000000,
              volume24h: Math.random() * 500000000,
            },
            riskFactors: mockRiskFactors.map(f => ({
              ...f,
              status: Math.random() > 0.7 ? "warning" : Math.random() > 0.5 ? "safe" : f.status,
            })) as RiskFactor[],
          };
        }
        return { network, found: false, riskScore: 0, marketData: null, riskFactors: [], address: "" };
      });

      setScanResults(results);
      const foundResult = results.find(r => r.found);
      if (foundResult) {
        setSelectedResult(foundResult);
      }
      
      setIsScanning(false);
    }, 2500);
  };

  const clearUpload = () => {
    setUploadedImage(null);
    setScanResults([]);
    setSelectedResult(null);
    setTokenName("");
    setTokenSymbol("");
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(2)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    if (value >= 1) return `$${value.toFixed(2)}`;
    return `$${value.toFixed(6)}`;
  };

  const getStatusIcon = (status: RiskFactor["status"]) => {
    switch (status) {
      case "safe": return <CheckCircle className="w-5 h-5 text-safe" />;
      case "warning": return <AlertTriangle className="w-5 h-5 text-warning" />;
      case "danger": return <XCircle className="w-5 h-5 text-danger" />;
    }
  };

  const foundNetworks = scanResults.filter(r => r.found);
  
  const { addToken, isInWatchlist } = useWatchlist();

  const handleAddToWatchlist = () => {
    if (!selectedResult || !tokenName) return;
    
    addToken({
      address: selectedResult.address,
      name: tokenName,
      network: selectedResult.network,
      riskScore: selectedResult.riskScore,
    });
    
    toast.success(`${tokenName} added to watchlist!`);
  };

  const resetScan = () => {
    setScanResults([]);
    setSelectedResult(null);
    setTokenName("");
    setTokenSymbol("");
    setTokenQuery("");
    setUploadedImage(null);
  };

  return (
    <div className="space-y-6">
      {/* Scan Mode Selector */}
      <div className="glass-card p-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => { setScanMode("address"); resetScan(); }}
            className={cn(
              "flex items-center justify-center gap-3 p-4 rounded-lg font-display text-sm transition-all",
              scanMode === "address"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            )}
          >
            <Clipboard className="w-5 h-5" />
            Paste Token Address
          </button>
          <button
            onClick={() => { setScanMode("screenshot"); resetScan(); }}
            className={cn(
              "flex items-center justify-center gap-3 p-4 rounded-lg font-display text-sm transition-all",
              scanMode === "screenshot"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            )}
          >
            <Upload className="w-5 h-5" />
            Upload Screenshot
          </button>
        </div>
      </div>

      {/* Paste Token Address Mode */}
      {scanMode === "address" && (
        <div className="glass-card p-6 animate-fade-in">
          <h3 className="font-display text-lg text-foreground mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Multi-Chain Token Search
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Paste a token address or name to scan all networks automatically
          </p>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Paste token address or name..."
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
                    }}
                    onFocus={() => tokenQuery.length >= 2 && setShowSuggestions(suggestions.length > 0)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="flex-1 bg-secondary/50 border-border/50 focus:border-primary/50 h-12 text-foreground placeholder:text-muted-foreground pr-10"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      setTokenQuery(text.trim());
                    } catch (err) {
                      console.error('Failed to read clipboard');
                    }
                  }}
                  className="h-12 px-3 border-border/50 hover:bg-secondary/50"
                  title="Paste from clipboard"
                >
                  <Clipboard className="w-5 h-5" />
                </Button>
              </div>
              
              {/* Real-time Suggestions Dropdown */}
              {showSuggestions && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border/50 rounded-lg shadow-xl overflow-hidden">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-primary/10 transition-colors text-left border-b border-border/30 last:border-b-0"
                      onMouseDown={() => handleSelectSuggestion(suggestion)}
                    >
                      <div>
                        <span className="font-medium text-foreground">{suggestion.name}</span>
                        <span className="text-muted-foreground ml-2">({suggestion.symbol})</span>
                      </div>
                      <Search className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Scans ETH, BSC, SOL, POLYGON, AVAX networks automatically
              </p>
            </div>
            <Button 
              onClick={handleScan}
              disabled={!tokenQuery || isScanning}
              className="h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-display"
            >
              {isScanning ? (
                <Scan className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Scan className="w-5 h-5 mr-2" />
                  SCAN
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Upload Screenshot Mode */}
      {scanMode === "screenshot" && (
        <div className="glass-card p-6 animate-fade-in">
          <h3 className="font-display text-lg text-foreground mb-4 flex items-center gap-2">
            <Image className="w-5 h-5 text-primary" />
            Screenshot Analyzer
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload a token transfer screenshot for automatic analysis
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
              {scanMode === "screenshot" ? "ANALYZING IMAGE..." : "SCANNING ALL NETWORKS..."}
            </p>
            <div className="flex gap-2 mt-4">
              {ALL_NETWORKS.map((network) => (
                <NetworkBadge key={network} network={network} selected={false} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No Results Found */}
      {scanResults.length > 0 && !isScanning && foundNetworks.length === 0 && (
        <div className="glass-card p-8 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-warning/10 border border-warning/30 flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-warning" />
          </div>
          <h3 className="font-display text-xl text-foreground mb-2">Token Not Found</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            We couldn't find "<span className="text-foreground font-medium">{tokenQuery}</span>" on any supported network.
          </p>
          <div className="bg-secondary/30 border border-border/30 rounded-lg p-4 max-w-md mx-auto">
            <h4 className="text-sm font-medium text-foreground mb-2 flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Suggestions
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1 text-left">
              <li>• Double-check the contract address for typos</li>
              <li>• Ensure you're using the correct network's address</li>
              <li>• Try searching by token name or symbol</li>
              <li>• The token may be too new or not yet indexed</li>
            </ul>
          </div>
          <Button
            onClick={resetScan}
            variant="outline"
            className="mt-6"
          >
            Try Another Search
          </Button>
        </div>
      )}

      {/* Results */}
      {scanResults.length > 0 && !isScanning && foundNetworks.length > 0 && (
        <div className="space-y-6 animate-fade-in">
          {/* Network Results Overview */}
          <div className="glass-card p-6">
            <h3 className="font-display text-2xl text-foreground mb-2">
              {tokenName} {tokenSymbol && <span className="text-muted-foreground">({tokenSymbol})</span>}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Found on {foundNetworks.length} network{foundNetworks.length !== 1 ? 's' : ''}
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {scanResults.map((result) => (
                <button
                  key={result.network}
                  onClick={() => result.found && setSelectedResult(result)}
                  disabled={!result.found}
                  className={cn(
                    "p-4 rounded-lg border transition-all",
                    result.found 
                      ? selectedResult?.network === result.network
                        ? "border-primary bg-primary/20"
                        : "border-border/50 bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50"
                      : "border-border/30 bg-secondary/10 opacity-50 cursor-not-allowed"
                  )}
                >
                  <NetworkBadge network={result.network} selected={result.found} />
                  {result.found ? (
                    <div className="mt-2">
                      <span className={cn(
                        "font-display text-lg",
                        result.riskScore >= 70 ? "text-safe" : 
                        result.riskScore >= 40 ? "text-warning" : "text-danger"
                      )}>
                        {result.riskScore}
                      </span>
                      <span className="text-muted-foreground text-xs ml-1">/ 100</span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-2">Not found</p>
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
                <h3 className="font-display text-xl text-foreground mb-1">{tokenName}</h3>
                <p className="text-sm text-primary mb-4">
                  {selectedResult.network} Network
                </p>
                <RiskGauge score={selectedResult.riskScore} />
                
                {/* Add to Watchlist Button */}
                <Button
                  onClick={handleAddToWatchlist}
                  disabled={isInWatchlist(selectedResult.address)}
                  variant="outline"
                  className="mt-4 gap-2"
                >
                  <Star className={cn("w-4 h-4", isInWatchlist(selectedResult.address) && "fill-warning text-warning")} />
                  {isInWatchlist(selectedResult.address) ? "In Watchlist" : "Add to Watchlist"}
                </Button>
              </div>

              {/* Risk Factors */}
              <div className="glass-card p-6">
                <h3 className="font-display text-lg text-foreground mb-4">Analysis Breakdown</h3>
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
                  <h3 className="font-display text-lg text-foreground mb-4">Market Data</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-secondary/30 border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1">Price</p>
                      <p className="font-display text-lg text-foreground">
                        {formatCurrency(selectedResult.marketData.price)}
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
