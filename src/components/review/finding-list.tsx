"use client";

import { ChevronRight, Heart } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { SEVERITY } from "@/lib/severity";
import type { Clause, Finding, Severity } from "@/lib/types";

export type Filter = "all" | Severity;

const ORDER = { risk: 0, caution: 1, fair: 2 } as const;

/** Findings that touch the user's priorities come first, then by severity. */
export function rankFindings(findings: Finding[], selected: Set<string>) {
  const matters = (f: Finding) => f.severity !== "fair" && f.priorities.some((p) => selected.has(p));
  return [...findings].sort(
    (a, b) => Number(matters(b)) - Number(matters(a)) || ORDER[a.severity] - ORDER[b.severity],
  );
}

export function FindingList({
  findings,
  clauses,
  selected,
  filter,
  onSelect,
}: {
  findings: Finding[];
  clauses: Clause[];
  selected: Set<string>;
  filter: Filter;
  onSelect: (f: Finding) => void;
}) {
  const visible = rankFindings(findings, selected).filter((f) => filter === "all" || f.severity === filter);
  const numberOf = (id: string) => clauses.find((c) => c.id === id)?.number;

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-card">
      <AnimatePresence initial={false}>
        {visible.map((f) => {
          const sev = SEVERITY[f.severity];
          const matters = f.severity !== "fair" && f.priorities.some((p) => selected.has(p));
          return (
            <motion.li
              key={f.id}
              layout="position"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <button
                type="button"
                onClick={() => onSelect(f)}
                className="group flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-sunken/60"
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${sev.dot}`} aria-label={sev.label} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm leading-snug text-ink">{f.title}</span>
                  <span className="mt-1 flex items-center gap-2 text-xs text-ink-3">
                    Clause {numberOf(f.clauseId)}
                    {matters && (
                      <span className="inline-flex items-center gap-1 text-mint-ink">
                        <Heart size={11} strokeWidth={2.5} /> Matters to you
                      </span>
                    )}
                  </span>
                </span>
                <ChevronRight
                  size={16}
                  className="mt-0.5 shrink-0 text-ink-4 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-2"
                />
              </button>
            </motion.li>
          );
        })}
      </AnimatePresence>
      {visible.length === 0 && <li className="px-4 py-6 text-center text-sm text-ink-3">Nothing here yet.</li>}
    </ul>
  );
}
