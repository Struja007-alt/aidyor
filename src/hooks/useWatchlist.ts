import { useState, useEffect, useCallback } from "react";

export interface WatchlistToken {
  address: string;
  name: string;
  network: string;
  riskScore: number;
  addedAt: number;
}

const WATCHLIST_KEY = "aidyor_watchlist";

export const useWatchlist = () => {
  const [watchlist, setWatchlist] = useState<WatchlistToken[]>([]);

  // Load watchlist from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(WATCHLIST_KEY);
    if (stored) {
      try {
        setWatchlist(JSON.parse(stored));
      } catch {
        console.error("Failed to parse watchlist");
      }
    }
  }, []);

  // Save to localStorage whenever watchlist changes
  const saveWatchlist = useCallback((tokens: WatchlistToken[]) => {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(tokens));
    setWatchlist(tokens);
  }, []);

  const addToken = useCallback((token: Omit<WatchlistToken, "addedAt">) => {
    const exists = watchlist.some(
      (t) => t.address.toLowerCase() === token.address.toLowerCase()
    );
    if (exists) return false;

    const newToken: WatchlistToken = {
      ...token,
      addedAt: Date.now(),
    };
    saveWatchlist([...watchlist, newToken]);
    return true;
  }, [watchlist, saveWatchlist]);

  const removeToken = useCallback((address: string) => {
    saveWatchlist(watchlist.filter(
      (t) => t.address.toLowerCase() !== address.toLowerCase()
    ));
  }, [watchlist, saveWatchlist]);

  const isInWatchlist = useCallback((address: string) => {
    return watchlist.some(
      (t) => t.address.toLowerCase() === address.toLowerCase()
    );
  }, [watchlist]);

  const updateToken = useCallback((address: string, updates: Partial<WatchlistToken>) => {
    saveWatchlist(watchlist.map((t) =>
      t.address.toLowerCase() === address.toLowerCase()
        ? { ...t, ...updates }
        : t
    ));
  }, [watchlist, saveWatchlist]);

  const updateAllTokens = useCallback((updatedTokens: WatchlistToken[]) => {
    saveWatchlist(updatedTokens);
  }, [saveWatchlist]);

  return { watchlist, addToken, removeToken, isInWatchlist, updateToken, updateAllTokens };
