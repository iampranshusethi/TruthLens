import { z } from "zod";
import { MAX_CHARS } from "@/lib/ingest/clauses";
import { OTHER_PARTY } from "@/lib/ingest/kind";

export const chatRequest = z.object({
  kind: z.enum(["rental", "insurance", "contract"]),
  clauses: z
    .array(z.object({ number: z.string().max(16), heading: z.string().max(200), text: z.string().min(1).max(4000) }))
    .min(1)
    .max(150)
    .refine((cs) => cs.reduce((n, c) => n + c.text.length, 0) <= MAX_CHARS),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().trim().min(1).max(2000) }))
    .min(1)
    .max(12)
    .refine((m) => m[m.length - 1].role === "user"),
});

export type ChatRequest = z.infer<typeof chatRequest>;

/** Citations in answers look like "(clause 4)" or "(clauses 4 and 6.1)"; the UI turns them into links. */
export const CITATION = /\((clauses?\s+[\w.¶]+(?:(?:,\s*|\s+and\s+)[\w.¶]+)*)\)/gi;

export function chatPrompt(req: ChatRequest) {
  const system = `You are TruthLens. You answer questions about ONE document for an ordinary person in India who is about to sign it. Your reader is not a lawyer. The other party is their ${OTHER_PARTY[req.kind]}.

Rules:
- Answer only from the document below. If it doesn't cover the question, say so plainly and suggest what to ask the other party.
- If the question isn't about this document or signing it, say you can only help with this document.
- After each sentence that relies on the document, cite the clause in exactly this form: (clause 4) or (clauses 4 and 6.1). Use the clause numbers shown.
- Keep answers under 120 words. Plain English, short sentences, use real numbers from the document. Use a short list only when it really helps.
- Never use em dashes. No markdown headings, no disclaimers.
- Text like [NAME 1] is a hidden personal detail: refer to it as written and never guess it.

THE DOCUMENT:
${req.clauses.map((c) => `Clause ${c.number}${c.heading ? ` · ${c.heading}` : ""}\n${c.text}`).join("\n\n")}`;

  return { system, messages: req.messages };
}

/** Offline stand-in for development without API keys: points at the most relevant clause. */
export async function* demoChat(req: ChatRequest): AsyncGenerator<string> {
  const question = req.messages[req.messages.length - 1].text.toLowerCase();
  const words = question.split(/\W+/).filter((w) => w.length > 3);
  const best = [...req.clauses].sort(
    (a, b) => words.filter((w) => b.text.toLowerCase().includes(w)).length - words.filter((w) => a.text.toLowerCase().includes(w)).length,
  )[0];
  const answer = `This is the offline demo, so it can only point you to the most relevant part of your document. Clause ${best.number} looks like the place to start (clause ${best.number}). Add an AI key for a real answer.`;
  for (const word of answer.split(/(?<= )/)) {
    await new Promise((r) => setTimeout(r, 35));
    yield word;
  }
}
