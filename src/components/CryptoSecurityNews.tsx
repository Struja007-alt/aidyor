import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertTriangle, 
  Shield, 
  ExternalLink, 
  Clock, 
  RefreshCw,
  Skull,
  Bug,
  Coins,
  TrendingDown
} from "lucide-react";

interface SecurityAlert {
  id: string;
  title: string;
  summary: string;
  severity: "critical" | "high" | "medium" | "info";
  category: "scam" | "hack" | "vulnerability" | "rugpull" | "warning";
  timestamp: Date;
  source?: string;
  link?: string;
}

// Curated security alerts - in production, this would come from an API
const securityAlerts: SecurityAlert[] = [
  {
    id: "1",
    title: "Fake Airdrop Scam Targeting Solana Users",
    summary: "Scammers are sending fake SOL airdrops that drain wallets when users interact with malicious contracts. Never approve transactions from unknown sources.",
    severity: "critical",
    category: "scam",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    source: "Community Report"
  },
  {
    id: "2", 
    title: "New Honeypot Pattern Detected on BSC",
    summary: "Multiple tokens using a new tax manipulation technique that prevents selling after purchase. Always verify sell functionality before investing.",
    severity: "high",
    category: "warning",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    source: "AIDYOR Analysis"
  },
  {
    id: "3",
    title: "DeFi Protocol Exploit - $2.1M Drained",
    summary: "Flash loan attack exploited a price oracle vulnerability. Users advised to revoke approvals for affected contracts.",
    severity: "critical",
    category: "hack",
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
    source: "On-chain Analysis"
  },
  {
    id: "4",
    title: "Rug Pull Alert: MOONX Token",
    summary: "Developer wallet removed all liquidity after 48 hours. Token is now worthless. Always check liquidity locks before investing.",
    severity: "high",
    category: "rugpull",
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
    source: "RugCheck"
  },
  {
    id: "5",
    title: "Phishing Site Mimicking Popular DEX",
    summary: "Fake website using similar domain to major DEX stealing wallet credentials. Always verify URLs and bookmark official sites.",
    severity: "critical",
    category: "scam",
    timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000),
    source: "Security Team"
  },
  {
    id: "6",
    title: "Smart Contract Vulnerability in ERC-20 Template",
    summary: "Common token template contains reentrancy vulnerability. Developers should audit contracts before deployment.",
    severity: "medium",
    category: "vulnerability",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    source: "Audit Report"
  },
  {
    id: "7",
    title: "Whale Manipulation Warning on Low-Cap Tokens",
    summary: "Increased whale activity causing artificial pumps followed by dumps. Exercise caution with tokens under $100K market cap.",
    severity: "medium",
    category: "warning",
    timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000),
    source: "Market Analysis"
  },
  {
    id: "8",
    title: "Telegram Impersonation Scams Rising",
    summary: "Scammers impersonating project admins in Telegram groups. Official admins will never DM first or ask for funds.",
    severity: "high",
    category: "scam",
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
    source: "Community Report"
  }
];

const severityConfig = {
  critical: {
    color: "bg-destructive text-destructive-foreground",
    icon: Skull,
    label: "Critical"
  },
  high: {
    color: "bg-warning text-warning-foreground",
    icon: AlertTriangle,
    label: "High"
  },
  medium: {
    color: "bg-accent text-accent-foreground",
    icon: Shield,
    label: "Medium"
  },
  info: {
    color: "bg-muted text-muted-foreground",
    icon: Shield,
    label: "Info"
  }
};

const categoryConfig = {
  scam: { icon: AlertTriangle, label: "Scam Alert", color: "text-destructive" },
  hack: { icon: Bug, label: "Hack", color: "text-destructive" },
  vulnerability: { icon: Bug, label: "Vulnerability", color: "text-warning" },
  rugpull: { icon: TrendingDown, label: "Rug Pull", color: "text-destructive" },
  warning: { icon: Coins, label: "Warning", color: "text-warning" }
};

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(seconds / 86400);
    return `${days}d ago`;
  }
}

export function CryptoSecurityNews() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>(securityAlerts);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "critical" | "high">("all");

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh - in production, this would fetch from API
    setTimeout(() => {
      setAlerts([...securityAlerts]);
      setIsRefreshing(false);
    }, 1000);
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === "all") return true;
    return alert.severity === filter;
  });

  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const highCount = alerts.filter(a => a.severity === "high").length;

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-lg font-display">Security Alerts</CardTitle>
              <p className="text-sm text-muted-foreground">
                Latest crypto scams & security warnings
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <Badge 
                variant={filter === "all" ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => setFilter("all")}
              >
                All
              </Badge>
              <Badge 
                variant={filter === "critical" ? "destructive" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => setFilter("critical")}
              >
                Critical ({criticalCount})
              </Badge>
              <Badge 
                variant={filter === "high" ? "default" : "outline"}
                className={`cursor-pointer text-xs ${filter === "high" ? "bg-warning text-warning-foreground" : ""}`}
                onClick={() => setFilter("high")}
              >
                High ({highCount})
              </Badge>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="ml-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {filteredAlerts.map((alert) => {
              const severity = severityConfig[alert.severity];
              const category = categoryConfig[alert.category];
              const SeverityIcon = severity.icon;
              const CategoryIcon = category.icon;
              
              return (
                <div
                  key={alert.id}
                  className="p-4 rounded-lg bg-secondary/30 border border-border/30 hover:border-border/60 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`${severity.color} text-xs`}>
                        <SeverityIcon className="w-3 h-3 mr-1" />
                        {severity.label}
                      </Badge>
                      <span className={`flex items-center gap-1 text-xs ${category.color}`}>
                        <CategoryIcon className="w-3 h-3" />
                        {category.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(alert.timestamp)}
                    </div>
                  </div>
                  
                  <h4 className="font-semibold text-foreground mb-1 text-sm">
                    {alert.title}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                    {alert.summary}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    {alert.source && (
                      <span className="text-xs text-muted-foreground/70">
                        Source: {alert.source}
                      </span>
                    )}
                    {alert.link && (
                      <a 
                        href={alert.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Learn more
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        
        <div className="mt-4 pt-4 border-t border-border/30">
          <p className="text-xs text-muted-foreground text-center">
            ⚠️ Always verify information from multiple sources. Stay vigilant and DYOR.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
