import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStripeSubscription } from '@/hooks/useStripeSubscription';
import { supabase } from '@/integrations/supabase/client';

const DAILY_FREE_LIMIT = 5;

export function useScanUsage() {
  const { user, session } = useAuth();
  const { isPro, loading: subscriptionLoading } = useStripeSubscription();
  const [remainingScans, setRemainingScans] = useState<number>(DAILY_FREE_LIMIT);
  const [scansUsedToday, setScansUsedToday] = useState<number>(0);
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(false);

  // Calls the server, which atomically checks AND increments in one step.
  // Returns true if the scan is allowed to proceed.
  const checkAndRecordScan = useCallback(async (): Promise<boolean> => {
    setChecking(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-scan-limit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: session?.access_token
            ? `Bearer ${session.access_token}`
            : `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.allowed) {
        setBlocked(true);
        setRemainingScans(0);
        return false;
      }
      setBlocked(false);
      if (typeof data.remaining === 'number' && data.remaining >= 0) {
        setRemainingScans(data.remaining);
        setScansUsedToday(DAILY_FREE_LIMIT - data.remaining);
      }
      return true;
    } catch (e) {
      console.error('[useScanUsage] check failed:', e);
      // Fail closed: if we can't verify, don't allow the scan.
      setBlocked(true);
      return false;
    } finally {
      setChecking(false);
    }
  }, [session]);

  return {
    canScan: isPro || !blocked,
    recordScan: checkAndRecordScan, // now async + does the real check
    remainingScans: isPro ? Infinity : remainingScans,
    scansUsedToday,
    dailyLimit: DAILY_FREE_LIMIT,
    isPro,
    loading: subscriptionLoading || checking,
  };
}
