"use client";

import { guessTitle, MAX_CHARS, splitClauses } from "@/lib/ingest/clauses";
import { detectKind, KIND_LABEL } from "@/lib/ingest/kind";
import { mask, type MaskMap } from "@/lib/ingest/mask";
import type { Clause, DocKind, Engine, Finding, Verdict } from "@/lib/types";

/**
 * Reviews kept in this browser (decisions.md D17): guests get history without an
 * account, and the original document text never has to leave the device.
 */
export type StoredReview = {
  id: string;
  fileName: string;
  pages: number;
  kind: DocKind;
  title: string;
  clauses: Clause[];
  maskMap: MaskMap;
  createdAt: number;
  /** Read from page images by the AI rather than from a text layer. */
  scanned?: boolean;
  result?: {
    title: string;
    otherParty: string;
    kind: DocKind;
    engine: Engine;
    findings: Finding[];
    verdict: Verdict;
    dropped: number;
    seconds: number;
  };
};

const KEY = (id: string) => `tl.review.${id}`;
const INDEX = "tl.reviews";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadReview(id: string) {
  return read<StoredReview>(KEY(id));
}

/** The raw stored JSON (a stable string, for useSyncExternalStore). */
export function storedJson(id: string): string | null {
  try {
    return localStorage.getItem(KEY(id));
  } catch {
    return null;
  }
}

export function saveReview(review: StoredReview) {
  write(KEY(review.id), review);
  const ids = (read<string[]>(INDEX) ?? []).filter((x) => x !== review.id);
  write(INDEX, [review.id, ...ids].slice(0, 30));
}

export function listReviews(): StoredReview[] {
  return (read<string[]>(INDEX) ?? []).flatMap((id) => loadReview(id) ?? []);
}

export function deleteReview(id: string) {
  try {
    localStorage.removeItem(KEY(id));
  } catch {}
  write(INDEX, (read<string[]>(INDEX) ?? []).filter((x) => x !== id));
}

export class TooLongError extends Error {}

/** Builds a review from extracted text: clauses, document type and the mask for personal details. */
export function createReview(fileName: string, text: string, pages: number, scanned = false): StoredReview {
  const clauses = splitClauses(text);
  const total = clauses.reduce((n, c) => n + c.text.length, 0);
  if (total > MAX_CHARS) {
    throw new TooLongError(
      `This document is about ${pages} pages long. TruthLens can read up to about 20 pages at a time, so try just the agreement itself.`,
    );
  }
  const kind = detectKind(text);
  const { map } = maskClauses(clauses);
  return {
    id: crypto.randomUUID().slice(0, 8),
    fileName,
    pages,
    kind,
    title: guessTitle(text) ?? KIND_LABEL[kind],
    clauses,
    maskMap: map,
    createdAt: Date.now(),
    scanned,
  };
}

const SEP = "\n\u0000\n";

/** Masks all clauses with one shared map, so "[NAME 1]" means the same person everywhere. */
export function maskClauses(clauses: Clause[]): { clauses: Clause[]; map: MaskMap } {
  const { masked, map } = mask(clauses.map((c) => c.text).join(SEP));
  const parts = masked.split(SEP);
  return { clauses: clauses.map((c, i) => ({ ...c, text: parts[i] })), map };
}
