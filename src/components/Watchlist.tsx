import { Star, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/hooks/useWatchlist";
import { cn } from "@/lib/utils";

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

const getNetworkExplorer = (network: string, address: string) => {
  const explorers: Record<string, string> = {
    ETH: `https://etherscan.io/token/${address}`,
    BSC: `https://bscscan.com/token/${address}`,
    SOL: `https://solscan.io/token/${address}`,
    POLYGON: `https://polygonscan.com/token/${address}`,
    AVAX: `https://snowtrace.io/token/${address}`,
  };
  return explorers[network] || "#";
};

export const Watchlist = () => {
  const { watchlist, removeToken } = useWatchlist();

  if (watchlist.length === 0) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-warning" />
          <h3 className="font-display text-lg text-foreground">Watchlist</h3>
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-warning fill-warning" />
          <h3 className="font-display text-lg text-foreground">Watchlist</h3>
        </div>
        <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-full">
          {watchlist.length} token{watchlist.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-3">
        {watchlist.map((token) => (
          <div
            key={token.address}
            className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30 hover:border-border/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground truncate">
                  {token.name}
                </span>
                <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  {token.network}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-1 truncate">
                {token.address.slice(0, 8)}...{token.address.slice(-6)}
              </p>
            </div>

            <div className="flex items-center gap-3 ml-3">
              <div className="text-right">
                <p className={cn("font-display text-sm", getRiskColor(token.riskScore))}>
                  {token.riskScore}
                </p>
                <p className={cn("text-xs", getRiskColor(token.riskScore))}>
                  {getRiskLabel(token.riskScore)}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-primary/10"
                  onClick={() => window.open(getNetworkExplorer(token.network, token.address), "_blank")}
                  title="View on explorer"
                >
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-danger/10"
                  onClick={() => removeToken(token.address)}
                  title="Remove from watchlist"
                >
                  <Trash2 className="w-4 h-4 text-danger" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
