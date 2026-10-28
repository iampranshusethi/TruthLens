"use client";

import { ArrowUpRight, FileUp, Lock } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useToast } from "@/components/toast";

const ACCEPT = ".pdf,.docx,.txt,.png,.jpg,.jpeg";

/**
 * Upload bar for the landing page. The whole window accepts drops,
 * so users don't have to aim for the bar.
 */
export function DropZone() {
  const router = useRouter();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = (file: File | undefined) => {
    if (!file) return;
    // Prototype: real uploads need the backend, so route to the sample flow.
    toast(`Got ${file.name}. Live analysis comes next, so here is the sample for now`);
    router.push("/review/sample");
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
          <FileUp size={20} className="shrink-0 text-ink-3" />
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="min-w-0 flex-1 truncate py-2 text-left text-[15px] text-ink-3"
          >
            <span className="hidden sm:inline">Drop a rental agreement, policy or contract here</span>
            <span className="sm:hidden">Drop or choose a document</span>
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
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-3">
        <Lock size={12} />
        PDF, Word or photo · personal details are masked before analysis
      </p>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
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
