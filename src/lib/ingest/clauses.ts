import type { Clause } from "@/lib/types";

/** Longest document we accept, roughly 20–25 dense pages. */
export const MAX_CHARS = 60_000;
const MIN_CLAUSE_CHARS = 40;
const MAX_CLAUSE_CHARS = 2_400;

/** Cleans text extracted from PDFs and Word files. */
export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/(\w)-\n(\w)/g, "$1$2") // words hyphenated across lines
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// "4.", "4)", "3.1", "3.1.2" at the start of a line, followed by text.
const NUMBERED = /^(\d{1,2}(?:\.\d{1,2}){0,2})[.)]?\s+(\S.*)$/;
// "Clause 7", "Section 3.2", "Article IV" at the start of a line.
const LABELLED = /^(?:clause|section|article)\s+(\d{1,2}(?:\.\d{1,2}){0,2}|[IVXLC]{1,6})\b[.:\-\s]*(.*)$/i;

type Block = { number: string | null; lines: string[] };

/** A short line with no full stop reads as a heading, e.g. "Security deposit". */
function looksLikeHeading(text: string) {
  const words = text.split(/\s+/).length;
  return words <= 8 && !/[.;:,]$/.test(text) && /^[A-Z(]/.test(text);
}

function headingOf(text: string): { heading: string; body: string } {
  // "Security deposit: The Licensee shall…" / "SECURITY DEPOSIT. The Licensee…"
  const inline = text.match(/^([A-Z][A-Za-z ,'&/()-]{2,50}?)[:.–]\s+(.{20,})$/);
  if (inline && looksLikeHeading(inline[1])) return { heading: tidyHeading(inline[1]), body: inline[2] };
  return { heading: "", body: text };
}

function tidyHeading(h: string) {
  const t = h.trim();
  // ALL CAPS headings → sentence case.
  if (t === t.toUpperCase()) return t.charAt(0) + t.slice(1).toLowerCase();
  return t;
}

function firstWords(text: string, n = 6) {
  const words = text.replace(/[^\w\s'-]/g, "").split(/\s+/).filter(Boolean);
  const out = words.slice(0, n).join(" ");
  return words.length > n ? `${out}…` : out;
}

/** Splits on numbered clause starts. Returns null if the document isn't numbered. */
function splitNumbered(text: string): Block[] | null {
  const blocks: Block[] = [];
  let current: Block = { number: null, lines: [] };
  let numberedStarts = 0;

  for (const line of text.split("\n")) {
    const m = line.match(NUMBERED) ?? line.match(LABELLED);
    // Guard against prices or dates at line start ("12 months…" is fine, "2026 the…" is not a clause).
    const isClause = m && !/^\d{3,}/.test(line) && Number.parseFloat(m[1]) < 100;
    if (isClause) {
      if (current.lines.length || current.number) blocks.push(current);
      current = { number: m[1], lines: m[2] ? [m[2]] : [] };
      numberedStarts++;
    } else if (line.trim()) {
      current.lines.push(line);
    } else if (current.lines.length) {
      current.lines.push(""); // keep paragraph breaks inside a clause
    }
  }
  if (current.lines.length || current.number) blocks.push(current);
  return numberedStarts >= 3 ? blocks : null;
}

/** Fallback: paragraphs, or groups of sentences when the text has no paragraph breaks. */
function splitParagraphs(text: string): Block[] {
  let parts = text.split(/\n\n+/).map((p) => p.replace(/\n/g, " ").trim()).filter(Boolean);
  if (parts.length < 3) {
    const sentences = text.replace(/\n/g, " ").match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [text];
    parts = [];
    let buf = "";
    for (const s of sentences) {
      if ((buf + s).length > 600 && buf) {
        parts.push(buf.trim());
        buf = "";
      }
      buf += s;
    }
    if (buf.trim()) parts.push(buf.trim());
  }
  return parts.map((p) => ({ number: null, lines: [p] }));
}

/** Splits a long block on paragraph breaks, then sentences, so no clause is unreadably long. */
function chunk(text: string): string[] {
  if (text.length <= MAX_CLAUSE_CHARS) return [text];
  const out: string[] = [];
  let buf = "";
  for (const piece of text.split(/(?<=\n\n)|(?<=[.;]\s)/)) {
    if ((buf + piece).length > MAX_CLAUSE_CHARS && buf) {
      out.push(buf.trim());
      buf = "";
    }
    buf += piece;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

/**
 * Splits document text into clauses with stable ids.
 * Every character of the input ends up in exactly one clause (modulo whitespace),
 * so nothing the model is asked about can silently disappear.
 */
export function splitClauses(raw: string): Clause[] {
  const text = normalizeText(raw);
  const blocks = splitNumbered(text) ?? splitParagraphs(text);

  // A short numbered block that's only a heading ("4. SECURITY DEPOSIT") takes the next block's text.
  const merged: { number: string | null; heading: string; body: string }[] = [];
  let pendingHeading: { number: string | null; heading: string } | null = null;
  for (const b of blocks) {
    const body = b.lines.join("\n").replace(/\n{2,}/g, "\n\n").trim();
    if (!body) continue;
    if (b.number && looksLikeHeading(body) && body.length < 60) {
      pendingHeading = { number: b.number, heading: tidyHeading(body) };
      continue;
    }
    const [firstLine, ...restLines] = body.split("\n");
    // "4. SECURITY DEPOSIT\nThe Licensee shall…": the first line is the heading.
    // An unnumbered opening block's first line is usually the document title.
    const ownLine =
      restLines.join("").trim() && looksLikeHeading(firstLine) && firstLine.length < 60
        ? {
            heading: !b.number && merged.length === 0 ? "Introduction" : tidyHeading(firstLine),
            body: restLines.join("\n").trim(),
          }
        : null;
    const { heading, body: rest } = ownLine ?? headingOf(body);
    if (pendingHeading) {
      merged.push({ number: pendingHeading.number, heading: pendingHeading.heading, body });
      pendingHeading = null;
    } else {
      merged.push({ number: b.number, heading, body: rest });
    }
  }
  if (pendingHeading) merged.push({ ...pendingHeading, body: pendingHeading.heading });

  // Tiny unnumbered fragments ("Signed:") join the clause before them. A tiny fragment
  // before the first clause is the document title, which is shown separately.
  const folded: typeof merged = [];
  for (const m of merged) {
    const tiny = !m.number && m.body.length < MIN_CLAUSE_CHARS;
    if (tiny && folded.length) {
      folded[folded.length - 1].body += `\n${m.body}`;
    } else if (!tiny || merged.length === 1) {
      folded.push(m);
    }
  }

  const clauses: Clause[] = [];
  let unnumbered = 0;
  for (const m of folded) {
    const parts = chunk(m.body);
    parts.forEach((part, i) => {
      const number = m.number ?? `¶${++unnumbered}`;
      clauses.push({
        id: `c${clauses.length + 1}`,
        number: parts.length > 1 ? `${number}${String.fromCharCode(97 + i)}` : number,
        heading: m.heading || firstWords(part),
        text: part,
      });
    });
  }
  return clauses;
}

/** A short title for the document: its first heading-like line, if it has one. */
export function guessTitle(raw: string): string | null {
  const first = normalizeText(raw)
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 3);
  if (!first || first.length > 80 || NUMBERED.test(first)) return null;
  return tidyHeading(first.replace(/[.:]$/, ""));
}
