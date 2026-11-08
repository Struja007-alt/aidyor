import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface NewsItem {
  id: string;
  title: string;
  excerpt: string | null;
  url: string;
  image_url: string | null;
  published_at: string;
  source: string;
  source_logo: string | null;
  sponsored: boolean;
  slot: number | null;
  tier: "top" | "top3" | "top5" | null;
}

interface CryptoNewsResponse {
  items: NewsItem[];
  total: number;
  timestamp: string;
}

export function useCryptoNews() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchNews = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke<CryptoNewsResponse>(
        "crypto-news",
        { method: "POST" }
      );

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.items) {
        setItems(data.items);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error("Failed to fetch crypto news:", err);
      setError("Failed to load crypto news");
      // Keep existing items if fetch fails
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();

    // Auto-refresh every 5 minutes, but only while the tab is visible
    const interval = setInterval(() => {
      if (!document.hidden) fetchNews();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchNews]);

  const refresh = useCallback(async () => {
    await fetchNews();
  }, [fetchNews]);

  return {
    items,
    isLoading,
    error,
    lastUpdated,
    refresh,
  };
}
