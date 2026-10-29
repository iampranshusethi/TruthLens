import { LogoMark } from "@/components/logo";
import { KIND_LABEL, OTHER_PARTY } from "@/lib/ingest/kind";
import type { Clause, DocKind, Finding, Verdict } from "@/lib/types";

const ORDER = { risk: 0, caution: 1, fair: 2 } as const;
const LABEL = { risk: "Risk", caution: "Caution", fair: "Fair" } as const;
const TONE = {
  risk: "border-risk text-risk-ink",
  caution: "border-caution text-caution-ink",
  fair: "border-fair text-fair-ink",
} as const;

/**
 * A print-only layout of a finished review. The page's own UI is hidden when
 * printing, so "Save as PDF" produces this clean report (decisions.md D27).
 */
export function Report({
  title,
  fileName,
  kind,
  otherParty,
  clauses,
  findings,
  verdict,
}: {
  title: string;
  fileName: string;
  kind: DocKind;
  otherParty?: string;
  clauses: Clause[];
  findings: Finding[];
  verdict: Verdict;
}) {
  const sorted = [...findings].sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  const problems = sorted.filter((f) => f.severity !== "fair");
  const fair = sorted.filter((f) => f.severity === "fair");
  const clause = (id: string) => clauses.find((c) => c.id === id);
  const count = (s: Finding["severity"]) => findings.filter((f) => f.severity === s).length;
  const party = otherParty ?? OTHER_PARTY[kind];

  return (
    <div className="hidden text-[10.5pt] leading-relaxed text-ink [print-color-adjust:exact] print:block">
      <header className="flex items-center justify-between border-b-2 border-ink pb-3">
        <span className="flex items-center gap-2 text-[11pt] font-medium">
          <LogoMark size={16} /> TruthLens
        </span>
        <span className="text-[9pt] text-ink-3">
          {KIND_LABEL[kind]} review ·{" "}
          {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </span>
      </header>

      <h1 className="mt-6 font-display text-[22pt] leading-tight">{title}</h1>
      <p className="mt-1 text-[9pt] text-ink-3">{fileName}</p>

      <section className="mt-5 rounded-xl border border-line-strong p-4 [break-inside:avoid]">
        <p className="text-[8pt] font-medium tracking-[0.14em] text-mint-ink uppercase">Verdict</p>
        <p className="mt-1 font-display text-[15pt] leading-snug">{verdict.headline}</p>
        <p className="mt-1.5 text-ink-2">{verdict.summary}</p>
        <p className="mt-2 text-[9pt] text-ink-3">
          {count("risk")} risks · {count("caution")} cautions · {count("fair")} fair terms
        </p>
      </section>

      {problems.length > 0 && (
        <section className="mt-7">
          <h2 className="font-display text-[14pt]">What to look at before signing</h2>
          <div className="mt-3 space-y-4">
            {problems.map((f) => {
              const c = clause(f.clauseId);
              return (
                <article key={f.id} className={`border-l-[3px] pl-4 [break-inside:avoid] ${TONE[f.severity]}`}>
                  <p className="text-[8pt] font-medium tracking-wide uppercase">
                    {LABEL[f.severity]} · Clause {c?.number}
                    {c?.heading ? ` · ${c.heading}` : ""}
                  </p>
                  <h3 className="mt-0.5 text-[11.5pt] font-medium text-ink">{f.title}</h3>
                  <p className="mt-1 font-doc text-[9.5pt] text-ink-3">“{f.quote}”</p>
                  <p className="mt-1.5 text-ink-2">{f.plain}</p>
                  <p className="mt-1 text-ink-2">
                    <span className="font-medium text-ink">For you: </span>
                    {f.scenario}
                  </p>
                  {f.benchmark && (
                    <p className="mt-1 text-ink-2">
                      <span className="font-medium text-ink">What&apos;s normal: </span>
                      {f.benchmark}
                    </p>
                  )}
                  {f.suggestion && (
                    <p className="mt-1 text-ink-2">
                      <span className="font-medium text-ink">Fairer wording: </span>
                      <span className="font-doc">{f.suggestion}</span>
                    </p>
                  )}
                  {f.ask && (
                    <p className="mt-1 text-ink-2">
                      <span className="font-medium text-ink">Message to your {party}: </span>
                      {f.ask}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {fair.length > 0 && (
        <section className="mt-7 [break-inside:avoid]">
          <h2 className="font-display text-[14pt]">Fair terms</h2>
          <ul className="mt-2 space-y-1">
            {fair.map((f) => (
              <li key={f.id} className="text-ink-2">
                <span className="text-fair-ink">✓</span> {f.title}{" "}
                <span className="text-[9pt] text-ink-3">(clause {clause(f.clauseId)?.number})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-8 border-t border-line-strong pt-3 text-[8.5pt] text-ink-3">
        Every quote in this report was checked word for word against the document. TruthLens explains documents; it
        isn&apos;t a substitute for a lawyer.
      </footer>
    </div>
  );
}

/** Prints with a helpful default file name, then restores the tab title. */
export function printReport(title: string) {
  const original = document.title;
  document.title = `TruthLens review - ${title}`;
  const restore = () => {
    document.title = original;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
}
