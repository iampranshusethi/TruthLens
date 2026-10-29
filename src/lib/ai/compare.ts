import { z } from "zod";
import { jsonLines } from "@/lib/ai/ndjson";
import { MAX_CHARS } from "@/lib/ingest/clauses";
import { KIND_LABEL, PRIORITIES } from "@/lib/ingest/kind";
import type { CompareEvent, CompareRow, DocKind, Engine } from "@/lib/types";
import { locateQuote } from "@/lib/verify";

/* ---------- Request ---------- */

const MAX_TOTAL = Math.round(MAX_CHARS * 1.5);

export const compareRequest = z
  .object({
    kind: z.enum(["rental", "insurance", "contract"]),
    documents: z
      .array(
        z.object({
          id: z.string().min(1).max(12),
          fileName: z.string().trim().min(1).max(200),
          clauses: z
            .array(z.object({ id: z.string().max(12), number: z.string().max(16), heading: z.string().max(200), text: z.string().min(1).max(4000) }))
            .min(1)
            .max(150),
        }),
      )
      .min(2)
      .max(3),
  })
  .refine((r) => r.documents.flatMap((d) => d.clauses).reduce((n, c) => n + c.text.length, 0) <= MAX_TOTAL, {
    message: "too_long",
  });

export type CompareRequest = z.infer<typeof compareRequest>;

/* ---------- Prompt ---------- */

const NOUN: Record<DocKind, string> = { rental: "rental agreements", insurance: "insurance policies", contract: "contracts" };

export function comparePrompt(req: CompareRequest) {
  const priorities = PRIORITIES[req.kind];
  const ids = req.documents.map((d) => d.id);

  const system = `You are TruthLens. You compare ${NOUN[req.kind]} for an ordinary person in India who must choose one. Your reader is not a lawyer.

Write ONLY newline-delimited JSON: one compact JSON object per line, no markdown, no code fences, no other text.

Line 1: {"type":"meta","title":"short title for this comparison, e.g. Family health insurance, ₹10 lakh cover"}
Then one line per document:
{"type":"option","id":"${ids[0]}","name":"product or short name","provider":"company or other party","price":"headline cost, e.g. ₹18,400 / year, or Not stated"}
Then 8 to 12 topic lines, most important first:
{"type":"row","topic":"Hospital room rent","priority":"limits","cells":{${ids.map((id) => `"${id}":{"value":"…","score":7,"quote":"…"}`).join(",")}}}

Rules for rows:
- Pick topics that genuinely differ between the documents or matter most to the reader. Use the same topic for every document.
- priority: one id from this list that the topic affects: ${priorities.map((p) => `${p.id} (${p.label})`).join(", ")}.
- Every document id must have a cell in every row.
- value: at most 8 words, plain English, with the real number from the document.
- score: 0 to 10 from the reader's point of view; 10 is best for them. Score documents relative to each other.
- quote: 4 to 20 consecutive words copied EXACTLY from that document, character for character. Quotes are checked automatically. If the document doesn't mention the topic, set value to "Not stated", score 3, and leave quote out.

Style: plain English, no jargon, never use em dashes. Text like [NAME 1] is a hidden personal detail: copy it exactly and never guess it.`;

  const user = req.documents
    .map(
      (d) =>
        `===== DOCUMENT ${d.id} (${d.fileName}) =====\n` +
        d.clauses.map((c) => `Clause ${c.number}${c.heading ? ` · ${c.heading}` : ""}\n${c.text}`).join("\n\n"),
    )
    .join("\n\n");

  return { system, user };
}

/* ---------- Parsing and verification ---------- */

const short = (max: number) => z.string().trim().min(1).max(max);

const optionLine = z.object({
  type: z.literal("option"),
  id: short(12),
  name: short(80),
  provider: short(80).catch(""),
  price: short(60).catch("Not stated"),
});

const rowLine = z.object({
  type: z.literal("row"),
  topic: short(60),
  priority: z.string(),
  cells: z.record(
    z.string(),
    z.object({
      value: short(120),
      score: z.coerce.number().min(0).max(10),
      quote: z.string().trim().max(400).optional(),
    }),
  ),
});

/** Validates, verifies quotes against each document and emits comparison events. */
export async function* compareEvents(
  req: CompareRequest,
  modelText: AsyncIterable<string>,
  engine: () => Engine,
): AsyncGenerator<CompareEvent> {
  const docs = new Map(req.documents.map((d) => [d.id, d]));
  const priorityIds = new Set(PRIORITIES[req.kind].map((p) => p.id));
  const seenOptions = new Set<string>();
  let metaSent = false;
  let dropped = 0;
  let rows = 0;

  const meta = (title = `Comparing ${req.documents.length} ${NOUN[req.kind]}`): CompareEvent => {
    metaSent = true;
    return { type: "meta", kind: req.kind, title, engine: engine() };
  };
  const ensureOptions = function* (): Generator<CompareEvent> {
    for (const d of req.documents) {
      if (seenOptions.has(d.id)) continue;
      seenOptions.add(d.id);
      const name = d.fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
      yield { type: "option", option: { id: d.id, name, provider: KIND_LABEL[req.kind], fileName: d.fileName, price: "Not stated" } };
    }
  };

  for await (const raw of jsonLines(modelText)) {
    const type = (raw as { type?: unknown })?.type;
    if (type === "meta" && !metaSent) {
      const title = (raw as { title?: unknown }).title;
      yield meta(typeof title === "string" && title.trim() ? title.trim().slice(0, 120) : undefined);
      continue;
    }
    if (!metaSent) yield meta();

    if (type === "option") {
      const o = optionLine.safeParse(raw);
      if (!o.success || !docs.has(o.data.id) || seenOptions.has(o.data.id)) continue;
      seenOptions.add(o.data.id);
      const { id, name, provider, price } = o.data;
      yield { type: "option", option: { id, name, provider, price, fileName: docs.get(id)!.fileName } };
      continue;
    }
    if (type !== "row" || rows >= 14) continue;

    const r = rowLine.safeParse(raw);
    if (!r.success || !req.documents.every((d) => r.data.cells[d.id])) {
      dropped++;
      continue;
    }
    yield* ensureOptions();
    const cells: CompareRow["cells"] = {};
    for (const d of req.documents) {
      const c = r.data.cells[d.id];
      // A quote that isn't in the document is removed; the cell then says the wording wasn't found.
      const quote = c.quote ? d.clauses.map((cl) => locateQuote(cl.text, c.quote!)).find(Boolean) : undefined;
      if (c.quote && !quote) dropped++;
      cells[d.id] = { value: c.value, score: Math.round(c.score), ...(quote ? { quote } : {}) };
    }
    const priority = priorityIds.has(r.data.priority) ? r.data.priority : PRIORITIES[req.kind][0].id;
    yield { type: "row", row: { id: `r${++rows}`, topic: r.data.topic, priority, cells } };
  }

  if (!metaSent) yield meta();
  yield* ensureOptions();
  if (dropped) yield { type: "dropped", count: dropped };
  yield { type: "done" };
}

/* ---------- Offline demo (development without API keys) ---------- */

export async function* demoCompareModel(req: CompareRequest): AsyncGenerator<string> {
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const line = (o: object) => `${JSON.stringify(o)}\n`;
  await wait(800);
  yield line({ type: "meta", title: `Demo comparison of ${req.documents.length} documents` });
  for (const d of req.documents) yield line({ type: "option", id: d.id, name: d.fileName.replace(/\.[^.]+$/, "") });

  // Topic per priority: the clause most related to it, scored by length as a stand-in.
  for (const p of PRIORITIES[req.kind].slice(0, 5)) {
    await wait(500);
    const cells = Object.fromEntries(
      req.documents.map((d, i) => {
        const clause = d.clauses[(i + p.id.length) % d.clauses.length];
        const quote = clause.text.split(/\s+/).slice(0, 8).join(" ");
        return [d.id, { value: `Demo value from clause ${clause.number}`, score: (p.id.length * (i + 3)) % 11, quote }];
      }),
    );
    yield line({ type: "row", topic: p.label, priority: p.id, cells });
  }
}
