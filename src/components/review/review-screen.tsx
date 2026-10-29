"use client";

import { CloudOff, FileDown, FileText, FlaskConical, LockKeyhole, LogIn, RotateCcw, ScanText } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useEffectEvent, useReducer, useRef, useState } from "react";
import { useAuth } from "@/components/auth";
import { ChatPanel } from "@/components/review/chat-panel";
import { printReport, Report } from "@/components/review/report";
import { FindingDetail } from "@/components/review/finding-detail";
import { type Filter, FindingList } from "@/components/review/finding-list";
import { HighlightedText } from "@/components/review/highlighted-text";
import { PriorityChips } from "@/components/review/priority-chips";
import { CompletedLine, ProgressCard, type StageStatus } from "@/components/review/progress-card";
import { KIND_LABEL, OTHER_PARTY, PRIORITIES } from "@/lib/ingest/kind";
import { SEVERITY } from "@/lib/severity";
import type {
  Clause,
  DocKind,
  Engine,
  Finding,
  ReviewErrorCode,
  ReviewEvent,
  Severity,
  StageId,
  Verdict,
} from "@/lib/types";

/** What's being reviewed: the sample, a fresh upload, or a review saved earlier. */
export type ReviewSubject = {
  id: string;
  fileName: string;
  pages: number;
  kind: DocKind;
  title: string;
  clauses: Clause[];
  isSample?: boolean;
  /** Personal details masked before analysis (decisions.md D9). */
  hiddenDetails?: number;
  /** Text came from page images read by the AI (decisions.md D25). */
  scanned?: boolean;
};

export type ReviewState = {
  stages: Record<StageId, StageStatus>;
  meta: { kind: DocKind; title: string; otherParty: string; engine: Engine } | null;
  findings: Finding[];
  dropped: number;
  verdict: Verdict | null;
  error: { code: ReviewErrorCode; message: string } | null;
  done: boolean;
};

const initial: ReviewState = {
  stages: { read: "active", split: "pending", check: "pending", verify: "pending" },
  meta: null,
  findings: [],
  dropped: 0,
  verdict: null,
  error: null,
  done: false,
};

function reducer(state: ReviewState, e: ReviewEvent | { type: "reset" }): ReviewState {
  switch (e.type) {
    case "reset":
      return initial;
    case "meta":
      return { ...state, meta: { kind: e.kind, title: e.title, otherParty: e.otherParty, engine: e.engine } };
    case "stage":
      return { ...state, stages: { ...state.stages, [e.stage]: e.status } };
    case "finding":
      return { ...state, findings: [...state.findings, e.finding] };
    case "dropped":
      return { ...state, dropped: e.count };
    case "verdict":
      return { ...state, verdict: e.verdict };
    case "error":
      return { ...state, error: { code: e.code, message: e.message } };
    case "done":
      return { ...state, done: true };
  }
}

export function ReviewScreen({
  subject,
  run,
  restoredSeconds,
  onFinished,
}: {
  subject: ReviewSubject;
  /** Starts the review, emitting events; returns a cancel function. */
  run: (emit: (e: ReviewEvent) => void) => () => void;
  restoredSeconds?: number;
  onFinished?: (state: ReviewState, seconds: number) => void;
}) {
  const [state, dispatch] = useReducer(reducer, initial);
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [elapsed, setElapsed] = useState(0);
  const [took, setTook] = useState(restoredSeconds ?? 0);
  const startedAt = useRef(0);
  const panel = useRef<HTMLDivElement>(null);

  const start = useEffectEvent(() => run(dispatch));

  // Run (or replay) the review; runs again on retry.
  useEffect(() => {
    dispatch({ type: "reset" });
    startedAt.current = Date.now();
    return start();
  }, [attempt]);

  const finished = useEffectEvent((seconds: number) => onFinished?.(state, seconds));

  // Elapsed-time ticker drives the "taking longer than usual" message.
  useEffect(() => {
    if (state.done) {
      const seconds = restoredSeconds ?? Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
      setTook(seconds);
      finished(seconds);
      return;
    }
    if (state.error) return;
    const id = setInterval(() => setElapsed((Date.now() - startedAt.current) / 1000), 500);
    return () => clearInterval(id);
  }, [state.done, state.error, restoredSeconds]);

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

  const kind = state.meta?.kind ?? subject.kind;
  const title = state.meta?.title ?? subject.title;
  const otherParty = state.meta?.otherParty ?? OTHER_PARTY[kind];
  const checkedClauses = new Set(state.findings.map((f) => f.clauseId));
  const active = state.findings.find((f) => f.id === activeId) ?? null;
  const activeClause = active ? subject.clauses.find((c) => c.id === active.clauseId)! : null;
  const counts = (s: Severity) => state.findings.filter((f) => f.severity === s).length;
  const failed = state.error !== null;

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

  // Chat citations scroll the document to the clause and flash it briefly.
  const [flash, setFlash] = useState<string | null>(null);
  const cite = (number: string) => {
    const clause = subject.clauses.find((c) => c.number === number);
    if (!clause) return;
    document.getElementById(`clause-${clause.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlash(clause.id);
    setTimeout(() => setFlash((f) => (f === clause.id ? null : f)), 1800);
  };

  const retry = () => {
    setActiveId(null);
    setAttempt((a) => a + 1);
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-8 pb-16 sm:px-6 lg:pt-12 print:max-w-none print:p-0">
      {state.done && state.verdict && (
        <Report
          title={title}
          fileName={subject.fileName}
          kind={kind}
          otherParty={otherParty}
          clauses={subject.clauses}
          findings={state.findings}
          verdict={state.verdict}
        />
      )}
      <div className="print:hidden">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-[0.14em] text-mint-ink uppercase">{KIND_LABEL[kind]} review</p>
          <h1 className="mt-2 font-display text-[2rem] text-balance sm:text-[2.6rem]">{title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-ink-2">
            <FileText size={13} className="shrink-0 text-ink-3" />
            <span className="truncate">{subject.fileName}</span>
          </span>
          <span className="rounded-full border border-line bg-card px-3 py-1.5">
            {subject.pages} {subject.pages === 1 ? "page" : "pages"}
          </span>
          {subject.isSample && <span className="rounded-full bg-mint-soft px-3 py-1.5 text-mint-ink">Sample document</span>}
          {!!subject.hiddenDetails && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-mint-soft px-3 py-1.5 text-mint-ink"
              title="Names, phone numbers, PAN, Aadhaar and account numbers were replaced before analysis."
            >
              <LockKeyhole size={12} /> {subject.hiddenDetails} personal{" "}
              {subject.hiddenDetails === 1 ? "detail" : "details"} hidden from the AI
            </span>
          )}
          {subject.scanned && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5"
              title="This document had no text layer, so its page images were read by the AI before personal details could be hidden."
            >
              <ScanText size={12} /> Read from a scan
            </span>
          )}
          {state.meta?.engine === "demo" && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-caution-soft px-3 py-1.5 text-caution-ink"
              title="No AI key is configured, so an offline demo engine is spotting common risky phrases."
            >
              <FlaskConical size={12} /> Demo engine
            </span>
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
            <span className="mx-auto truncate text-[11px] text-ink-3">{subject.fileName}</span>
            <span className="w-[42px]" aria-hidden="true" />
          </div>
          <div className="px-5 py-7 sm:px-10 sm:py-10">
            <div className="space-y-6">
              {subject.clauses.map((clause) => {
                const lit = state.done || failed || checkedClauses.has(clause.id);
                return (
                  <section
                    key={clause.id}
                    id={`clause-${clause.id}`}
                    className={`-mx-3 scroll-mt-24 rounded-xl px-3 py-1 transition-colors duration-700 ${
                      flash === clause.id ? "bg-mint-soft/70" : ""
                    }`}
                  >
                    <p className="mb-1 text-xs text-ink-3">
                      <span className="tabular-nums">{clause.number}</span> · {clause.heading}
                    </p>
                    <p
                      className={`font-doc text-[16px] leading-[1.75] whitespace-pre-line transition-colors duration-700 ${
                        lit ? "text-ink-2" : "text-ink-4"
                      }`}
                    >
                      <HighlightedText clause={clause} findings={state.findings} activeId={activeId} onSelect={select} />
                    </p>
                  </section>
                );
              })}
            </div>
          </div>
        </article>

        {/* Side panel */}
        <aside className="order-1 lg:order-2">
          <div
            ref={panel}
            className="space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pb-4 [scrollbar-width:thin]"
          >
            {active && activeClause ? (
              <div className="hidden lg:block">
                <FindingDetail finding={active} clause={activeClause} otherParty={otherParty} onBack={() => setActiveId(null)} />
              </div>
            ) : null}

            <div className={active ? "space-y-4 lg:hidden" : "space-y-4"}>
              <AnimatePresence mode="popLayout" initial={false}>
                {state.error ? (
                  <motion.div key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <ErrorCard
                      code={state.error.code}
                      message={state.error.message}
                      partial={state.findings.length > 0}
                      onRetry={retry}
                    />
                  </motion.div>
                ) : state.verdict ? (
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
                      <CompletedLine clauseCount={subject.clauses.length} seconds={took} dropped={state.dropped} />
                    </div>
                    <button
                      type="button"
                      onClick={() => printReport(title)}
                      className="relative mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-paper px-4 py-2.5 text-sm font-medium text-ink transition-transform active:scale-[0.98]"
                    >
                      <FileDown size={16} /> Download PDF report
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="progress" exit={{ opacity: 0, y: -8 }}>
                    <ProgressCard
                      stages={state.stages}
                      clauseCount={subject.clauses.length}
                      checked={checkedClauses.size}
                      pages={subject.pages}
                      elapsed={elapsed}
                      expectedSeconds={subject.isSample ? 10 : Math.min(45, 12 + subject.clauses.length)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {!(failed && state.findings.length === 0) && (
                <PriorityChips
                  priorities={PRIORITIES[kind]}
                  selected={selected}
                  onToggle={toggle}
                  title={state.done ? "What matters to you" : "While we read: what matters most to you?"}
                  hint="We'll put the findings that affect these first."
                />
              )}

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
                    clauses={subject.clauses}
                    selected={selected}
                    filter={filter}
                    onSelect={select}
                  />
                </div>
              )}

              {state.done && state.findings.length === 0 && (
                <p className="rounded-3xl border border-line bg-card p-6 text-sm leading-relaxed text-ink-2">
                  Nothing in this document stood out as unusual or one-sided.
                </p>
              )}

              {state.done && !failed && <ChatPanel kind={kind} clauses={subject.clauses} onCite={cite} />}
            </div>
          </div>
        </aside>
      </div>

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
              <FindingDetail finding={active} clause={activeClause} otherParty={otherParty} onBack={() => setActiveId(null)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

const ERROR_TITLE: Record<ReviewErrorCode, string> = {
  not_configured: "Live reviews are switched off right now",
  rate_limited: "Let's take a short break",
  quota: "Today's free allowance is used up",
  unavailable: "The review didn't finish",
  too_long: "This document is too long",
  bad_request: "This document couldn't be read",
  sign_in_required: "Sign in to keep going",
  daily_limit: "That's today's reviews done",
};

export function ErrorCard({
  code,
  message,
  partial,
  onRetry,
  sample = { href: "/review/sample", label: "See the sample review" },
}: {
  code: ReviewErrorCode;
  message: string;
  partial: boolean;
  onRetry: () => void;
  sample?: { href: string; label: string };
}) {
  const { status, signIn } = useAuth();
  // Once a guest signs in, they have a fresh allowance, so the same document can run again.
  const needsSignIn = code === "sign_in_required" && status !== "signed-in";
  const canRetry = code === "unavailable" || code === "rate_limited" || (code === "sign_in_required" && !needsSignIn);
  return (
    <div className="rounded-3xl border border-line bg-card p-6 shadow-soft">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-caution-soft text-caution-ink">
        <CloudOff size={19} />
      </span>
      <p className="mt-4 font-display text-[1.35rem] leading-tight">{ERROR_TITLE[code]}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">{message}</p>
      {partial && (
        <p className="mt-2 text-sm leading-relaxed text-ink-3">What&apos;s shown was checked before it stopped.</p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        {needsSignIn && (
          <button
            type="button"
            onClick={signIn}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-transform active:scale-[0.98]"
          >
            <LogIn size={15} /> Sign in with Google
          </button>
        )}
        {canRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-transform active:scale-[0.98]"
          >
            <RotateCcw size={15} /> Try again
          </button>
        )}
        <Link
          href={sample.href}
          className="inline-flex items-center rounded-full border border-line-strong px-4 py-2 text-sm text-ink-2 transition-colors hover:bg-sunken"
        >
          {sample.label}
        </Link>
      </div>
    </div>
  );
}
