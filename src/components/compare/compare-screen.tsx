"use client";

import { Check, ChevronDown, FileText, LoaderCircle, Trophy } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { advantages, bestIn, joinList, rankOptions, type Weights } from "@/lib/score";
import type { Comparison, CompareRow } from "@/lib/types";

const WEIGHT_LABELS = ["Doesn't matter", "Nice to have", "Important", "Must have"];

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

const STEPS = ["Reading both policies", "Matching topics across policies", "Checking quotes"];

export function CompareScreen({ comparison }: { comparison: Comparison }) {
  const [step, setStep] = useState(0);
  const [weights, setWeights] = useState<Weights>(() =>
    Object.fromEntries(comparison.priorities.map((p) => [p.id, p.defaultWeight])),
  );

  // Sample: a short replay of the comparison stream.
  useEffect(() => {
    const timers = STEPS.map((_, i) => setTimeout(() => setStep(i + 1), 700 * (i + 1)));
    return () => timers.forEach(clearTimeout);
  }, []);
  const ready = step >= STEPS.length;

  const ranking = rankOptions(comparison, weights);
  const option = (id: string) => comparison.options.find((o) => o.id === id)!;
  const noWeights = Object.values(weights).every((w) => w === 0);
  const [first, second] = ranking;
  const tie = first.score === second.score;
  const pros = advantages(comparison, weights, first.id, second.id);
  const cons = advantages(comparison, weights, second.id, first.id, 2);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-8 pb-16 sm:px-6 lg:pt-12">
      <header className="mx-auto mb-10 max-w-3xl text-center">
        <p className="text-xs font-medium tracking-[0.14em] text-mint-ink uppercase">Comparison</p>
        <h1 className="mt-2 font-display text-[2rem] text-balance sm:text-[2.6rem]">{comparison.title}</h1>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-ink-2">
          {comparison.options.map((o) => (
            <span key={o.id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5">
              <FileText size={13} className="text-ink-3" /> {o.fileName}
            </span>
          ))}
          <span className="rounded-full bg-mint-soft px-3 py-1.5 text-mint-ink">Sample comparison</span>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {!ready ? (
          <motion.div
            key="loading"
            exit={{ opacity: 0, y: -8 }}
            className="mx-auto max-w-md rounded-3xl border border-line bg-card p-6 shadow-soft"
          >
            <p className="font-medium">Comparing {comparison.options.length} policies</p>
            <ol className="mt-4 space-y-2.5 text-sm">
              {STEPS.map((label, i) => (
                <li key={label} className="flex items-center gap-2.5">
                  {i < step ? (
                    <Check size={16} className="text-fair" />
                  ) : (
                    <LoaderCircle size={16} className={i === step ? "animate-spin text-caution" : "text-ink-4"} />
                  )}
                  <span className={i <= step ? "text-ink-2" : "text-ink-4"}>{label}</span>
                </li>
              ))}
            </ol>
          </motion.div>
        ) : (
          <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
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
                              {o.name}
                            </p>
                            <p className="mt-0.5 text-xs text-ink-3">
                              {o.provider} · {o.price}
                            </p>
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
                          <span className={`text-xs ${w === 0 ? "text-ink-4" : "text-mint-ink"}`}>
                            {WEIGHT_LABELS[w]}
                          </span>
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

            <Matrix comparison={comparison} weights={weights} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
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
            <span key={o.id}>{o.name}</span>
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
    <li className={`transition-opacity ${muted ? "opacity-55" : ""}`}>
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
            <Cell key={o.id} value={row.cells[o.id].value} best={best === o.id} />
          ))}
          <ChevronDown size={16} className={`text-ink-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
        {cols.map((o) => (
          <span key={o.id} className="sm:hidden">
            <span className="block text-[11px] text-ink-3">{o.name}</span>
            <Cell value={row.cells[o.id].value} best={best === o.id} />
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
            <div className="grid gap-3 px-5 pb-4 sm:grid-cols-2">
              {cols.map((o) => {
                const quote = row.cells[o.id].quote;
                return (
                  <div key={o.id} className="rounded-2xl bg-sunken/60 p-4">
                    <p className="text-[11px] text-ink-3">{o.name}</p>
                    <p className="mt-1 font-doc text-sm leading-relaxed text-ink-2">
                      {quote ? `“${quote}”` : "Not stated clearly in the document. Worth asking the insurer."}
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
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
