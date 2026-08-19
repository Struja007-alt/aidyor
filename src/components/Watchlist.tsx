import { useState, useEffect, forwardRef } from "react";
import { Star, Trash2, ExternalLink, RefreshCw, Loader2, Rocket, TrendingDown, AlertTriangle, LogIn, LogOut, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCloudWatchlist, WatchlistToken } from "@/hooks/useCloudWatchlist";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getTokenByAddress, analyzeTokenRisk } from "@/lib/api/dexscreener";
import { analyzePumpDump, PumpDumpAnalysis, getPumpDumpColor, getPumpDumpBg, getPumpDumpLabel } from "@/lib/api/pumpDump";
import { useNavigate } from "react-router-dom";

const getRiskColor = (score: number) => {
  if (score >= 70) return "text-safe";
  if (score >= 40) return "text-warning";
  return "text-danger";
};

const getRiskLabel = (score: number) => {
  if (score >= 70) return "Safe";
  if (score >= 40) return "Caution";
  return "Danger";
};

// Generate a one-sentence risk summary for watchlist tokens
const generateWatchlistSummary = (token: WatchlistToken, analysis?: PumpDumpAnalysis): string => {
  const { riskScore } = token;
  const riskLevel = riskScore >= 70 ? "Low risk" : riskScore >= 40 ? "Medium risk" : "High risk";
  
  // If we have pump/dump analysis, use that info
  if (analysis) {
    if (analysis.status === 'pump') {
      return `⚡ PUMP DETECTED — ${analysis.priceChange1h.toFixed(0)}% in 1h with high volume.`;
    }
    if (analysis.status === 'dump') {
      return `📉 DUMP DETECTED — ${Math.abs(analysis.priceChange1h).toFixed(0)}% drop in 1h.`;
    }
    if (analysis.status === 'pump_warning') {
      return `${riskLevel} — unusual upward momentum detected.`;
    }
    if (analysis.status === 'dump_warning') {
      return `${riskLevel} — unusual selling pressure detected.`;
    }
    
    // Use price data for context
    if (analysis.priceChange24h > 50) {
      return `${riskLevel} — up ${analysis.priceChange24h.toFixed(0)}% in 24h.`;
    }
    if (analysis.priceChange24h < -30) {
      return `${riskLevel} — down ${Math.abs(analysis.priceChange24h).toFixed(0)}% in 24h.`;
    }
  }
  
  // Default based on score
  if (riskScore >= 80) return "Low risk — strong fundamentals detected.";
  if (riskScore >= 70) return "Low risk — no major issues detected.";
  if (riskScore >= 50) return "Medium risk — some concerns, proceed with caution.";
  if (riskScore >= 40) return "Medium risk — multiple warning signs.";
  return "High risk — significant red flags detected.";
};

const getNetworkExplorer = (network: string, address: string) => {
  const explorers: Record<string, string> = {
    ETH: `https://etherscan.io/token/${address}`,
    BSC: `https://bscscan.com/token/${address}`,
    SOL: `https://solscan.io/token/${address}`,
    POLYGON: `https://polygonscan.com/token/${address}`,
    AVAX: `https://snowtrace.io/token/${address}`,
    ARB: `https://arbiscan.io/token/${address}`,
    BASE: `https://basescan.org/token/${address}`,
  };
  return explorers[network] || "#";
};


// Rescan a token using real DEXScreener API data
const rescanToken = async (token: WatchlistToken): Promise<{ token: WatchlistToken; analysis: PumpDumpAnalysis } | null> => {
  try {
    const pairs = await getTokenByAddress(token.address);
    
    if (pairs.length === 0) {
      return null;
    }
    
    const { score } = analyzeTokenRisk(pairs);
    const analysis = analyzePumpDump(pairs);
    
    return {
      token: {
        ...token,
        riskScore: score,
      },
      analysis,
    };
  } catch (error) {
    console.error("Rescan error:", error);
    return null;
  }
};

export const Watchlist = forwardRef<HTMLDivElement>((_, ref) => {
  const { watchlist, removeToken, updateToken, loading, isAuthenticated } = useCloudWatchlist();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [rescanning, setRescanning] = useState<string | null>(null);
  const [scanningAll, setScanningAll] = useState(false);
  const [analyses, setAnalyses] = useState<Record<string, PumpDumpAnalysis>>({});
  const [lastScanTime, setLastScanTime] = useState<Record<string, number>>({});
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Auto-refresh every 30 seconds when enabled
  useEffect(() => {
    if (!autoRefresh || watchlist.length === 0) return;

    const interval = setInterval(() => {
      handleScanAll();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, watchlist]);

  const handleRescan = async (token: WatchlistToken) => {
    setRescanning(token.address);
    try {
      const result = await rescanToken(token);
      if (result) {
        await updateToken(token.address, { riskScore: result.token.riskScore });
        setAnalyses(prev => ({ ...prev, [token.address]: result.analysis }));
        setLastScanTime(prev => ({ ...prev, [token.address]: Date.now() }));
        
        const diff = result.token.riskScore - token.riskScore;
        
        // Show pump/dump alerts
        if (result.analysis.status === 'pump' || result.analysis.status === 'dump') {
          toast.warning(result.analysis.alert || `${token.name}: ${getPumpDumpLabel(result.analysis.status)}`, {
            duration: 5000,
          });
        } else if (diff !== 0) {
          toast.success(`${token.name} updated: Risk score ${diff > 0 ? '+' : ''}${diff}`);
        } else {
          toast.info(`${token.name}: No changes detected`);
        }
      } else {
        toast.error(`Failed to rescan ${token.name}`);
      }
    } catch (error) {
      toast.error("Rescan failed");
    } finally {
      setRescanning(null);
    }
  };

  const handleScanAll = async () => {
    if (watchlist.length === 0) return;
    
    setScanningAll(true);
    let alerts: string[] = [];
    
    try {
      const results = await Promise.all(
        watchlist.map(token => rescanToken(token))
      );
      
      const newAnalyses: Record<string, PumpDumpAnalysis> = {};
      const newScanTimes: Record<string, number> = {};
      
      results.forEach((result, index) => {
        if (result) {
          const token = watchlist[index];
          updateToken(token.address, { riskScore: result.token.riskScore });
          newAnalyses[token.address] = result.analysis;
          newScanTimes[token.address] = Date.now();
          
          if (result.analysis.status === 'pump' || result.analysis.status === 'dump') {
            alerts.push(`${token.name}: ${result.analysis.alert || getPumpDumpLabel(result.analysis.status)}`);
          }
        }
      });
      
      setAnalyses(prev => ({ ...prev, ...newAnalyses }));
      setLastScanTime(prev => ({ ...prev, ...newScanTimes }));
      
      if (alerts.length > 0) {
        alerts.forEach(alert => {
          toast.warning(alert, { duration: 5000 });
        });
      } else {
        toast.success(`Scanned ${watchlist.length} tokens - All stable`);
      }
    } catch (error) {
      toast.error("Scan failed");
    } finally {
      setScanningAll(false);
    }
  };

  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  // Count alerts
  const alertCount = Object.values(analyses).filter(
    a => a.status === 'pump' || a.status === 'dump' || a.status === 'pump_warning' || a.status === 'dump_warning'
  ).length;

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-warning" />
          <h3 className="font-display text-lg text-foreground">Watchlist</h3>
        </div>
        <div className="text-center py-8">
          <Cloud className="w-12 h-12 text-primary/50 mx-auto mb-3" />
          <p className="text-foreground font-medium mb-2">
            Cloud Sync Enabled
          </p>
          <p className="text-muted-foreground text-sm mb-4">
            Sign in to save your watchlist and access it from any device
          </p>
          <Button onClick={() => navigate("/auth")} className="gap-2">
            <LogIn className="w-4 h-4" />
            Sign In to Continue
          </Button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-warning" />
          <h3 className="font-display text-lg text-foreground">Watchlist</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (watchlist.length === 0) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-warning" />
            <h3 className="font-display text-lg text-foreground">Watchlist</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Cloud className="w-3 h-3" />
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={signOut} className="h-7 text-xs">
              Sign Out
            </Button>
          </div>
        </div>
        <div className="text-center py-8">
          <Star className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            No tokens in your watchlist yet
          </p>
          <p className="text-muted-foreground/70 text-xs mt-1">
            Scan a token and click "Add to Watchlist" to track it
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Star className="w-5 h-5 text-warning fill-warning" />
          <h3 className="font-display text-lg text-foreground">Watchlist</h3>
          {alertCount > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-danger/20 text-danger border border-danger/40 flex items-center gap-1 animate-pulse">
              <AlertTriangle className="w-3 h-3" />
              {alertCount} Alert{alertCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <span className="hidden sm:flex text-xs text-muted-foreground items-center gap-1">
            <Cloud className="w-3 h-3" />
            Synced
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(
                "h-8 text-xs gap-1",
                autoRefresh && "bg-primary/20 text-primary"
              )}
              title={autoRefresh ? "Auto-refresh ON (30s)" : "Enable auto-refresh"}
            >
              <RefreshCw className={cn("w-3 h-3", autoRefresh && "animate-spin")} />
              Auto
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleScanAll}
              disabled={scanningAll}
              className="h-8 text-xs gap-1"
            >
              {scanningAll ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Rocket className="w-3 h-3" />
              )}
              Scan All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="h-8 w-8 p-0 sm:w-auto sm:px-3"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4 sm:hidden" />
              <span className="hidden sm:inline text-xs">Sign Out</span>
            </Button>
          </div>
        </div>
      </div>


      {/* Token List */}
      <div className="space-y-3">
        {watchlist.map((token) => {
          const analysis = analyses[token.address];
          const scanTime = lastScanTime[token.address];
          const hasPumpDumpAlert = analysis && (
            analysis.status === 'pump' || 
            analysis.status === 'dump' ||
            analysis.status === 'pump_warning' ||
            analysis.status === 'dump_warning'
          );

          return (
            <div
              key={token.address}
              className={cn(
                "rounded-lg border transition-all",
                hasPumpDumpAlert 
                  ? getPumpDumpBg(analysis.status)
                  : "bg-secondary/30 border-border/30 hover:border-border/50"
              )}
            >
              {/* Main Row */}
              <div className="flex items-center justify-between p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground truncate">
                      {token.name}
                    </span>
                    <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      {token.network}
                    </span>
                    {/* Pump/Dump Badge */}
                    {analysis && analysis.status !== 'normal' && (
                      <span 
                        className={cn(
                          "px-1.5 py-0.5 text-[10px] rounded border flex items-center gap-0.5 font-bold",
                          getPumpDumpBg(analysis.status),
                          getPumpDumpColor(analysis.status)
                        )}
                      >
                        {analysis.status === 'pump' || analysis.status === 'pump_warning' ? (
                          <Rocket className="w-2.5 h-2.5" />
                        ) : (
                          <TrendingDown className="w-2.5 h-2.5" />
                        )}
                        {getPumpDumpLabel(analysis.status)}
                      </span>
                    )}
                  </div>
                  {/* Risk Summary */}
                  <p className={cn(
                    "text-[11px] mt-1.5 leading-tight",
                    token.riskScore >= 70 ? "text-safe/70" : 
                    token.riskScore >= 40 ? "text-warning/70" : "text-danger/70"
                  )}>
                    {generateWatchlistSummary(token, analysis)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {token.address.slice(0, 8)}...{token.address.slice(-6)}
                    </p>
                    {scanTime && (
                      <span className="text-[10px] text-muted-foreground/70">
                        • {getTimeAgo(scanTime)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-3">
                  {/* Price Changes (if available) */}
                  {analysis && (
                    <div className="hidden sm:flex items-center gap-2 text-xs">
                      <div className="text-center">
                        <span className="text-muted-foreground block text-[10px]">5m</span>
                        <span className={cn(
                          "font-mono font-medium",
                          analysis.priceChange5m >= 5 ? "text-[#00ff88]" :
                          analysis.priceChange5m <= -5 ? "text-danger" :
                          "text-foreground"
                        )}>
                          {analysis.priceChange5m >= 0 ? '+' : ''}{analysis.priceChange5m.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="text-muted-foreground block text-[10px]">1h</span>
                        <span className={cn(
                          "font-mono font-medium",
                          analysis.priceChange1h >= 10 ? "text-[#00ff88]" :
                          analysis.priceChange1h <= -10 ? "text-danger" :
                          "text-foreground"
                        )}>
                          {analysis.priceChange1h >= 0 ? '+' : ''}{analysis.priceChange1h.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Risk Score */}
                  <div className="text-right">
                    <p className={cn("font-display text-sm", getRiskColor(token.riskScore))}>
                      {token.riskScore}
                    </p>
                    <p className={cn("text-xs", getRiskColor(token.riskScore))}>
                      {getRiskLabel(token.riskScore)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-primary/10"
                      onClick={() => handleRescan(token)}
                      disabled={rescanning === token.address || scanningAll}
                      aria-label={`Rescan ${token.name}`}
                      title="Rescan for pump/dump"
                    >
                      {rescanning === token.address ? (
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-primary/10"
                      onClick={() => window.open(getNetworkExplorer(token.network, token.address), "_blank")}
                      aria-label={`View ${token.name} on explorer`}
                      title="View on explorer"
                    >
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-danger/10"
                      onClick={() => removeToken(token.address)}
                      aria-label={`Remove ${token.name} from watchlist`}
                      title="Remove from watchlist"
                    >
                      <Trash2 className="w-4 h-4 text-danger" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Expanded Alert Info */}
              {analysis && analysis.alert && (
                <div className={cn(
                  "px-3 pb-3 pt-0",
                )}>
                  <div className={cn(
                    "p-2 rounded-md flex items-center gap-2 text-sm",
                    analysis.status === 'pump' ? "bg-[#00ff88]/10" :
                    analysis.status === 'dump' ? "bg-danger/10" :
                    "bg-warning/10"
                  )}>
                    <AlertTriangle className={cn("w-4 h-4 flex-shrink-0", getPumpDumpColor(analysis.status))} />
                    <span className={cn("font-medium", getPumpDumpColor(analysis.status))}>
                      {analysis.alert}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-border/30">
        <p className="text-xs text-muted-foreground mb-2">Pump/Dump Detection Legend:</p>
        <div className="flex flex-wrap gap-2 text-[10px]">
          <span className="flex items-center gap-1 px-2 py-1 rounded bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/40">
            <Rocket className="w-3 h-3" /> PUMPING
          </span>
          <span className="flex items-center gap-1 px-2 py-1 rounded bg-danger/20 text-danger border border-danger/40">
            <TrendingDown className="w-3 h-3" /> DUMPING
          </span>
          <span className="flex items-center gap-1 px-2 py-1 rounded bg-warning/20 text-warning border border-warning/40">
            <AlertTriangle className="w-3 h-3" /> WARNING
          </span>
        </div>
      </div>
    </div>
  );
});

Watchlist.displayName = "Watchlist";
