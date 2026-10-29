"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { useToast } from "@/components/toast";

const NAV = [
  { href: "/review/sample", match: "/review", label: "Review" },
  { href: "/compare", match: "/compare", label: "Compare" },
  { href: "/history", match: "/history", label: "History" },
];

function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav className="flex items-center gap-0.5 text-sm">
      {NAV.map((item) => {
        const active = pathname?.startsWith(item.match);
        return (
          <Link
            key={item.href}
            href={item.href}
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
function ActiveNavLinks() {
  return <NavLinks pathname={usePathname()} />;
}

export function SiteHeader() {
  const toast = useToast();

  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-4">
      <div className="mx-auto grid h-12 max-w-5xl grid-cols-[1fr_auto_1fr] items-center rounded-full border border-line bg-card/75 pr-1.5 pl-4 shadow-soft backdrop-blur-xl">
        <Logo />
        <Suspense fallback={<NavLinks pathname={null} />}>
          <ActiveNavLinks />
        </Suspense>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => toast("Google sign-in is coming soon")}
            className="hidden rounded-full bg-ink px-4 py-1.5 text-sm text-paper transition-opacity hover:opacity-85 sm:block"
          >
            Sign in
          </button>
        </div>
      </div>
    </header>
  );
}
