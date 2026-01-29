import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SubscriptionStatus {
  subscribed: boolean;
  has_pro: boolean;
  has_whale_pro: boolean;
  pro_subscription_end: string | null;
  whale_pro_subscription_end: string | null;
}

export function useStripeSubscription() {
  const { user, session } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setStatus(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('stripe-check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (fnError) throw fnError;
      setStatus(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check subscription';
      setError(message);
      console.error('Subscription check error:', err);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  // Check on mount and when session changes
  useEffect(() => {
    if (user) {
      checkSubscription();
    }
  }, [user, checkSubscription]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  const startCheckout = async (priceType: 'pro' | 'whale_pro') => {
    if (!session?.access_token) {
      toast.error('Please sign in to subscribe');
      return;
    }

    // Whale Pro requires active Pro subscription
    if (priceType === 'whale_pro' && !status?.has_pro) {
      toast.error('Whale Pro requires an active Pro subscription first');
      return;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke('stripe-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { priceType },
      });

      if (fnError) throw fnError;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start checkout';
      toast.error(message);
      console.error('Checkout error:', err);
    }
  };

  const openCustomerPortal = async () => {
    if (!session?.access_token) {
      toast.error('Please sign in to manage subscription');
      return;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke('stripe-customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (fnError) throw fnError;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open customer portal';
      toast.error(message);
      console.error('Portal error:', err);
    }
  };

  return {
    status,
    loading,
    error,
    checkSubscription,
    startCheckout,
    openCustomerPortal,
    isPro: status?.has_pro ?? false,
    isWhalePro: status?.has_whale_pro ?? false,
  };
}
