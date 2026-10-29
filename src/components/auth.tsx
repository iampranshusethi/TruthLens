"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";
import { useToast } from "@/components/toast";
import { saveToCloud, supabase } from "@/lib/cloud";
import { listComparisons } from "@/lib/compare-store";
import { listReviews } from "@/lib/review-store";

type Auth = {
  /** "disabled" until Supabase keys are configured. */
  status: "disabled" | "loading" | "signed-out" | "signed-in";
  user: { name: string; email: string; avatar?: string } | null;
  signIn: () => void;
  signOut: () => void;
};

const AuthContext = createContext<Auth>({ status: "disabled", user: null, signIn: () => {}, signOut: () => {} });

export const useAuth = () => useContext(AuthContext);

function toUser(u: User): Auth["user"] {
  const m = u.user_metadata ?? {};
  return { name: m.full_name ?? m.name ?? u.email ?? "You", email: u.email ?? "", avatar: m.avatar_url ?? m.picture };
}

/** Uploads reviews made before signing in, so history follows the user. */
async function syncLocal() {
  for (const r of listReviews()) if (r.result) await saveToCloud("review", r);
  for (const c of listComparisons()) if (c.result) await saveToCloud("compare", c);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const sb = supabase();
  const [status, setStatus] = useState<Auth["status"]>(sb ? "loading" : "disabled");
  const [user, setUser] = useState<Auth["user"]>(null);

  useEffect(() => {
    if (!sb) return;
    const { data } = sb.auth.onAuthStateChange((event, session) => {
      setUser(session ? toUser(session.user) : null);
      setStatus(session ? "signed-in" : "signed-out");
      if (event === "SIGNED_IN") syncLocal();
    });
    return () => data.subscription.unsubscribe();
  }, [sb]);

  const value: Auth = {
    status,
    user,
    signIn: () => {
      if (!sb) return toast("Google sign-in is coming soon");
      sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/history` } });
    },
    signOut: async () => {
      await sb?.auth.signOut();
      toast("Signed out. Reviews on this device are still here.");
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
