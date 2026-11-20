import { useCallback, useEffect, useState } from "react";
import { History, RefreshCw, ExternalLink, Trash2, Loader2, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { onScanHistoryChange } from "@/lib/scanHistory";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  network: string;
  address: string;
  symbol: string | null;
  score: number | null;
  scanned_at: string;
};

const scoreColor = (s: number | null) =>
  s === null ? "text-muted-foreground" : s >= 70 ? "text-safe" : s >= 40 ? "text-warning" : "text-danger";

const scoreLabel = (s: number | null) =>
  s === null ? "–" : s >= 70 ? "Low Risk" : s >= 40 ? "Caution" : "Danger";

const explorer = (network: string, address: string) => {
  const map: Record<string, string> = {
    ETH: `https://etherscan.io/token/${address}`,
    BSC: `https://bscscan.com/token/${address}`,
    SOL: `https://solscan.io/token/${address}`,
    POLYGON: `https://polygonscan.com/token/${address}`,
    AVAX: `https://snowtrace.io/token/${address}`,
    ARB: `https://arbiscan.io/token/${address}`,
    BASE: `https://basescan.org/token/${address}`,
  };
  return map[network] || "#";
};

const timeAgo = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export const ScanHistory = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("scan_history")
      .select("id, network, address, symbol, score, scanned_at")
      .order("scanned_at", { ascending: false })
      .limit(50);
    if (!error && data) setRows(data as Row[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setRows([]);
      return;
    }
    load();
    return onScanHistoryChange(load);
  }, [user, load]);

  const remove = async (id: string) => {
    setRows((r) => r.filter((x) => x.id !== id));
    await supabase.from("scan_history").delete().eq("id", id);
  };

  // Full rescan: reload the scanner with this token (TokenScanner reads these params on mount).
  const rescan = (r: Row) => {
    window.location.assign(`/?address=${encodeURIComponent(r.address)}&chain=${r.network.toLowerCase()}#scanner`);
  };

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="glass-card p-6 text-center">
        <History className="w-10 h-10 text-primary/50 mx-auto mb-3" />
        <p className="text-foreground font-medium mb-1">Your scan history</p>
        <p className="text-muted-foreground text-sm mb-4">Sign in to keep every token you scan.</p>
        <Button onClick={() => navigate("/auth")} className="gap-2">
          <LogIn className="w-4 h-4" />
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-primary" />
        <h3 className="font-display text-lg text-foreground">Scan History</h3>
        {rows.length > 0 && <span className="text-xs text-muted-foreground">({rows.length})</span>}
      </div>

      {loading && rows.length === 0 ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          No scans yet. Scan a token and it will appear here.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-secondary/30 border-border/30"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-foreground truncate">
                    {r.symbol || `${r.address.slice(0, 6)}…`}
                  </span>
                  <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">{r.network}</span>
                </div>
                <p className="text-xs text-muted-foreground font-mono truncate mt-1">
                  {r.address.slice(0, 8)}...{r.address.slice(-6)} • {timeAgo(r.scanned_at)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={cn("font-display text-sm", scoreColor(r.score))}>{r.score ?? "–"}</p>
                <p className={cn("text-xs", scoreColor(r.score))}>{scoreLabel(r.score)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => rescan(r)} aria-label="Rescan" title="Full rescan">
                  <RefreshCw className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => window.open(explorer(r.network, r.address), "_blank")}
                  aria-label="View on explorer"
                  title="View on explorer"
                >
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-danger/10" onClick={() => remove(r.id)} aria-label="Remove" title="Remove">
                  <Trash2 className="w-4 h-4 text-danger" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground/70 mt-4">
        Scores are from the full scan at the time shown. Rescan for a fresh result (uses one scan).
      </p>
    </div>
  );
};
