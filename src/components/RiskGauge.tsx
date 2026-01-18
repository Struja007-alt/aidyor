/**
 * @fileoverview RiskGauge component for visualizing token risk scores
 * Displays a semi-circular gauge with color-coded risk levels
 */

import { useMemo, forwardRef } from "react";

/**
 * Props for the RiskGauge component
 * @interface RiskGaugeProps
 */
interface RiskGaugeProps {
  /** Risk score from 0-100 where higher values indicate safer tokens */
  score: number;
  /** Size of the gauge in pixels (default: 200) */
  size?: number;
}

/**
 * A visual risk gauge component that displays a semi-circular progress indicator
 * with color-coded risk levels (safe/caution/danger).
 * 
 * @component
 * @example
 * ```tsx
 * <RiskGauge score={75} size={200} />
 * ```
 * 
 * @param props - Component props
 * @param props.score - Risk score from 0-100 (higher = safer)
 * @param props.size - Optional size of the gauge in pixels
 * @param ref - Forwarded ref for the container div
 */

export const RiskGauge = forwardRef<HTMLDivElement, RiskGaugeProps>(({ score, size = 200 }, ref) => {
  const { color, label, glowClass } = useMemo(() => {
    if (score >= 70) return { color: "hsl(160, 100%, 50%)", label: "SAFE", glowClass: "glow-safe" };
    if (score >= 40) return { color: "hsl(45, 100%, 50%)", label: "CAUTION", glowClass: "" };
    return { color: "hsl(350, 100%, 60%)", label: "DANGER", glowClass: "glow-danger" };
  }, [score]);

  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI; // Half circle
  const progress = (score / 100) * circumference;

  return (
    <div ref={ref} className="flex flex-col items-center gap-4">
      <div className={`relative ${glowClass}`} style={{ width: size, height: size / 2 + 20 }}>
        <svg width={size} height={size / 2 + 20} className="transform -rotate-0">
          {/* Background arc */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="hsl(240, 10%, 18%)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            className="transition-all duration-1000 ease-out"
            style={{ filter: `drop-shadow(0 0 10px ${color})` }}
          />
        </svg>
        
        {/* Score display */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <span 
            className="text-5xl font-display font-bold transition-colors duration-500"
            style={{ color }}
          >
            {score}
          </span>
          <span className="text-muted-foreground text-sm">/ 100</span>
        </div>
      </div>
      
      <div 
        className="px-4 py-1.5 rounded-full font-display font-semibold text-sm tracking-wider animate-pulse-glow"
        style={{ 
          backgroundColor: `${color}20`,
          color,
          border: `1px solid ${color}40`
        }}
      >
        {label}
      </div>
    </div>
  );
});

RiskGauge.displayName = "RiskGauge";
