"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { createClient } from "@/lib/supabase/client";
import { ensureUserProfile } from "@/lib/auth/profile";
import type { EdenUser } from "@/lib/types/user";

interface AuthContextValue {
  user: EdenUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isSeller: boolean;
  isBuyer: boolean;
  isVerifiedAccess: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<EdenUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const {
      data: { user: authUser }
    } = await supabase.auth.getUser();

    if (!authUser) {
      setUser(null);
      return;
    }

    const { profile } = await ensureUserProfile(supabase, authUser);
    setUser(profile);
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (session?.user) {
        const { profile } = await ensureUserProfile(supabase, session.user);
        if (mounted) setUser(profile);
      } else {
        setUser(null);
      }
      if (mounted) setLoading(false);
    }

    void init();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT") {
        setUser(null);
        setLoading(false);
        return;
      }

      if (session?.user) {
        const { profile } = await ensureUserProfile(supabase, session.user);
        if (mounted) setUser(profile);
      } else if (event === "INITIAL_SESSION") {
        setUser(null);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isSeller: user?.role === "seller",
      isBuyer: user?.role === "buyer",
      isVerifiedAccess: user?.membership_tier === "verified_access",
      signOut,
      refreshProfile
    }),
    [user, loading, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
