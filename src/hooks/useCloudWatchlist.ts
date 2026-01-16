import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface WatchlistToken {
  id?: string;
  address: string;
  name: string;
  network: string;
  riskScore: number;
  addedAt: number;
}

interface DbWatchlistToken {
  id: string;
  user_id: string;
  address: string;
  name: string;
  network: string;
  risk_score: number;
  added_at: string;
  updated_at: string;
}

export const useCloudWatchlist = () => {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistToken[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch watchlist from database
  const fetchWatchlist = useCallback(async () => {
    if (!user) {
      setWatchlist([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("watchlist_tokens")
        .select("*")
        .order("added_at", { ascending: false });

      if (error) {
        console.error("Error fetching watchlist:", error);
        return;
      }

      const tokens: WatchlistToken[] = (data as DbWatchlistToken[]).map((item) => ({
        id: item.id,
        address: item.address,
        name: item.name,
        network: item.network,
        riskScore: item.risk_score,
        addedAt: new Date(item.added_at).getTime(),
      }));

      setWatchlist(tokens);
    } catch (error) {
      console.error("Error fetching watchlist:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load watchlist on mount and when user changes
  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  const addToken = useCallback(async (token: Omit<WatchlistToken, "addedAt" | "id">) => {
    if (!user) return false;

    // Check if already exists
    const exists = watchlist.some(
      (t) => t.address.toLowerCase() === token.address.toLowerCase()
    );
    if (exists) return false;

    try {
      const { data, error } = await supabase
        .from("watchlist_tokens")
        .insert({
          user_id: user.id,
          address: token.address,
          name: token.name,
          network: token.network,
          risk_score: token.riskScore,
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding token:", error);
        return false;
      }

      const dbToken = data as DbWatchlistToken;
      const newToken: WatchlistToken = {
        id: dbToken.id,
        address: dbToken.address,
        name: dbToken.name,
        network: dbToken.network,
        riskScore: dbToken.risk_score,
        addedAt: new Date(dbToken.added_at).getTime(),
      };

      setWatchlist((prev) => [newToken, ...prev]);
      return true;
    } catch (error) {
      console.error("Error adding token:", error);
      return false;
    }
  }, [user, watchlist]);

  const removeToken = useCallback(async (address: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("watchlist_tokens")
        .delete()
        .eq("address", address)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error removing token:", error);
        return;
      }

      setWatchlist((prev) =>
        prev.filter((t) => t.address.toLowerCase() !== address.toLowerCase())
      );
    } catch (error) {
      console.error("Error removing token:", error);
    }
  }, [user]);

  const isInWatchlist = useCallback((address: string) => {
    return watchlist.some(
      (t) => t.address.toLowerCase() === address.toLowerCase()
    );
  }, [watchlist]);

  const updateToken = useCallback(async (address: string, updates: Partial<WatchlistToken>) => {
    if (!user) return;

    try {
      const dbUpdates: Partial<{ name: string; network: string; risk_score: number }> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.network !== undefined) dbUpdates.network = updates.network;
      if (updates.riskScore !== undefined) dbUpdates.risk_score = updates.riskScore;

      const { error } = await supabase
        .from("watchlist_tokens")
        .update(dbUpdates)
        .eq("address", address)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error updating token:", error);
        return;
      }

      setWatchlist((prev) =>
        prev.map((t) =>
          t.address.toLowerCase() === address.toLowerCase()
            ? { ...t, ...updates }
            : t
        )
      );
    } catch (error) {
      console.error("Error updating token:", error);
    }
  }, [user]);

  const updateAllTokens = useCallback(async (updatedTokens: WatchlistToken[]) => {
    if (!user) return;

    // Update all tokens in parallel
    await Promise.all(
      updatedTokens.map((token) =>
        supabase
          .from("watchlist_tokens")
          .update({ risk_score: token.riskScore })
          .eq("address", token.address)
          .eq("user_id", user.id)
      )
    );

    setWatchlist(updatedTokens);
  }, [user]);

  return { 
    watchlist, 
    addToken, 
    removeToken, 
    isInWatchlist, 
    updateToken, 
    updateAllTokens,
    loading,
    isAuthenticated: !!user,
    refetch: fetchWatchlist
  };
};
