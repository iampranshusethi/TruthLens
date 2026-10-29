# Execution flow

How code execution moves through TruthLens: the entry points, the order things run in, and which file hands off to which. Design reasons are in [`decisions.md`](decisions.md) (referenced as D1, D2, …).

## Files

| File | Role |
|---|---|
| `src/app/layout.tsx` | **Root of every page.** Loads the three self-hosted fonts, the header and the toast provider. |
| `src/app/page.tsx` | **Landing page** (`/`): hero, upload bar, live demo, features. |
| `src/app/review/sample/page.tsx` | **Sample review** (`/review/sample`), replayed from saved data. |
| `src/app/review/[id]/page.tsx` | **A real review** (`/review/<id>`), loaded from this browser's storage. |
| `src/app/compare/page.tsx` | **Comparison upload** (`/compare`). |
| `src/app/compare/sample/page.tsx`, `[id]/page.tsx` | Sample comparison and real comparisons. |
| `src/app/history/page.tsx` | Reviews saved in this browser, plus examples. |
| `src/app/api/review/route.ts` | **Backend entry point** for reviews. Streams events as NDJSON. |
| `src/app/api/compare/route.ts` | Backend entry point for comparisons. |
| `src/app/api/chat/route.ts` | Backend entry point for follow-up questions. Streams plain text. |
| `src/lib/ingest/extract.ts` | Browser: PDF (pdf.js), Word (mammoth) and text files → plain text. |
| `src/lib/ingest/clauses.ts` | Text → numbered clauses with stable ids (D7). |
| `src/lib/ingest/kind.ts` | Guesses rental / insurance / contract; per-type priorities and labels. |
| `src/lib/ingest/mask.ts` | Hides personal details behind placeholders, and restores them (D9). |
| `src/lib/verify.ts` | Finds a quote inside a clause, tolerant of spacing and quote styles (D6). |
| `src/lib/review-store.ts`, `compare-store.ts` | Save and load reviews and comparisons in `localStorage` (D17). |
| `src/lib/live-review.ts` | Browser side of streaming: calls an API route, un-masks and emits events. |
| `src/lib/replay.ts` | Replays a saved analysis as a timed event stream (D13). |
| `src/lib/score.ts` | Comparison "fit for you" scores, computed in the browser (D12). |
| `src/lib/ai/providers.ts` | Gemini and Groq clients with fallback (D5). |
| `src/lib/ai/http.ts` | `fetch` that honours `HTTPS_PROXY`, and an SSE reader (D19). |
| `src/lib/ai/prompt.ts`, `compare.ts`, `chat.ts` | Prompts and request schemas for each AI task. |
| `src/lib/ai/ndjson.ts` | Model text → one parsed JSON object per line (D18). |
| `src/lib/ai/review.ts` | Model lines → validated, verified review events. |
| `src/lib/ai/route-utils.ts` | Shared by API routes: engine choice, rate limit, cache, NDJSON response. |
| `src/lib/ai/demo.ts` | Offline stand-in engine for development without API keys. |
| `src/components/review/review-screen.tsx` | The review UI: a reducer over review events. |
| `src/components/compare/compare-screen.tsx` | The comparison UI: a reducer over comparison events. |
| `src/components/review/chat-panel.tsx` | Follow-up questions with clickable clause citations. |
| `src/lib/samples/*.ts` | The sample rental agreement and insurance comparison. |

## Page start-up

1. `layout.tsx` renders on the server: fonts, the floating header (`site-header.tsx`) and the page.
2. Pages that only show browser data (`/review/[id]`, `/compare/[id]`) are static shells wrapped in `<Suspense>`. The client component reads the id with `useParams` and the saved record from `localStorage` via `useSyncExternalStore`.
3. The header's active link reads the URL with `usePathname`, inside its own `<Suspense>`, so it never blocks prerendering.

## Flow 1: upload a document → live review

```
file chosen or dropped anywhere on the page      (drop-zone.tsx, window-level drag listeners)
  → extractText(file)                            (ingest/extract.ts: pdf.js worker or mammoth, in the browser)
  → createReview(name, text, pages)              (review-store.ts)
       splitClauses(text)                        (ingest/clauses.ts)
       detectKind(text)                          (ingest/kind.ts)
       maskClauses(clauses)                      (one shared mask map for the whole document)
  → saveReview → router.push(/review/<id>)
LiveReview reads the record                      (components/review/live-review.tsx)
  → ReviewScreen run = runLiveReview             (lib/live-review.ts)
       emits read ✓, split ✓ locally
       POST /api/review {fileName, title, kind, masked clauses}
API route                                        (app/api/review/route.ts)
  → zod validation → pickEngine() → rate limit (cache hits skip it)
  → reviewPrompt(req)                            (ai/prompt.ts)
  → streamWithFallback(Gemini → Groq)            (ai/providers.ts, through http.ts)
  → reviewEvents(req, text)                      (ai/review.ts)
       jsonLines: model text → JSON objects
       meta → event; finding → zod → clause exists? → locateQuote() → event (or counted as dropped)
       verdict held until the end (computed fallback if missing)
  → ndjsonStream: one JSON event per line, whole stream cached on success
Browser: each line → unmaskDeep(event, map) → dispatch into the ReviewScreen reducer
  → clauses light up, findings list re-ranks by chosen priorities, verdict card replaces progress
  → on done: saveReview with result (later visits replay it instantly with replayStored)
```

## Flow 2: sample review

```
/review/sample → SampleReview → ReviewScreen run = replayReview(sampleRental)
  → the same events on timers (read, split, check, findings risk-first, verify, verdict, done)
```
No network call. The landing page's hero demo (`landing/hero-demo.tsx`) loops a shortened version using the same `HighlightedText` component.

## Flow 3: comparison

```
/compare: files added → extractText per file immediately (each slot shows reading / read / error)
  → Compare → createComparison(files)            (compare-store.ts: clauses per document, one shared mask map)
  → /compare/<id> → LiveCompare → CompareScreen run = runLiveCompare
  → POST /api/compare → comparePrompt → streamWithFallback → compareEvents
       meta, one option per document, rows (each cell's quote verified against that document)
Browser: ranking and the side-by-side table fill in as rows stream; sliders re-rank with rankOptions()
  → on done: saveComparison with result
```

## Flow 4: follow-up chat

```
ChatPanel (shown under a finished review)
  → POST /api/chat {kind, masked clauses, last 12 turns re-masked with remask()}
  → chatPrompt → streamWithFallback → plain text streamed back
Browser: unmask as text arrives → "(clause 4)" citations become buttons
  → click → ReviewScreen.cite(): scroll to the clause and flash it
```

## Errors

Every stream ends in `done` or `error`. Provider failures before the first chunk fall back to the next provider; failures after it become an `error` event (`quota` or `unavailable`). The browser turns network drops into `error` too, so the screen always ends in a clear state with "Try again" where retrying can help.
