import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { History, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getLocalScans, onScanHistoryChange, type Scan } from "@/lib/scanHistory";

interface Props {
  isSignedIn: boolean;
  isPro: boolean;
  canScan: boolean;
  remainingScans: number;
}

const scoreColor = (s?: number) =>
  s === undefined ? "text-muted-foreground" : s >= 70 ? "text-safe" : s >= 40 ? "text-warning" : "text-danger";

export const ScanHistoryCard = ({ isSignedIn, isPro, canScan, remainingScans }: Props) => {
  const [scans, setScans] = useState<Scan[]>(() => getLocalScans());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const refresh = () => setScans(getLocalScans());
    refresh();
    return onScanHistoryChange(refresh);
  }, []);

  if (isSignedIn || isPro || dismissed || scans.length === 0) return null;

  const limitHit = !canScan || remainingScans === 0;
  const preview = scans.slice(0, 3);

  return (
    <div className="glass-card p-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <History className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            Your scans ({scans.length})
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
            {preview.map((s) => (
              <span key={`${s.network}-${s.address}`} className="text-xs text-muted-foreground">
                {s.symbol || `${s.address.slice(0, 6)}…`}{" "}
                <span className={cn("font-mono", scoreColor(s.score))}>{s.score ?? "–"}</span>
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {limitHit
              ? "Sign in to keep this list and get more scans."
              : `${remainingScans} free scan${remainingScans !== 1 ? "s" : ""} left today. Sign in to keep this list across devices.`}
          </p>
          <Button asChild size="sm" className="mt-3 h-8 text-xs">
            <Link to="/auth">Sign in to keep this list</Link>
          </Button>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
