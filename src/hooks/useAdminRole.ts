/**
 * @fileoverview Server-verified admin role check.
 * Calls the security-definer `has_role` function in the backend — the client
 * never decides on its own whether a user is an admin.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AdminRoleState {
  /** True only when the backend confirms the `admin` role. */
  isAdmin: boolean;
  /** True while auth or the role check is still resolving. */
  loading: boolean;
  /** True when the role check itself could not be completed. */
  unavailable: boolean;
}

export const useAdminRole = (): AdminRoleState => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      setChecking(false);
      return;
    }

    setChecking(true);
    (async () => {
      // Fails closed: any error leaves isAdmin false.
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: boolean | null; error: unknown }>)("has_role", {
        _user_id: user.id,
        _role: "admin",
      });

      if (cancelled) return;
      setIsAdmin(data === true);
      setUnavailable(Boolean(error));
      setChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { isAdmin, loading: authLoading || checking, unavailable };
};
