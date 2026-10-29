/**
 * Quote verification (decisions.md D6): a finding is shown only if its quote
 * appears in the clause it cites. Matching tolerates differences that don't
 * change meaning (whitespace, curly vs straight quotes, dash styles, case)
 * and returns the clause's own wording, so highlights match the document exactly.
 */

function canon(ch: string): string {
  if (/\s/.test(ch)) return " ";
  if ("‘’‚‛′`".includes(ch)) return "'";
  if ("“”„‟″".includes(ch)) return '"';
  if ("‐‑‒–—―−".includes(ch)) return "-";
  return ch.toLowerCase();
}

/** Canonical form plus, for each canonical character, its index in the original. */
function canonicalize(s: string): { text: string; index: number[] } {
  let text = "";
  const index: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = canon(s[i]);
    if (c === " " && (text.endsWith(" ") || text.length === 0)) continue;
    text += c;
    index.push(i);
  }
  return { text, index };
}

function trimQuote(q: string) {
  const bare = q.trim().replace(/^["'“‘…. ]+|["'”’… ]+$/g, "");
  // An elided quote ("deposit … forfeited") can't be matched whole; use its longest piece.
  const pieces = bare.split(/\s*(?:\.\.\.|…)\s*/);
  return pieces.reduce((a, b) => (b.length > a.length ? b : a), "").trim();
}

/**
 * Returns the exact substring of `clauseText` that `quote` refers to, or null
 * if the quote isn't in the clause.
 */
export function locateQuote(clauseText: string, quote: string): string | null {
  const q = canonicalize(trimQuote(quote)).text.trim();
  if (q.length < 4) return null;
  const c = canonicalize(clauseText);
  const at = c.text.indexOf(q);
  if (at < 0) return null;
  const start = c.index[at];
  const end = c.index[at + q.length - 1] + 1;
  return clauseText.slice(start, end);
}
