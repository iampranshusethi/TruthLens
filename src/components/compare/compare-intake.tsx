"use client";

import { AlertCircle, ArrowRight, Check, FilePlus2, LoaderCircle, Lock, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { createComparison, saveComparison } from "@/lib/compare-store";
import { ACCEPTED, ExtractError, extractText } from "@/lib/ingest/extract";

type Slot =
  | { key: string; name: string; state: "reading"; label?: string }
  | { key: string; name: string; state: "ready"; text: string; pages: number }
  | { key: string; name: string; state: "error"; message: string };

const MAX = 3;

export function CompareIntake() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const ready = slots.filter((s) => s.state === "ready");

  const add = (files: FileList | File[] | null | undefined) => {
    if (!files) return;
    setHint(null);
    const room = MAX - slots.length;
    const picked = Array.from(files).slice(0, Math.max(0, room));
    if (files.length > room) setHint(`You can compare up to ${MAX} documents at a time.`);
    for (const file of picked) {
      const key = crypto.randomUUID();
      setSlots((s) => [...s, { key, name: file.name, state: "reading" }]);
      extractText(file, (label) =>
        setSlots((s) => s.map((x) => (x.key === key && x.state === "reading" ? { ...x, label } : x))),
      )
        .then(({ text, pages }) =>
          setSlots((s) => s.map((x) => (x.key === key ? { key, name: file.name, state: "ready", text, pages } : x))),
        )
        .catch((e) => {
          const message = e instanceof ExtractError ? e.message : "This file couldn't be read.";
          setSlots((s) => s.map((x) => (x.key === key ? { key, name: file.name, state: "error", message } : x)));
        });
    }
    if (input.current) input.current.value = "";
  };

  const onDrop = useEffectEvent((files: FileList | undefined) => add(files));
  useEffect(() => {
    const over = (e: DragEvent) => e.preventDefault();
    const drop = (e: DragEvent) => {
      e.preventDefault();
      onDrop(e.dataTransfer?.files);
    };
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, []);

  const compare = () => {
    if (ready.length < 2) {
      setHint(slots.some((s) => s.state === "reading") ? "Still reading your files…" : "Add at least two documents to compare.");
      return;
    }
    const c = createComparison(
      ready.map((s) => ({ fileName: s.name, text: (s as Extract<Slot, { state: "ready" }>).text, pages: (s as Extract<Slot, { state: "ready" }>).pages })),
    );
    saveComparison(c);
    router.push(`/compare/${c.id}`);
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-12 pb-20 sm:px-6 sm:pt-16">
      <div className="text-center">
        <p className="text-xs font-medium tracking-[0.14em] text-mint-ink uppercase">Compare</p>
        <h1 className="mt-3 font-display text-[2.4rem] leading-[1.02] text-balance sm:text-[3.4rem]">
          Choosing between <span className="hl">two offers?</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-ink-3">
          Add two or three policies, flats or job offers. TruthLens lines them up topic by topic and ranks them on what
          matters to you.
        </p>
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        {Array.from({ length: MAX }, (_, i) => {
          const slot = slots[i];
          if (!slot) {
            return (
              <button
                key={`empty-${i}`}
                type="button"
                onClick={() => input.current?.click()}
                className="group flex min-h-16 items-center gap-3 rounded-3xl border-2 border-dashed border-line-strong bg-card/60 px-5 py-4 text-left transition-colors hover:border-mint hover:bg-mint-soft/30 sm:min-h-40 sm:flex-col sm:justify-center sm:gap-2 sm:text-center"
              >
                <FilePlus2 size={22} className="text-ink-4 transition-colors group-hover:text-mint-ink" />
                <span className="text-sm text-ink-2">{i < 2 ? `Document ${i + 1}` : "Optional third"}</span>
                <span className="ml-auto text-xs text-ink-4 sm:ml-0">PDF, Word or photo</span>
              </button>
            );
          }
          return (
            <motion.div
              key={slot.key}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`relative flex min-h-24 flex-col justify-between rounded-3xl border bg-card p-5 shadow-soft sm:min-h-40 ${
                slot.state === "error" ? "border-risk/40" : "border-line"
              }`}
            >
              <button
                type="button"
                aria-label={`Remove ${slot.name}`}
                onClick={() => setSlots((s) => s.filter((x) => x.key !== slot.key))}
                className="absolute top-3 right-3 rounded-full p-1.5 text-ink-4 transition-colors hover:bg-sunken hover:text-ink"
              >
                <X size={15} />
              </button>
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  slot.state === "ready"
                    ? "bg-fair-soft text-fair-ink"
                    : slot.state === "error"
                      ? "bg-risk-soft text-risk-ink"
                      : "bg-sunken text-ink-3"
                }`}
              >
                {slot.state === "ready" ? (
                  <Check size={17} />
                ) : slot.state === "error" ? (
                  <AlertCircle size={17} />
                ) : (
                  <LoaderCircle size={17} className="animate-spin" />
                )}
              </span>
              <div className="mt-4 min-w-0">
                <p className="truncate pr-4 text-sm font-medium">{slot.name}</p>
                <p className={`mt-1 text-xs leading-snug ${slot.state === "error" ? "text-risk-ink" : "text-ink-3"}`}>
                  {slot.state === "ready"
                    ? `Read · ${slot.pages} ${slot.pages === 1 ? "page" : "pages"}`
                    : slot.state === "error"
                      ? slot.message
                      : slot.label ?? "Reading…"}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
      <input ref={input} type="file" accept={ACCEPTED} multiple className="hidden" onChange={(e) => add(e.target.files)} />

      <div className="mt-8 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={compare}
          className="group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper shadow-lift transition-transform active:scale-[0.98]"
        >
          Compare {ready.length >= 2 ? ready.length : ""} documents
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </button>
        <AnimatePresence mode="popLayout">
          {hint ? (
            <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-caution-ink">
              {hint}
            </motion.p>
          ) : (
            <motion.p
              key="privacy"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-xs text-ink-3"
            >
              <Lock size={12} /> Read on your device, personal details hidden from the AI
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <Link
        href="/compare/sample"
        className="group mx-auto mt-14 flex max-w-xl items-center justify-between gap-4 rounded-3xl border border-line bg-card p-5 transition-all hover:border-line-strong hover:shadow-soft"
      >
        <span>
          <span className="block text-xs text-ink-3">Not sure what you&apos;ll get?</span>
          <span className="mt-1 block font-display text-lg">See two health policies compared</span>
        </span>
        <ArrowRight size={18} className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </main>
  );
}
