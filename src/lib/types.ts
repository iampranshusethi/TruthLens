/**
 * Domain types shared by the UI and (later) the analysis pipeline.
 * The prototype's sample data is shaped exactly like real model output will be,
 * so swapping samples for live results is a data change, not a UI change.
 */

export type DocKind = "rental" | "insurance" | "contract";

export type Severity = "risk" | "caution" | "fair";

export interface Clause {
  id: string;
  /** Number as printed in the document, e.g. "7.2". */
  number: string;
  heading: string;
  text: string;
}

export interface Finding {
  id: string;
  clauseId: string;
  severity: Severity;
  /** One-line, plain-English headline. */
  title: string;
  /**
   * Exact substring of the clause text this finding is about.
   * The pipeline drops any finding whose quote isn't found verbatim.
   */
  quote: string;
  /** What the clause says, in plain words. */
  plain: string;
  /** A concrete "what this means for you" scenario. */
  scenario: string;
  /** What's typical, so the user knows whether this is unusual. */
  benchmark?: string;
  /** A fairer wording to propose. */
  suggestion?: string;
  /** A ready-to-send message to the other party. */
  ask?: string;
  /** Priority ids this finding relates to. */
  priorities: string[];
}

export interface Priority {
  id: string;
  label: string;
}

export interface Verdict {
  headline: string;
  summary: string;
}

export interface DocumentAnalysis {
  id: string;
  kind: DocKind;
  title: string;
  fileName: string;
  pages: number;
  otherParty: string;
  clauses: Clause[];
  findings: Finding[];
  verdict: Verdict;
  priorities: Priority[];
}

export type StageId = "read" | "split" | "check" | "verify";

export interface Stage {
  id: StageId;
  label: string;
  activeLabel: string;
}

/** Events streamed while a review runs. The prototype replays these from samples. */
export type ReviewEvent =
  | { type: "stage"; stage: StageId; status: "active" | "done" }
  | { type: "finding"; finding: Finding }
  | { type: "verdict"; verdict: Verdict }
  | { type: "done" };

/* ---------- Comparison ---------- */

export interface CompareCell {
  value: string;
  /** 0–10, higher is better for the user. */
  score: number;
  quote?: string;
}

export interface CompareRow {
  id: string;
  topic: string;
  priority: string;
  cells: Record<string, CompareCell>;
}

export interface CompareOption {
  id: string;
  name: string;
  provider: string;
  fileName: string;
  price: string;
}

export interface Comparison {
  id: string;
  kind: DocKind;
  title: string;
  options: CompareOption[];
  priorities: (Priority & { defaultWeight: number })[];
  rows: CompareRow[];
}
