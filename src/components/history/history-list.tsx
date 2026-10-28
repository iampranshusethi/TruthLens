"use client";

import { Briefcase, ChevronRight, Home, LogIn, ShieldPlus } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/toast";

type Item = {
  id: string;
  kind: "rental" | "insurance" | "contract";
  title: string;
  detail: string;
  when: string;
  verdict: string;
  counts: { risk: number; caution: number; fair: number };
  href?: string;
};

// Prototype data; becomes the user's saved reviews once sign-in lands.
const ITEMS: Item[] = [
  {
    id: "1",
    kind: "rental",
    title: "Flat_agreement_Koramangala.pdf",
    detail: "Rental agreement · 11 pages",
    when: "Today",
    verdict: "Sign it, but negotiate two clauses first",
    counts: { risk: 2, caution: 8, fair: 6 },
    href: "/review/sample",
  },
  {
    id: "2",
    kind: "insurance",
    title: "Shield Health Optima vs Navya Family Floater",
    detail: "Comparison · 2 policies",
    when: "Yesterday",
    verdict: "Shield Health Optima fits you better",
    counts: { risk: 1, caution: 4, fair: 9 },
    href: "/compare",
  },
  {
    id: "3",
    kind: "contract",
    title: "Offer_letter_Senior_Analyst.pdf",
    detail: "Job offer · 6 pages",
    when: "12 Oct",
    verdict: "Fair overall, but check the 2-year non-compete",
    counts: { risk: 1, caution: 2, fair: 14 },
  },
  {
    id: "4",
    kind: "contract",
    title: "Freelance_design_agreement.docx",
    detail: "Service agreement · 4 pages",
    when: "28 Sep",
    verdict: "Payment terms favour the client. Ask for 50% upfront",
    counts: { risk: 0, caution: 3, fair: 8 },
  },
];

const ICON = { rental: Home, insurance: ShieldPlus, contract: Briefcase };

export function HistoryList() {
  const toast = useToast();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-mint/50 bg-mint-soft/40 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">Keep your reviews in one place</p>
          <p className="mt-0.5 text-sm text-ink-2">
            Sign in to save reviews and come back to them before renewal time. We never store your documents without asking.
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast("Google sign-in arrives with the backend phase")}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-transform active:scale-[0.98]"
        >
          <LogIn size={16} /> Continue with Google
        </button>
      </div>

      <ul className="grid gap-3">
        {ITEMS.map((item) => {
          const Icon = ICON[item.kind];
          const body = (
            <>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sunken text-ink-2">
                <Icon size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-medium">{item.title}</span>
                  <span className="shrink-0 text-xs text-ink-3">{item.when}</span>
                </span>
                <span className="mt-0.5 block text-xs text-ink-3">{item.detail}</span>
                <span className="mt-2 block font-display text-[1.05rem] leading-snug font-medium tracking-[-0.02em]">{item.verdict}</span>
                <span className="mt-2.5 flex gap-3 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-risk-ink">
                    <span className="h-1.5 w-1.5 rounded-full bg-risk" /> {item.counts.risk}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-caution-ink">
                    <span className="h-1.5 w-1.5 rounded-full bg-caution" /> {item.counts.caution}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-fair-ink">
                    <span className="h-1.5 w-1.5 rounded-full bg-fair" /> {item.counts.fair}
                  </span>
                </span>
              </span>
              <ChevronRight size={18} className="mt-2.5 shrink-0 text-ink-4 transition-transform group-hover:translate-x-0.5" />
            </>
          );
          const cls =
            "group flex w-full items-start gap-4 rounded-3xl border border-line bg-card p-4 text-left transition-all hover:border-line-strong hover:shadow-soft sm:p-5";
          return (
            <li key={item.id} className="min-w-0">
              {item.href ? (
                <Link href={item.href} className={cls}>
                  {body}
                </Link>
              ) : (
                <button type="button" className={cls} onClick={() => toast("Example item. It opens once history is live")}>
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
