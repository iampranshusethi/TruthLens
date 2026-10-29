# Decisions

A log of meaningful decisions made while building TruthLens v2, with the reasoning and the trade-offs accepted. Newest entries at the bottom.

---

## D1. Keep only the contract and policy engine
**Decision:** v2 reviews and compares rental agreements, insurance policies and everyday contracts. v1's second engine (detecting manipulation and bias in articles) is removed.
**Why:** v1 shipped two engines to improve the odds of winning a 24-hour hackathon. As a product, one sharp idea is easier to understand, explain and make excellent than two half-finished ones. Contract review for ordinary people is also the stronger idea: the stakes are real money (deposits, claims, notice periods).
**Trade-off accepted:** Anyone who liked the article analyser loses it. It remains in the `v1` git tag.

## D2. Built for ordinary people in India, in English
**Decision:** The user is a tenant, policy buyer or new employee reading a document before signing, not a lawyer. Benchmarks and examples are Indian (rupees, Bengaluru deposits, Indian insurance terms). The interface is English only.
**Why:** Lawyers already have tools; people signing a flat agreement on WhatsApp usually have no one to ask. Picking one audience decides tone (plain English, "you"), features (what to say to the landlord) and design (calm, not alarming).
**Trade-off accepted:** No Hindi or regional languages for now. Legal teams would find it too simple.

## D3. Rebuild from scratch, keep v1 in a tag
**Decision:** v2 is a new codebase. The v1 Flask app is preserved under the `v1` git tag, and v2 is developed on the `v2` branch.
**Why:** v1 was assembled from pasted chat snippets in 24 hours: one global variable shared between all users, a hardcoded API key, fake fallback results when the model failed, and a 900-line HTML file. Fixing it piece by piece would cost more than rebuilding with a proper structure.
**Trade-off accepted:** Nothing from v1's code is reused. Its ideas are (comparison by intent, citations, follow-up chat).

## D4. Next.js 16, TypeScript, Tailwind CSS 4, Motion
**Decision:** The app is a Next.js (App Router) project in TypeScript, styled with Tailwind 4 and animated with Motion.
**Why:** One codebase for pages and the server routes that call the AI, first-class Vercel deployment, and smooth animations for the streaming review. TypeScript in particular because the same data shapes (clauses, findings, review events, stored reviews) travel between the browser, the server, the AI output parser and local storage; the compiler checks that every one of those places agrees, which caught real mismatches while the live pipeline was being wired up. Python (v1's language) was considered, but it would split the project into two languages and two deployments for no gain.
**Trade-off accepted:** Next.js 16 changes some conventions from older versions (cache components, async params), so docs bundled in `node_modules/next/dist/docs` are checked before using an API.

## D5. Free AI only: Gemini first, Groq as fallback
**Decision:** Reviews run on Google's Gemini free tier. If Gemini fails before answering (quota, outage), the same request goes to Groq's free tier. Both sit behind one small provider interface, and model names come from environment variables.
**Why:** The project must cost nothing to run. Gemini Flash has a very long context window, so a whole agreement fits in one request. Two providers mean one bad day at either doesn't take the app down. Model names change often, so they are configuration, not code.
**Trade-off accepted:** Free tiers have daily limits, and Google may use free-tier prompts to improve its models (see D9 for how personal details are protected). A paid tier (for example Claude) can be added later by writing one more provider.

## D6. Every finding must quote the document, and the quote is checked
**Decision:** The model must copy the exact words of the clause each finding is about. The server checks that quote word for word against the clause text, and any finding whose quote isn't found is dropped before the user sees it.
**Why:** For a legal tool, a confident claim about a clause that doesn't exist is the worst failure. Verification is cheap, deterministic and makes the "every point is traced to your document" promise true. It is also what makes highlighting the clause in the document possible.
**Trade-off accepted:** Occasionally a valid point is dropped because the model paraphrased its quote. The prompt asks for short verbatim quotes to keep this rare.

## D7. Clauses are split by code, not by the model
**Decision:** The document is split into numbered clauses by deterministic code (numbered headings like `4.`, `3.1`, `Clause 7`, with a paragraph fallback). The model receives clauses with ids and refers to them by id.
**Why:** Stable clause ids let findings point at exact places in the document, and splitting in code is instant, free and testable. Asking the model to split would cost tokens and could silently drop text.
**Trade-off accepted:** Unusually formatted documents may split imperfectly. The paragraph fallback keeps every word, just in less tidy chunks.

## D8. Read documents in the browser
**Decision:** PDFs (via pdf.js) and Word files (via mammoth) are turned into text in the user's browser. Only text is sent to the server.
**Why:** The document appears on screen instantly, before any AI call, which makes the wait feel short. Uploads stay small (Vercel limits request bodies to about 4.5 MB). The original file never leaves the device.
**Trade-off accepted:** Scanned PDFs and photos have no text layer, so they need a separate reading step.

## D9. Mask personal details before anything leaves the browser
**Decision:** Before text is sent for analysis, Aadhaar numbers, PAN, phone numbers, emails, bank account numbers, IFSC codes and names after titles (Mr., Smt., etc.) are replaced with placeholders like `[NAME 1]`. Results are un-masked in the browser.
**Why:** Free AI tiers may keep prompts. A rental agreement is full of personal data, and none of it is needed to judge whether a clause is fair.
**Trade-off accepted:** Pattern-based masking can miss unusual formats (for example a name without a title). It is a strong reduction in exposure, not a guarantee, and the UI says so honestly.

## D10. Results stream as events, and the UI is built around the stream
**Decision:** The server streams newline-delimited JSON events (`stage`, `finding`, `verdict`, `done`, `error`). The review screen is a reducer over these events.
**Why:** Users see the first risk within seconds instead of staring at a spinner for 30. The same event format lets the sample document be replayed from saved data with no API call.
**Trade-off accepted:** Streaming is more complex than one JSON response, and a stream can fail halfway, so partial results and a retry path have to be designed.

## D11. Waiting is designed, not hidden
**Decision:** While a review runs, the screen shows real stages with counts, a progress bar, an honest time estimate ("usually about 20 seconds"), a "taking longer than usual" message if needed, and asks "What matters most to you?" so the wait is useful. If the user switches tabs, the tab title changes to "✓ Review ready".
**Why:** v1 used a spinner, and slow model responses made first-time users think the app had stopped. Visible, real progress keeps trust.
**Trade-off accepted:** More UI states to build and test.

## D12. Comparison scores are computed by code, not the model
**Decision:** For comparisons, the model reads the documents and scores each option per topic (0–10, with quotes). The overall "fit for you" score is computed in the browser from those scores and the user's priority sliders.
**Why:** Moving a slider re-ranks options instantly with no model call, and the arithmetic is exact and explainable. A number on screen is never the model's guess at a total.
**Trade-off accepted:** The per-topic scores still come from the model; the code only combines them.

## D13. A sample document that costs nothing
**Decision:** "Try a sample rental agreement" replays a saved analysis through the real streaming UI.
**Why:** Visitors (and recruiters) can try the product instantly, it never uses API quota, and it teaches first-time users what a real wait looks like.
**Trade-off accepted:** The sample has to be kept in the exact same data shape as live results.

## D14. Visual design: calm precision with warmth
**Decision:** Warm paper background, colour used only for meaning (mint brand, coral risk, amber caution, sage fair), Bricolage Grotesque for headlines, Geist for the interface, Source Serif 4 for document text. Emphasis uses a mint highlighter swipe, echoing highlighted clauses.
**Why:** The product should feel premium and trustworthy, not like a generic AI-generated site. A serif italic accent word and em dashes read as "made by an AI", so neither is used anywhere.
**Trade-off accepted:** Custom typography and motion take longer than a component-library default.

## D15. Fonts are bundled with the app
**Decision:** All fonts are self-hosted files in `src/fonts` (and the `geist` package), loaded with `next/font/local`.
**Why:** The development machine sits behind a network proxy that blocks direct downloads from Google Fonts, which silently fell back to Arial and Times New Roman. Bundling removes that build-time dependency everywhere.
**Trade-off accepted:** A few hundred KB of font files in the repo.

## D16. No "plain-English rewrite of the whole document"
**Decision:** The proposed "Flip the lens" feature (rewriting the entire document in plain English in place) was dropped.
**Why:** The user's call: per-clause explanations already cover it, and it would cost a large extra model call per document on a free tier.
**Trade-off accepted:** Lose a flashy demo moment.

## D17. Google sign-in is optional
**Decision:** Anyone can review documents without an account. Signing in with Google (via Supabase, free tier) saves history across devices.
**Why:** Asking for sign-in before showing value loses most first-time visitors. History matters only once someone is coming back.
**Trade-off accepted:** Guests keep history only in their own browser.

## D18. Model output is one JSON object per line
**Decision:** The model is asked to write newline-delimited JSON: a `meta` line, then one finding per line (risks first), then a `verdict` line. Each line is validated with zod as soon as it is complete.
**Why:** A line can be parsed and shown the moment it arrives, which is what makes streaming possible. It works the same on Gemini and Groq. A malformed line is skipped, not fatal.
**Trade-off accepted:** The model occasionally wraps output in code fences or adds prose; the parser ignores anything that isn't a valid line.

## D19. Route server-side AI calls through the system proxy in development
**Decision:** If `DEV_PROXY` (in `.env.local`) or `HTTPS_PROXY` is set, server calls to Gemini and Groq go through it (via undici's `ProxyAgent`). If the proxy itself can't be reached, the call is retried directly.
**Why:** The development network only allows outbound traffic through a proxy, and Node's built-in `fetch` ignores proxy settings. A dev server started by a tool doesn't always inherit the system's proxy variables, hence the explicit `DEV_PROXY`. The direct retry keeps things working off that network. On Vercel no proxy is set, so this code path is skipped.
**Trade-off accepted:** One small extra dependency (`undici`).

## D20. Reviews are saved in the browser first
**Decision:** Every review and comparison is saved in `localStorage` with its result, under a short random id in the URL (`/review/<id>`). Reopening it replays the saved result instantly, with no API call.
**Why:** Guests get history without an account, the original document never has to be stored on a server, and revisiting a review costs no quota.
**Trade-off accepted:** A review link only works in the browser that made it. Cloud history arrives with Google sign-in (D17).

## D21. An offline demo engine for development
**Decision:** With no API key set, development uses a small rule-based engine that spots well-known risky phrases and streams them through the real pipeline. The UI marks its output "Demo engine". In production, a missing key shows a clear "switched off" message instead.
**Why:** The whole upload → mask → stream → verify → save path can be built and tested without spending quota or waiting for keys, and the demo can never be mistaken for a real review.
**Trade-off accepted:** One more code path, kept deliberately small.

## D22. Shared limits and caching on the server
**Decision:** All AI routes share a per-IP hourly limit (12 reviews or comparisons, 40 chat questions) and a cache of finished streams keyed by a hash of the masked input.
**Why:** Protects the free quota from accidental loops or one heavy user, and makes re-running the same document instant.
**Trade-off accepted:** Both live in a server instance's memory, so on Vercel they're best-effort rather than exact. A shared store (for example Supabase) can replace them later.

## D23. Comparison quotes are verified too
**Decision:** Every cell in a comparison may quote its document; quotes that aren't found word for word in that document are removed, and the cell says the wording wasn't found.
**Why:** Same principle as D6: anything presented as coming from a document must be checkable against it.
**Trade-off accepted:** A cell can keep its value while losing its quote, which is weaker evidence; the count of removed quotes is shown.

## D24. Chat is grounded and cites clauses
**Decision:** Follow-up questions are answered only from the document, with citations in a fixed form, "(clause 4)", that the UI turns into buttons. Off-topic questions are declined. Earlier answers are re-masked before being sent back.
**Why:** v1's chat could drift into general answers. Citations let the reader check every claim in one click, and re-masking keeps personal details out of the conversation history sent to the model.
**Trade-off accepted:** The model may occasionally cite in a different format, which then shows as plain text rather than a button.

## D25. Scans and photos are read by Gemini, page by page
**Decision:** A PDF with almost no text layer, or a photo, is rendered to page images in the browser (pdf.js onto a canvas, at most 1400 px wide, JPEG) and sent one page at a time to `/api/ocr`, which asks Gemini to transcribe it exactly. The text then goes through the normal flow. Scans are limited to 12 pages, and the review is labelled "Read from a scan".
**Why:** In India many rental agreements exist only on stamp paper, so a phone photo is often the only copy people have. One page per request keeps each upload far below Vercel's 4.5 MB body limit and lets the screen show "Reading scanned page 3 of 8".
**Trade-off accepted:** Page images reach the AI before personal details can be masked (masking needs text). The label and its tooltip say so. Without a Gemini key, scans get a clear message instead.

## D26. Unit tests for the parts that must never be wrong
**Decision:** Vitest covers clause splitting, document-type detection, masking (including round trips), quote verification, NDJSON parsing and the review event pipeline (verified, dropped, de-duplicated and fallback cases).
**Why:** These are the trust guarantees of the product. They are pure functions, so they are cheap to test thoroughly.
**Trade-off accepted:** UI behaviour is checked by hand in the browser rather than with end-to-end tests.

## D27. The PDF report is the browser's own "Save as PDF"
**Decision:** A finished review has a "Download PDF report" button. A print-only layout (verdict, every problem with its quote, plain explanation, what's normal, fairer wording and message, then fair terms) is hidden on screen; printing hides the app and shows only that layout.
**Why:** No PDF library to ship, text stays selectable and searchable, and it works offline on every device. People forward the report to family or a lawyer before signing.
**Trade-off accepted:** The user picks "Save as PDF" in the print dialog, one extra click compared with a direct download.

## D28. Google sign-in with Supabase, client-side only
**Decision:** Sign-in uses Supabase Auth's Google provider with the PKCE flow entirely in the browser. Finished reviews and comparisons are upserted into one `saved_items` table protected by row-level security (each user sees only their rows). Signing in uploads earlier local reviews; deleting removes both copies. Without the two public env vars the feature switches itself off.
**Why:** No server session code or middleware to maintain; the database itself enforces who can read what. One table with a JSON column keeps the schema trivial while the data shape still evolves.
**Trade-off accepted:** Cloud copies include the document text (needed to reopen a review anywhere); History says so plainly. Supabase's free tier pauses after a week of inactivity, which a deployed project must handle.

## D29. Important content never waits for an animation
**Decision:** Swaps between states (progress → verdict, hint → error, loading → results) use Motion's "popLayout" mode, so the new content appears at once while the old one fades out.
**Why:** Testing showed that with "wait" mode, an error message or the verdict could be held back until the previous element finished animating, which never happens when a browser throttles animations (background tabs, slow phones). Animation should decorate state changes, not gate them.
**Trade-off accepted:** For a moment both elements can overlap while one fades.

## D30. Sharing and identity
**Decision:** A share image (`opengraph-image.tsx`, prerendered at build time with Geist) and an SVG favicon of the lens mark replace the framework defaults; unknown URLs get a branded 404.
**Why:** The link will be posted on LinkedIn; the preview card is most people's first impression.
**Trade-off accepted:** None meaningful.

## D31. A chain of models, a timeout on every attempt, and a short cooldown
**Decision:** Gemini is a list of models tried in order (default `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.8-flash`, `gemini-flash-lite-latest`), then Groq's `openai/gpt-oss-120b`. Any attempt that errors or hasn't started answering within 15 seconds is cancelled and the next one is tried. A model that fails is skipped for 5 minutes. Gemini 3 models run with low thinking so findings start streaming quickly. Scans use the same chain.
**Why:** First real tests showed every failure mode at once: the newest models answered "experiencing high demand", `gemini-flash-latest` accepted the request and then never replied (so a review hung forever with no fallback), `gemini-2.5-flash` was no longer offered to new keys, and Groq had retired `llama-3.3-70b-versatile`. A single hard-coded model is not viable on free tiers. With the chain, a review's first finding arrives in about 7 seconds and the whole review takes about 16.
**Trade-off accepted:** In the worst case a user waits through a 15-second timeout before the next model answers. The order puts the models that responded fastest in testing first; `GEMINI_MODEL` can override it without a code change.

## D32. "What's normal" is qualitative, taught by example
**Decision:** The prompt forbids "typical" numeric ranges and city-specific norms in benchmarks, says to call a one-sided term "common, but negotiable" when it is common, and shows one bad and one good example.
**Why:** In real reviews the model stated confident but wrong norms ("lock-ins are typically 1 to 6 months", when 11-month lock-ins are common in Mumbai). A hedging instruction alone didn't stop it; a concrete bad/good pair did. A wrong benchmark misleads exactly the user TruthLens exists to protect.
**Trade-off accepted:** Benchmarks are less specific. They describe what a fair version looks like rather than quoting market statistics.

## D33. The clause splitter must never lose a word
**Decision:** Markdown that a model adds when transcribing scans (`**1. RENT**`) is stripped before splitting. A phrase only becomes a heading if it ends with a colon or looks like a title ("SECURITY DEPOSIT", "Security Deposit"), never a sentence fragment. Sentences don't break after abbreviations like "Rs.", "No." or "Mr.". Short fragments are merged into the previous clause with their heading. A test checks that every word of several layouts survives splitting.
**Why:** The first scanned agreement lost "The Tenant shall pay Rs." (mistaken for a heading) and a whole electricity clause, so the review silently skipped a clause that turned out to be a risk. Losing text is worse than splitting untidily.
**Trade-off accepted:** Some real headings written in sentence case after a full stop ("Security deposit. The tenant…") stay in the clause text instead of becoming the heading.

## D34. Cache keys include the prompt
**Decision:** The server's cache of finished streams is keyed by the full prompt (system and user), not just the document.
**Why:** While tuning, an improved prompt kept returning the old cached answer for the same document. Keying by prompt means a prompt change takes effect immediately everywhere.
**Trade-off accepted:** Changing the prompt invalidates every cached review, which costs quota once per document.

## D35. Google's own sign-in button instead of the redirect flow
**Decision:** "Sign in" opens a small TruthLens panel with Google's official "Continue with Google" button (Google Identity Services). Google returns a signed ID token to the page, which passes it to Supabase with `signInWithIdToken`, protected by a one-time nonce (Google signs the hashed nonce into the token; Supabase checks the raw one). If no Google client ID is configured, it falls back to Supabase's redirect flow.
**Why:** In the redirect flow Google's screen said "Sign in to xxxx.supabase.co", because Google names the site it will send you back to. With the button, Google shows TruthLens's own address (localhost now, the Vercel address once deployed) and the user never leaves the page. Showing the name "TruthLens" itself needs Google brand verification, which needs an owned domain.
**Trade-off accepted:** The button is styled by Google, not by us, and one more public env var (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`) is needed. Supabase's custom domain add-on would also fix the address, but it isn't free.

## D36. Sync retries on every visit, and only sends what's missing
**Decision:** While signed in, every page load (Supabase's `INITIAL_SESSION`) as well as signing in uploads finished local reviews and comparisons that this browser hasn't uploaded yet. Each browser remembers, per user, which ids it has uploaded (`tl.synced.<user>`), so repeat visits send nothing new.
**Why:** Testing showed that syncing only at the moment of sign-in leaves gaps: a review finished while the cloud save failed (offline, a closed tab) would stay on one device forever. Retrying on each visit closes that gap at almost no cost.
**Trade-off accepted:** If a review is deleted on one device, another device that still holds a copy it never uploaded will upload it on its next visit. Copies it had already uploaded are not re-sent.

## D37. Vercel Web Analytics for visitors
**Decision:** Page views and visitors come from Vercel Web Analytics (free on the Hobby plan, no cookies). Before anything is sent, review and comparison ids in the URL are replaced with `[id]`.
**Why:** Seeing how many people visit, and which pages they use, is the first question after launch. Replacing ids makes pages group together in the dashboard and keeps even random ids out of a third-party service.
**Trade-off accepted:** It only works on Vercel deployments, and only counts page views, not what happens inside a review. D38 covers that.

## D38. A private stats page built on anonymous events
**Decision:** Each review, comparison, chat answer and scanned page records one row in `usage_events`: type, document kind, engine and model, success or error code, duration, finding and dropped counts, fallbacks, and whether it came from cache. Never document text, user ids or IP addresses. The server writes with the Supabase secret key; the table has row-level security with no policies, so browsers can't touch it. `/stats` (not linked anywhere) sends the signed-in user's session token to `/api/stats`, which asks Supabase whose token it is and only proceeds if that account's email is in `STATS_ADMIN_EMAIL`, is verified, and signed in with Google (so nobody can pass by registering the same address another way). Aggregation is a pure, unit-tested function.
**Why:** The questions that matter for a free AI product (how fast are reviews, how often a backup model is needed, how often the free quota runs out, what fraction of quotes verify) can only be answered from the server. Keeping the events content-free means the stats can never leak what anyone uploaded.
**Trade-off accepted:** Recording adds up to 2 seconds of server work after the user already has their result, and stats need one more secret in the server environment. Without it, nothing is recorded and the app works the same.

## D39. Daily limits: one free review for guests, three a day signed in
**Decision:** A "generation" is one review or comparison. Guests get 1 per device per day, then a sign-in prompt; signed-in users get 3 a day. Days reset at midnight India time. Follow-up questions, scanned-page reading, the samples, cached results and reopening saved reviews are free. A run that fails before producing anything gives its generation back. The developer's account is exempt so demos always work. The upload areas check the allowance before reading a file, and the server enforces it: a database function (`take_generation`) checks and increments the count in one statement, so parallel tabs can't overshoot.
**Why:** Free AI tiers have hard daily caps; without limits a handful of heavy users (or one script) could use up everyone's reviews for the day. One free try keeps the product instantly usable; asking for sign-in after that also gives people history across devices. Guests are tracked by a random device cookie rather than their IP address, because a whole hostel or office can share one IP.
**Trade-off accepted:** A determined guest can clear cookies for another free review; the per-IP hourly limit (D22) still caps that. If the limits table is unavailable, reviews are allowed rather than blocked.

## D40. Deployed on Vercel from GitHub, running in Mumbai
**Decision:** The Vercel project is connected to the GitHub repository, so every push to `main` deploys. Server functions run in Mumbai (`bom1`, set in `vercel.json`). Secrets live only in Vercel's environment settings; `DEV_PROXY` is never set there.
**Why:** Users, the Supabase database and the hostel network are all in India; the default region (Washington) would add a round trip across the world to every review and database call. Deploying from Git means the live site always matches a commit.
**Trade-off accepted:** The free plan runs functions in a single region, so users far from India get slightly slower server responses. Static pages are served worldwide from Vercel's edge either way.

## D41. Respect free-tier quotas, and keep unreliable models out of the way
**Decision:** When a model answers "quota exceeded" (429), it's skipped until its quota resets (Gemini: midnight Pacific time) instead of for 5 minutes. The default Gemini chain is `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-flash-lite-latest`, then Groq, and only then the last Gemini model (`gemini-3.8-flash`, the newest and most often overloaded on the free tier).
**Why:** The first live tests on Vercel were 3x slower than local ones. The logs showed why: testing had used up the free daily quota of the first two models, and the third hung until the 15-second timeout before a fallback answered. Free tiers have small per-model daily caps, so treating "quota used up" like a brief hiccup wastes time on every request.
**Trade-off accepted:** The skip list lives in each server instance's memory, so a freshly started instance relearns it with one fast 429. Lower-tier models may answer more often on busy days; every finding is still quote-verified either way.
