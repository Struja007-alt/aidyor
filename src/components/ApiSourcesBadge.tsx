/**
 * @fileoverview ApiSourcesBadge component for displaying data source attribution
 * Shows which security APIs contributed to the token analysis results
 */

import { memo, forwardRef } from "react";
import { Shield, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Supported API data sources for token security analysis
 * @typedef {string} ApiSource
 */
export type ApiSource = 
  | "goplus" 
  | "goplus-sol" 
  | "solanafm" 
  | "rugcheck" 
  | "bsctrace" 
  | "dexscreener" 
  | "unicrypt"
  | "coingecko";

/**
 * Configuration for individual API source styling and information
 * @interface ApiSourceConfig
 */
interface ApiSourceConfig {
  /** Full display name of the API */
  label: string;
  /** Abbreviated name for compact display */
  shortLabel: string;
  /** Text color class */
  color: string;
  /** Background color class */
  bgColor: string;
  /** Border color class */
  borderColor: string;
  /** Description of what data this API provides */
  description: string;
}

const apiSourceConfig: Record<ApiSource, ApiSourceConfig> = {
  goplus: {
    label: "GoPlus",
    shortLabel: "GP",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    borderColor: "border-blue-500/40",
    description: "GoPlus Security API - Contract analysis for EVM chains",
  },
  "goplus-sol": {
    label: "GoPlus SOL",
    shortLabel: "GP",
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    borderColor: "border-purple-500/40",
    description: "GoPlus Solana API - Solana token security analysis",
  },
  solanafm: {
    label: "SolanaFM",
    shortLabel: "SFM",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    borderColor: "border-emerald-500/40",
    description: "SolanaFM API - Holder data & authority checks",
  },
  rugcheck: {
    label: "RugCheck",
    shortLabel: "RC",
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
    borderColor: "border-orange-500/40",
    description: "RugCheck API - Solana rug pull detection",
  },
  bsctrace: {
    label: "BSCTrace",
    shortLabel: "BSC",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
    borderColor: "border-yellow-500/40",
    description: "BSCTrace API - BSC honeypot & contract analysis",
  },
  dexscreener: {
    label: "DEXScreener",
    shortLabel: "DEX",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
    borderColor: "border-cyan-500/40",
    description: "DEXScreener API - Real-time market data",
  },
  unicrypt: {
    label: "Unicrypt",
    shortLabel: "UC",
    color: "text-pink-400",
    bgColor: "bg-pink-500/20",
    borderColor: "border-pink-500/40",
    description: "Unicrypt/Team Finance - Liquidity lock verification",
  },
  coingecko: {
    label: "CoinGecko",
    shortLabel: "CG",
    color: "text-lime-400",
    bgColor: "bg-lime-500/20",
    borderColor: "border-lime-500/40",
    description: "CoinGecko API - Token metadata & original network detection",
  },
};

interface ApiSourcesBadgeProps {
  sources: ApiSource[];
  compact?: boolean;
  showTooltip?: boolean;
  className?: string;
}

// ForwardRef wrapper for tooltip trigger
const TriggerWrapper = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("cursor-help", className)} {...props}>
      {children}
    </div>
  )
);
TriggerWrapper.displayName = "TriggerWrapper";

// ForwardRef wrapper for count badge trigger
const CountTrigger = forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement> & { count: number }>(
  ({ count, className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded",
        "bg-primary/20 text-primary border border-primary/40 font-medium cursor-help",
        className
      )}
      {...props}
    >
      <Shield className="w-2.5 h-2.5" />
      {count} API{count !== 1 ? "s" : ""}
    </span>
  )
);
CountTrigger.displayName = "CountTrigger";

export const ApiSourcesBadge = memo(function ApiSourcesBadge({
  sources,
  compact = false,
  showTooltip = true,
  className,
}: ApiSourcesBadgeProps) {
  if (!sources || sources.length === 0) return null;

  const content = (
    <div className={cn("flex items-center gap-0.5 flex-wrap", className)}>
      {sources.map((source) => {
        const config = apiSourceConfig[source];
        if (!config) return null;

        return (
          <span
            key={source}
            className={cn(
              "inline-flex items-center gap-0.5 rounded font-medium transition-colors",
              config.bgColor,
              config.color,
              config.borderColor,
              "border",
              compact 
                ? "px-1 py-0.5 text-[9px]" 
                : "px-1.5 py-0.5 text-[10px]"
            )}
            title={!showTooltip ? config.description : undefined}
          >
            {compact ? config.shortLabel : config.label}
          </span>
        );
      })}
    </div>
  );

  if (!showTooltip) return content;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <TriggerWrapper>{content}</TriggerWrapper>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          className="max-w-xs p-3 bg-card border border-border shadow-xl"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <Database className="w-3.5 h-3.5 text-primary" />
              Security Data Sources
            </div>
            <div className="space-y-1.5">
              {sources.map((source) => {
                const config = apiSourceConfig[source];
                if (!config) return null;

                return (
                  <div key={source} className="flex items-start gap-2">
                    <span
                      className={cn(
                        "px-1.5 py-0.5 text-[10px] rounded font-medium shrink-0",
                        config.bgColor,
                        config.color,
                        config.borderColor,
                        "border"
                      )}
                    >
                      {config.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground leading-tight">
                      {config.description}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

// Helper to create a summary badge showing count
export const ApiSourcesCount = memo(function ApiSourcesCount({
  sources,
  className,
}: {
  sources: ApiSource[];
  className?: string;
}) {
  if (!sources || sources.length === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <CountTrigger count={sources.length} className={className} />
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          className="max-w-xs p-3 bg-card border border-border shadow-xl"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <Database className="w-3.5 h-3.5 text-primary" />
              Security Data Sources ({sources.length})
            </div>
            <ApiSourcesBadge sources={sources} showTooltip={false} />
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});
