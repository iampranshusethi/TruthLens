"use client";

import { Briefcase, ChevronRight, Home, LogIn, ShieldPlus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useAuth } from "@/components/auth";
import { DropZone } from "@/components/drop-zone";
import { useToast } from "@/components/toast";
import { KIND_LABEL } from "@/lib/ingest/kind";
import { deleteFromCloud, listCloud } from "@/lib/cloud";
import { deleteComparison, listComparisons, type StoredComparison } from "@/lib/compare-store";
import { deleteReview, listReviews, type StoredReview } from "@/lib/review-store";
import { sampleRental } from "@/lib/samples/rental";
import type { DocKind, Finding } from "@/lib/types";

type Item = {
  id: string;
  kind: DocKind;
  title: string;
  detail: string;
  when: string;
  verdict: string;
  findings?: Finding[];
  href: string;
  createdAt: number;
  removable?: "review" | "compare";
};

const ICON = { rental: Home, insurance: ShieldPlus, contract: Briefcase };

const EXAMPLES: Item[] = [
  {
    id: "sample",
    kind: "rental",
    title: sampleRental.fileName,
    detail: "Rental agreement · 11 pages",
    when: "Example",
    createdAt: 0,
    verdict: sampleRental.verdict.headline,
    findings: sampleRental.findings,
    href: "/review/sample",
  },
  {
    id: "sample-compare",
    kind: "insurance",
    title: "Shield Health Optima vs Navya Family Floater",
    detail: "Comparison · 2 policies",
    when: "Example",
    createdAt: 0,
    verdict: "Ranked live on what matters to you",
    href: "/compare/sample",
  },
];

function when(ts: number) {
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function reviewItem(r: StoredReview): Item {
  return {
    id: r.id,
    kind: r.result?.kind ?? r.kind,
    title: r.fileName,
    detail: `${KIND_LABEL[r.result?.kind ?? r.kind]} · ${r.pages} ${r.pages === 1 ? "page" : "pages"}`,
    when: when(r.createdAt),
    createdAt: r.createdAt,
    verdict: r.result?.verdict.headline ?? "Not finished. Open it to run the review again.",
    findings: r.result?.findings,
    href: `/review/${r.id}`,
    removable: "review",
  };
}

function compareItem(c: StoredComparison): Item {
  return {
    id: c.id,
    kind: c.kind,
    title: c.documents.map((d) => d.fileName).join(" vs "),
    detail: `Comparison · ${c.documents.length} documents`,
    when: when(c.createdAt),
    createdAt: c.createdAt,
    verdict: c.result?.title ?? "Not finished. Open it to run the comparison again.",
    href: `/compare/${c.id}`,
    removable: "compare",
  };
}

// Re-read storage when it changes in this tab (after a delete) or another tab.
let version = 0;
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
const bump = () => {
  version++;
  listeners.forEach((l) => l());
};

function localItems() {
  return [...listReviews().map(reviewItem), ...listComparisons().map(compareItem)];
}

export function HistoryList() {
  const toast = useToast();
  const { status, user, signIn } = useAuth();
  const v = useSyncExternalStore(subscribe, () => version, () => -1);
  const [cache] = useState(() => new Map<number, Item[]>());
  if (v >= 0 && !cache.has(v)) cache.set(v, localItems());

  // Items saved to the account but not on this device.
  const [cloudItems, setCloudItems] = useState<Item[]>([]);
  useEffect(() => {
    if (status !== "signed-in") return;
    let live = true;
    listCloud().then((rows) => {
      if (!live) return;
      setCloudItems(
        rows.map((row) =>
          row.type === "review" ? reviewItem(row.data as StoredReview) : compareItem(row.data as StoredComparison),
        ),
      );
    });
    return () => {
      live = false;
    };
  }, [status, v]);

  const mine =
    v < 0
      ? null
      : [...cache.get(v)!, ...(status === "signed-in" ? cloudItems : [])]
          .filter((item, i, all) => all.findIndex((x) => x.id === item.id) === i)
          .sort((a, b) => b.createdAt - a.createdAt);

  const remove = (item: Item) => {
    if (item.removable === "compare") deleteComparison(item.id);
    else deleteReview(item.id);
    deleteFromCloud(item.id);
    setCloudItems((xs) => xs.filter((x) => x.id !== item.id));
    bump();
    toast(status === "signed-in" ? "Deleted from this browser and your account" : "Deleted from this browser");
  };

  return (
    <div className="space-y-10">
      {status === "signed-in" && user ? (
        <div className="rounded-3xl border border-mint/50 bg-mint-soft/40 p-6">
          <p className="font-medium">Signed in as {user.name}</p>
          <p className="mt-0.5 text-sm text-ink-2">
            Reviews you finish are saved to your account, including the document text, so you can reopen them on any
            device. Delete one and it&apos;s removed everywhere.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded-3xl border border-mint/50 bg-mint-soft/40 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Keep your reviews on every device</p>
            <p className="mt-0.5 text-sm text-ink-2">
              Reviews are saved in this browser. Sign in to keep them wherever you are.
            </p>
          </div>
          <button
            type="button"
            onClick={signIn}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-transform active:scale-[0.98]"
          >
            <LogIn size={16} /> Continue with Google
          </button>
        </div>
      )}

      {mine !== null &&
        (mine.length ? (
          <ItemList items={mine} onDelete={remove} />
        ) : (
          <div className="rounded-3xl border border-dashed border-line-strong bg-card/60 p-8 text-center">
            <p className="font-display text-[1.4rem]">Your reviews will appear here</p>
            <p className="mt-1 text-sm text-ink-3">Upload an agreement to get started.</p>
            <div className="mx-auto mt-6 max-w-xl">
              <DropZone />
            </div>
          </div>
        ))}

      <section>
        <p className="mb-3 text-xs font-medium tracking-[0.14em] text-ink-3 uppercase">Examples</p>
        <ItemList items={EXAMPLES} />
      </section>
    </div>
  );
}

function ItemList({ items, onDelete }: { items: Item[]; onDelete?: (item: Item) => void }) {
  return (
    <ul className="grid gap-3">
      {items.map((item) => {
        const Icon = ICON[item.kind];
        const count = (s: Finding["severity"]) => item.findings?.filter((f) => f.severity === s).length ?? 0;
        return (
          <li key={item.id} className="group relative min-w-0">
            <Link
              href={item.href}
              className="flex w-full items-start gap-4 rounded-3xl border border-line bg-card p-4 text-left transition-all hover:border-line-strong hover:shadow-soft sm:p-5"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sunken text-ink-2">
                <Icon size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-medium">{item.title}</span>
                  <span className="shrink-0 text-xs text-ink-3">{item.when}</span>
                </span>
                <span className="mt-0.5 block text-xs text-ink-3">{item.detail}</span>
                <span className="mt-2 block font-display text-[1.05rem] leading-snug font-medium tracking-[-0.02em]">
                  {item.verdict}
                </span>
                {item.findings && (
                  <span className="mt-2.5 flex gap-3 text-xs">
                    <span className="inline-flex items-center gap-1.5 text-risk-ink">
                      <span className="h-1.5 w-1.5 rounded-full bg-risk" /> {count("risk")}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-caution-ink">
                      <span className="h-1.5 w-1.5 rounded-full bg-caution" /> {count("caution")}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-fair-ink">
                      <span className="h-1.5 w-1.5 rounded-full bg-fair" /> {count("fair")}
                    </span>
                  </span>
                )}
              </span>
              <ChevronRight
                size={18}
                className="mt-2.5 shrink-0 text-ink-4 transition-transform group-hover:translate-x-0.5"
              />
            </Link>
            {item.removable && onDelete && (
              <button
                type="button"
                aria-label={`Delete ${item.title}`}
                onClick={() => onDelete(item)}
                className="absolute right-12 bottom-4 rounded-full p-2 text-ink-4 transition-opacity hover:bg-sunken hover:text-risk-ink focus-visible:opacity-100 sm:bottom-5 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <Trash2 size={15} />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
