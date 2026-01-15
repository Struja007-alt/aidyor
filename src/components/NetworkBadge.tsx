import { cn } from "@/lib/utils";

interface NetworkBadgeProps {
  network: "ETH" | "BSC" | "SOL" | "POLYGON" | "AVAX" | "TON";
  selected?: boolean;
  onClick?: () => void;
}

const networkConfig = {
  ETH: { name: "Ethereum", color: "hsl(220, 70%, 55%)", icon: "⟠" },
  BSC: { name: "BNB Chain", color: "hsl(45, 100%, 50%)", icon: "◆" },
  SOL: { name: "Solana", color: "hsl(280, 80%, 60%)", icon: "◎" },
  POLYGON: { name: "Polygon", color: "hsl(270, 80%, 55%)", icon: "⬡" },
  AVAX: { name: "Avalanche", color: "hsl(0, 75%, 55%)", icon: "▲" },
  TON: { name: "TON", color: "hsl(200, 90%, 50%)", icon: "💎" },
};

export const NetworkBadge = ({ network, selected, onClick }: NetworkBadgeProps) => {
  const config = networkConfig[network];
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300",
        "hover:scale-105 active:scale-95",
        selected 
          ? "border-primary/50 bg-primary/10" 
          : "border-border/50 bg-secondary/30 hover:border-border"
      )}
      style={selected ? { 
        boxShadow: `0 0 20px ${config.color}30`,
        borderColor: `${config.color}50`
      } : {}}
    >
      <span className="text-xl" style={{ color: config.color }}>{config.icon}</span>
      <span className={cn(
        "font-medium text-sm",
        selected ? "text-foreground" : "text-muted-foreground"
      )}>
        {config.name}
      </span>
    </button>
  );
};
