"use client";

import type { User } from "@supabase/supabase-js";
import { LoaderCircle, Lock, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { createContext, useContext, useEffect, useEffectEvent, useRef, useState } from "react";
import { LogoMark } from "@/components/logo";
import { useToast } from "@/components/toast";
import { saveToCloud, supabase } from "@/lib/cloud";
import { createNonce, googleClientId, loadGoogleIdentity } from "@/lib/google-identity";
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

  const [dialogOpen, setDialogOpen] = useState(false);

  const value: Auth = {
    status,
    user,
    signIn: () => {
      if (!sb) return toast("Google sign-in is coming soon");
      // Without a Google client ID, fall back to Supabase's redirect flow.
      if (!googleClientId) {
        sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/history` } });
        return;
      }
      setDialogOpen(true);
    },
    signOut: async () => {
      await sb?.auth.signOut();
      toast("Signed out. Reviews on this device are still here.");
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {dialogOpen && sb && (
          <SignInDialog
            onClose={() => setDialogOpen(false)}
            onCredential={async (token, nonce) => {
              const { error } = await sb.auth.signInWithIdToken({ provider: "google", token, nonce });
              if (error) {
                console.warn("[auth] sign-in failed:", error.message);
                toast("Sign-in didn't work. Please try again.");
                return;
              }
              setDialogOpen(false);
              toast("Signed in. Your reviews will now be saved to your account.");
            }}
          />
        )}
      </AnimatePresence>
    </AuthContext.Provider>
  );
}

/** A small panel holding Google's own button, so Google shows this site's address, not the auth server's. */
function SignInDialog({
  onClose,
  onCredential,
}: {
  onClose: () => void;
  onCredential: (token: string, rawNonce: string) => Promise<void>;
}) {
  const slot = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "working" | "failed">("loading");
  const close = useEffectEvent(onClose);
  const credential = useEffectEvent(async (token: string, raw: string) => {
    setState("working");
    await onCredential(token, raw);
    setState("ready");
  });

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [gsi, nonce] = await Promise.all([loadGoogleIdentity(), createNonce()]);
        if (!live || !slot.current) return;
        gsi.initialize({
          client_id: googleClientId!,
          nonce: nonce.hashed,
          context: "signin",
          itp_support: true,
          // FedCM fails in some browsers (embedded ones, some Edge setups) with "Error retrieving a token";
          // Google's classic popup works everywhere.
          use_fedcm_for_button: false,
          callback: ({ credential: token }) => credential(token, nonce.raw),
        });
        gsi.renderButton(slot.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          logo_alignment: "left",
          width: 280,
        });
        setState("ready");
      } catch {
        if (live) setState("failed");
      }
    })();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", esc);
    return () => {
      live = false;
      document.removeEventListener("keydown", esc);
    };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="signin-title"
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ type: "spring", damping: 26, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-3xl border border-line bg-card p-7 text-center shadow-lift"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1.5 text-ink-4 transition-colors hover:bg-sunken hover:text-ink"
        >
          <X size={16} />
        </button>
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-mint-soft">
          <LogoMark size={22} />
        </span>
        <h2 id="signin-title" className="mt-4 font-display text-[1.6rem] leading-tight">
          Sign in to TruthLens
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-3">
          Keep your reviews and comparisons on every device. Reviews you&apos;ve already made in this browser come with
          you.
        </p>
        <div className="mt-6 flex min-h-11 items-center justify-center">
          {state === "failed" ? (
            <p className="text-sm text-risk-ink">Google sign-in couldn&apos;t load. Check your connection and try again.</p>
          ) : (
            <>
              {state !== "ready" && <LoaderCircle size={20} className="animate-spin text-ink-4" />}
              <div ref={slot} className={state === "ready" ? "" : "hidden"} />
            </>
          )}
        </div>
        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-ink-4">
          <Lock size={11} /> We only use your name, email and photo.
        </p>
      </motion.div>
    </motion.div>
  );
}
