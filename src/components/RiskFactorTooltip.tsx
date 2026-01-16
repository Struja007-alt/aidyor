import { memo } from "react";
import { Info, AlertTriangle, ShieldAlert, Shield } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getRiskExplanation, getImpactColor, getImpactLabel } from "@/lib/riskExplanations";
import { cn } from "@/lib/utils";

interface RiskFactorTooltipProps {
  factorName: string;
  status: "safe" | "warning" | "danger";
  description: string;
  className?: string;
}

export const RiskFactorTooltip = memo(function RiskFactorTooltip({ 
  factorName, 
  status,
  description,
  className 
}: RiskFactorTooltipProps) {
  const explanation = getRiskExplanation(factorName);
  
  // Don't show tooltip for safe factors without special explanation
  if (status === "safe" && !explanation) {
    return (
      <span className={cn("text-safe", className)}>
        {factorName}: {description}
      </span>
    );
  }

  const ImpactIcon = status === "danger" ? ShieldAlert : 
                     status === "warning" ? AlertTriangle : Shield;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            "inline-flex items-center gap-1 cursor-help underline decoration-dotted decoration-1 underline-offset-2",
            status === "danger" ? "text-danger" : 
            status === "warning" ? "text-warning" : "text-safe",
            className
          )}>
            {factorName}: {description}
            <Info className="w-3 h-3 opacity-60" />
          </span>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-xs p-0 overflow-hidden bg-card border-border/50"
          sideOffset={5}
        >
          {explanation ? (
            <div className="text-left">
              {/* Header */}
              <div className={cn(
                "px-3 py-2 border-b border-border/30 flex items-center gap-2",
                status === "danger" ? "bg-danger/10" : 
                status === "warning" ? "bg-warning/10" : "bg-safe/10"
              )}>
                <ImpactIcon className={cn(
                  "w-4 h-4",
                  status === "danger" ? "text-danger" : 
                  status === "warning" ? "text-warning" : "text-safe"
                )} />
                <span className={cn(
                  "font-medium text-sm",
                  status === "danger" ? "text-danger" : 
                  status === "warning" ? "text-warning" : "text-safe"
                )}>
                  {explanation.title}
                </span>
                <span className={cn(
                  "ml-auto text-[10px] px-1.5 py-0.5 rounded font-medium",
                  getImpactColor(explanation.impact),
                  status === "danger" ? "bg-danger/20" : 
                  status === "warning" ? "bg-warning/20" : "bg-safe/20"
                )}>
                  {getImpactLabel(explanation.impact)}
                </span>
              </div>
              
              {/* Body */}
              <div className="px-3 py-2 space-y-2">
                <p className="text-xs text-foreground leading-relaxed">
                  {explanation.detailedExplanation}
                </p>
                <div className="pt-1 border-t border-border/20">
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">Action: </span>
                    {explanation.whatToDo}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {description}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

RiskFactorTooltip.displayName = "RiskFactorTooltip";
