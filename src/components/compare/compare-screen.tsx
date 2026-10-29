"use client";

import { Check, ChevronDown, FileText, FlaskConical, LoaderCircle, LockKeyhole, Trophy } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useEffectEvent, useReducer, useState } from "react";
import { ErrorCard } from "@/components/review/review-screen";
import { advantages, bestIn, joinList, rankOptions, type Weights } from "@/lib/score";
import type { CompareEvent, CompareOption, CompareRow, Comparison, DocKind, Engine, Priority, ReviewErrorCode } from "@/lib/types";

const WEIGHT_LABELS = ["Doesn't matter", "Nice to have", "Important", "Must have"];

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

type State = {
  title: string | null;
  engine: Engine | null;
  options: CompareOption[];
  rows: CompareRow[];
  dropped: number;
  error: { code: ReviewErrorCode; message: string } | null;
  done: boolean;
};

const initial: State = { title: null, engine: null, options: [], rows: [], dropped: 0, error: null, done: false };

function reducer(state: State, e: CompareEvent | { type: "reset" }): State {
  switch (e.type) {
    case "reset":
      return initial;
    case "meta":
      return { ...state, title: e.title, engine: e.engine };
    case "option":
      return { ...state, options: [...state.options, e.option] };
    case "row":
      return { ...state, rows: [...state.rows, e.row] };
    case "dropped":
      return { ...state, dropped: e.count };
    case "error":
      return { ...state, error: { code: e.code, message: e.message } };
    case "done":
      return { ...state, done: true };
  }
}

export type CompareSubject = {
  id: string;
  kind: DocKind;
  title: string;
  fileNames: string[];
  priorities: (Priority & { defaultWeight: number })[];
  isSample?: boolean;
  hiddenDetails?: number;
};

export function CompareScreen({
  subject,
  run,
  onFinished,
}: {
  subject: CompareSubject;
  run: (emit: (e: CompareEvent) => void) => () => void;
  onFinished?: (comparison: Comparison) => void;
}) {
  const [state, dispatch] = useReducer(reducer, initial);
  const [attempt, setAttempt] = useState(0);
  const [weights, setWeights] = useState<Weights>(() =>
    Object.fromEntries(subject.priorities.map((p) => [p.id, p.defaultWeight])),
  );

  const start = useEffectEvent(() => run(dispatch));
  useEffect(() => {
    dispatch({ type: "reset" });
    return start();
  }, [attempt]);

  const comparison: Comparison = {
    id: subject.id,
    kind: subject.kind,
    title: state.title ?? subject.title,
    options: state.options,
    priorities: subject.priorities,
    rows: state.rows,
  };

  const finished = useEffectEvent(() => onFinished?.(comparison));
  useEffect(() => {
    if (state.done && !state.error) finished();
  }, [state.done, state.error]);

  const ready = state.options.length >= 2 && state.rows.length > 0;
  const streaming = ready && !state.done && !state.error;
  const n = subject.fileNames.length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-8 pb-16 sm:px-6 lg:pt-12">
      <header className="mx-auto mb-10 max-w-3xl text-center">
        <p className="text-xs font-medium tracking-[0.14em] text-mint-ink uppercase">Comparison</p>
        <h1 className="mt-2 font-display text-[2rem] text-balance sm:text-[2.6rem]">{comparison.title}</h1>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-ink-2">
          {subject.fileNames.map((name) => (
            <span key={name} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5">
              <FileText size={13} className="shrink-0 text-ink-3" /> <span className="truncate">{name}</span>
            </span>
          ))}
          {subject.isSample && <span className="rounded-full bg-mint-soft px-3 py-1.5 text-mint-ink">Sample comparison</span>}
          {!!subject.hiddenDetails && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-mint-soft px-3 py-1.5 text-mint-ink">
              <LockKeyhole size={12} /> {subject.hiddenDetails} personal {subject.hiddenDetails === 1 ? "detail" : "details"}{" "}
              hidden from the AI
            </span>
          )}
          {state.engine === "demo" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-caution-soft px-3 py-1.5 text-caution-ink">
              <FlaskConical size={12} /> Demo engine
            </span>
          )}
        </div>
      </header>

      <AnimatePresence mode="wait">
        {state.error && !ready ? (
          <motion.div key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-md">
            <ErrorCard
              code={state.error.code}
              message={state.error.message}
              partial={false}
              onRetry={() => setAttempt((a) => a + 1)}
              sample={{ href: "/compare/sample", label: "See the sample comparison" }}
            />
          </motion.div>
        ) : !ready ? (
          <motion.div
            key="loading"
            exit={{ opacity: 0, y: -8 }}
            className="mx-auto max-w-md rounded-3xl border border-line bg-card p-6 shadow-soft"
          >
            <p className="font-medium">Comparing {n} documents</p>
            <ol className="mt-4 space-y-2.5 text-sm">
              <Step done label={`Read ${n} documents`} />
              <Step done={state.options.length >= 2} active label="Matching topics across documents" />
              <Step done={false} active={state.options.length >= 2} label="Checking quotes against each document" />
            </ol>
            <p className="mt-4 text-xs text-ink-3">Usually 15 to 30 seconds. Results appear as soon as the first topic is ready.</p>
          </motion.div>
        ) : (
          <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
            <Results comparison={comparison} weights={weights} setWeights={setWeights} />
            <div>
              <AnimatePresence>
                {streaming && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 flex items-center justify-center gap-2 text-sm text-ink-3"
                  >
                    <LoaderCircle size={15} className="animate-spin text-caution" />
                    Still comparing · {state.rows.length} {state.rows.length === 1 ? "topic" : "topics"} so far
                  </motion.p>
                )}
              </AnimatePresence>
              {state.error && (
                <div className="mx-auto mb-6 max-w-md">
                  <ErrorCard
                    code={state.error.code}
                    message={state.error.message}
                    partial
                    onRetry={() => setAttempt((a) => a + 1)}
                    sample={{ href: "/compare/sample", label: "See the sample comparison" }}
                  />
                </div>
              )}
              <Matrix comparison={comparison} weights={weights} />
              {state.done && state.dropped > 0 && (
                <p className="mt-3 text-center text-xs text-ink-3">
                  {state.dropped} {state.dropped === 1 ? "quote" : "quotes"} couldn&apos;t be found word for word in the
                  documents and {state.dropped === 1 ? "was" : "were"} removed.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function Step({ done, active, label }: { done: boolean; active?: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2.5">
      {done ? (
        <Check size={16} className="text-fair" />
      ) : (
        <LoaderCircle size={16} className={active ? "animate-spin text-caution" : "text-ink-4"} />
      )}
      <span className={done || active ? "text-ink-2" : "text-ink-4"}>{label}</span>
    </li>
  );
}

function Results({
  comparison,
  weights,
  setWeights,
}: {
  comparison: Comparison;
  weights: Weights;
  setWeights: React.Dispatch<React.SetStateAction<Weights>>;
}) {
  const ranking = rankOptions(comparison, weights);
  const option = (id: string) => comparison.options.find((o) => o.id === id)!;
  const noWeights = Object.values(weights).every((w) => w === 0);
  const [first, second] = ranking;
  const tie = first.score === second.score;
  const pros = advantages(comparison, weights, first.id, second.id);
  const cons = advantages(comparison, weights, second.id, first.id, 2);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,1fr)] lg:gap-8">
      {/* Ranking */}
      <section className="rounded-3xl bg-card p-6 shadow-window sm:p-7">
        {noWeights ? (
          <p className="font-display text-[1.6rem] leading-[1.1]">Tell us what matters to see a recommendation</p>
        ) : tie ? (
          <p className="font-display text-[1.6rem] leading-[1.1]">Too close to call on what you&apos;ve picked</p>
        ) : (
          <>
            <p className="font-display text-[1.75rem] leading-[1.1] text-balance">
              <span className="hl">{option(first.id).name}</span> fits you better
            </p>
            {pros.length > 0 && (
              <p className="mt-3 text-sm leading-relaxed text-ink-2">
                Better for you on {joinList(pros.map((r) => lower(r.topic)))}.
              </p>
            )}
            {cons.length > 0 && (
              <p className="mt-1 text-sm leading-relaxed text-ink-3">
                Trade-off: {option(second.id).name} is better on {joinList(cons.map((r) => lower(r.topic)))}.
              </p>
            )}
          </>
        )}

        <ol className="mt-6 space-y-3">
          {ranking.map((r, i) => {
            const o = option(r.id);
            const lead = i === 0 && !tie && !noWeights;
            return (
              <motion.li
                key={r.id}
                layout
                transition={{ type: "spring", damping: 26, stiffness: 260 }}
                className={`rounded-2xl border p-4 sm:p-5 ${lead ? "border-mint bg-mint-soft/30" : "border-line"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium">
                      {lead && <Trophy size={15} className="shrink-0 text-mint-ink" />}
                      <span className="truncate">{o.name}</span>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-3">{[o.provider, o.price].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-[2.2rem] tabular-nums">{r.score}</p>
                    <p className="mt-1 text-[11px] text-ink-3">fit for you</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sunken">
                  <motion.div
                    className={`h-full rounded-full ${lead ? "bg-mint" : "bg-ink-4"}`}
                    animate={{ width: `${r.score}%` }}
                    transition={{ type: "spring", damping: 30, stiffness: 200 }}
                  />
                </div>
              </motion.li>
            );
          })}
        </ol>
      </section>

      {/* Priorities */}
      <section className="rounded-3xl border border-line bg-card p-6 sm:p-7">
        <p className="font-display text-xl">What matters to you</p>
        <p className="mt-1 text-xs text-ink-3">Move these and the ranking updates instantly.</p>
        <div className="mt-5 space-y-4">
          {comparison.priorities.map((p) => {
            const w = weights[p.id];
            return (
              <label key={p.id} className="block">
                <span className="flex items-baseline justify-between text-sm">
                  <span className={w === 0 ? "text-ink-3" : "text-ink"}>{p.label}</span>
                  <span className={`text-xs ${w === 0 ? "text-ink-4" : "text-mint-ink"}`}>{WEIGHT_LABELS[w]}</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={3}
                  step={1}
                  value={w}
                  onChange={(e) => setWeights((ws) => ({ ...ws, [p.id]: Number(e.target.value) }))}
                  className="mt-2 w-full accent-[var(--mint)]"
                />
              </label>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Matrix({ comparison, weights }: { comparison: Comparison; weights: Weights }) {
  const [open, setOpen] = useState<string | null>(null);
  const cols = comparison.options;

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-[1.6rem]">Side by side</h2>
        <p className="text-xs text-ink-3">Tap a row to see the exact wording</p>
      </div>
      <div className="overflow-hidden rounded-3xl border border-line bg-card shadow-soft">
        <div
          className="hidden gap-4 border-b border-line bg-sunken/50 px-5 py-3 text-xs text-ink-3 sm:grid"
          style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${cols.length}, minmax(0,1.2fr)) 20px` }}
        >
          <span>Topic</span>
          {cols.map((o) => (
            <span key={o.id} className="truncate">
              {o.name}
            </span>
          ))}
          <span />
        </div>
        <ul className="divide-y divide-line">
          {comparison.rows.map((row) => (
            <MatrixRow
              key={row.id}
              row={row}
              comparison={comparison}
              muted={(weights[row.priority] ?? 0) === 0}
              open={open === row.id}
              onToggle={() => setOpen(open === row.id ? null : row.id)}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}

function MatrixRow({
  row,
  comparison,
  muted,
  open,
  onToggle,
}: {
  row: CompareRow;
  comparison: Comparison;
  muted: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const best = bestIn(row);
  const cols = comparison.options;

  return (
    <motion.li
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: muted ? 0.55 : 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="grid w-full grid-cols-2 gap-x-4 gap-y-2 px-5 py-3.5 text-left transition-colors hover:bg-sunken/40 sm:items-center"
      >
        <span className="col-span-2 flex items-center justify-between text-sm font-medium sm:hidden">
          {row.topic}
          <ChevronDown size={16} className={`text-ink-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
        <span
          className="col-span-2 hidden items-center gap-4 sm:grid"
          style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${cols.length}, minmax(0,1.2fr)) 20px` }}
        >
          <span className="text-sm font-medium">{row.topic}</span>
          {cols.map((o) => (
            <Cell key={o.id} value={row.cells[o.id]?.value ?? "Not stated"} best={best === o.id} />
          ))}
          <ChevronDown size={16} className={`text-ink-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
        {cols.map((o) => (
          <span key={o.id} className="min-w-0 sm:hidden">
            <span className="block truncate text-[11px] text-ink-3">{o.name}</span>
            <Cell value={row.cells[o.id]?.value ?? "Not stated"} best={best === o.id} />
          </span>
        ))}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className={`grid gap-3 px-5 pb-4 ${cols.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              {cols.map((o) => {
                const quote = row.cells[o.id]?.quote;
                return (
                  <div key={o.id} className="rounded-2xl bg-sunken/60 p-4">
                    <p className="truncate text-[11px] text-ink-3">{o.name}</p>
                    <p className="mt-1 font-doc text-sm leading-relaxed text-ink-2">
                      {quote ? `“${quote}”` : "Not stated clearly in the document. Worth asking before you sign."}
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

function Cell({ value, best }: { value: string; best: boolean }) {
  return (
    <span className={`inline-flex items-start gap-1.5 text-sm ${best ? "text-fair-ink" : "text-ink-2"}`}>
      {best && <Check size={15} strokeWidth={2.5} className="mt-0.5 shrink-0 text-fair" />}
      {value}
    </span>
  );
}
