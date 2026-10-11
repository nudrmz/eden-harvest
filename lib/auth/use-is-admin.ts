"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/supabase/hooks";

/** Whether the signed-in user is on the ADMIN_EMAILS list (checked server-side). */
export function useIsAdmin(): boolean {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    fetch("/api/admin/me")
      .then((r) => (r.ok ? r.json() : { isAdmin: false }))
      .then((d: { isAdmin?: boolean }) => {
        if (!cancelled) setIsAdmin(Boolean(d.isAdmin));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user]);

  return isAdmin;
}
