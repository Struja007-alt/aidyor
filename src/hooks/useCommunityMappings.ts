import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getTokenOriginalNetworks } from "@/lib/api/coingecko";

export interface TokenMapping {
  id: string;
  symbol: string;
  original_networks: string[];
  submitted_by: string | null;
  status: "pending" | "approved" | "rejected";
  votes_up: number;
  votes_down: number;
  notes: string | null;
  created_at: string;
  user_vote?: "up" | "down" | null;
}

// Cache for CoinGecko lookups to avoid repeated API calls
const coinGeckoCache = new Map<string, string[]>();

export const useCommunityMappings = () => {
  const { user } = useAuth();
  const [mappings, setMappings] = useState<TokenMapping[]>([]);
  const [approvedMappings, setApprovedMappings] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Look up original networks from CoinGecko for a symbol
  const getCoinGeckoMapping = useCallback(async (symbol: string): Promise<string[]> => {
    const upperSymbol = symbol.toUpperCase();
    
    // Check cache first
    if (coinGeckoCache.has(upperSymbol)) {
      return coinGeckoCache.get(upperSymbol)!;
    }
    
    try {
      const networks = await getTokenOriginalNetworks(symbol);
      coinGeckoCache.set(upperSymbol, networks);
      return networks;
    } catch (error) {
      console.error("CoinGecko lookup error:", error);
      return [];
    }
  }, []);

  // Fetch all approved mappings for use in token detection
  const fetchApprovedMappings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("token_network_mappings")
        .select("symbol, original_networks")
        .eq("status", "approved");

      if (error) throw error;

      const mappingsObj: Record<string, string[]> = {};
      data?.forEach((m) => {
        mappingsObj[m.symbol.toUpperCase()] = m.original_networks;
      });
      setApprovedMappings(mappingsObj);
    } catch (error) {
      console.error("Error fetching approved mappings:", error);
    }
  }, []);

  // Fetch all mappings (for display in submission UI)
  const fetchMappings = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch mappings
      const { data: mappingsData, error: mappingsError } = await supabase
        .from("token_network_mappings")
        .select("*")
        .order("created_at", { ascending: false });

      if (mappingsError) throw mappingsError;

      // If user is logged in, fetch their votes
      let userVotes: Record<string, "up" | "down"> = {};
      if (user) {
        const { data: votesData } = await supabase
          .from("token_mapping_votes")
          .select("mapping_id, vote_type")
          .eq("user_id", user.id);

        votesData?.forEach((v) => {
          userVotes[v.mapping_id] = v.vote_type as "up" | "down";
        });
      }

      const mappingsWithVotes = (mappingsData || []).map((m) => ({
        ...m,
        status: m.status as "pending" | "approved" | "rejected",
        user_vote: userVotes[m.id] || null,
      }));

      setMappings(mappingsWithVotes);
    } catch (error) {
      console.error("Error fetching mappings:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchApprovedMappings();
    fetchMappings();
  }, [fetchApprovedMappings, fetchMappings]);

  // Submit a new mapping
  const submitMapping = async (symbol: string, networks: string[], notes?: string) => {
    if (!user) {
      toast.error("Please sign in to submit mappings");
      return false;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase.from("token_network_mappings").insert({
        symbol: symbol.toUpperCase(),
        original_networks: networks,
        submitted_by: user.id,
        notes: notes || null,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("This token symbol already has a mapping submission");
        } else {
          throw error;
        }
        return false;
      }

      toast.success("Token mapping submitted for community review!");
      await fetchMappings();
      return true;
    } catch (error) {
      console.error("Error submitting mapping:", error);
      toast.error("Failed to submit mapping");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Vote on a mapping
  const vote = async (mappingId: string, voteType: "up" | "down") => {
    if (!user) {
      toast.error("Please sign in to vote");
      return;
    }

    try {
      const mapping = mappings.find((m) => m.id === mappingId);
      if (!mapping) return;

      // If user already voted the same way, remove vote
      if (mapping.user_vote === voteType) {
        await supabase
          .from("token_mapping_votes")
          .delete()
          .eq("mapping_id", mappingId)
          .eq("user_id", user.id);

        // Update vote counts
        const updates =
          voteType === "up"
            ? { votes_up: Math.max(0, mapping.votes_up - 1) }
            : { votes_down: Math.max(0, mapping.votes_down - 1) };

        await supabase
          .from("token_network_mappings")
          .update(updates)
          .eq("id", mappingId);
      } else {
        // Upsert vote
        await supabase.from("token_mapping_votes").upsert(
          {
            mapping_id: mappingId,
            user_id: user.id,
            vote_type: voteType,
          },
          { onConflict: "mapping_id,user_id" }
        );

        // Calculate vote changes
        let votesUp = mapping.votes_up;
        let votesDown = mapping.votes_down;

        if (mapping.user_vote === "up") votesUp--;
        if (mapping.user_vote === "down") votesDown--;
        if (voteType === "up") votesUp++;
        if (voteType === "down") votesDown++;

        await supabase
          .from("token_network_mappings")
          .update({ votes_up: votesUp, votes_down: votesDown })
          .eq("id", mappingId);
      }

      await fetchMappings();
      await fetchApprovedMappings();
    } catch (error) {
      console.error("Error voting:", error);
      toast.error("Failed to register vote");
    }
  };

  // Delete own submission
  const deleteMapping = async (mappingId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("token_network_mappings")
        .delete()
        .eq("id", mappingId)
        .eq("submitted_by", user.id);

      if (error) throw error;

      toast.success("Submission deleted");
      await fetchMappings();
    } catch (error) {
      console.error("Error deleting mapping:", error);
      toast.error("Failed to delete submission");
    }
  };

  return {
    mappings,
    approvedMappings,
    loading,
    submitting,
    submitMapping,
    vote,
    deleteMapping,
    refetch: fetchMappings,
    getCoinGeckoMapping, // Expose CoinGecko lookup for real-time queries
  };
};
