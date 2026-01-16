import { useState, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown, Plus, Trash2, Users, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
import { useCommunityMappings, type TokenMapping } from "@/hooks/useCommunityMappings";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const AVAILABLE_NETWORKS = [
  { id: "ethereum", label: "Ethereum" },
  { id: "bsc", label: "BSC" },
  { id: "solana", label: "Solana" },
  { id: "polygon", label: "Polygon" },
  { id: "arbitrum", label: "Arbitrum" },
  { id: "base", label: "Base" },
  { id: "optimism", label: "Optimism" },
  { id: "avalanche", label: "Avalanche" },
  { id: "fantom", label: "Fantom" },
  { id: "tron", label: "Tron" },
];

const MappingCard = memo(({ 
  mapping, 
  onVote, 
  onDelete, 
  isOwner,
  isAuthenticated 
}: { 
  mapping: TokenMapping; 
  onVote: (id: string, type: "up" | "down") => void;
  onDelete: (id: string) => void;
  isOwner: boolean;
  isAuthenticated: boolean;
}) => {
  const netVotes = mapping.votes_up - mapping.votes_down;
  
  const statusConfig = {
    pending: { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Pending" },
    approved: { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Approved" },
    rejected: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Rejected" },
  };

  const status = statusConfig[mapping.status];
  const StatusIcon = status.icon;

  return (
    <div className="p-3 rounded-lg bg-card/50 border border-border/50 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-primary">{mapping.symbol}</span>
          <Badge variant="outline" className={cn("text-xs", status.bg, status.color)}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {status.label}
          </Badge>
        </div>
        {isOwner && mapping.status === "pending" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={() => onDelete(mapping.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {mapping.original_networks.map((network) => (
          <Badge key={network} variant="secondary" className="text-xs capitalize">
            {network}
          </Badge>
        ))}
      </div>

      {mapping.notes && (
        <p className="text-xs text-muted-foreground">{mapping.notes}</p>
      )}

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 gap-1",
              mapping.user_vote === "up" && "bg-emerald-500/20 text-emerald-500"
            )}
            onClick={() => onVote(mapping.id, "up")}
            disabled={!isAuthenticated}
          >
            <ThumbsUp className="w-3 h-3" />
            <span className="text-xs">{mapping.votes_up}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 gap-1",
              mapping.user_vote === "down" && "bg-red-500/20 text-red-500"
            )}
            onClick={() => onVote(mapping.id, "down")}
            disabled={!isAuthenticated}
          >
            <ThumbsDown className="w-3 h-3" />
            <span className="text-xs">{mapping.votes_down}</span>
          </Button>
        </div>
        <span className={cn(
          "text-xs font-medium",
          netVotes > 0 ? "text-emerald-500" : netVotes < 0 ? "text-red-500" : "text-muted-foreground"
        )}>
          {netVotes > 0 ? "+" : ""}{netVotes} votes
        </span>
      </div>
    </div>
  );
});

MappingCard.displayName = "MappingCard";

export const CommunityMappings = memo(() => {
  const { user } = useAuth();
  const { mappings, loading, submitting, submitMapping, vote, deleteMapping } = useCommunityMappings();
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const handleSubmit = async () => {
    if (!symbol.trim() || selectedNetworks.length === 0) return;
    
    const success = await submitMapping(symbol.trim(), selectedNetworks, notes.trim());
    if (success) {
      setSymbol("");
      setSelectedNetworks([]);
      setNotes("");
      setOpen(false);
    }
  };

  const toggleNetwork = (network: string) => {
    setSelectedNetworks((prev) =>
      prev.includes(network)
        ? prev.filter((n) => n !== network)
        : [...prev, network]
    );
  };

  const pendingMappings = mappings.filter((m) => m.status === "pending");
  const approvedMappings = mappings.filter((m) => m.status === "approved");

  return (
    <Card className="bg-card/30 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Community Token Mappings
          </CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 gap-1" disabled={!user}>
                <Plus className="w-4 h-4" />
                Submit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Submit Token Mapping</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Token Symbol</label>
                  <Input
                    placeholder="e.g., PEPE"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    maxLength={20}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Original Network(s)</label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_NETWORKS.map((network) => (
                      <Badge
                        key={network.id}
                        variant={selectedNetworks.includes(network.id) ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-colors",
                          selectedNetworks.includes(network.id) && "bg-primary"
                        )}
                        onClick={() => toggleNetwork(network.id)}
                      >
                        {network.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes (optional)</label>
                  <Textarea
                    placeholder="Why is this the original network?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={200}
                    rows={2}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={!symbol.trim() || selectedNetworks.length === 0 || submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit for Review"
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Mappings with 5+ net upvotes are auto-approved
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!user && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Sign in to submit or vote on token mappings
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {pendingMappings.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  Pending Review ({pendingMappings.length})
                </h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {pendingMappings.map((mapping) => (
                    <MappingCard
                      key={mapping.id}
                      mapping={mapping}
                      onVote={vote}
                      onDelete={deleteMapping}
                      isOwner={mapping.submitted_by === user?.id}
                      isAuthenticated={!!user}
                    />
                  ))}
                </div>
              </div>
            )}

            {approvedMappings.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="w-3 h-3" />
                  Approved ({approvedMappings.length})
                </h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {approvedMappings.slice(0, 5).map((mapping) => (
                    <MappingCard
                      key={mapping.id}
                      mapping={mapping}
                      onVote={vote}
                      onDelete={deleteMapping}
                      isOwner={mapping.submitted_by === user?.id}
                      isAuthenticated={!!user}
                    />
                  ))}
                </div>
              </div>
            )}

            {mappings.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No community mappings yet. Be the first to submit!
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});

CommunityMappings.displayName = "CommunityMappings";
