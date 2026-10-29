"use client";

import { Lock, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth";
import { supabase } from "@/lib/cloud";
import { KIND_LABEL } from "@/lib/ingest/kind";
import type { Stats } from "@/lib/stats";

type Load =
  | { state: "loading" }
  | { state: "ready"; stats: Stats }
  | { state: "blocked"; title: string; body: string };

const BAR = "#2f9e7e"; // brand mint, deepened to pass 3:1 against the card (validated)

const pct = (x: number | null) => (x === null ? "–" : `${Math.round(x * 100)}%`);
const secs = (x: number | null) => (x === null ? "–" : `${x < 10 ? x.toFixed(1) : Math.round(x)}s`);
const shortDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export function StatsDashboard() {
  const { status, signIn } = useAuth();
  const [load, setLoad] = useState<Load>({ state: "loading" });

  useEffect(() => {
    if (status !== "signed-in") return;
    let live = true;
    (async () => {
      const { data } = (await supabase()?.auth.getSession()) ?? { data: { session: null } };
      const res = await fetch("/api/stats", { headers: { authorization: `Bearer ${data.session?.access_token ?? ""}` } });
      const body = await res.json().catch(() => null);
      if (!live) return;
      if (res.ok) setLoad({ state: "ready", stats: body as Stats });
      else if (res.status === 403) setLoad({ state: "blocked", title: "This page is private", body: "Usage stats are only visible to the developer." });
      else if (res.status === 503)
        setLoad({ state: "blocked", title: "Stats aren't set up yet", body: "Add SUPABASE_SECRET_KEY and STATS_ADMIN_EMAIL to the server environment, and create the usage_events table." });
      else setLoad({ state: "blocked", title: "Couldn't load stats", body: body?.message ?? "Try again in a moment." });
    })();
    return () => {
      live = false;
    };
  }, [status]);

  if (status === "disabled") return <Notice title="Stats need sign-in" body="Connect Supabase to enable sign-in and usage stats." />;
  if (status === "signed-out") {
    return (
      <Notice title="Sign in to see stats" body="Usage stats are only visible to the developer.">
        <button
          type="button"
          onClick={signIn}
          className="mt-6 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-transform active:scale-[0.98]"
        >
          Sign in
        </button>
      </Notice>
    );
  }
  if (status === "loading" || load.state === "loading") {
    return (
      <div className="flex justify-center py-24">
        <LoaderCircle size={22} className="animate-spin text-ink-4" />
      </div>
    );
  }
  if (load.state === "blocked") return <Notice title={load.title} body={load.body} />;

  const s = load.stats;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Reviews" value={s.totals.review.all} note={`${s.totals.review.ok} completed`} />
        <Tile label="Comparisons" value={s.totals.compare.all} note={`${s.totals.compare.ok} completed`} />
        <Tile label="Questions answered" value={s.totals.chat.ok} note={`${s.totals.chat.all} asked`} />
        <Tile label="Scanned pages read" value={s.totals.ocr.ok} note={`${s.totals.ocr.all} sent`} />
        <Tile label="Median review time" value={secs(s.reviewSeconds.median)} note={`90% under ${secs(s.reviewSeconds.p90)}`} />
        <Tile
          label="Findings per review"
          value={s.findingsPerReview === null ? "–" : s.findingsPerReview.toFixed(1)}
          note={`${pct(s.verifiedShare)} of quotes verified`}
        />
        <Tile label="Signed-in users" value={s.users ?? "–"} note={`${s.savedItems ?? 0} saved items`} />
        <Tile label="Needed a backup model" value={pct(s.fallbackShare)} note={`${pct(s.cachedShare)} served from cache`} />
      </div>

      <DailyChart daily={s.daily} />

      <div className="grid gap-4 md:grid-cols-3">
        <Breakdown
          title="Document types"
          rows={s.byKind.map((k) => ({ label: KIND_LABEL[k.kind as keyof typeof KIND_LABEL] ?? k.kind, count: k.count }))}
          empty="No reviews yet."
        />
        <Breakdown title="Models that answered" rows={s.byModel.map((m) => ({ label: m.model, count: m.count }))} empty="No AI calls yet." />
        <Breakdown
          title="Failures"
          rows={s.errors.map((e) => ({ label: ERROR_LABEL[e.code] ?? e.code, count: e.count }))}
          empty="No failures in the last 30 days."
        />
      </div>
    </div>
  );
}

const ERROR_LABEL: Record<string, string> = {
  quota: "Free AI allowance used up",
  unavailable: "AI didn't respond",
  unknown: "Other",
};

function Notice({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-line bg-card px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sunken text-ink-3">
        <Lock size={19} />
      </span>
      <p className="mt-4 font-display text-[1.5rem] leading-tight">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-3">{body}</p>
      {children}
    </div>
  );
}

function Tile({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div className="rounded-3xl border border-line bg-card p-5">
      <p className="text-xs text-ink-3">{label}</p>
      <p className="mt-2 font-display text-[2rem] leading-none tabular-nums">{value}</p>
      <p className="mt-2 text-xs text-ink-4">{note}</p>
    </div>
  );
}

/** Reviews and comparisons per day: one series, so no legend; hover any day for the breakdown. */
function DailyChart({ daily }: { daily: Stats["daily"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const totals = daily.map((d) => d.reviews + d.compares);
  const max = Math.max(1, ...totals);
  const top = Math.max(2, Math.ceil(max / 2) * 2); // a round gridline value
  const h = hover !== null ? daily[hover] : null;

  return (
    <section className="rounded-3xl border border-line bg-card p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-medium">Reviews and comparisons per day</h2>
        <p className="text-xs text-ink-3 tabular-nums" aria-live="polite">
          {h ? `${shortDate(h.date)}: ${h.reviews} reviews, ${h.compares} comparisons` : "Last 14 days"}
        </p>
      </div>
      <div className="relative mt-5 h-44" role="img" aria-label="Bar chart of reviews and comparisons per day">
        {/* Recessive gridlines at 0, half and top */}
        {[0, 0.5, 1].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-line" style={{ bottom: `${f * 100}%` }}>
            <span className="absolute -top-2 -left-0.5 bg-card pr-1 text-[10px] text-ink-4 tabular-nums">{Math.round(f * top)}</span>
          </div>
        ))}
        <div className="absolute inset-0 left-6 flex items-end gap-[2px]">
          {daily.map((d, i) => (
            <button
              key={d.date}
              type="button"
              aria-label={`${shortDate(d.date)}: ${totals[i]}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="group flex h-full flex-1 items-end justify-center"
            >
              <span
                className="w-full max-w-7 rounded-t-[4px] transition-opacity"
                style={{
                  height: `${(totals[i] / top) * 100}%`,
                  minHeight: totals[i] ? 3 : 0,
                  background: BAR,
                  opacity: hover === null || hover === i ? 1 : 0.45,
                }}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 ml-6 flex justify-between text-[10px] text-ink-4">
        <span>{shortDate(daily[0].date)}</span>
        <span>Today</span>
      </div>
      {/* The same numbers as a table, for screen readers. */}
      <table className="sr-only">
        <thead>
          <tr>
            <th>Day</th>
            <th>Reviews</th>
            <th>Comparisons</th>
          </tr>
        </thead>
        <tbody>
          {daily.map((d) => (
            <tr key={d.date}>
              <td>{shortDate(d.date)}</td>
              <td>{d.reviews}</td>
              <td>{d.compares}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Breakdown({ title, rows, empty }: { title: string; rows: { label: string; count: number }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="rounded-3xl border border-line bg-card p-5">
      <h2 className="font-medium">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-ink-3">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.slice(0, 6).map((r) => (
            <li key={r.label}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-ink-2">{r.label}</span>
                <span className="text-ink tabular-nums">{r.count}</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-sunken">
                <div className="h-full rounded-full" style={{ width: `${(r.count / max) * 100}%`, background: BAR }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
