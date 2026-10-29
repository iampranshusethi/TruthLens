"use client";

import { LogIn, MoonStar } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth";
import { authHeader } from "@/lib/live-review";

/** Mirrors the server's Quota type (src/lib/quota.ts). */
export type Quota = { signedIn: boolean; unlimited: boolean; limit: number; used: number; remaining: number };

/**
 * Today's allowance of reviews and comparisons (decisions.md D39). Checked before
 * a file is read, so nobody uploads a document only to be told no. The server
 * enforces the same limit regardless.
 */
export function useQuota(): Quota | null {
  const { status } = useAuth();
  const [quota, setQuota] = useState<Quota | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    let live = true;
    const load = async () => {
      const res = await fetch("/api/quota", { headers: await authHeader(), cache: "no-store" }).catch(() => null);
      const q = res?.ok ? ((await res.json()) as Quota) : null;
      if (live) setQuota(q);
    };
    load();
    window.addEventListener("tl:quota", load);
    return () => {
      live = false;
      window.removeEventListener("tl:quota", load);
    };
  }, [status]);

  return quota;
}

export const outOfGenerations = (q: Quota | null) => !!q && !q.unlimited && q.remaining <= 0;

/** A quiet line under an upload area: what's left today. */
export function QuotaHint({ quota }: { quota: Quota | null }) {
  if (!quota || quota.unlimited || quota.remaining <= 0) return null;
  return (
    <p className="mt-2 text-center text-xs text-ink-4">
      {quota.signedIn
        ? `${quota.remaining} of ${quota.limit} reviews left today`
        : "1 free review today · sign in for 3 a day"}
    </p>
  );
}

/** Shown instead of reading a file when today's allowance is used up. */
export function LimitNotice({ quota, onClose }: { quota: Quota; onClose?: () => void }) {
  const { signIn } = useAuth();
  const guest = !quota.signedIn;
  return (
    <div role="alert" className="mx-auto mt-4 max-w-md rounded-3xl border border-line bg-card p-6 text-center shadow-soft">
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-mint-soft text-mint-ink">
        {guest ? <LogIn size={18} /> : <MoonStar size={18} />}
      </span>
      <p className="mt-4 font-display text-[1.35rem] leading-tight">
        {guest ? "Sign in to keep going" : "That's today's reviews done"}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">
        {guest
          ? "You've used today's free review. Sign in with Google to get 3 reviews or comparisons a day, saved to your account."
          : `You've used all ${quota.limit} of today's reviews and comparisons. Your allowance resets at midnight, India time. Your saved reviews are all still in Your History.`}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {guest && (
          <button
            type="button"
            onClick={signIn}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-transform active:scale-[0.98]"
          >
            <LogIn size={15} /> Sign in with Google
          </button>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line-strong px-4 py-2 text-sm text-ink-2 transition-colors hover:bg-sunken"
          >
            Not now
          </button>
        )}
      </div>
    </div>
  );
}
