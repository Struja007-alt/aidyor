import { useState } from "react";
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

const mockRiskFactors: RiskFactor[] = [
  { name: "Contract Verified", status: "safe", description: "Source code is verified on explorer" },
  { name: "Liquidity Locked", status: "safe", description: "LP tokens locked for 6 months" },
  { name: "Ownership Renounced", status: "warning", description: "Owner still has control" },
  { name: "Honeypot Check", status: "safe", description: "Token can be sold freely" },
  { name: "Tax Analysis", status: "warning", description: "Buy: 5% | Sell: 8%" },
  { name: "Holder Distribution", status: "danger", description: "Top holder owns 45%" },
];

export const TokenScanner = () => {
  const [tokenAddress, setTokenAddress] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<Network>("ETH");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<number | null>(null);
  const [riskFactors, setRiskFactors] = useState<RiskFactor[]>([]);

  const handleScan = () => {
    if (!tokenAddress) return;
    
    setIsScanning(true);
    setScanResult(null);
    
    // Simulate scanning
    setTimeout(() => {
      const mockScore = Math.floor(Math.random() * 60) + 30;
      setScanResult(mockScore);
      setRiskFactors(mockRiskFactors);
      setIsScanning(false);
    }, 2000);
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
          Token Address
        </h3>
        <div className="flex gap-3">
          <Input
            placeholder="Enter token contract address..."
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            className="flex-1 bg-secondary/50 border-border/50 focus:border-primary/50 h-12 text-foreground placeholder:text-muted-foreground"
          />
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
        <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
          {/* Risk Score */}
          <div className="glass-card p-6 flex flex-col items-center justify-center">
            <h3 className="font-display text-lg text-foreground mb-6">Risk Score</h3>
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
      )}
    </div>
  );
};
