"use client";

import { ArrowLeft, MessageCircle, Sparkles } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { SEVERITY } from "@/lib/severity";
import type { Clause, Finding } from "@/lib/types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-ink-3 uppercase">{title}</p>
      <div className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{children}</div>
    </div>
  );
}

export function FindingDetail({
  finding,
  clause,
  otherParty,
  onBack,
}: {
  finding: Finding;
  clause: Clause;
  otherParty: string;
  onBack: () => void;
}) {
  const sev = SEVERITY[finding.severity];

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-card shadow-soft">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-ink-3 transition-colors hover:text-ink"
        >
          <ArrowLeft size={15} /> All findings
        </button>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${sev.badge}`}>{sev.label}</span>
      </div>

      <div className="space-y-5 p-6">
        <div>
          <h2 className="font-display text-[1.45rem] leading-[1.15]">{finding.title}</h2>
          <blockquote className="mt-3 border-l-2 border-line-strong pl-3 font-doc text-sm leading-relaxed text-ink-3">
            <span className="font-sans text-xs text-ink-4">
              Clause {clause.number} · {clause.heading}
            </span>
            <br />“{finding.quote}”
          </blockquote>
        </div>

        <Section title="In plain words">{finding.plain}</Section>
        <Section title="What this could mean for you">{finding.scenario}</Section>
        {finding.benchmark && <Section title="What's normal">{finding.benchmark}</Section>}

        {finding.suggestion && (
          <div className="rounded-xl bg-fair-soft/50 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wide text-fair-ink uppercase">
                <Sparkles size={13} /> A fairer version
              </p>
              <CopyButton text={finding.suggestion} />
            </div>
            <p className="mt-2 font-doc text-[15px] leading-relaxed text-ink">{finding.suggestion}</p>
          </div>
        )}

        {finding.ask && (
          <div className="rounded-xl border border-line p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wide text-ink-3 uppercase">
                <MessageCircle size={13} /> Message your {otherParty}
              </p>
              <CopyButton text={finding.ask} label="Copy message" />
            </div>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{finding.ask}</p>
          </div>
        )}
      </div>
    </div>
  );
}
