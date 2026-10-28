import type { Comparison, CompareRow } from "@/lib/types";

export type Weights = Record<string, number>;

/**
 * Fit score (0–100) for each option under the user's weights.
 * Pure and cheap, so rankings update live as sliders move, with no model call.
 */
export function rankOptions(c: Comparison, weights: Weights) {
  const scored = c.options.map((o) => {
    let got = 0;
    let max = 0;
    for (const row of c.rows) {
      const w = weights[row.priority] ?? 0;
      got += w * row.cells[o.id].score;
      max += w * 10;
    }
    return { id: o.id, score: max === 0 ? 0 : Math.round((got / max) * 100) };
  });
  return scored.sort((a, b) => b.score - a.score);
}

/** Topics where `a` beats `b`, ordered by how much they matter to this user. */
export function advantages(c: Comparison, weights: Weights, a: string, b: string, limit = 3): CompareRow[] {
  return c.rows
    .map((row) => ({ row, gain: (weights[row.priority] ?? 0) * (row.cells[a].score - row.cells[b].score) }))
    .filter((x) => x.gain > 0)
    .sort((x, y) => y.gain - x.gain)
    .slice(0, limit)
    .map((x) => x.row);
}

export function bestIn(row: CompareRow): string | null {
  const entries = Object.entries(row.cells);
  const top = Math.max(...entries.map(([, cell]) => cell.score));
  const winners = entries.filter(([, cell]) => cell.score === top);
  return winners.length === 1 ? winners[0][0] : null;
}

/** "a, b and c" */
export function joinList(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
