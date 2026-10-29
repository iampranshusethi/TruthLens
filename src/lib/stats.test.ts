import { describe, expect, it } from "vitest";
import { type EventRow, summariseEvents } from "@/lib/stats";

const row = (o: Partial<EventRow>): EventRow => ({
  created_at: "2026-10-29T06:00:00Z",
  type: "review",
  kind: "rental",
  engine: "gemini",
  model: "gemini-3.6-flash",
  ok: true,
  error_code: null,
  duration_ms: 16_000,
  findings: 9,
  dropped: 1,
  fallbacks: 0,
  cached: false,
  ...o,
});

describe("summariseEvents", () => {
  const now = new Date("2026-10-29T12:00:00Z");
  const stats = summariseEvents(
    [
      row({}),
      row({ duration_ms: 8_000, findings: 5, dropped: 0, fallbacks: 1, model: "gemini-3.5-flash" }),
      row({ ok: false, error_code: "quota", findings: 0, dropped: 0 }),
      row({ cached: true, model: "cache" }),
      row({ type: "compare", kind: "insurance", findings: 7, created_at: "2026-10-28T20:00:00Z" }),
      row({ type: "chat", kind: "rental" }),
    ],
    now,
  );

  it("counts each type and its successes", () => {
    expect(stats.totals.review).toEqual({ all: 4, ok: 3 });
    expect(stats.totals.compare).toEqual({ all: 1, ok: 1 });
    expect(stats.totals.chat.all).toBe(1);
  });

  it("buckets by Indian date, ending today", () => {
    expect(stats.daily).toHaveLength(14);
    // 2026-10-28T20:00Z is 29 Oct 01:30 in India.
    expect(stats.daily.at(-1)).toEqual({ date: "2026-10-29", reviews: 4, compares: 1 });
  });

  it("measures only live, successful reviews for timing and quality", () => {
    expect(stats.reviewSeconds.median).toBe(16);
    expect(stats.findingsPerReview).toBe(7);
    expect(stats.verifiedShare).toBeCloseTo(14 / 15);
  });

  it("reports fallbacks, cache hits, models and errors", () => {
    expect(stats.fallbackShare).toBeCloseTo(1 / 5);
    expect(stats.cachedShare).toBeCloseTo(1 / 5);
    expect(stats.byModel[0]).toEqual({ model: "gemini-3.6-flash", count: 3 });
    expect(stats.errors).toEqual([{ code: "quota", count: 1 }]);
    expect(stats.byKind).toEqual([
      { kind: "rental", count: 4 },
      { kind: "insurance", count: 1 },
    ]);
  });
});
