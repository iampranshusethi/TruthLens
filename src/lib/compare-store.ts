"use client";

import { guessTitle, splitClauses } from "@/lib/ingest/clauses";
import { detectKind } from "@/lib/ingest/kind";
import { mask, type MaskMap } from "@/lib/ingest/mask";
import type { Clause, Comparison, DocKind } from "@/lib/types";

/** A comparison kept in this browser, like a stored review. */
export type StoredComparison = {
  id: string;
  kind: DocKind;
  createdAt: number;
  documents: { id: string; fileName: string; pages: number; title: string; clauses: Clause[] }[];
  result?: Comparison;
  /** Masked copies sent to the AI, with one shared map so placeholders are consistent across documents. */
  masked: { map: MaskMap; documents: { id: string; fileName: string; clauses: Clause[] }[] };
};

const KEY = (id: string) => `tl.compare.${id}`;

export function storedComparisonJson(id: string): string | null {
  try {
    return localStorage.getItem(KEY(id));
  } catch {
    return null;
  }
}

export function saveComparison(c: StoredComparison) {
  try {
    localStorage.setItem(KEY(c.id), JSON.stringify(c));
  } catch {}
}

const SEP = "\n\u0000\n";
const DOC_SEP = "\n\u0001\n";

export function createComparison(files: { fileName: string; text: string; pages: number }[]): StoredComparison {
  const documents = files.map((f, i) => ({
    id: `d${i + 1}`,
    fileName: f.fileName,
    pages: f.pages,
    title: guessTitle(f.text) ?? f.fileName,
    clauses: splitClauses(f.text),
  }));

  // Majority vote on document type.
  const kinds = files.map((f) => detectKind(f.text));
  const kind = kinds.sort((a, b) => kinds.filter((k) => k === b).length - kinds.filter((k) => k === a).length)[0];

  const joined = documents.map((d) => d.clauses.map((c) => c.text).join(SEP)).join(DOC_SEP);
  const { masked, map } = mask(joined);
  const maskedDocs = masked.split(DOC_SEP).map((docText, i) => {
    const texts = docText.split(SEP);
    const d = documents[i];
    return { id: d.id, fileName: d.fileName, clauses: d.clauses.map((c, j) => ({ ...c, text: texts[j] })) };
  });

  return {
    id: crypto.randomUUID().slice(0, 8),
    kind,
    createdAt: Date.now(),
    documents,
    masked: { map, documents: maskedDocs },
  };
}
