"use client";

import { BadgeCheck, LockKeyhole } from "lucide-react";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { HighlightedText } from "@/components/review/highlighted-text";
import { sampleRental } from "@/lib/samples/rental";
import { SEVERITY } from "@/lib/severity";

// The four clauses the demo "reviews", in document order, with the finding each reveals.
const DEMO = ["c3", "c5", "c7", "c9"].map((clauseId) => ({
  clause: sampleRental.clauses.find((c) => c.id === clauseId)!,
  finding: sampleRental.findings.find((f) => f.clauseId === clauseId)!,
}));

const STEP_MS = 850;
const SCAN_MS = STEP_MS * (DEMO.length + 1);
const HOLD_MS = 4200;

/**
 * A looping, self-playing review inside a product window.
 * Uses the real review components and sample data, so what visitors see
 * here is exactly what they get.
 */
export function HeroDemo() {
  const [step, setStep] = useState(0); // number of clauses reviewed so far; DEMO.length + 1 = verdict
  const [cycle, setCycle] = useState(0);
  const frame = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({ target: frame, offset: ["start end", "start 0.25"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [16, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.93, 1]);

  useEffect(() => {
    const timers = DEMO.map((_, i) => setTimeout(() => setStep(i + 1), STEP_MS * (i + 1)));
    timers.push(setTimeout(() => setStep(DEMO.length + 1), SCAN_MS));
    timers.push(
      setTimeout(() => {
        setStep(0);
        setCycle((c) => c + 1);
      }, SCAN_MS + HOLD_MS),
    );
    return () => timers.forEach(clearTimeout);
  }, [cycle]);

  const revealed = DEMO.slice(0, step).map((d) => d.finding);
  const showVerdict = step > DEMO.length;
  const shownFindings = [...revealed].reverse();

  return (
    <div className="relative [perspective:1600px]">
      {/* Glow */}
      <div
        aria-hidden="true"
        className="absolute -inset-x-10 -top-10 bottom-0 -z-10 rounded-[48px] bg-[radial-gradient(60%_55%_at_50%_45%,rgb(94_214_180/0.28),transparent_70%)] blur-2xl"
      />

      <motion.div
        ref={frame}
        style={{ rotateX, scale, transformOrigin: "50% 0%" }}
        className="overflow-hidden rounded-[20px] bg-card shadow-window"
        aria-label="An animated example of TruthLens reviewing a rental agreement"
        role="img"
      >
        {/* Window chrome */}
        <div className="flex items-center gap-3 border-b border-line bg-sunken/50 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          </div>
          <div className="mx-auto flex items-center gap-1.5 rounded-md bg-card px-3 py-1 text-[11px] text-ink-3 ring-1 ring-line">
            <LockKeyhole size={10} /> truthlens.app/review
          </div>
          <div className="w-[42px]" />
        </div>

        <div className="grid md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          {/* Document */}
          <div className="relative overflow-hidden border-line px-6 py-6 sm:px-9 sm:py-8 md:border-r">
            <p className="text-[11px] text-ink-3">{sampleRental.fileName}</p>
            <p className="mt-1 font-doc text-xl font-medium tracking-tight">{sampleRental.title}</p>
            <div className="mt-5 space-y-4">
              {DEMO.map(({ clause }, i) => (
                <div key={clause.id}>
                  <p className="text-[11px] text-ink-4">
                    {clause.number} · {clause.heading}
                  </p>
                  <p
                    className={`mt-0.5 font-doc text-[14.5px] leading-[1.7] transition-colors duration-500 ${
                      step > i ? "text-ink-2" : "text-ink-4"
                    }`}
                  >
                    <HighlightedText clause={clause} findings={revealed} />
                  </p>
                </div>
              ))}
            </div>

            {/* Scan line */}
            <motion.div
              key={cycle}
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-mint/15 to-transparent"
              initial={{ top: "-10%" }}
              animate={{ top: showVerdict ? "110%" : "100%" }}
              transition={{ duration: SCAN_MS / 1000, ease: "linear" }}
            >
              <div className="absolute inset-x-0 top-1/2 h-px bg-mint/70 shadow-[0_0_12px_2px_rgb(94_214_180/0.5)]" />
            </motion.div>
          </div>

          {/* Findings panel */}
          <div className="hidden flex-col gap-3 bg-paper/60 p-5 md:flex">
            <AnimatePresence mode="popLayout" initial={false}>
              {showVerdict ? (
                <motion.div
                  key="verdict"
                  layout
                  initial={{ opacity: 0, y: -10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl bg-ink p-4 text-paper"
                >
                  <p className="font-display text-[19px] leading-[1.15]">{sampleRental.verdict.headline}</p>
                  <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-paper/70">
                    <BadgeCheck size={13} className="text-mint" /> 17 clauses · every quote verified
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="progress"
                  layout
                  exit={{ opacity: 0 }}
                  className="rounded-xl border border-line bg-card p-4"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-2">Checking each clause…</span>
                    <span className="text-ink-3 tabular-nums">{Math.round((step / DEMO.length) * 100)}%</span>
                  </div>
                  <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-sunken">
                    <motion.div
                      className="h-full rounded-full bg-mint"
                      animate={{ width: `${Math.max(6, (step / DEMO.length) * 100)}%` }}
                    />
                  </div>
                </motion.div>
              )}

              {shownFindings.map((f) => (
                <motion.div
                  key={`${cycle}-${f.id}`}
                  layout
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", damping: 24, stiffness: 260 }}
                  className="rounded-xl border border-line bg-card p-3.5"
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY[f.severity].dot}`} />
                    <span className="text-[11px] text-ink-3">
                      {SEVERITY[f.severity].label} · Clause {DEMO.find((d) => d.finding.id === f.id)!.clause.number}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-snug text-ink">{f.title}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
