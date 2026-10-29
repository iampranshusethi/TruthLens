import { z } from "zod";
import { MAX_CHARS } from "@/lib/ingest/clauses";

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((s) => s || undefined);

/** What the browser sends to /api/review. Clause text is already masked. */
export const reviewRequest = z
  .object({
    fileName: text(200),
    /** Our guess from the first line; the model may improve it. */
    title: z.string().trim().max(120).optional(),
    kind: z.enum(["rental", "insurance", "contract"]),
    clauses: z
      .array(z.object({ id: text(12), number: text(16), heading: z.string().max(200), text: text(4000) }))
      .min(1)
      .max(150),
  })
  .refine((r) => r.clauses.reduce((n, c) => n + c.text.length, 0) <= MAX_CHARS, { message: "too_long" });

export type ReviewRequest = z.infer<typeof reviewRequest>;

/* ---------- Lines the model writes ---------- */

export const metaLine = z.object({
  type: z.literal("meta"),
  kind: z.enum(["rental", "insurance", "contract"]).catch("contract"),
  title: text(120),
  otherParty: text(40).catch("the other party"),
});

export const findingLine = z.object({
  type: z.literal("finding"),
  clauseId: text(12),
  severity: z.enum(["risk", "caution", "fair"]),
  title: text(140),
  quote: text(400),
  plain: text(600),
  scenario: text(600),
  benchmark: optionalText(400),
  suggestion: optionalText(800),
  ask: optionalText(600),
  priorities: z.array(z.string()).max(6).catch([]),
});

export const verdictLine = z.object({
  type: z.literal("verdict"),
  headline: text(90),
  summary: text(700),
});
