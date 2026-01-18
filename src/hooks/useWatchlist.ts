/**
 * @fileoverview Local storage watchlist hook
 * Manages token watchlist with browser localStorage persistence
 */

import { useState, useEffect, useCallback } from "react";

/**
 * Token data structure for local watchlist
 * @interface WatchlistToken
 */
export interface WatchlistToken {
  /** Token contract address */
  address: string;
  /** Token display name */
  name: string;
  /** Blockchain network */
  network: string;
  /** Risk score (0-100) */
  riskScore: number;
  /** Timestamp when added */
  addedAt: number;
}

/** LocalStorage key for watchlist persistence */
const WATCHLIST_KEY = "aidyor_watchlist";

/**
 * Hook for managing a locally-stored token watchlist.
 * Data persists in browser localStorage (not synced across devices).
 * 
 * @returns {Object} Watchlist state and management functions
 * @returns {WatchlistToken[]} watchlist - Array of watched tokens
 * @returns {Function} addToken - Add a token to the watchlist
 * @returns {Function} removeToken - Remove a token by address
 * @returns {Function} isInWatchlist - Check if token is already watched
 * @returns {Function} updateToken - Update token properties
 * @returns {Function} updateAllTokens - Replace entire watchlist
 * 
 * @example
 * ```tsx
 * const { watchlist, addToken, isInWatchlist } = useWatchlist();
 * 
 * if (!isInWatchlist("0x...")) {
 *   addToken({ address: "0x...", name: "Token", network: "ETH", riskScore: 75 });
 * }
 * ```
 */

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
};
