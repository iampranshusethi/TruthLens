import { ArrowUpRight, BadgeCheck, Gauge, LockKeyhole, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DEVELOPER, PROJECTS } from "@/lib/about";

export const metadata: Metadata = {
  title: "About",
  description: `TruthLens is built by ${DEVELOPER.name}.`,
};

const V2 = [
  {
    icon: BadgeCheck,
    title: "Every finding is verified",
    body: "Each quote is checked word for word against your document before you see it. v1 could show a made-up result when the AI failed; v2 never does.",
  },
  {
    icon: LockKeyhole,
    title: "Private by design",
    body: "Documents are read in your browser and personal details are hidden before anything reaches the AI.",
  },
  {
    icon: Gauge,
    title: "Fast on free AI",
    body: "Results stream in clause by clause. A chain of free models with timeouts means a busy model never freezes a review.",
  },
  {
    icon: ShieldCheck,
    title: "Built to be explained",
    body: "Every design decision and its trade-off is written down in the repository, so the code can be understood, not just used.",
  },
];

const STACK = ["Next.js 16", "React 19", "TypeScript", "Tailwind CSS 4", "Motion", "Gemini", "Groq", "Supabase", "Vitest"];

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.9 1.3 1.9 1.3 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.3 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.3V9h3.4v1.6h.1c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.5v6.2ZM5.3 7.4a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2ZM7.1 20.5H3.5V9h3.6v11.5ZM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0Z" />
    </svg>
  );
}

export default function AboutPage() {
  const initials = DEVELOPER.name
    .split(" ")
    .map((w) => w[0])
    .join("");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-12 pb-20 sm:px-6 sm:pt-16">
      {/* Developer */}
      <section className="text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-mint-soft font-display text-2xl text-mint-ink ring-4 ring-card">
          {initials}
        </span>
        <p className="mt-6 text-xs font-medium tracking-[0.14em] text-mint-ink uppercase">About</p>
        <h1 className="mt-3 font-display text-[2.4rem] leading-[1.02] sm:text-[3.2rem]">
          Built by <span className="hl">{DEVELOPER.name}</span>
        </h1>
        {DEVELOPER.headline && <p className="mt-3 text-ink-3">{DEVELOPER.headline}</p>}
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ink-2">{DEVELOPER.intro}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <a
            href={DEVELOPER.links.github}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-card px-4 py-2 text-sm text-ink-2 transition-colors hover:text-ink"
          >
            <GitHubIcon /> GitHub
          </a>
          {DEVELOPER.links.linkedin && (
            <a
              href={DEVELOPER.links.linkedin}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm text-paper transition-opacity hover:opacity-85"
            >
              <LinkedInIcon /> LinkedIn
            </a>
          )}
        </div>
      </section>

      {/* Timeline */}
      {DEVELOPER.timeline.length > 1 && (
        <section className="mt-20">
          <h2 className="text-center font-display text-[1.9rem]">Along the way</h2>
          <ol className="relative mx-auto mt-8 max-w-lg space-y-6 border-l border-line-strong pl-6">
            {DEVELOPER.timeline.map((t) => (
              <li key={t.title} className="relative">
                <span className="absolute top-1.5 -left-[29px] h-2.5 w-2.5 rounded-full bg-mint ring-4 ring-paper" />
                <p className="text-xs text-ink-3">{t.when}</p>
                <p className="mt-0.5 font-medium">{t.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">{t.detail}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* The TruthLens story */}
      <section className="mt-20">
        <h2 className="text-center font-display text-[1.9rem]">
          From a 24-hour build to <span className="hl">v2</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center leading-relaxed text-ink-2">
          I built the first TruthLens alone in 24 hours for a hackathon, and it placed runner-up. Rebuilding it gave
          me the time to make it trustworthy.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {V2.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-3xl border border-line bg-card p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mint-soft text-mint-ink">
                <Icon size={18} />
              </span>
              <p className="mt-4 font-medium">{title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-3">{body}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-1.5">
          {STACK.map((s) => (
            <span key={s} className="rounded-full bg-sunken px-3 py-1 text-xs text-ink-3">
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* Projects */}
      <section className="mt-20">
        <h2 className="text-center font-display text-[1.9rem]">Things I&apos;ve built</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {PROJECTS.map((p, i) => {
            // The first project is featured across the full width, so the rest pair up evenly.
            const cls = `group flex flex-col rounded-3xl border border-line bg-card p-6 transition-all ${
              i === 0 ? "sm:col-span-2" : ""
            } ${p.href ? "hover:border-line-strong hover:shadow-soft" : ""}`;
            const body = (
              <>
                <span className="flex items-center justify-between">
                  <span className="font-display text-xl">{p.name}</span>
                  {p.href && (
                    <ArrowUpRight
                      size={18}
                      className="text-ink-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  )}
                </span>
                <span className="mt-1 text-sm text-mint-ink">{p.tagline}</span>
                <span className="mt-3 text-sm leading-relaxed text-ink-3">{p.detail}</span>
              </>
            );
            return p.href ? (
              <a key={p.name} href={p.href} target="_blank" rel="noreferrer" className={cls}>
                {body}
              </a>
            ) : (
              <div key={p.name} className={cls}>
                {body}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-20 rounded-3xl bg-ink px-6 py-12 text-center text-paper">
        <p className="font-display text-[1.8rem] leading-tight">
          Have an agreement to <span className="hl-dark">check?</span>
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center rounded-full bg-mint px-5 py-2.5 text-sm font-medium text-ink transition-transform active:scale-[0.98]"
        >
          Review a document
        </Link>
      </section>
    </main>
  );
}
