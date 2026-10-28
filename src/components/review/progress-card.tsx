"use client";

import { BadgeCheck, Check, Circle, LoaderCircle } from "lucide-react";
import { motion } from "motion/react";
import { REVIEW_STAGES } from "@/lib/replay";
import type { StageId } from "@/lib/types";

export type StageStatus = "pending" | "active" | "done";

export function ProgressCard({
  stages,
  clauseCount,
  checked,
  pages,
  elapsed,
  expectedSeconds,
}: {
  stages: Record<StageId, StageStatus>;
  clauseCount: number;
  checked: number;
  pages: number;
  elapsed: number;
  expectedSeconds: number;
}) {
  const doneCount = REVIEW_STAGES.filter((s) => stages[s.id] === "done").length;
  // Stage progress plus a share for clauses checked, so the bar keeps moving during the long stage.
  const progress = Math.min(
    0.97,
    (doneCount + (stages.check === "active" ? checked / Math.max(clauseCount, 1) : 0)) / REVIEW_STAGES.length,
  );
  const slow = elapsed > expectedSeconds * 1.5;

  const detail = (id: StageId) => {
    if (id === "read") return `${pages} pages`;
    if (id === "split" && stages.split === "done") return `${clauseCount} clauses`;
    if (id === "check" && stages.check !== "pending")
      return `${stages.check === "done" ? clauseCount : checked} of ${clauseCount}`;
    return null;
  };

  return (
    <div className="rounded-3xl border border-line bg-card p-6">
      <div className="flex items-baseline justify-between">
        <p className="font-medium">Reviewing your document</p>
        <p className="text-xs text-ink-3 tabular-nums">{Math.round(progress * 100)}%</p>
      </div>

      <ol className="mt-4 space-y-2.5 text-sm">
        {REVIEW_STAGES.map((stage) => {
          const status = stages[stage.id];
          return (
            <li key={stage.id} className="flex items-center gap-2.5">
              {status === "done" && <Check size={16} className="shrink-0 text-fair" />}
              {status === "active" && <LoaderCircle size={16} className="shrink-0 animate-spin text-caution" />}
              {status === "pending" && <Circle size={16} className="shrink-0 text-ink-4" />}
              <span className={status === "pending" ? "text-ink-4" : "text-ink-2"}>
                {status === "active" ? stage.activeLabel : stage.label}
              </span>
              {detail(stage.id) && <span className="ml-auto text-xs text-ink-3 tabular-nums">{detail(stage.id)}</span>}
            </li>
          );
        })}
      </ol>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-sunken">
        <motion.div
          className="h-full rounded-full bg-mint"
          initial={{ width: "4%" }}
          animate={{ width: `${Math.max(4, progress * 100)}%` }}
          transition={{ ease: "easeOut", duration: 0.5 }}
        />
      </div>
      <p className="mt-2.5 text-xs text-ink-3">
        {slow
          ? "Taking a little longer than usual. Longer documents need more time. Still working."
          : `Usually about ${expectedSeconds} seconds for a document this size. You can keep reading while we work.`}
      </p>
    </div>
  );
}

export function CompletedLine({ clauseCount, seconds }: { clauseCount: number; seconds: number }) {
  return (
    <div className="flex items-center gap-2 text-xs text-paper/70">
      <BadgeCheck size={15} className="shrink-0 text-mint" />
      Reviewed {clauseCount} clauses in {seconds}s · every quote checked against your document
    </div>
  );
}
