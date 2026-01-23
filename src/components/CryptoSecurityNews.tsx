import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useSecurityAlerts, SecurityAlert } from "@/hooks/useSecurityAlerts";
import { 
  AlertTriangle, 
  Shield, 
  ExternalLink, 
  Clock, 
  RefreshCw,
  Skull,
  Bug,
  Coins,
  TrendingDown,
  Wifi,
  WifiOff
} from "lucide-react";

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

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) {
    return "just now";
  } else if (seconds < 3600) {
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

function AlertSkeleton() {
  return (
    <div className="p-4 rounded-lg bg-secondary/30 border border-border/30 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function CryptoSecurityNews() {
  const { alerts, isLoading, error, lastUpdated, refresh } = useSecurityAlerts();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "critical" | "high">("all");

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
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
              <CardTitle className="text-lg font-display flex items-center gap-2">
                Security Alerts
                {!error && alerts.length > 0 && (
                  <Wifi className="w-3 h-3 text-primary animate-pulse" />
                )}
                {error && (
                  <WifiOff className="w-3 h-3 text-muted-foreground" />
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {lastUpdated 
                  ? `Updated ${formatTimeAgo(lastUpdated.toISOString())}`
                  : "Loading live alerts..."}
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
              disabled={isRefreshing || isLoading}
              className="ml-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing || isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {isLoading && alerts.length === 0 ? (
              <>
                <AlertSkeleton />
                <AlertSkeleton />
                <AlertSkeleton />
              </>
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No alerts matching this filter</p>
              </div>
            ) : (
              filteredAlerts.map((alert) => {
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
              })
            )}
          </div>
        </ScrollArea>
        
        <div className="mt-4 pt-4 border-t border-border/30">
          <p className="text-xs text-muted-foreground text-center">
            ⚠️ Live feed from multiple sources. Always verify before acting. DYOR.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
