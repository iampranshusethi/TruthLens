/** Turns raw usage events into the numbers on the stats page. Pure, so it's unit-tested. */

export type EventRow = {
  created_at: string;
  type: "review" | "compare" | "chat" | "ocr";
  kind: string | null;
  engine: string | null;
  model: string | null;
  ok: boolean;
  error_code: string | null;
  duration_ms: number | null;
  findings: number | null;
  dropped: number | null;
  fallbacks: number | null;
  cached: boolean;
};

export type Stats = {
  days: number;
  totals: Record<EventRow["type"], { all: number; ok: number }>;
  /** Reviews and comparisons per day (IST), oldest first. */
  daily: { date: string; reviews: number; compares: number }[];
  byKind: { kind: string; count: number }[];
  byModel: { model: string; count: number }[];
  errors: { code: string; count: number }[];
  /** Live (not cached) reviews only. */
  reviewSeconds: { median: number | null; p90: number | null };
  findingsPerReview: number | null;
  verifiedShare: number | null;
  fallbackShare: number | null;
  cachedShare: number | null;
  users?: number;
  savedItems?: number;
};

const IST = 5.5 * 3600_000;
const dayOf = (iso: string) => new Date(new Date(iso).getTime() + IST).toISOString().slice(0, 10);

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return null;
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

function countBy<T>(items: T[], key: (t: T) => string | null | undefined) {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

const share = (part: number, whole: number) => (whole ? part / whole : null);

export function summariseEvents(rows: EventRow[], now = new Date(), chartDays = 14): Stats {
  const totals = Object.fromEntries(
    (["review", "compare", "chat", "ocr"] as const).map((t) => {
      const of = rows.filter((r) => r.type === t);
      return [t, { all: of.length, ok: of.filter((r) => r.ok).length }];
    }),
  ) as Stats["totals"];

  const today = dayOf(now.toISOString());
  const daily = Array.from({ length: chartDays }, (_, i) => {
    const d = new Date(new Date(`${today}T00:00:00Z`).getTime() - (chartDays - 1 - i) * 86_400_000).toISOString().slice(0, 10);
    const on = rows.filter((r) => dayOf(r.created_at) === d);
    return { date: d, reviews: on.filter((r) => r.type === "review").length, compares: on.filter((r) => r.type === "compare").length };
  });

  const analyses = rows.filter((r) => r.type === "review" || r.type === "compare");
  const live = rows.filter((r) => !r.cached);
  const liveReviews = live.filter((r) => r.type === "review" && r.ok);
  const seconds = liveReviews.map((r) => (r.duration_ms ?? 0) / 1000).sort((a, b) => a - b);
  const findings = liveReviews.reduce((n, r) => n + (r.findings ?? 0), 0);
  const dropped = liveReviews.reduce((n, r) => n + (r.dropped ?? 0), 0);

  return {
    days: 30,
    totals,
    daily,
    byKind: countBy(analyses, (r) => r.kind).map(([kind, count]) => ({ kind, count })),
    byModel: countBy(
      live.filter((r) => r.ok),
      (r) => r.model,
    ).map(([model, count]) => ({ model, count })),
    errors: countBy(
      rows.filter((r) => !r.ok),
      (r) => r.error_code ?? "unknown",
    ).map(([code, count]) => ({ code, count })),
    reviewSeconds: { median: quantile(seconds, 0.5), p90: quantile(seconds, 0.9) },
    findingsPerReview: liveReviews.length ? findings / liveReviews.length : null,
    verifiedShare: share(findings, findings + dropped),
    fallbackShare: share(live.filter((r) => (r.fallbacks ?? 0) > 0).length, live.length),
    cachedShare: share(analyses.filter((r) => r.cached).length, analyses.length),
  };
}
