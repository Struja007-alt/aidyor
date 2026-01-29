import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStripeSubscription } from '@/hooks/useStripeSubscription';

const DAILY_FREE_LIMIT = 5;
const STORAGE_KEY = 'aidyor_scan_usage';

interface ScanUsage {
  date: string;
  count: number;
}

/**
 * Hook to track and enforce scan usage limits.
 * Free users: 5 scans/day
 * Pro users: Unlimited scans
 */
export function useScanUsage() {
  const { user } = useAuth();
  const { isPro, loading: subscriptionLoading } = useStripeSubscription();
  const [usage, setUsage] = useState<ScanUsage | null>(null);

  // Get today's date string (YYYY-MM-DD)
  const getTodayString = () => new Date().toISOString().split('T')[0];

  // Load usage from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const today = getTodayString();

    if (stored) {
      try {
        const parsed: ScanUsage = JSON.parse(stored);
        // Reset if it's a new day
        if (parsed.date !== today) {
          const newUsage = { date: today, count: 0 };
          setUsage(newUsage);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newUsage));
        } else {
          setUsage(parsed);
        }
      } catch {
        const newUsage = { date: today, count: 0 };
        setUsage(newUsage);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newUsage));
      }
    } else {
      const newUsage = { date: today, count: 0 };
      setUsage(newUsage);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUsage));
    }
  }, []);

  // Check if user can scan
  const canScan = useCallback(() => {
    // Pro users have unlimited scans
    if (isPro) return true;
    
    // Check daily limit for free users
    if (!usage) return true; // Allow while loading
    
    return usage.count < DAILY_FREE_LIMIT;
  }, [isPro, usage]);

  // Increment scan count
  const recordScan = useCallback(() => {
    const today = getTodayString();
    
    setUsage(prev => {
      const newUsage = {
        date: today,
        count: (prev?.date === today ? prev.count : 0) + 1
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUsage));
      return newUsage;
    });
  }, []);

  // Get remaining scans for free users
  const remainingScans = isPro 
    ? Infinity 
    : Math.max(0, DAILY_FREE_LIMIT - (usage?.count || 0));

  // Get scans used today
  const scansUsedToday = usage?.count || 0;

  return {
    canScan: canScan(),
    recordScan,
    remainingScans,
    scansUsedToday,
    dailyLimit: DAILY_FREE_LIMIT,
    isPro,
    loading: subscriptionLoading || !usage,
  };
}
