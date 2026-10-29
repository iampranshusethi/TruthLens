"use client";

import { AlertCircle, ArrowUpRight, FileUp, LoaderCircle, Lock } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { LimitNotice, outOfGenerations, QuotaHint, useQuota } from "@/components/quota";
import { ACCEPTED, ExtractError, extractText } from "@/lib/ingest/extract";
import { createReview, saveReview, TooLongError } from "@/lib/review-store";

type Status =
  | { state: "idle" }
  | { state: "reading"; label: string }
  | { state: "error"; message: string }
  | { state: "limit" };

/**
 * Upload bar. The whole window accepts drops, so users don't have to aim for the bar.
 * The file is read in the browser (decisions.md D8) and the review opens as soon
 * as the text is ready, before any AI call.
 */
export function DropZone() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const quota = useQuota();

  const handle = async (file: File | undefined) => {
    if (!file || status.state === "reading") return;
    // Out of reviews for today: say so before reading anything.
    if (outOfGenerations(quota)) {
      setStatus({ state: "limit" });
      if (input.current) input.current.value = "";
      return;
    }
    setStatus({ state: "reading", label: `Reading ${file.name}…` });
    try {
      const { text, pages, scanned } = await extractText(file, (label) => setStatus({ state: "reading", label }));
      const review = createReview(file.name, text, pages, scanned);
      saveReview(review);
      router.push(`/review/${review.id}`);
    } catch (e) {
      const message =
        e instanceof ExtractError || e instanceof TooLongError
          ? e.message
          : "Something went wrong reading that file. Try another copy, or a PDF export.";
      if (!(e instanceof ExtractError || e instanceof TooLongError)) console.error(e);
      setStatus({ state: "error", message });
    } finally {
      if (input.current) input.current.value = "";
    }
  };

  const onWindowDrop = useEffectEvent(handle);

  useEffect(() => {
    let depth = 0;
    const enter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      depth++;
      setDragging(true);
    };
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const over = (e: DragEvent) => e.preventDefault();
    const drop = (e: DragEvent) => {
      e.preventDefault();
      depth = 0;
      setDragging(false);
      onWindowDrop(e.dataTransfer?.files[0]);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, []);

  return (
    <>
      <div className="rounded-[22px] bg-gradient-to-b from-line-strong/70 to-line/40 p-px shadow-lift">
        <div className="flex items-center gap-3 rounded-[21px] bg-card p-2 pl-4">
          {status.state === "reading" ? (
            <LoaderCircle size={20} className="shrink-0 animate-spin text-mint-ink" />
          ) : (
            <FileUp size={20} className="shrink-0 text-ink-3" />
          )}
          <button
            type="button"
            onClick={() => input.current?.click()}
            aria-busy={status.state === "reading"}
            className="min-w-0 flex-1 truncate py-2 text-left text-[15px] text-ink-3"
          >
            {status.state === "reading" ? (
              <span className="text-ink-2">{status.label}</span>
            ) : (
              <>
                <span className="hidden sm:inline">Drop a rental agreement, policy or contract here</span>
                <span className="sm:hidden">Choose a document</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="group inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-all hover:gap-2.5 active:scale-[0.98]"
          >
            Review it
            <ArrowUpRight size={16} className="transition-transform group-hover:rotate-45" />
          </button>
        </div>
      </div>
      <AnimatePresence mode="popLayout" initial={false}>
        {status.state === "error" ? (
          <motion.p
            key="error"
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-auto mt-3 flex max-w-md items-start justify-center gap-1.5 text-left text-sm leading-snug text-risk-ink"
          >
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            {status.message}
          </motion.p>
        ) : (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-3"
          >
            <Lock size={12} />
            PDF, Word or photo · personal details hidden from the AI
          </motion.p>
        )}
      </AnimatePresence>
      {status.state === "limit" && quota ? (
        <LimitNotice quota={quota} onClose={() => setStatus({ state: "idle" })} />
      ) : (
        <QuotaHint quota={quota} />
      )}
      <input
        ref={input}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />

      <AnimatePresence>
        {dragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-paper/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.94 }}
              animate={{ scale: 1 }}
              className="flex flex-col items-center gap-4 rounded-[32px] border-2 border-dashed border-mint bg-card px-20 py-14 shadow-lift"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mint-soft text-mint-ink">
                <FileUp size={26} />
              </span>
              <span className="font-display text-3xl">Drop to review</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
