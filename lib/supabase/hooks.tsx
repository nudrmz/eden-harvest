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

const AUTH_LOADING_TIMEOUT_MS = 2000;

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

  const finishLoading = useCallback(() => {
    setLoading(false);
  }, []);

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
    let resolved = false;

    const timeoutId = window.setTimeout(() => {
      if (!mounted || resolved) return;
      resolved = true;
      setUser(null);
      setLoading(false);
    }, AUTH_LOADING_TIMEOUT_MS);

    async function init() {
      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();

        if (!mounted || resolved) return;

        if (session?.user) {
          const { profile } = await ensureUserProfile(supabase, session.user);
          if (mounted && !resolved) setUser(profile);
        } else {
          setUser(null);
        }
      } catch {
        if (mounted && !resolved) setUser(null);
      } finally {
        if (mounted && !resolved) {
          resolved = true;
          setLoading(false);
        }
      }
    }

    void init();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT") {
        setUser(null);
        finishLoading();
        return;
      }

      // Defer async work — awaiting inside this callback deadlocks signInWithPassword.
      setTimeout(() => {
        void (async () => {
          if (!mounted) return;

          if (session?.user) {
            const { profile } = await ensureUserProfile(supabase, session.user);
            if (mounted) setUser(profile);
          } else if (event === "INITIAL_SESSION") {
            setUser(null);
          }
          if (mounted) finishLoading();
        })();
      }, 0);
    });

    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [supabase, finishLoading]);

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
