import type { Metadata } from "next";
import { HistoryList } from "@/components/history/history-list";

export const metadata: Metadata = { title: "History" };

export default function HistoryPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-8 pb-16 sm:px-6 lg:pt-12">
      <p className="text-xs font-medium tracking-[0.14em] text-mint-ink uppercase">History</p>
      <h1 className="mt-2 font-display text-[2rem] sm:text-[2.6rem]">Your reviews</h1>
      <p className="mt-2 text-sm text-ink-3">Everything you&apos;ve checked, with the verdict at a glance.</p>
      <div className="mt-6">
        <HistoryList />
      </div>
    </main>
  );
}
