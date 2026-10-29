/**
 * Masks personal details before text leaves the browser (see decisions.md D9).
 * Each distinct value gets a numbered placeholder, so the model can still tell
 * "[NAME 1]" from "[NAME 2]", and results can be un-masked locally.
 */

export type MaskMap = Record<string, string>; // placeholder → original

type Rule = { label: string; re: RegExp; group?: number };

// Order matters: specific formats run before generic digit runs.
const RULES: Rule[] = [
  { label: "EMAIL", re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g },
  { label: "PAN", re: /\b[A-Z]{5}\d{4}[A-Z]\b/g },
  { label: "IFSC", re: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g },
  { label: "AADHAAR", re: /\b[2-9]\d{3}[ -]?\d{4}[ -]?\d{4}\b/g },
  { label: "PHONE", re: /(?:\+91[ -]?|\b0)?\b[6-9]\d{4}[ -]?\d{5}\b/g },
  {
    label: "ACCOUNT",
    re: /\b(?:a\/c|acct|account)(?:\s*(?:no\.?|number|#))?[\s:.-]*(\d{9,18})\b/gi,
    group: 1,
  },
  {
    label: "NAME",
    // A title followed by one to three capitalised words: "Mr. R. Narayan", "Smt Kavita Rao".
    re: /\b(?:Mr|Mrs|Ms|Miss|Shri|Sri|Smt|Kumari|Dr)\.?\s+((?:[A-Z]\.\s?)*[A-Z][a-z]+(?:\s+(?:[A-Z]\.\s?)*[A-Z][a-z]+){0,2})/g,
    group: 1,
  },
];

export function mask(text: string): { masked: string; map: MaskMap } {
  const map: MaskMap = {};
  const seen = new Map<string, string>(); // original → placeholder
  const counters: Record<string, number> = {};

  const placeholderFor = (label: string, value: string) => {
    const key = `${label}:${value}`;
    let p = seen.get(key);
    if (!p) {
      counters[label] = (counters[label] ?? 0) + 1;
      p = `[${label} ${counters[label]}]`;
      seen.set(key, p);
      map[p] = value;
    }
    return p;
  };

  let masked = text;
  for (const { label, re, group } of RULES) {
    masked = masked.replace(re, (match, ...args) => {
      if (!group) return placeholderFor(label, match);
      const value = args[group - 1] as string;
      return match.replace(value, placeholderFor(label, value));
    });
  }
  return { masked, map };
}

export function unmask(text: string, map: MaskMap): string {
  if (!text.includes("[")) return text;
  return text.replace(/\[(?:EMAIL|PAN|IFSC|AADHAAR|PHONE|ACCOUNT|NAME) \d+\]/g, (p) => map[p] ?? p);
}

/** Un-masks every string field of a JSON-like value. */
export function unmaskDeep<T>(value: T, map: MaskMap): T {
  if (typeof value === "string") return unmask(value, map) as T;
  if (Array.isArray(value)) return value.map((v) => unmaskDeep(v, map)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, unmaskDeep(v, map)])) as T;
  }
  return value;
}

/** Masks text again with an existing map, e.g. chat history that was shown un-masked. */
export function remask(text: string, map: MaskMap): string {
  const pairs = Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  return pairs.reduce((t, [placeholder, original]) => t.split(original).join(placeholder), text);
}

export function maskedCount(map: MaskMap) {
  return Object.keys(map).length;
}
