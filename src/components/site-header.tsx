"use client";

import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { useAuth } from "@/components/auth";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/user-menu";

const NAV = [
  { href: "/", label: "Home", active: (p: string) => p === "/" },
  { href: "/review/sample", label: "Review", active: (p: string) => p.startsWith("/review") },
  { href: "/compare", label: "Compare", active: (p: string) => p.startsWith("/compare") },
  { href: "/history", label: "Your history", active: (p: string) => p.startsWith("/history") },
  { href: "/about", label: "About", active: (p: string) => p.startsWith("/about") },
];

function NavLinks({ pathname, className, onNavigate }: { pathname: string | null; className: string; onNavigate?: () => void }) {
  return (
    <nav className={className}>
      {NAV.map((item) => {
        const active = pathname !== null && item.active(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 transition-colors ${
              active ? "bg-sunken text-ink" : "text-ink-3 hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

// The active link depends on the URL, which dynamic pages only know at request time.
function ActiveNavLinks(props: { className: string; onNavigate?: () => void }) {
  return <NavLinks pathname={usePathname()} {...props} />;
}

const DESKTOP = "hidden items-center gap-0.5 text-sm md:flex";
const MOBILE = "flex flex-col gap-1 text-[15px] [&>a]:rounded-2xl [&>a]:px-4 [&>a]:py-3";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { status, signIn } = useAuth();

  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-4 print:hidden">
      <div className="relative mx-auto grid h-12 max-w-5xl grid-cols-[1fr_auto_1fr] items-center rounded-full border border-line bg-card/75 pr-1.5 pl-4 shadow-soft backdrop-blur-xl">
        <Logo />
        <Suspense fallback={<NavLinks pathname={null} className={DESKTOP} />}>
          <ActiveNavLinks className={DESKTOP} />
        </Suspense>
        <div className="flex items-center justify-end gap-1">
          <UserMenu />
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-sunken md:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Phones: the links don't fit in the bar, so they open as a panel below it. */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="mx-auto mt-2 max-w-5xl rounded-3xl border border-line bg-card/95 p-2 shadow-lift backdrop-blur-xl md:hidden"
          >
            <Suspense fallback={<NavLinks pathname={null} className={MOBILE} />}>
              <ActiveNavLinks className={MOBILE} onNavigate={() => setOpen(false)} />
            </Suspense>
            {status !== "signed-in" && status !== "loading" && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  signIn();
                }}
                className="mt-1 w-full rounded-2xl bg-ink px-4 py-3 text-[15px] font-medium text-paper sm:hidden"
              >
                Sign in
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
