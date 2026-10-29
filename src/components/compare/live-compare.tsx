"use client";

import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useSyncExternalStore } from "react";
import { CompareScreen } from "@/components/compare/compare-screen";
import { saveComparison, type StoredComparison, storedComparisonJson } from "@/lib/compare-store";
import { PRIORITIES } from "@/lib/ingest/kind";
import { maskedCount } from "@/lib/ingest/mask";
import { runLiveCompare } from "@/lib/live-review";
import type { CompareEvent } from "@/lib/types";

const noSubscribe = () => () => {};
// The first two priorities start as "Must have", the rest as "Important".
const DEFAULT_WEIGHTS = [3, 3, 2, 2, 1, 1];

export function LiveCompare() {
  const { id } = useParams<{ id: string }>();
  const raw = useSyncExternalStore(noSubscribe, () => storedComparisonJson(id), () => "server");
  const stored = useMemo<StoredComparison | null | undefined>(
    () => (raw === "server" ? undefined : raw ? (JSON.parse(raw) as StoredComparison) : null),
    [raw],
  );

  if (stored === undefined) return <main className="flex-1" />;
  if (stored === null) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-4 pt-20 pb-16 text-center sm:px-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sunken text-ink-3">
          <FileQuestion size={22} />
        </span>
        <h1 className="mt-5 font-display text-[2rem] leading-tight">This comparison isn&apos;t on this device</h1>
        <p className="mt-3 text-ink-3">Comparisons are kept in the browser they were made in.</p>
        <Link
          href="/compare"
          className="mt-8 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-transform active:scale-[0.98]"
        >
          Start a new comparison
        </Link>
      </main>
    );
  }

  const done = stored.result;
  return (
    <CompareScreen
      key={stored.id}
      subject={{
        id: stored.id,
        kind: stored.kind,
        title: done?.title ?? `Comparing ${stored.documents.length} documents`,
        fileNames: stored.documents.map((d) => d.fileName),
        priorities: PRIORITIES[stored.kind].map((p, i) => ({ ...p, defaultWeight: DEFAULT_WEIGHTS[i] ?? 1 })),
        hiddenDetails: maskedCount(stored.masked.map),
      }}
      run={(emit) => {
        if (!done) return runLiveCompare(stored, emit);
        replay(done, emit);
        return () => {};
      }}
      onFinished={(result) => {
        if (!stored.result) saveComparison({ ...stored, result });
      }}
    />
  );
}

function replay(c: NonNullable<StoredComparison["result"]>, emit: (e: CompareEvent) => void) {
  emit({ type: "meta", kind: c.kind, title: c.title, engine: "sample" });
  c.options.forEach((option) => emit({ type: "option", option }));
  c.rows.forEach((row) => emit({ type: "row", row }));
  emit({ type: "done" });
}
