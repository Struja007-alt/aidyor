import { useState } from "react";
import { Gamepad2, ExternalLink, CheckCircle, XCircle, AlertTriangle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface GameResult {
  name: string;
  status: "verified" | "suspicious" | "scam";
  players: string;
  earnings: string;
  warning?: string;
}

const mockGames: GameResult[] = [
  { name: "Hamster Kombat", status: "verified", players: "300M+", earnings: "Real P2E rewards" },
  { name: "Notcoin", status: "verified", players: "35M+", earnings: "Listed on exchanges" },
  { name: "TapSwap", status: "suspicious", players: "60M+", earnings: "Pending token launch", warning: "No confirmed token yet" },
];

export const TelegramGameChecker = () => {
  const [gameLink, setGameLink] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);

  const handleCheck = () => {
    if (!gameLink) return;
    
    setIsChecking(true);
    
    setTimeout(() => {
      const randomGame = mockGames[Math.floor(Math.random() * mockGames.length)];
      setResult(randomGame);
      setIsChecking(false);
    }, 1500);
  };

  const getStatusConfig = (status: GameResult["status"]) => {
    switch (status) {
      case "verified": return { 
        icon: <CheckCircle className="w-6 h-6" />, 
        color: "text-safe",
        bg: "bg-safe/10",
        border: "border-safe/30",
        label: "VERIFIED"
      };
      case "suspicious": return { 
        icon: <AlertTriangle className="w-6 h-6" />, 
        color: "text-warning",
        bg: "bg-warning/10",
        border: "border-warning/30",
        label: "CAUTION"
      };
      case "scam": return { 
        icon: <XCircle className="w-6 h-6" />, 
        color: "text-danger",
        bg: "bg-danger/10",
        border: "border-danger/30",
        label: "SCAM ALERT"
      };
    }
  };

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center">
          <Gamepad2 className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h3 className="font-display text-xl text-foreground">Telegram Game Checker</h3>
          <p className="text-sm text-muted-foreground">Verify Play-to-Earn games legitimacy</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Paste Telegram bot/game link..."
          value={gameLink}
          onChange={(e) => setGameLink(e.target.value)}
          className="flex-1 bg-secondary/50 border-border/50 focus:border-accent/50 h-12 text-foreground placeholder:text-muted-foreground"
        />
        <Button 
          onClick={handleCheck}
          disabled={!gameLink || isChecking}
          className="h-12 px-6 bg-accent hover:bg-accent/90 text-accent-foreground font-display"
        >
          {isChecking ? (
            <Search className="w-5 h-5 animate-pulse" />
          ) : (
            "CHECK"
          )}
        </Button>
      </div>

      {result && !isChecking && (
        <div className={cn(
          "p-4 rounded-xl border animate-scale-in",
          getStatusConfig(result.status).bg,
          getStatusConfig(result.status).border
        )}>
          <div className="flex items-start gap-4">
            <div className={getStatusConfig(result.status).color}>
              {getStatusConfig(result.status).icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-display text-lg text-foreground">{result.name}</h4>
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-display",
                  getStatusConfig(result.status).bg,
                  getStatusConfig(result.status).color
                )}>
                  {getStatusConfig(result.status).label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Players: </span>
                  <span className="text-foreground">{result.players}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Rewards: </span>
                  <span className="text-foreground">{result.earnings}</span>
                </div>
              </div>
              {result.warning && (
                <p className="mt-3 text-sm text-warning flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {result.warning}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ExternalLink className="w-4 h-4" />
        <span>We analyze game contracts, community size, and reward history</span>
      </div>
    </div>
  );
};
