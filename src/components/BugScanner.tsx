import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Bug, Loader2, ShieldCheck, ShieldAlert, Lock, Sparkles, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStripeSubscription } from "@/hooks/useStripeSubscription";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Finding {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  description: string;
  remediation: string;
  line?: number;
  snippet?: string;
}

interface ScanResult {
  chain: string;
  address: string;
  verified: boolean;
  contractName: string;
  compiler?: string;
  summary: string;
  findings: Finding[];
  riskScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  label: string;
  engines: { static: boolean; ai: boolean };
}

const CHAINS = [
  { value: "ethereum", label: "Ethereum" },
  { value: "bsc", label: "BNB Chain" },
  { value: "polygon", label: "Polygon" },
  { value: "arbitrum", label: "Arbitrum" },
  { value: "base", label: "Base" },
  { value: "avalanche", label: "Avalanche" },
  { value: "optimism", label: "Optimism" },
  { value: "fantom", label: "Fantom" },
  { value: "solana", label: "Solana (limited)" },
];

const SEVERITY_STYLES: Record<Finding["severity"], string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/40",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/40",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/40",
  low: "bg-blue-500/15 text-blue-400 border-blue-500/40",
  info: "bg-muted text-muted-foreground border-border",
};

const GRADE_COLOR: Record<ScanResult["grade"], string> = {
  A: "text-emerald-400",
  B: "text-lime-400",
  C: "text-yellow-400",
  D: "text-orange-400",
  F: "text-red-500",
};

export function BugScanner() {
  const { user, session } = useAuth();
  const { isPro, isWhalePro } = useStripeSubscription();
  const hasAccess = isPro || isWhalePro;

  const [address, setAddress] = useState("");
  const [chain, setChain] = useState("ethereum");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  const runScan = async () => {
    if (!user || !session) {
      toast.error("Sign in to use the bug scanner");
      return;
    }
    if (!hasAccess) {
      toast.error("Upgrade to Pro to run smart-contract audits");
      return;
    }
    if (!address.trim()) {
      toast.error("Enter a contract address");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("bug-scanner", {
        body: { address: address.trim(), chain },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.error === "PRO_REQUIRED") {
        toast.error(data.message ?? "Pro required");
        return;
      }
      if (data?.error) {
        toast.error(data.message ?? data.error);
        return;
      }
      setResult(data as ScanResult);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Scan failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-card p-6 space-y-5 border-primary/20">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full" />
            <Bug className="relative w-7 h-7 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              Smart Contract Bug Scanner
              <Badge className="bg-gradient-to-r from-primary to-accent text-primary-foreground border-0 text-[10px] tracking-wider">
                <Sparkles className="w-3 h-3 mr-1" /> PRO
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground">
              Pre-audit scanner — reentrancy, overflow, access control & honeypot patterns. Static + AI dual-engine.
            </p>
          </div>
        </div>
        {!hasAccess && (
          <Link to="/subscription">
            <Button size="sm" className="gap-1">
              <Lock className="w-3.5 h-3.5" /> Unlock with Pro
            </Button>
          </Link>
        )}
      </div>

      {/* Form */}
      <div className={!hasAccess ? "opacity-50 pointer-events-none" : undefined}>
        <div className="flex flex-col md:flex-row gap-2">
          <Select value={chain} onValueChange={setChain} disabled={loading || !hasAccess}>
            <SelectTrigger className="md:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHAINS.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="0x… contract address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={loading || !hasAccess}
            className="font-mono"
          />
          <Button onClick={runScan} disabled={loading || !hasAccess} className="md:w-40">
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Auditing…</>
            ) : (
              <><Bug className="w-4 h-4" /> Run Audit</>
            )}
          </Button>
        </div>
      </div>

      {/* Locked preview */}
      {!hasAccess && !result && (
        <div className="relative rounded-lg border border-border/50 bg-secondary/30 p-6 text-center overflow-hidden">
          <div className="absolute inset-0 backdrop-blur-[2px]" />
          <div className="relative space-y-2">
            <Lock className="w-8 h-8 text-primary mx-auto" />
            <p className="font-display text-foreground">Pro-only feature</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Get unlimited smart-contract bug scans across 8 EVM chains + Solana for <strong>$9.99/mo</strong>.
              Catches critical bugs like reentrancy, overflow, access-control flaws and honeypot logic before you ape in.
            </p>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border/50 bg-secondary/30 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Contract</p>
              <p className="font-mono text-sm text-foreground break-all">{result.contractName} · {result.address.slice(0, 10)}…{result.address.slice(-6)}</p>
              {result.compiler && <p className="text-[11px] text-muted-foreground mt-0.5">Compiler: {result.compiler}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Security Score</p>
              <p className={`font-display text-3xl font-bold ${GRADE_COLOR[result.grade]}`}>
                {result.riskScore}<span className="text-base ml-1">/100 · {result.grade}</span>
              </p>
              <p className={`text-xs font-semibold ${GRADE_COLOR[result.grade]}`}>{result.label}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {result.engines.static && (
              <Badge variant="outline" className="border-primary/40 text-primary">Static engine</Badge>
            )}
            {result.engines.ai && (
              <Badge variant="outline" className="border-accent/40 text-accent">AI deep audit (Gemini 3.1 Pro)</Badge>
            )}
            {result.verified ? (
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 gap-1">
                <ShieldCheck className="w-3 h-3" /> Source verified
              </Badge>
            ) : (
              <Badge variant="outline" className="border-red-500/40 text-red-400 gap-1">
                <ShieldAlert className="w-3 h-3" /> Unverified
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground italic border-l-2 border-primary/40 pl-3">
            {result.summary}
          </p>

          {result.findings.length === 0 ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-emerald-400 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> No bug patterns detected. Still DYOR — automated scans can miss novel exploits.
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {result.findings.length} finding{result.findings.length === 1 ? "" : "s"}
              </p>
              {result.findings.map((f) => (
                <div key={f.id} className={`rounded-lg border p-3 space-y-1.5 ${SEVERITY_STYLES[f.severity]}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{f.title}</p>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] uppercase border-current">{f.severity}</Badge>
                      <Badge variant="outline" className="text-[10px] border-current">{f.category}</Badge>
                    </div>
                  </div>
                  <p className="text-xs opacity-90">{f.description}</p>
                  {f.snippet && (
                    <pre className="text-[11px] font-mono bg-background/40 rounded px-2 py-1 overflow-x-auto">
                      {f.line ? `L${f.line}: ` : ""}{f.snippet}
                    </pre>
                  )}
                  <p className="text-xs">
                    <span className="font-semibold">Fix:</span> {f.remediation}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end">
            <a
              href={evmExplorer(result.chain, result.address)}
              target="_blank" rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              View on explorer <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </Card>
  );
}

function evmExplorer(chain: string, address: string): string {
  const map: Record<string, string> = {
    ethereum: `https://etherscan.io/address/${address}`,
    bsc: `https://bscscan.com/address/${address}`,
    polygon: `https://polygonscan.com/address/${address}`,
    arbitrum: `https://arbiscan.io/address/${address}`,
    base: `https://basescan.org/address/${address}`,
    avalanche: `https://snowtrace.io/address/${address}`,
    optimism: `https://optimistic.etherscan.io/address/${address}`,
    fantom: `https://ftmscan.com/address/${address}`,
    solana: `https://solscan.io/account/${address}`,
  };
  return map[chain] ?? `https://etherscan.io/address/${address}`;
}