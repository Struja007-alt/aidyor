import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useCryptoNews } from "@/hooks/useCryptoNews";
import {
  Newspaper,
  ExternalLink,
  Clock,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const seconds = Math.max(0, Math.floor((new Date().getTime() - date.getTime()) / 1000));

  if (seconds < 60) {
    return "just now";
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`;
  } else if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h ago`;
  } else {
    return `${Math.floor(seconds / 86400)}d ago`;
  }
}

function NewsSkeleton() {
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

export function CryptoNewsFeed() {
  const { items, isLoading, error, lastUpdated, refresh } = useCryptoNews();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Newspaper className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                Crypto News Feed
                {!error && items.length > 0 && (
                  <Wifi className="w-3 h-3 text-primary animate-pulse" />
                )}
                {error && <WifiOff className="w-3 h-3 text-muted-foreground" />}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {lastUpdated
                  ? `Updated ${formatTimeAgo(lastUpdated.toISOString())}`
                  : "Loading latest news..."}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing || isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {isLoading && items.length === 0 ? (
              <>
                <NewsSkeleton />
                <NewsSkeleton />
                <NewsSkeleton />
              </>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>{error ? "News is temporarily unavailable" : "No news yet"}</p>
              </div>
            ) : (
              items.map((item) => (
                <article
                  key={item.id}
                  className={`p-4 rounded-lg bg-secondary/30 border transition-colors hover:border-border/60 ${
                    item.sponsored ? "border-primary/40" : "border-border/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.sponsored && (
                        <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                          Sponsored
                        </Badge>
                      )}
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {item.source_logo && (
                          <img
                            src={item.source_logo}
                            alt=""
                            className="w-4 h-4 rounded-sm object-contain"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                        {item.source}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(item.published_at)}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-foreground mb-1 text-sm">
                        <a
                          href={item.url}
                          target="_blank"
                          rel={
                            item.sponsored
                              ? "noopener noreferrer sponsored"
                              : "noopener noreferrer"
                          }
                          className="hover:underline"
                        >
                          {item.title}
                        </a>
                      </h4>
                      {item.excerpt && (
                        <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                          {item.excerpt}
                          {item.excerpt.length >= 200 ? "…" : ""}
                        </p>
                      )}
                      <a
                        href={item.url}
                        target="_blank"
                        rel={
                          item.sponsored
                            ? "noopener noreferrer sponsored"
                            : "noopener noreferrer"
                        }
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Read on {item.source}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt=""
                        className="w-16 h-16 rounded-md object-cover shrink-0"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="mt-4 pt-4 border-t border-border/30">
          <p className="text-xs text-muted-foreground text-center">
            Headlines come from third-party publishers. Sponsored placements are labeled.
            Not financial advice. DYOR.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
