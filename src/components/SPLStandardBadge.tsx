/**
 * @fileoverview SPL Standard Badge Component
 * Displays the detected SPL token standard with visual indicators for Solana
 */

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Coins, Image, Layers, Sparkles, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SPLStandardResult } from "@/lib/api/splStandards";

interface SPLStandardBadgeProps {
  result: SPLStandardResult;
  className?: string;
  showDetails?: boolean;
}

const standardConfig = {
  'SPL Token': {
    icon: Coins,
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    label: 'SPL',
    shortDesc: 'Fungible Token',
  },
  'Token-2022': {
    icon: Sparkles,
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    label: 'Token-2022',
    shortDesc: 'Extended Token',
  },
  'Metaplex NFT': {
    icon: Image,
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    label: 'NFT',
    shortDesc: 'Metaplex NFT',
  },
  'Compressed NFT': {
    icon: Layers,
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    label: 'cNFT',
    shortDesc: 'Compressed NFT',
  },
  'Unknown': {
    icon: HelpCircle,
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    label: 'Unknown',
    shortDesc: 'Non-Standard',
  },
} as const;

export function SPLStandardBadge({ result, className, showDetails = true }: SPLStandardBadgeProps) {
  const config = standardConfig[result.standard];
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 cursor-help transition-all hover:scale-105",
            config.color,
            className
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          <span className="font-medium">{config.label}</span>
          {showDetails && result.confidence === 'high' && (
            <span className="text-[10px] opacity-70">✓</span>
          )}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs p-3 space-y-2">
        <div className="font-semibold flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {config.label} - {config.shortDesc}
        </div>
        <p className="text-sm text-muted-foreground">
          {result.description}
        </p>
        {showDetails && (
          <div className="text-xs space-y-1 pt-1 border-t border-border/50">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Detection Confidence:</span>
              <span className={cn(
                "font-medium",
                result.confidence === 'high' && "text-emerald-400",
                result.confidence === 'medium' && "text-yellow-400",
                result.confidence === 'low' && "text-red-400"
              )}>
                {result.confidence.toUpperCase()}
              </span>
            </div>
            {result.isToken2022 && result.extensions.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Extensions:</span>
                <div className="flex flex-wrap gap-1">
                  {result.extensions.map((ext) => (
                    <span key={ext} className="px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 rounded text-[10px]">
                      {ext}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {result.isNFT && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Has Metadata:</span>
                  <span>{result.hasMetadata ? '✅ Yes' : '❌ No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Master Edition:</span>
                  <span>{result.hasMasterEdition ? '✅ Yes' : '❌ No'}</span>
                </div>
              </>
            )}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export function SPLStandardIndicator({ standard, compact = false }: { standard: string; compact?: boolean }) {
  const config = standardConfig[standard as keyof typeof standardConfig] || standardConfig.Unknown;
  const Icon = config.icon;

  if (compact) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        standard === 'SPL Token' && "text-emerald-400",
        standard === 'Token-2022' && "text-cyan-400",
        standard === 'Metaplex NFT' && "text-purple-400",
        standard === 'Compressed NFT' && "text-blue-400",
        standard === 'Unknown' && "text-yellow-400"
      )}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
      config.color
    )}>
      <Icon className="w-4 h-4" />
      <div className="flex flex-col">
        <span className="text-sm font-medium">{config.label}</span>
        <span className="text-xs opacity-70">{config.shortDesc}</span>
      </div>
    </div>
  );
}
