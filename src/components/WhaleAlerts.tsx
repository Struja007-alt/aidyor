/**
 * @fileoverview WhaleAlerts component for tracking large cryptocurrency transactions
 * Monitors and displays significant buy/sell activity across multiple networks
 */

import { useEffect, useState, useRef } from "react";
import { useWhaleAlerts, WhaleAlert } from "@/hooks/useWhaleAlerts";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationPermission } from "@/components/NotificationPermission";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  Fish, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertCircle,
  Loader2,
  DollarSign,
  Star
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";

/**
 * Whale alerts feed component with filtering and notification support.
 * Displays large transactions and can send push notifications for watchlist tokens.
 * 
 * @component
 * @example
 * ```tsx
 * <WhaleAlerts />
 * ```
 */

export function WhaleAlerts() {
  const { alerts, isLoading, error, lastUpdated, fetchAlerts } = useWhaleAlerts();
  const { watchlist, isInWatchlist } = useWatchlist();
  const { isEnabled, sendWhaleAlert } = useNotifications();
  const [minAmount, setMinAmount] = useState(50000);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [notifyWatchlistOnly, setNotifyWatchlistOnly] = useState(true);
  const notifiedAlertsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchAlerts(minAmount);
  }, []);

  // Check for watchlist matches and send notifications
  useEffect(() => {
    if (!isEnabled || alerts.length === 0) return;

    alerts.forEach((alert) => {
      // Skip if already notified
      if (notifiedAlertsRef.current.has(alert.id)) return;

      const isWatchlistToken = isInWatchlist(alert.tokenAddress);
      
      // Only notify for watchlist tokens if that setting is enabled
      if (notifyWatchlistOnly && !isWatchlistToken) return;

      // Send browser notification
      sendWhaleAlert(
        alert.tokenSymbol,
        alert.tokenName,
        formatAmount(alert.amountUsd),
        alert.transactionType,
        alert.network
      );

      // Show toast as well
      toast({
        title: `🐋 Whale ${alert.transactionType.toUpperCase()} Alert!`,
        description: `${alert.tokenSymbol}: ${formatAmount(alert.amountUsd)} on ${alert.network}`,
      });

      // Mark as notified
      notifiedAlertsRef.current.add(alert.id);
    });
  }, [alerts, isEnabled, isInWatchlist, notifyWatchlistOnly, sendWhaleAlert]);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchAlerts(minAmount);
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [autoRefresh, minAmount, fetchAlerts]);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchAlerts(minAmount);
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [autoRefresh, minAmount, fetchAlerts]);

  const handleRefresh = () => {
    fetchAlerts(minAmount);
  };

  const handleMinAmountChange = (value: number[]) => {
    setMinAmount(value[0]);
  };

  const handleApplyFilter = () => {
    fetchAlerts(minAmount);
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  const getNetworkColor = (network: string): string => {
    const colors: Record<string, string> = {
      Ethereum: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      BSC: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      Solana: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      Polygon: "bg-violet-500/20 text-violet-400 border-violet-500/30",
      Arbitrum: "bg-sky-500/20 text-sky-400 border-sky-500/30",
      Base: "bg-blue-600/20 text-blue-300 border-blue-600/30",
      Avalanche: "bg-red-500/20 text-red-400 border-red-500/30",
      Optimism: "bg-red-600/20 text-red-300 border-red-600/30",
    };
    return colors[network] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card className="glass-card p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Fish className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Whale Alert Feed</h3>
              <p className="text-xs text-muted-foreground">
                {lastUpdated 
                  ? `Updated ${formatDistanceToNow(lastUpdated, { addSuffix: true })}`
                  : "Tracking large transactions"
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="text-xs"
            >
              {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Min Amount Filter */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Minimum Transaction</span>
            <span className="text-sm font-medium text-foreground">{formatAmount(minAmount)}</span>
          </div>
          <div className="flex items-center gap-3">
            <Slider
              value={[minAmount]}
              onValueChange={handleMinAmountChange}
              min={10000}
              max={500000}
              step={10000}
              className="flex-1"
            />
            <Button size="sm" variant="secondary" onClick={handleApplyFilter}>
              Apply
            </Button>
          </div>
        </div>
      </Card>

      {/* Notification Settings */}
      <NotificationPermission />
      
      {isEnabled && (
        <Card className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-foreground">Watchlist alerts only</span>
            </div>
            <Button
              variant={notifyWatchlistOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setNotifyWatchlistOnly(!notifyWatchlistOnly)}
              className="text-xs"
            >
              {notifyWatchlistOnly ? "ON" : "OFF"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {notifyWatchlistOnly 
              ? "Only receive notifications for tokens in your watchlist"
              : "Receive notifications for all whale activity"
            }
          </p>
          {watchlist.length === 0 && notifyWatchlistOnly && (
            <p className="text-xs text-yellow-400 mt-2">
              ⚠️ Your watchlist is empty. Add tokens to receive whale alerts.
            </p>
          )}
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="glass-card p-4 border-destructive/50">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">{error}</p>
          </div>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && alerts.length === 0 && (
        <Card className="glass-card p-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Scanning for whale activity...</p>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && alerts.length === 0 && !error && (
        <Card className="glass-card p-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <Fish className="w-12 h-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">No whale transactions detected</p>
            <p className="text-xs text-muted-foreground">Try lowering the minimum amount filter</p>
          </div>
        </Card>
      )}

      {/* Alerts Feed */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <WhaleAlertCard 
              key={alert.id} 
              alert={alert} 
              formatAmount={formatAmount} 
              getNetworkColor={getNetworkColor} 
              isWatchlistToken={isInWatchlist(alert.tokenAddress)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface WhaleAlertCardProps {
  alert: WhaleAlert;
  formatAmount: (amount: number) => string;
  getNetworkColor: (network: string) => string;
  isWatchlistToken?: boolean;
}

function WhaleAlertCard({ alert, formatAmount, getNetworkColor, isWatchlistToken }: WhaleAlertCardProps) {
  const isBuy = alert.transactionType === "buy";
  
  return (
    <Card className={`glass-card p-4 border-l-4 ${isBuy ? 'border-l-green-500' : 'border-l-red-500'} ${isWatchlistToken ? 'ring-1 ring-yellow-500/50' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${isBuy ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            {isBuy ? (
              <TrendingUp className="w-5 h-5 text-green-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400" />
            )}
          </div>
          
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground">
                {alert.tokenSymbol}
              </span>
              {isWatchlistToken && (
                <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                  <Star className="w-3 h-3 mr-1" />
                  Watching
                </Badge>
              )}
              <Badge variant="outline" className={getNetworkColor(alert.network)}>
                {alert.network}
              </Badge>
              <Badge variant={isBuy ? "default" : "destructive"} className="text-xs">
                {isBuy ? "BUY" : "SELL"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {alert.tokenName}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex items-center gap-1 text-lg font-bold text-foreground">
            <DollarSign className="w-4 h-4" />
            {formatAmount(alert.amountUsd).replace('$', '')}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
          </div>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-border/30">
        <p className="text-xs text-muted-foreground font-mono truncate">
          {alert.tokenAddress}
        </p>
      </div>
    </Card>
  );
}
