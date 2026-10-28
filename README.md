# TruthLens

**Read the fine print before you sign it.**

TruthLens reviews rental agreements, insurance policies and everyday contracts for ordinary people. It explains what each clause means for *you* in plain English, says what's normal, and gives you a fairer wording and a message to send. Every finding is tied to the exact clause it's about.

> v1 won the runner-up award at the Eudia legal AI hackathon (built in 24 hours). It's preserved under the `v1` git tag. This is the v2 rebuild.

## Status

**Phase 1: clickable prototype.** All screens run on sample data with no backend or AI calls:

| Route | What it shows |
|---|---|
| `/` | Landing page with drag-and-drop upload |
| `/review/sample` | A clause-by-clause review of a sample Bengaluru rental agreement, streamed in live |
| `/compare` | Two health insurance policies ranked against your priorities, re-ranked live as you move the sliders |
| `/history` | Saved reviews (Google sign-in comes in a later phase) |

## Running locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Motion.

## Project layout

- `src/lib/types.ts`: domain types. The sample data uses the same shape the live analysis pipeline will return.
- `src/lib/samples/`: the sample rental agreement and insurance comparison.
- `src/lib/replay.ts`: replays a saved analysis as a live event stream, so the sample costs no API calls.
- `src/lib/score.ts`: comparison scoring. It's pure and runs in the browser, so the ranking updates instantly.
- `src/components/`: UI components, grouped by screen.

*TruthLens explains documents. It isn't a substitute for a lawyer.*
