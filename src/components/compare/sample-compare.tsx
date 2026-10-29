"use client";

import { CompareScreen } from "@/components/compare/compare-screen";
import { sampleInsurance } from "@/lib/samples/insurance";

/** Replays the saved sample through the real comparison UI, at no API cost. */
export function SampleCompare() {
  const c = sampleInsurance;
  return (
    <CompareScreen
      subject={{
        id: c.id,
        kind: c.kind,
        title: c.title,
        fileNames: c.options.map((o) => o.fileName),
        priorities: c.priorities,
        isSample: true,
      }}
      run={(emit) => {
        const timers: ReturnType<typeof setTimeout>[] = [];
        const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
        emit({ type: "meta", kind: c.kind, title: c.title, engine: "sample" });
        at(700, () => c.options.forEach((option) => emit({ type: "option", option })));
        c.rows.forEach((row, i) => at(1400 + i * 220, () => emit({ type: "row", row })));
        at(1400 + c.rows.length * 220, () => emit({ type: "done" }));
        return () => timers.forEach(clearTimeout);
      }}
    />
  );
}
