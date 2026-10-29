import { describe, expect, it } from "vitest";
import { demoModel } from "@/lib/ai/demo";
import { jsonLines } from "@/lib/ai/ndjson";
import { reviewEvents } from "@/lib/ai/review";
import type { ReviewRequest } from "@/lib/ai/schema";
import type { ReviewEvent } from "@/lib/types";

const req: ReviewRequest = {
  fileName: "flat.pdf",
  kind: "rental",
  clauses: [
    { id: "c1", number: "4", heading: "Security deposit", text: "Refundable within sixty (60) days, subject to deductions at the Licensor's sole discretion." },
    { id: "c2", number: "5", heading: "Rent", text: "The rent is ₹28,000 per month, payable by the 5th." },
  ],
};

async function* chunks(text: string, size = 7) {
  for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size);
}

async function collect(model: AsyncIterable<string>) {
  const out: ReviewEvent[] = [];
  for await (const e of reviewEvents(req, model, () => "gemini")) out.push(e);
  return out;
}

const finding = (o: object) =>
  JSON.stringify({
    type: "finding",
    severity: "risk",
    title: "Owner decides deductions",
    plain: "p",
    scenario: "s",
    priorities: ["deposit", "made-up"],
    ...o,
  });

describe("jsonLines", () => {
  it("parses lines split across chunks and skips fences and prose", async () => {
    const out = [];
    for await (const o of jsonLines(chunks('```json\n{"a":1}\nSure, here you go:\n{"b":2},\n{"broken"\n'))) out.push(o);
    expect(out).toEqual([{ a: 1 }, { b: 2 }]);
  });
});

describe("reviewEvents", () => {
  it("emits verified findings, drops invented quotes and unknown clauses, and ends with a verdict", async () => {
    const model = [
      JSON.stringify({ type: "meta", kind: "rental", title: "Flat agreement", otherParty: "landlord" }),
      finding({ clauseId: "c1", quote: "subject to deductions at the Licensor’s sole discretion" }),
      finding({ clauseId: "c1", quote: "the deposit is non-refundable" }),
      finding({ clauseId: "c9", quote: "anything" }),
      finding({ clauseId: "c2", severity: "fair", quote: "payable by the 5th", ask: "should be dropped" }),
      JSON.stringify({ type: "verdict", headline: "Negotiate the deposit", summary: "One clause matters." }),
    ].join("\n");

    const events = await collect(chunks(model));
    const findings = events.flatMap((e) => (e.type === "finding" ? [e.finding] : []));

    expect(events[0]).toEqual({ type: "stage", stage: "check", status: "active" });
    expect(events[1]).toMatchObject({ type: "meta", title: "Flat agreement", engine: "gemini" });
    expect(findings).toHaveLength(2);
    expect(findings[0].quote).toBe("subject to deductions at the Licensor's sole discretion");
    expect(findings[0].priorities).toEqual(["deposit"]);
    expect(findings[1].ask).toBeUndefined();
    expect(events).toContainEqual({ type: "dropped", count: 2 });
    expect(events.at(-2)).toEqual({ type: "verdict", verdict: { headline: "Negotiate the deposit", summary: "One clause matters." } });
    expect(events.at(-1)).toEqual({ type: "done" });
  });

  it("still sends meta and a computed verdict when the model leaves them out", async () => {
    const events = await collect(chunks(finding({ clauseId: "c1", quote: "sole discretion" })));
    expect(events.find((e) => e.type === "meta")).toMatchObject({ kind: "rental", title: "flat" });
    expect(events.find((e) => e.type === "verdict")).toMatchObject({ verdict: { headline: "Fix 1 clause before you sign" } });
  });

  it("works end to end with the offline demo engine", async () => {
    const events = await collect(demoModel(req));
    const findings = events.filter((e) => e.type === "finding");
    expect(findings).toHaveLength(1);
    expect(events.some((e) => e.type === "dropped")).toBe(false);
  }, 10_000);
});
