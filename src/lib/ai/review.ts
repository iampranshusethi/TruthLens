import { jsonLines } from "@/lib/ai/ndjson";
import { findingLine, metaLine, type ReviewRequest, verdictLine } from "@/lib/ai/schema";
import { OTHER_PARTY, PRIORITIES } from "@/lib/ingest/kind";
import type { Engine, Finding, ReviewEvent, Verdict } from "@/lib/types";
import { locateQuote } from "@/lib/verify";

/**
 * Turns raw model output into the review event stream (decisions.md D6, D10, D18).
 * Every finding is validated, its clause looked up and its quote verified before
 * it's emitted. Pure apart from the input stream, so it's unit-tested directly.
 */
export async function* reviewEvents(
  req: ReviewRequest,
  modelText: AsyncIterable<string>,
  engine: () => Engine,
): AsyncGenerator<ReviewEvent> {
  const clauses = new Map(req.clauses.map((c) => [c.id, c]));
  const priorityIds = new Set(PRIORITIES[req.kind].map((p) => p.id));
  let metaSent = false;
  let verdict: Verdict | null = null;
  let dropped = 0;
  let count = 0;
  const findings: Finding[] = [];

  const fallbackTitle = req.title || req.fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
  const meta = (kind = req.kind, title = fallbackTitle, otherParty = OTHER_PARTY[req.kind]) => {
    metaSent = true;
    return { type: "meta", kind, title, otherParty, engine: engine() } as const;
  };

  yield { type: "stage", stage: "check", status: "active" };

  for await (const raw of jsonLines(modelText)) {
    const type = (raw as { type?: unknown })?.type;

    if (type === "meta" && !metaSent) {
      const m = metaLine.safeParse(raw);
      yield m.success ? meta(m.data.kind, m.data.title, m.data.otherParty) : meta();
      continue;
    }
    if (type === "verdict") {
      const v = verdictLine.safeParse(raw);
      if (v.success) verdict = { headline: v.data.headline, summary: v.data.summary };
      continue;
    }
    if (type !== "finding") continue;

    if (!metaSent) yield meta();
    const f = findingLine.safeParse(raw);
    const clause = f.success ? clauses.get(f.data.clauseId) : undefined;
    const quote = f.success && clause ? locateQuote(clause.text, f.data.quote) : null;
    if (!f.success || !clause || !quote) {
      dropped++;
      continue;
    }
    if (findings.some((x) => x.clauseId === clause.id && x.quote === quote)) continue; // duplicate
    const d = f.data;
    const problem = d.severity !== "fair";
    const finding: Finding = {
      id: `f${++count}`,
      clauseId: d.clauseId,
      severity: d.severity,
      title: d.title,
      quote,
      plain: d.plain,
      scenario: d.scenario,
      benchmark: d.benchmark,
      // Rewrites and messages only make sense for problems.
      suggestion: problem ? d.suggestion : undefined,
      ask: problem ? d.ask : undefined,
      priorities: d.priorities.filter((p) => priorityIds.has(p)),
    };
    findings.push(finding);
    yield { type: "finding", finding };
  }

  if (!metaSent) yield meta();
  yield { type: "stage", stage: "check", status: "done" };
  yield { type: "stage", stage: "verify", status: "active" };
  if (dropped) yield { type: "dropped", count: dropped };
  yield { type: "stage", stage: "verify", status: "done" };
  yield { type: "verdict", verdict: verdict ?? fallbackVerdict(findings) };
  yield { type: "done" };
}

/** Used only if the model's verdict line is missing or invalid. Computed from the verified findings. */
export function fallbackVerdict(findings: Finding[]): Verdict {
  const risks = findings.filter((f) => f.severity === "risk").length;
  const cautions = findings.filter((f) => f.severity === "caution").length;
  if (risks === 0 && cautions === 0) {
    return { headline: "Looks fair to sign", summary: "Nothing in this document stood out as unusual or one-sided." };
  }
  const n = (x: number, word: string) => `${x} ${word}${x === 1 ? "" : "s"}`;
  return {
    headline: risks ? `Fix ${n(risks, "clause")} before you sign` : "Fine to sign, with a few questions first",
    summary: `We found ${n(risks, "serious risk")} and ${n(cautions, "point")} worth questioning. Start with the risks at the top of the list.`,
  };
}
