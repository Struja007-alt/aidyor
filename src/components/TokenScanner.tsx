import { useState, useEffect, useCallback, ClipboardEvent } from "react";
import { Clipboard, Loader2 } from "lucide-react";
import { Search, Scan, Shield, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NetworkBadge } from "./NetworkBadge";
import { RiskGauge } from "./RiskGauge";
import { cn } from "@/lib/utils";

type Network = "ETH" | "BSC" | "SOL" | "POLYGON" | "AVAX";

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

const mockRiskFactors: RiskFactor[] = [
  { name: "Contract Verified", status: "safe", description: "Source code is verified on explorer" },
  { name: "Liquidity Locked", status: "safe", description: "LP tokens locked for 6 months" },
  { name: "Ownership Renounced", status: "warning", description: "Owner still has control" },
  { name: "Honeypot Check", status: "safe", description: "Token can be sold freely" },
  { name: "Tax Analysis", status: "warning", description: "Buy: 5% | Sell: 8%" },
  { name: "Holder Distribution", status: "danger", description: "Top holder owns 45%" },
];

// Mock token database for real-time search
const mockTokenDatabase: TokenSuggestion[] = [
  { name: "Pepe", symbol: "PEPE", address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933", network: "ETH" },
  { name: "Shiba Inu", symbol: "SHIB", address: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE", network: "ETH" },
  { name: "Dogecoin", symbol: "DOGE", address: "0xbA2aE424d960c26247Dd6c32edC70B295c744C43", network: "BSC" },
  { name: "Bonk", symbol: "BONK", address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", network: "SOL" },
  { name: "Floki Inu", symbol: "FLOKI", address: "0xcf0C122c6b73ff809C693DB761e7BaeBe62b6a2E", network: "ETH" },
  { name: "Wojak", symbol: "WOJAK", address: "0x5026F006B85729a8b14553FAE6af249aD16c9aaB", network: "ETH" },
  { name: "SafeMoon", symbol: "SFM", address: "0x42981d0bfbAf196529376EE702F2a9Eb9092fcB5", network: "BSC" },
  { name: "Baby Doge", symbol: "BabyDoge", address: "0xc748673057861a797275CD8A068AbB95A902e8de", network: "BSC" },
  { name: "Polygon", symbol: "MATIC", address: "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0", network: "POLYGON" },
  { name: "Avalanche", symbol: "AVAX", address: "0x85f138bfEE4ef8e540890CFb48F620571d67Eda3", network: "AVAX" },
];

export const TokenScanner = () => {
  const [tokenAddress, setTokenAddress] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<Network>("ETH");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<number | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [riskFactors, setRiskFactors] = useState<RiskFactor[]>([]);
  const [tokenName, setTokenName] = useState<string>("");
  const [suggestions, setSuggestions] = useState<TokenSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search for real-time suggestions
  const searchTokens = useCallback((query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    
    // Simulate API delay for realistic feel
    setTimeout(() => {
      const lowerQuery = query.toLowerCase();
      const filtered = mockTokenDatabase.filter(
        token =>
          token.name.toLowerCase().includes(lowerQuery) ||
          token.symbol.toLowerCase().includes(lowerQuery) ||
          token.address.toLowerCase().includes(lowerQuery)
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setIsSearching(false);
    }, 300);
  }, []);

  // Effect for real-time search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchTokens(tokenAddress);
    }, 200);

    return () => clearTimeout(timer);
  }, [tokenAddress, searchTokens]);

  const handleSelectSuggestion = (suggestion: TokenSuggestion) => {
    setTokenAddress(suggestion.address);
    setSelectedNetwork(suggestion.network);
    setTokenName(suggestion.name);
    setShowSuggestions(false);
  };

  const handleScan = () => {
    if (!tokenAddress) return;
    
    setIsScanning(true);
    setScanResult(null);
    setTokenName("");
    setMarketData(null);
    
    // Simulate scanning - derive token name from address
    setTimeout(() => {
      const mockScore = Math.floor(Math.random() * 60) + 30;
      const detectedName = getTokenNameFromAddress(tokenAddress);
      setScanResult(mockScore);
      setTokenName(detectedName);
      setRiskFactors(mockRiskFactors);
      
      // Generate mock market data
      setMarketData({
        price: Math.random() * 100,
        change24h: (Math.random() - 0.5) * 40,
        marketCap: Math.random() * 10000000000,
        volume24h: Math.random() * 500000000,
      });
      
      setIsScanning(false);
    }, 2000);
  };

  // Derive token name from address (for demo purposes)
  const getTokenNameFromAddress = (address: string): string => {
    // Check if it matches any known token
    const knownToken = mockTokenDatabase.find(
      t => t.address.toLowerCase() === address.toLowerCase()
    );
    if (knownToken) return knownToken.name;

    const addr = address.toLowerCase();
    if (addr.includes("pepe")) return "PEPE";
    if (addr.includes("shib")) return "SHIBA INU";
    if (addr.includes("doge")) return "DOGE";
    if (addr.includes("bonk")) return "BONK";
    if (addr.includes("floki")) return "FLOKI";
    if (addr.includes("wojak")) return "WOJAK";
    // Generate a mock name for unknown tokens
    const mockNames = ["Unknown Token", "MYSTERY", "TOKEN-X", "ALPHA"];
    return mockNames[Math.floor(Math.random() * mockNames.length)];
  };

  // Format address for display
  const getFormattedAddress = () => {
    return tokenAddress.length > 10 
      ? `${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`
      : tokenAddress;
  };

  // Format currency for display
  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(2)}B`;
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    } else if (value >= 1) {
      return `$${value.toFixed(2)}`;
    } else {
      return `$${value.toFixed(6)}`;
    }
  };

  const getStatusIcon = (status: RiskFactor["status"]) => {
    switch (status) {
      case "safe": return <CheckCircle className="w-5 h-5 text-safe" />;
      case "warning": return <AlertTriangle className="w-5 h-5 text-warning" />;
      case "danger": return <XCircle className="w-5 h-5 text-danger" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Network Selection */}
      <div className="glass-card p-6">
        <h3 className="font-display text-lg text-foreground mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Select Network
        </h3>
        <div className="flex flex-wrap gap-3">
          {(["ETH", "BSC", "SOL", "POLYGON", "AVAX"] as Network[]).map((network) => (
            <NetworkBadge
              key={network}
              network={network}
              selected={selectedNetwork === network}
              onClick={() => setSelectedNetwork(network)}
            />
          ))}
        </div>
      </div>

      {/* Token Address Input */}
      <div className="glass-card p-6">
        <h3 className="font-display text-lg text-foreground mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-accent" />
          Token Name or Address
        </h3>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Search token name or paste address..."
                  value={tokenAddress}
                  onChange={(e) => {
                    setTokenAddress(e.target.value);
                    setTokenName("");
                    setScanResult(null);
                  }}
                  onPaste={(e: ClipboardEvent<HTMLInputElement>) => {
                    e.preventDefault();
                    const pastedText = e.clipboardData.getData('text').trim();
                    setTokenAddress(pastedText);
                    setTokenName("");
                  }}
                  onFocus={() => tokenAddress.length >= 2 && setShowSuggestions(suggestions.length > 0)}
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
                    setTokenAddress(text.trim());
                    setTokenName("");
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
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        {suggestion.address.slice(0, 10)}...{suggestion.address.slice(-6)}
                      </p>
                    </div>
                    <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                      {suggestion.network}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Type at least 2 characters to search tokens
            </p>
          </div>
          <Button 
            onClick={handleScan}
            disabled={!tokenAddress || isScanning}
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

      {/* Scanning Animation */}
      {isScanning && (
        <div className="glass-card p-12 relative overflow-hidden">
          <div className="scan-line" />
          <div className="flex flex-col items-center justify-center">
            <Scan className="w-16 h-16 text-primary animate-scan mb-4" />
            <p className="font-display text-primary animate-pulse">ANALYZING TOKEN...</p>
          </div>
        </div>
      )}

      {/* Results */}
      {scanResult !== null && !isScanning && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Risk Score */}
            <div className="glass-card p-6 flex flex-col items-center justify-center">
              <h3 className="font-display text-2xl text-foreground mb-1">{tokenName}</h3>
              <p className="text-xs text-muted-foreground mb-1 font-mono">
                {getFormattedAddress()}
              </p>
              <p className="text-sm text-primary mb-4">
                {selectedNetwork} Network
              </p>
              <RiskGauge score={scanResult} />
            </div>

            {/* Risk Factors */}
            <div className="glass-card p-6">
              <h3 className="font-display text-lg text-foreground mb-4">Analysis Breakdown</h3>
              <div className="space-y-3">
                {riskFactors.map((factor, index) => (
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
          </div>

          {/* Market Data */}
          {marketData && (
            <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
              <h3 className="font-display text-lg text-foreground mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                Market Data
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-secondary/30 border border-border/30 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Price</p>
                  <p className="font-display text-xl text-foreground">{formatCurrency(marketData.price)}</p>
                </div>
                <div className="bg-secondary/30 border border-border/30 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">24h Change</p>
                  <p className={cn(
                    "font-display text-xl",
                    marketData.change24h >= 0 ? "text-safe" : "text-danger"
                  )}>
                    {marketData.change24h >= 0 ? '+' : ''}{marketData.change24h.toFixed(2)}%
                  </p>
                </div>
                <div className="bg-secondary/30 border border-border/30 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Market Cap</p>
                  <p className="font-display text-xl text-foreground">{formatCurrency(marketData.marketCap)}</p>
                </div>
                <div className="bg-secondary/30 border border-border/30 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Volume 24h</p>
                  <p className="font-display text-xl text-foreground">{formatCurrency(marketData.volume24h)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
