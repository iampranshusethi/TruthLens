"use client";

import { LogOut } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth";

/** Sign-in button, or the signed-in user's avatar with a small menu. */
export function UserMenu() {
  const { status, user, signIn, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (status === "loading") return <span className="hidden h-8 w-8 rounded-full bg-sunken sm:block" />;

  if (status !== "signed-in" || !user) {
    return (
      <button
        type="button"
        onClick={signIn}
        className="hidden rounded-full bg-ink px-4 py-1.5 text-sm text-paper transition-opacity hover:opacity-85 sm:block"
      >
        Sign in
      </button>
    );
  }

  const initials = user.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label="Account"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-mint-soft text-xs font-medium text-mint-ink ring-2 ring-card"
      >
        {user.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote Google avatar, tiny
          <img src={user.avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          initials
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-11 right-0 w-60 rounded-2xl border border-line bg-card p-2 shadow-lift"
          >
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-ink-3">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-2 transition-colors hover:bg-sunken"
            >
              <LogOut size={15} /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
