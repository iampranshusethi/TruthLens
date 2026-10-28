import { SEVERITY } from "@/lib/severity";
import type { Severity } from "@/lib/types";

// Real-world clause patterns TruthLens is built to catch.
const CATCHES: { text: string; severity: Severity }[] = [
  { text: "Deposit deductions at the owner's sole discretion", severity: "risk" },
  { text: "10% co-pay on every claim", severity: "caution" },
  { text: "2-year non-compete after you resign", severity: "risk" },
  { text: "Room rent capped at 1% of sum insured", severity: "caution" },
  { text: "Whole deposit forfeited for leaving early", severity: "risk" },
  { text: "Owner can enter at any time", severity: "caution" },
  { text: "Exclusions “as specified from time to time”", severity: "risk" },
  { text: "Joining bonus clawback for 24 months", severity: "caution" },
  { text: "Painting charges irrespective of condition", severity: "caution" },
  { text: "Foreclosure penalty of 4% on prepayment", severity: "caution" },
];

export function CatchesMarquee() {
  const row = [...CATCHES, ...CATCHES];
  return (
    <div className="fade-x overflow-hidden" aria-label="Examples of clauses TruthLens flags">
      <ul className="flex w-max animate-marquee gap-3 hover:[animation-play-state:paused]">
        {row.map((c, i) => (
          <li
            key={i}
            aria-hidden={i >= CATCHES.length}
            className="flex shrink-0 items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-sm text-ink-2"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY[c.severity].dot}`} />
            {c.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
