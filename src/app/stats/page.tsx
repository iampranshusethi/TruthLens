import type { Metadata } from "next";
import { StatsDashboard } from "@/components/stats/stats-dashboard";

export const metadata: Metadata = { title: "Stats", robots: { index: false, follow: false } };

/** Private usage stats for the developer (decisions.md D38). Not linked from the header. */
export default function StatsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <p className="text-xs font-medium tracking-[0.14em] text-mint-ink uppercase">Private</p>
      <h1 className="mt-2 font-display text-[2rem] sm:text-[2.6rem]">How TruthLens is used</h1>
      <p className="mt-2 text-sm text-ink-3">Last 30 days. Anonymous counts and timings only: no document content.</p>
      <div className="mt-8">
        <StatsDashboard />
      </div>
    </main>
  );
}
