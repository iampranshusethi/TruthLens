"use client";

import { ArrowUp, MessageCircleQuestion } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { CITATION } from "@/lib/ai/chat";
import { remask, unmask } from "@/lib/ingest/mask";
import { maskClauses } from "@/lib/review-store";
import type { Clause, DocKind } from "@/lib/types";

const SUGGESTIONS: Record<DocKind, string[]> = {
  rental: ["Can I get my full deposit back?", "What if I need to leave early?", "Who pays for repairs?"],
  insurance: ["What isn't covered?", "How do I make a claim?", "Are there waiting periods?"],
  contract: ["How much notice do I have to give?", "Can I join a competitor later?", "What happens if I quit early?"],
};

type Message = { role: "user" | "assistant"; text: string; failed?: boolean };

/** Follow-up questions answered only from this document, with clickable clause citations. */
export function ChatPanel({
  kind,
  clauses,
  onCite,
}: {
  kind: DocKind;
  clauses: Clause[];
  onCite: (clauseNumber: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const masked = useMemo(() => maskClauses(clauses), [clauses]);
  const list = useRef<HTMLDivElement>(null);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    const history: Message[] = [...messages.filter((m) => !m.failed), { role: "user", text: q }];
    setMessages([...history, { role: "assistant", text: "" }]);
    setDraft("");
    setBusy(true);

    const update = (text: string, failed = false) =>
      setMessages((ms) => [...ms.slice(0, -1), { role: "assistant", text, failed }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          clauses: masked.clauses.map(({ number, heading, text }) => ({ number, heading, text })),
          // Earlier turns were shown un-masked; mask them again before sending.
          messages: history.slice(-12).map((m) => ({ role: m.role, text: remask(m.text, masked.map) })),
        }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => null);
        update(err?.message ?? "That question couldn't be answered right now. Try again in a moment.", true);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        update(unmask(text, masked.map));
        list.current?.scrollTo({ top: list.current.scrollHeight });
      }
      if (!text.trim()) update("No answer came back. Try asking in a different way.", true);
    } catch {
      update("You seem to be offline. Check your connection and try again.", true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-line bg-card p-6">
      <p className="flex items-center gap-2 font-display text-xl">
        <MessageCircleQuestion size={19} className="text-mint-ink" />
        Ask about this document
      </p>
      <p className="mt-1 text-xs text-ink-3">Answers come only from your document, with the clause they rely on.</p>

      {messages.length > 0 && (
        <div ref={list} className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin]">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                    m.role === "user"
                      ? "rounded-br-md bg-ink text-paper"
                      : m.failed
                        ? "rounded-bl-md bg-caution-soft text-caution-ink"
                        : "rounded-bl-md bg-sunken text-ink-2"
                  }`}
                >
                  {m.role === "assistant" && !m.text ? <TypingDots /> : <Answer text={m.text} onCite={onCite} />}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {messages.length === 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS[kind].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              className="rounded-full border border-line-strong px-3 py-1.5 text-sm text-ink-2 transition-colors hover:border-mint hover:bg-mint-soft/40 hover:text-mint-ink"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="mt-4 flex items-center gap-2 rounded-2xl border border-line-strong bg-paper/60 p-1.5 pl-4 focus-within:border-mint"
        onSubmit={(e) => {
          e.preventDefault();
          ask(draft);
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What happens if I pay rent late?"
          aria-label="Ask a question about this document"
          maxLength={500}
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-ink-4"
        />
        <button
          type="submit"
          aria-label="Ask"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink text-paper transition-transform active:scale-95"
        >
          <ArrowUp size={17} />
        </button>
      </form>
      {busy && <p className="mt-2 text-xs text-ink-3">Reading your document…</p>}
    </section>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1 py-1" aria-label="Answering">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-ink-4"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

/** Renders "(clause 4)" citations as buttons that jump to the clause. */
function Answer({ text, onCite }: { text: string; onCite: (n: string) => void }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(CITATION)) {
    parts.push(text.slice(last, m.index));
    const numbers = m[1].replace(/^clauses?\s+/i, "").split(/,\s*|\s+and\s+/);
    parts.push(
      <span key={m.index} className="whitespace-nowrap">
        {numbers.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onCite(n)}
            className="mx-0.5 inline-flex items-center rounded-md bg-mint-soft px-1.5 py-px align-baseline text-[11px] font-medium text-mint-ink transition-colors hover:bg-mint/40"
          >
            Clause {n}
          </button>
        ))}
      </span>,
    );
    last = m.index! + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}
