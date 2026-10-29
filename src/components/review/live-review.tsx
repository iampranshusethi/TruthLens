"use client";

import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useSyncExternalStore } from "react";
import { DropZone } from "@/components/drop-zone";
import { type ReviewState, ReviewScreen } from "@/components/review/review-screen";
import { maskedCount } from "@/lib/ingest/mask";
import { replayStored, runLiveReview } from "@/lib/live-review";
import { saveReview, type StoredReview, storedJson } from "@/lib/review-store";

const noSubscribe = () => () => {};

export function LiveReview() {
  const { id } = useParams<{ id: string }>();
  // Read once from this browser's storage; "server" while rendering on the server.
  const raw = useSyncExternalStore(
    noSubscribe,
    () => storedJson(id),
    () => "server",
  );
  const review = useMemo<StoredReview | null | undefined>(
    () => (raw === "server" ? undefined : raw ? (JSON.parse(raw) as StoredReview) : null),
    [raw],
  );

  if (review === undefined) return <main className="flex-1" />;
  if (review === null) return <NotFound />;

  const save = (state: ReviewState, seconds: number) => {
    if (review.result || !state.meta || !state.verdict || state.error) return;
    saveReview({
      ...review,
      title: state.meta.title,
      result: {
        title: state.meta.title,
        otherParty: state.meta.otherParty,
        kind: state.meta.kind,
        engine: state.meta.engine,
        findings: state.findings,
        verdict: state.verdict,
        dropped: state.dropped,
        seconds,
      },
    });
  };

  return (
    <ReviewScreen
      key={review.id}
      subject={{ ...review, hiddenDetails: maskedCount(review.maskMap) }}
      run={(emit) => (review.result ? replayStored(review, emit) : runLiveReview(review, emit))}
      restoredSeconds={review.result?.seconds}
      onFinished={save}
    />
  );
}

function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-4 pt-20 pb-16 text-center sm:px-6">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sunken text-ink-3">
        <FileQuestion size={22} />
      </span>
      <h1 className="mt-5 font-display text-[2rem] leading-tight">This review isn&apos;t on this device</h1>
      <p className="mt-3 text-ink-3">
        Reviews are kept in the browser they were made in. Upload the document again to review it here.
      </p>
      <div className="mt-8 w-full">
        <DropZone />
      </div>
      <Link href="/review/sample" className="mt-6 text-sm text-mint-ink">
        Or see the sample review
      </Link>
    </main>
  );
}
