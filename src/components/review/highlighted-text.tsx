import { SEVERITY } from "@/lib/severity";
import type { Clause, Finding } from "@/lib/types";

type Segment = { text: string; finding?: Finding };

/** Splits clause text around each finding's quote. Quotes that aren't found verbatim are skipped. */
function segment(text: string, findings: Finding[]): Segment[] {
  const spans = findings
    .map((f) => ({ f, start: text.indexOf(f.quote) }))
    .filter((s) => s.start >= 0)
    .sort((a, b) => a.start - b.start);

  const out: Segment[] = [];
  let cursor = 0;
  for (const { f, start } of spans) {
    if (start < cursor) continue; // overlapping quote: first one wins
    if (start > cursor) out.push({ text: text.slice(cursor, start) });
    out.push({ text: f.quote, finding: f });
    cursor = start + f.quote.length;
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor) });
  return out;
}

export function HighlightedText({
  clause,
  findings,
  activeId,
  onSelect,
}: {
  clause: Clause;
  findings: Finding[];
  activeId?: string | null;
  onSelect?: (finding: Finding) => void;
}) {
  const own = findings.filter((f) => f.clauseId === clause.id);

  return segment(clause.text, own).map((s, i) => {
    if (!s.finding) return <span key={i}>{s.text}</span>;
    const f = s.finding;
    const sev = SEVERITY[f.severity];
    const active = activeId === f.id;
    return (
      <mark
        key={i}
        onClick={onSelect ? () => onSelect(f) : undefined}
        className={`rounded-[4px] px-0.5 py-px [box-decoration-break:clone] transition-shadow duration-200 ${sev.mark} ${
          onSelect ? "cursor-pointer hover:ring-2 " + sev.ring : ""
        } ${active ? "ring-2 " + sev.ring : ""}`}
      >
        {s.text}
      </mark>
    );
  });
}
