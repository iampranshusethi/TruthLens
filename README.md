# TruthLens

**Know what you're signing.**

TruthLens reads rental agreements, insurance policies and everyday contracts for ordinary people in India, and explains what each clause means for *them*, in plain English. Every finding quotes the exact clause it's about, and that quote is checked word for word against the document before it's shown.

> v1 won the runner-up award at the Eudia legal AI hackathon (built in 24 hours). It's preserved under the `v1` git tag. This is the v2 rebuild.

## What it does

- **Review a document.** Drop in a PDF, Word or text file. It's read on your device, personal details (names, phone, PAN, Aadhaar, account numbers) are hidden from the AI, and the review streams in clause by clause: risks first, then cautions, then fair terms.
- **Every point is traced to the document.** Each finding highlights its clause. Quotes that can't be found word for word are thrown away.
- **Knows what's normal.** Findings say what's typical in India, so you know what's worth pushing back on.
- **Tells you what to say.** Problem clauses come with fairer wording and a polite message for your landlord, insurer or employer.
- **Compare two or three options.** Policies, flats or job offers are lined up topic by topic and ranked on what matters to you. Moving a slider re-ranks them instantly.
- **Ask follow-up questions.** Answers come only from your document and cite the clause they rely on; click a citation to jump to it.
- **History without an account.** Reviews are saved in your browser and reopen instantly.

## Running it

```bash
npm install
cp .env.example .env.local   # add a free Gemini and/or Groq key
npm run dev
```

Open http://localhost:3000. Without any key, development runs an offline demo engine (labelled "Demo engine" in the UI) so every flow still works.

```bash
npm test        # unit tests: clause splitting, masking, quote verification, the review pipeline
npm run lint
npm run build
```

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Motion · zod · pdf.js · mammoth · Vitest. AI: Google Gemini (free tier) with Groq as fallback.

## How it's built

- The browser reads the file, splits it into clauses, masks personal details and streams the review from `/api/review`.
- The server prompts the model for one JSON object per line, validates each line, verifies each quote and streams events back.
- The review screen is a reducer over that event stream; the sample replays the same events from saved data, at no API cost.

[`flow.md`](flow.md) walks through how execution moves between files. [`decisions.md`](decisions.md) records every design decision and why it was made.

*TruthLens explains documents. It isn't a substitute for a lawyer.*
