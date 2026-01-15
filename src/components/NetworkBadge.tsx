import { cn } from "@/lib/utils";

interface NetworkBadgeProps {
  network: "ETH" | "BSC" | "SOL" | "POLYGON" | "AVAX" | "TON" | "ARB" | "BASE" | "OP";
  selected?: boolean;
  onClick?: () => void;
}

const NetworkIcon = ({ network, size = 20 }: { network: string; size?: number }) => {
  switch (network) {
    case "ETH":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <path d="M16 2L6 16.5L16 22L26 16.5L16 2Z" fill="#627EEA"/>
          <path d="M16 2L6 16.5L16 22V2Z" fill="#627EEA" fillOpacity="0.8"/>
          <path d="M16 24L6 18L16 30L26 18L16 24Z" fill="#627EEA"/>
          <path d="M16 24L6 18L16 30V24Z" fill="#627EEA" fillOpacity="0.8"/>
        </svg>
      );
    case "BSC":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <path d="M16 4L10 10L12.4 12.4L16 8.8L19.6 12.4L22 10L16 4Z" fill="#F3BA2F"/>
          <path d="M22 16L24.4 13.6L26.8 16L24.4 18.4L22 16Z" fill="#F3BA2F"/>
          <path d="M16 19.2L12.4 15.6L10 18L16 24L22 18L19.6 15.6L16 19.2Z" fill="#F3BA2F"/>
          <path d="M5.2 16L7.6 13.6L10 16L7.6 18.4L5.2 16Z" fill="#F3BA2F"/>
          <path d="M16 13.6L12.4 17.2L10 14.8L16 8.8L22 14.8L19.6 17.2L16 13.6Z" fill="#F3BA2F"/>
        </svg>
      );
    case "SOL":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <defs>
            <linearGradient id="solGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00FFA3"/>
              <stop offset="100%" stopColor="#DC1FFF"/>
            </linearGradient>
          </defs>
          <path d="M8 22.5L10.5 25H26L23.5 22.5H8Z" fill="url(#solGrad)"/>
          <path d="M8 7L10.5 9.5H26L23.5 7H8Z" fill="url(#solGrad)"/>
          <path d="M26 14.5L23.5 17H8L10.5 14.5H26Z" fill="url(#solGrad)"/>
        </svg>
      );
    case "POLYGON":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <path d="M21.5 11.5L16 8L10.5 11.5V18.5L16 22L21.5 18.5V11.5Z" stroke="#8247E5" strokeWidth="2" fill="none"/>
          <path d="M16 8V14L21.5 11.5" stroke="#8247E5" strokeWidth="2"/>
          <path d="M16 14L10.5 11.5" stroke="#8247E5" strokeWidth="2"/>
          <path d="M16 14V22" stroke="#8247E5" strokeWidth="2"/>
        </svg>
      );
    case "AVAX":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <path d="M16 6L26 24H6L16 6Z" fill="#E84142"/>
          <path d="M16 14L20 22H12L16 14Z" fill="#FFFFFF"/>
        </svg>
      );
    case "TON":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <path d="M16 4L28 16L16 28L4 16L16 4Z" fill="#0098EA"/>
          <path d="M16 4L28 16L16 16V4Z" fill="#0098EA" fillOpacity="0.8"/>
          <path d="M16 10L22 16L16 22L10 16L16 10Z" fill="white"/>
        </svg>
      );
    case "ARB":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <path d="M16 4L28 28H4L16 4Z" fill="#28A0F0"/>
          <path d="M16 10L22 22H10L16 10Z" fill="#FFFFFF"/>
          <circle cx="16" cy="18" r="3" fill="#28A0F0"/>
        </svg>
      );
    case "BASE":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="12" fill="#0052FF"/>
          <path d="M16 8C11.58 8 8 11.58 8 16C8 20.42 11.58 24 16 24C19.73 24 22.84 21.45 23.71 18H18C17.28 19.19 15.99 20 14.5 20C12.29 20 10.5 18.21 10.5 16C10.5 13.79 12.29 12 14.5 12C15.99 12 17.28 12.81 18 14H23.71C22.84 10.55 19.73 8 16 8Z" fill="white"/>
        </svg>
      );
    case "OP":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="12" fill="#FF0420"/>
          <text x="16" y="20" fontSize="12" fontWeight="bold" fill="white" textAnchor="middle">OP</text>
        </svg>
      );
    default:
      return null;
  }
};

const networkConfig = {
  ETH: { name: "Ethereum", color: "hsl(227, 79%, 65%)" },
  BSC: { name: "BNB Chain", color: "hsl(43, 89%, 57%)" },
  SOL: { name: "Solana", color: "hsl(280, 80%, 60%)" },
  POLYGON: { name: "Polygon", color: "hsl(263, 75%, 58%)" },
  AVAX: { name: "Avalanche", color: "hsl(0, 78%, 58%)" },
  TON: { name: "TON", color: "hsl(200, 100%, 46%)" },
  ARB: { name: "Arbitrum", color: "hsl(207, 88%, 55%)" },
  BASE: { name: "Base", color: "hsl(220, 100%, 50%)" },
  OP: { name: "Optimism", color: "hsl(0, 100%, 50%)" },
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
      <NetworkIcon network={network} size={20} />
      <span className={cn(
        "font-medium text-sm",
        selected ? "text-foreground" : "text-muted-foreground"
      )}>
        {config.name}
      </span>
    </button>
  );
};
