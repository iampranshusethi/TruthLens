import type { ReviewRequest } from "@/lib/ai/schema";
import { OTHER_PARTY } from "@/lib/ingest/kind";
import type { Severity } from "@/lib/types";

/**
 * An offline stand-in for the model, used in development when no API key is set.
 * It spots a few well-known risky phrases so the whole upload → stream → verify
 * pipeline can be exercised for real. The UI labels its output as a demo.
 */
const PATTERNS: { re: RegExp; severity: Severity; title: string; priorities: string[] }[] = [
  { re: /forfeit\w*/i, severity: "risk", title: "You could lose money you've already paid", priorities: ["deposit", "exit", "costs"] },
  { re: /sole discretion/i, severity: "risk", title: "The other side decides this alone", priorities: ["deposit", "costs"] },
  { re: /irrespective of/i, severity: "caution", title: "This applies no matter what", priorities: ["costs"] },
  { re: /at any time/i, severity: "caution", title: "This can happen at any time, without notice", priorities: ["privacy", "exit"] },
  { re: /howsoever/i, severity: "caution", title: "A very broad promise to cover losses", priorities: ["costs"] },
  { re: /non-?compete|shall not (?:join|engage)/i, severity: "risk", title: "Limits on where you can work next", priorities: ["future"] },
  { re: /co-?pay\w*/i, severity: "caution", title: "You pay part of every claim", priorities: ["limits", "claims"] },
  { re: /penalt\w+|late (?:charge|fee)/i, severity: "caution", title: "A penalty to watch out for", priorities: ["costs"] },
  { re: /exclu\w+/i, severity: "caution", title: "Check what isn't covered", priorities: ["limits"] },
];

function quoteAround(text: string, index: number, length: number) {
  const words = text.split(/(\s+)/);
  // Rebuild a short window of whole words around the match.
  let pos = 0;
  let startWord = 0;
  for (let i = 0; i < words.length; i++) {
    if (pos + words[i].length > index) {
      startWord = i;
      break;
    }
    pos += words[i].length;
  }
  const from = Math.max(0, startWord - 6);
  const to = Math.min(words.length, startWord + Math.ceil(length / 5) + 8);
  return words.slice(from, to).join("").trim();
}

export async function* demoModel(req: ReviewRequest): AsyncGenerator<string> {
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const line = (o: object) => `${JSON.stringify(o)}\n`;

  await wait(900);
  yield line({
    type: "meta",
    kind: req.kind,
    title: req.title || req.fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "),
    otherParty: OTHER_PARTY[req.kind],
  });

  const found: { clauseId: string; severity: Severity; title: string; quote: string; priorities: string[] }[] = [];
  for (const c of req.clauses) {
    for (const p of PATTERNS) {
      const m = c.text.match(p.re);
      if (m?.index !== undefined && !found.some((f) => f.clauseId === c.id)) {
        found.push({ clauseId: c.id, severity: p.severity, title: p.title, quote: quoteAround(c.text, m.index, m[0].length), priorities: p.priorities });
      }
    }
  }
  found.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "risk" ? -1 : 1));

  for (const f of found.slice(0, 12)) {
    await wait(450);
    yield line({
      type: "finding",
      ...f,
      plain: "This is a demo analysis: the wording here is a common warning sign. Add an AI key to get a real explanation.",
      scenario: "With a live AI key, this explains a concrete situation using the numbers in your document.",
      suggestion: "With a live AI key, TruthLens suggests fairer wording here.",
      ask: "With a live AI key, TruthLens drafts a polite message you can send.",
    });
  }

  await wait(500);
  yield line({
    type: "verdict",
    headline: found.length ? "Demo: a few clauses worth a closer look" : "Demo: nothing obvious stood out",
    summary: "This is the offline demo engine, which only spots common risky phrases. Add a Gemini or Groq key for a full review.",
  });
}
