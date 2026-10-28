"use client";

import { Check } from "lucide-react";
import type { Priority } from "@/lib/types";

export function PriorityChips({
  priorities,
  selected,
  onToggle,
  title,
  hint,
}: {
  priorities: Priority[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  title: string;
  hint: string;
}) {
  return (
    <div className="rounded-3xl border border-line bg-card p-6">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-xs text-ink-3">{hint}</p>
      <div className="mt-3.5 flex flex-wrap gap-2">
        {priorities.map((p) => {
          const on = selected.has(p.id);
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(p.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all active:scale-[0.97] ${
                on
                  ? "border-mint bg-mint-soft text-mint-ink"
                  : "border-line-strong text-ink-2 hover:border-ink-4 hover:bg-sunken/60"
              }`}
            >
              {on && <Check size={13} strokeWidth={2.5} />}
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
