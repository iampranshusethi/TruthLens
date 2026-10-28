"use client";

import { FileText } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useReducer, useRef, useState } from "react";
import { FindingDetail } from "@/components/review/finding-detail";
import { type Filter, FindingList } from "@/components/review/finding-list";
import { HighlightedText } from "@/components/review/highlighted-text";
import { PriorityChips } from "@/components/review/priority-chips";
import { CompletedLine, ProgressCard, type StageStatus } from "@/components/review/progress-card";
import { replayReview } from "@/lib/replay";
import { SEVERITY } from "@/lib/severity";
import type { DocumentAnalysis, Finding, ReviewEvent, Severity, StageId, Verdict } from "@/lib/types";

type State = {
  stages: Record<StageId, StageStatus>;
  findings: Finding[];
  verdict: Verdict | null;
  done: boolean;
};

const initial: State = {
  stages: { read: "pending", split: "pending", check: "pending", verify: "pending" },
  findings: [],
  verdict: null,
  done: false,
};

function reducer(state: State, e: ReviewEvent | { type: "reset" }): State {
  switch (e.type) {
    case "reset":
      return initial;
    case "stage":
      return { ...state, stages: { ...state.stages, [e.stage]: e.status } };
    case "finding":
      return { ...state, findings: [...state.findings, e.finding] };
    case "verdict":
      return { ...state, verdict: e.verdict };
    case "done":
      return { ...state, done: true };
  }
}

const KIND_LABEL = { rental: "Rental agreement", insurance: "Insurance policy", contract: "Contract" };

export function ReviewScreen({ analysis }: { analysis: DocumentAnalysis }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [elapsed, setElapsed] = useState(0);
  const [took, setTook] = useState(0);
  const startedAt = useRef(0);
  const panel = useRef<HTMLDivElement>(null);

  // Run (or replay) the review.
  useEffect(() => {
    dispatch({ type: "reset" });
    startedAt.current = Date.now();
    return replayReview(analysis, dispatch);
  }, [analysis]);

  // Elapsed-time ticker drives the "taking longer than usual" message.
  useEffect(() => {
    if (state.done) {
      setTook(Math.round((Date.now() - startedAt.current) / 1000));
      return;
    }
    const id = setInterval(() => setElapsed((Date.now() - startedAt.current) / 1000), 500);
    return () => clearInterval(id);
  }, [state.done]);

  // If the user switched tabs while waiting, tell them in the tab title.
  useEffect(() => {
    if (!state.done || !document.hidden) return;
    const original = document.title;
    document.title = "✓ Review ready · TruthLens";
    const restore = () => {
      if (!document.hidden) document.title = original;
    };
    document.addEventListener("visibilitychange", restore);
    return () => document.removeEventListener("visibilitychange", restore);
  }, [state.done]);

  const checkedClauses = new Set(state.findings.map((f) => f.clauseId));
  const active = state.findings.find((f) => f.id === activeId) ?? null;
  const activeClause = active ? analysis.clauses.find((c) => c.id === active.clauseId)! : null;
  const counts = (s: Severity) => state.findings.filter((f) => f.severity === s).length;

  const select = (f: Finding) => {
    setActiveId(f.id);
    panel.current?.scrollTo({ top: 0 });
    if (window.matchMedia("(min-width: 1024px)").matches) {
      document.getElementById(`clause-${f.clauseId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-8 pb-16 sm:px-6 lg:pt-12">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.14em] text-mint-ink uppercase">
            {KIND_LABEL[analysis.kind]} review
          </p>
          <h1 className="mt-2 font-display text-[2rem] sm:text-[2.6rem]">{analysis.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-ink-2">
            <FileText size={13} className="text-ink-3" />
            {analysis.fileName}
          </span>
          <span className="rounded-full border border-line bg-card px-3 py-1.5">{analysis.pages} pages</span>
          {analysis.id === "sample" && (
            <span className="rounded-full bg-mint-soft px-3 py-1.5 text-mint-ink">Sample document</span>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,1fr)] lg:gap-8">
        {/* Document */}
        <article className="order-2 overflow-hidden rounded-[20px] bg-card shadow-window lg:order-1">
          <div className="flex items-center gap-3 border-b border-line bg-sunken/50 px-4 py-2.5">
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
              <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
              <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            </div>
            <span className="mx-auto truncate text-[11px] text-ink-3">{analysis.fileName}</span>
            <span className="w-[42px]" aria-hidden="true" />
          </div>
          <div className="px-5 py-7 sm:px-10 sm:py-10">
          <p className="font-doc text-xl font-medium tracking-tight sm:text-2xl">{analysis.title}</p>
          <div className="mt-7 space-y-6">
            {analysis.clauses.map((clause) => {
              const lit = state.done || checkedClauses.has(clause.id);
              return (
                <section
                  key={clause.id}
                  id={`clause-${clause.id}`}
                  className="scroll-mt-24 transition-colors duration-500"
                >
                  <p className="mb-1 text-xs text-ink-3">
                    <span className="tabular-nums">{clause.number}</span> · {clause.heading}
                  </p>
                  <p
                    className={`font-doc text-[16px] leading-[1.75] transition-colors duration-700 ${
                      lit ? "text-ink-2" : "text-ink-4"
                    }`}
                  >
                    <HighlightedText
                      clause={clause}
                      findings={state.findings}
                      activeId={activeId}
                      onSelect={select}
                    />
                  </p>
                </section>
              );
            })}
          </div>
          </div>
        </article>

        {/* Side panel */}
        <aside className="order-1 lg:order-2">
          <div ref={panel} className="space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pb-4 [scrollbar-width:thin]">
            {active && activeClause ? (
              <div className="hidden lg:block">
                <FindingDetail
                  finding={active}
                  clause={activeClause}
                  otherParty={analysis.otherParty}
                  onBack={() => setActiveId(null)}
                />
              </div>
            ) : null}

            <div className={active ? "space-y-4 lg:hidden" : "space-y-4"}>
              <AnimatePresence mode="wait" initial={false}>
                {state.verdict ? (
                  <motion.div
                    key="verdict"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-3xl bg-ink p-6 text-paper shadow-lift"
                  >
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-[radial-gradient(70%_60%_at_100%_0%,rgb(94_214_180/0.22),transparent_70%)]"
                    />
                    <p className="relative text-xs font-medium tracking-[0.14em] text-mint uppercase">Verdict</p>
                    <p className="relative mt-2 font-display text-[1.6rem] leading-[1.1]">{state.verdict.headline}</p>
                    <p className="relative mt-3 text-sm leading-relaxed text-paper/75">{state.verdict.summary}</p>
                    <div className="relative mt-5 grid grid-cols-3 gap-2">
                      {(["risk", "caution", "fair"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setFilter(s)}
                          className="rounded-2xl bg-paper/8 px-3 py-2.5 text-left transition-colors hover:bg-paper/14"
                        >
                          <span className="block font-display text-2xl tabular-nums">{counts(s)}</span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-paper/70">
                            <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY[s].dot}`} />
                            {s === "fair" ? "Fair" : SEVERITY[s].label + (counts(s) === 1 ? "" : "s")}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="relative mt-4">
                      <CompletedLine clauseCount={analysis.clauses.length} seconds={took} />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="progress" exit={{ opacity: 0, y: -8 }}>
                    <ProgressCard
                      stages={state.stages}
                      clauseCount={analysis.clauses.length}
                      checked={checkedClauses.size}
                      pages={analysis.pages}
                      elapsed={elapsed}
                      expectedSeconds={10}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <PriorityChips
                priorities={analysis.priorities}
                selected={selected}
                onToggle={toggle}
                title={state.done ? "What matters to you" : "While we read: what matters most to you?"}
                hint="We'll put the findings that affect these first."
              />

              {state.findings.length > 0 && (
                <div>
                  <div className="mb-2.5 flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filter findings">
                    {(["all", "risk", "caution", "fair"] as const).map((f) => {
                      const n = f === "all" ? state.findings.length : counts(f);
                      const on = filter === f;
                      return (
                        <button
                          key={f}
                          type="button"
                          role="tab"
                          aria-selected={on}
                          onClick={() => setFilter(f)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-colors ${
                            on ? "bg-ink text-paper" : "text-ink-3 hover:bg-card hover:text-ink"
                          }`}
                        >
                          {f !== "all" && <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY[f].dot}`} />}
                          {f === "all" ? "All" : SEVERITY[f].label}
                          <span className="tabular-nums opacity-70">{n}</span>
                        </button>
                      );
                    })}
                  </div>
                  <FindingList
                    findings={state.findings}
                    clauses={analysis.clauses}
                    selected={selected}
                    filter={filter}
                    onSelect={select}
                  />
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile: finding detail as a bottom sheet */}
      <AnimatePresence>
        {active && activeClause && (
          <motion.div
            className="fixed inset-0 z-40 flex items-end bg-ink/30 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveId(null)}
          >
            <motion.div
              className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-paper p-3 pb-8"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong" />
              <FindingDetail
                finding={active}
                clause={activeClause}
                otherParty={analysis.otherParty}
                onBack={() => setActiveId(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
