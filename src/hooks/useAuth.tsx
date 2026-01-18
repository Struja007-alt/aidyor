/**
 * @fileoverview Authentication hook and context provider
 * Manages Supabase authentication state and user sessions
 */

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Authentication context type definition
 * @interface AuthContextType
 */
interface AuthContextType {
  /** Current authenticated user or null */
  user: User | null;
  /** Current session or null */
  session: Session | null;
  /** Whether auth state is still loading */
  loading: boolean;
  /** Sign up a new user with email/password */
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  /** Sign in existing user with email/password */
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  /** Sign out current user */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Authentication context provider component.
 * Wraps the app to provide auth state and functions to all children.
 * 
 * @component
 * @example
 * ```tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * ```
 */

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  // Return a default state if context is not available
  // This allows the hook to be used during initial render before provider mounts
  if (context === null) {
    return {
      user: null,
      session: null,
      loading: true,
      signUp: async () => ({ error: new Error("Auth not initialized") }),
      signIn: async () => ({ error: new Error("Auth not initialized") }),
      signOut: async () => {},
    };
  }
  
  return context;
};
