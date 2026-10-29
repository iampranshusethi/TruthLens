# TruthLens

**Know what you're signing.**

TruthLens reads rental agreements, insurance policies and everyday contracts for ordinary people in India, and explains what each clause means for *them*, in plain English. Every finding quotes the exact clause it's about, and that quote is checked word for word against the document before it's shown.

> v1 won the runner-up award at the Eudia legal AI hackathon (built in 24 hours). It's preserved under the `v1` git tag. This is the v2 rebuild.

## What it does

- **Review a document.** Drop in a PDF, Word file or a photo of the paper copy. Personal details (names, phone, PAN, Aadhaar, account numbers) are hidden from the AI, and the review streams in clause by clause: risks first, then cautions, then fair terms.
- **Every point is traced to the document.** Each finding highlights its clause. Quotes that can't be found word for word are thrown away.
- **Knows what's normal.** Findings say what's typical in India, so you know what's worth pushing back on.
- **Tells you what to say.** Problem clauses come with fairer wording and a polite message for your landlord, insurer or employer.
- **Download a PDF report** to share with family or a lawyer before signing.
- **Compare two or three options.** Policies, flats or job offers are lined up topic by topic and ranked on what matters to you. Moving a slider re-ranks them instantly.
- **Ask follow-up questions.** Answers come only from your document and cite the clause they rely on; click a citation to jump to it.
- **History.** Reviews are saved in your browser, or in your account if you sign in with Google.

## Running it locally

```bash
npm install
cp .env.example .env.local   # add your keys (see Setup below)
npm run dev
```

Open http://localhost:3000. Without any key, development runs an offline demo engine (labelled "Demo engine" in the UI) so every flow still works.

```bash
npm test        # unit tests: clause splitting, masking, quote verification, the review pipeline
npm run lint
npm run build
```

## Setup (one time)

Everything is free-tier. Each step only needs doing once.

1. **Gemini key (required for real reviews).** Go to [Google AI Studio](https://aistudio.google.com/apikey), sign in, click *Create API key*, and paste it into `.env.local` as `GEMINI_API_KEY=...`.
2. **Groq key (recommended backup).** Go to [console.groq.com/keys](https://console.groq.com/keys), create a key, and add `GROQ_API_KEY=...`. If Gemini is busy or over its daily limit, reviews switch to Groq automatically.
3. **Google sign-in (optional).**
   1. Create a free project at [supabase.com](https://supabase.com).
   2. In the project, open *SQL Editor*, paste the contents of [`supabase.sql`](supabase.sql) and click *Run*.
   3. In *Project Settings → API*, copy the Project URL and the publishable (anon) key into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
   4. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an *OAuth client ID* (type: Web application). Under *Authorized JavaScript origins* add `http://localhost`, `http://localhost:3000` and your deployed address. Under *Authorized redirect URIs* add the callback URL that Supabase shows under *Authentication → Sign In / Providers → Google*. Put the client ID in `.env.local` as `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
   5. Back in Supabase, enable the Google provider and paste the Google client ID and secret.
   6. Under *Authentication → URL Configuration*, set the Site URL to your deployed address and add `http://localhost:3000/**` and `https://<your-site>/**` to the redirect URLs.
4. **Deploy on Vercel.** Push the repo to GitHub, then *Add New Project* on [vercel.com](https://vercel.com) and import it. Add the same environment variables from `.env.local`, plus `NEXT_PUBLIC_SITE_URL=https://<your-site>` so link previews use the right address.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Motion · zod · pdf.js · mammoth · Supabase · Vitest. AI: Google Gemini (free tier) with Groq as fallback.

## How it's built

- The browser reads the file, splits it into clauses, masks personal details and streams the review from `/api/review`.
- The server prompts the model for one JSON object per line, validates each line, verifies each quote and streams events back.
- The review screen is a reducer over that event stream; the sample replays the same events from saved data, at no API cost.

[`flow.md`](flow.md) walks through how execution moves between files. [`decisions.md`](decisions.md) records every design decision and why it was made.

*TruthLens explains documents. It isn't a substitute for a lawyer.*
