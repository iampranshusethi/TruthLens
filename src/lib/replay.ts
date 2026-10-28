import type { DocumentAnalysis, ReviewEvent, Stage } from "@/lib/types";

export const REVIEW_STAGES: Stage[] = [
  { id: "read", label: "Read the document", activeLabel: "Reading the document…" },
  { id: "split", label: "Split it into clauses", activeLabel: "Finding the clauses…" },
  { id: "check", label: "Checked every clause", activeLabel: "Checking each clause…" },
  { id: "verify", label: "Verified quotes against your document", activeLabel: "Verifying quotes against your document…" },
];

/** Risks first, then cautions, then fair terms: the order a real model is prompted to stream in. */
const SEVERITY_ORDER = { risk: 0, caution: 1, fair: 2 } as const;

/**
 * Replays a saved analysis as the event stream a live review will produce.
 * Used for the sample document, so it costs no API calls and shows
 * first-time users what a real analysis wait looks like.
 * Returns a cancel function.
 */
export function replayReview(analysis: DocumentAnalysis, onEvent: (e: ReviewEvent) => void): () => void {
  const timers: ReturnType<typeof setTimeout>[] = [];
  const at = (ms: number, e: ReviewEvent) => timers.push(setTimeout(() => onEvent(e), ms));

  at(0, { type: "stage", stage: "read", status: "active" });
  at(700, { type: "stage", stage: "read", status: "done" });
  at(700, { type: "stage", stage: "split", status: "active" });
  at(1400, { type: "stage", stage: "split", status: "done" });
  at(1400, { type: "stage", stage: "check", status: "active" });

  const findings = [...analysis.findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  let t = 1900;
  for (const finding of findings) {
    at(t, { type: "finding", finding });
    t += finding.severity === "fair" ? 160 : 340;
  }

  at(t, { type: "stage", stage: "check", status: "done" });
  at(t, { type: "stage", stage: "verify", status: "active" });
  at(t + 800, { type: "stage", stage: "verify", status: "done" });
  at(t + 900, { type: "verdict", verdict: analysis.verdict });
  at(t + 1000, { type: "done" });

  return () => timers.forEach(clearTimeout);
}
