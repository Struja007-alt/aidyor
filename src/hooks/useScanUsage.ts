import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStripeSubscription } from '@/hooks/useStripeSubscription';

const DAILY_FREE_LIMIT = 3;
const LIMIT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-scan-limit`;

type LimitResponse = {
  ok: boolean;
  data: { allowed?: boolean; remaining?: number } | null;
};

export function useScanUsage() {
  const { session } = useAuth();
  const { isPro, loading: subscriptionLoading } = useStripeSubscription();
  const [remainingScans, setRemainingScans] = useState<number>(DAILY_FREE_LIMIT);
  const [scansUsedToday, setScansUsedToday] = useState<number>(0);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  // Incremented on every scan/peek so a slow, older response can't overwrite newer state.
  const requestSeq = useRef(0);
  const accessToken = session?.access_token;

  const callLimit = useCallback(
    async (body?: Record<string, unknown>): Promise<LimitResponse> => {
      const res = await fetch(LIMIT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: accessToken
            ? `Bearer ${accessToken}`
            : `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      let data: LimitResponse['data'] = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      return { ok: res.ok, data };
    },
    [accessToken],
  );

  // Server atomically checks AND increments. Returns true if the scan may proceed.
  const checkAndRecordScan = useCallback(async (): Promise<boolean> => {
    const seq = ++requestSeq.current;
    setChecking(true);
    try {
      const { ok, data } = await callLimit();

      if (!ok || !data) {
        // Server/network problem: fail closed, but don't claim the limit was reached.
        console.error('[useScanUsage] check failed: server error');
        setError(true);
        return false;
      }

      setError(false);

      if (!data.allowed) {
        // Genuine limit reached.
        if (seq === requestSeq.current) {
          setBlocked(true);
          setRemainingScans(0);
          setScansUsedToday(DAILY_FREE_LIMIT);
        }
        return false;
      }

      if (seq === requestSeq.current) {
        setBlocked(false);
        if (typeof data.remaining === 'number' && data.remaining >= 0) {
          setRemainingScans(data.remaining);
          setScansUsedToday(DAILY_FREE_LIMIT - data.remaining);
        }
      }
      return true;
    } catch (e) {
      console.error('[useScanUsage] check failed:', e);
      setError(true);
      return false;
    } finally {
      setChecking(false);
    }
  }, [callLimit]);

  // Read-only: fetch the true remaining count without consuming a scan.
  const peek = useCallback(async () => {
    const seq = ++requestSeq.current;
    try {
      const { ok, data } = await callLimit({ peek: true });
      if (seq !== requestSeq.current) return; // a newer request superseded this one
      if (!ok || !data) return;
      if (typeof data.remaining === 'number' && data.remaining >= 0) {
        setRemainingScans(data.remaining);
        setScansUsedToday(DAILY_FREE_LIMIT - data.remaining);
        setBlocked(data.remaining === 0); // clears a stale block after login / new day
        setError(false);
      }
    } catch (e) {
      console.error('[useScanUsage] peek failed:', e);
    }
  }, [callLimit]);

  // On mount and when the user logs in/out (token changes).
  useEffect(() => {
    if (isPro) return;
    peek();
  }, [isPro, peek]);

  // Re-check when the tab becomes visible again (handles the daily reset without a reload).
  useEffect(() => {
    if (isPro) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') peek();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isPro, peek]);

  return {
    canScan: isPro || !blocked,
    recordScan: checkAndRecordScan,
    remainingScans: isPro ? Infinity : remainingScans,
    scansUsedToday,
    dailyLimit: DAILY_FREE_LIMIT,
    isPro,
    error, // new: true when the last check failed for a non-limit reason
    loading: subscriptionLoading || checking,
  };
}