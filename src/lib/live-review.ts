"use client";

import { type MaskMap, unmaskDeep } from "@/lib/ingest/mask";
import type { StoredComparison } from "@/lib/compare-store";
import { maskClauses, type StoredReview } from "@/lib/review-store";
import type { CompareEvent, ReviewEvent } from "@/lib/types";

type StreamEvent = { type: string };

/**
 * POSTs to an AI route and emits each streamed event, un-masked, as it arrives.
 * Network failures and dropped connections become `error` events, so the UI
 * always ends in a clear state.
 */
async function streamEvents<E extends StreamEvent>(
  url: string,
  body: unknown,
  map: MaskMap,
  emit: (e: E) => void,
  signal: AbortSignal,
) {
  const fail = (message: string) => emit({ type: "error", code: "unavailable", message } as unknown as E);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    if (!signal.aborted) fail("You seem to be offline. Check your connection and try again.");
    return;
  }
  if (!res.body) return fail("This couldn't start. Try again in a moment.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let finished = false;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        const event = unmaskDeep(JSON.parse(line) as E, map);
        if (event.type === "done" || event.type === "error") finished = true;
        emit(event);
      }
    }
  } catch {
    if (signal.aborted) return;
  }
  if (!finished && !signal.aborted) fail("The connection dropped before it finished. Try again.");
}

/** Runs a live review of one document. Returns a cancel function. */
export function runLiveReview(review: StoredReview, emit: (e: ReviewEvent) => void): () => void {
  const abort = new AbortController();
  (async () => {
    // Reading and splitting already happened in the browser; show them as done.
    emit({ type: "stage", stage: "read", status: "done" });
    await new Promise((r) => setTimeout(r, 250));
    emit({ type: "stage", stage: "split", status: "done" });
    const { clauses } = maskClauses(review.clauses);
    await streamEvents<ReviewEvent>(
      "/api/review",
      { fileName: review.fileName, title: review.title, kind: review.kind, clauses },
      review.maskMap,
      emit,
      abort.signal,
    );
  })();
  return () => abort.abort();
}

/** Replays a finished review from storage, instantly. */
export function replayStored(review: StoredReview, emit: (e: ReviewEvent) => void): () => void {
  const r = review.result!;
  emit({ type: "meta", kind: r.kind, title: r.title, otherParty: r.otherParty, engine: r.engine });
  for (const stage of ["read", "split", "check", "verify"] as const) emit({ type: "stage", stage, status: "done" });
  for (const finding of r.findings) emit({ type: "finding", finding });
  if (r.dropped) emit({ type: "dropped", count: r.dropped });
  emit({ type: "verdict", verdict: r.verdict });
  emit({ type: "done" });
  return () => {};
}

/** Runs a live comparison of 2–3 documents. Returns a cancel function. */
export function runLiveCompare(c: StoredComparison, emit: (e: CompareEvent) => void): () => void {
  const abort = new AbortController();
  const { masked } = c;
  streamEvents<CompareEvent>(
    "/api/compare",
    { kind: c.kind, documents: masked.documents },
    masked.map,
    emit,
    abort.signal,
  );
  return () => abort.abort();
}
