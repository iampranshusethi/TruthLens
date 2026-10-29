import { ArrowRight, Briefcase, Home as HomeIcon, ShieldPlus } from "lucide-react";
import Link from "next/link";
import { DropZone } from "@/components/drop-zone";
import { CatchesMarquee } from "@/components/landing/catches-marquee";
import { FeatureBento } from "@/components/landing/feature-bento";
import { HeroDemo } from "@/components/landing/hero-demo";

const STEPS = [
  {
    title: "Upload",
    body: "A PDF, a Word file, or a photo of the paper copy someone handed you.",
  },
  {
    title: "Every clause is read",
    body: "Personal details are masked, then each clause is checked and compared with what's normal.",
  },
  {
    title: "Decide with confidence",
    body: "A clear verdict, fairer wording, and messages ready to send before you sign.",
  },
];

const KINDS = [
  {
    icon: HomeIcon,
    title: "Rental agreements",
    checks: ["Deposit refunds", "Lock-in penalties", "Notice periods", "Repairs", "Painting charges"],
  },
  {
    icon: ShieldPlus,
    title: "Insurance policies",
    checks: ["Room-rent caps", "Co-pay", "Waiting periods", "Exclusions", "Claim process"],
  },
  {
    icon: Briefcase,
    title: "Contracts",
    checks: ["Job offers", "Non-competes", "Freelance terms", "Loan penalties", "Hidden fees"],
  },
];

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: React.ReactNode; body?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-medium tracking-[0.14em] text-mint-ink uppercase">{eyebrow}</p>
      <h2 className="mt-3 font-display text-[2.1rem] leading-[1.05] text-balance sm:text-[2.9rem]">{title}</h2>
      {body && <p className="mt-4 text-lg leading-relaxed text-ink-3">{body}</p>}
    </div>
  );
}

export default function Home() {
  return (
    <main className="overflow-x-clip">
      {/* Hero */}
      <section className="relative">
        <div aria-hidden="true" className="bg-dots absolute inset-x-0 -top-16 h-[640px]" />
        <div className="relative mx-auto max-w-3xl px-4 pt-16 text-center sm:px-6 sm:pt-24">
          <Link
            href="/review/sample"
            className="group inline-flex items-center gap-2 rounded-full border border-line bg-card/80 py-1 pr-3 pl-1 text-xs text-ink-2 shadow-soft backdrop-blur"
          >
            <span className="rounded-full bg-mint-soft px-2 py-0.5 font-medium text-mint-ink">New</span>
            Every finding verified against your document
            <ArrowRight size={13} className="text-ink-3 transition-transform group-hover:translate-x-0.5" />
          </Link>

          <h1 className="mt-7 font-display text-[3rem] leading-[1] text-balance sm:text-[4.9rem]">
            Know what you&apos;re <span className="hl">signing.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-3 sm:text-xl">
            TruthLens reads your rental agreement, insurance policy or contract and tells you what it really means for
            you, in plain English, clause by clause.
          </p>

          <div className="mx-auto mt-10 max-w-xl">
            <DropZone />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="text-ink-3">Or try a sample:</span>
            <Link
              href="/review/sample"
              className="rounded-full border border-line bg-card px-3.5 py-1.5 text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
            >
              Rental agreement
            </Link>
            <Link
              href="/compare/sample"
              className="rounded-full border border-line bg-card px-3.5 py-1.5 text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
            >
              Insurance comparison
            </Link>
          </div>
        </div>

        <div className="relative mx-auto mt-16 max-w-5xl px-4 sm:mt-20 sm:px-6">
          <HeroDemo />
        </div>
      </section>

      {/* What it catches */}
      <section className="mt-24 sm:mt-32">
        <p className="mb-6 text-center text-sm text-ink-3">The clauses people wish they&apos;d read</p>
        <CatchesMarquee />
      </section>

      {/* Features */}
      <section className="mx-auto mt-28 max-w-5xl px-4 sm:mt-36 sm:px-6">
        <SectionHeading
          eyebrow="Why TruthLens"
          title={
            <>
              Not a chatbot. <span className="hl">A careful second reader.</span>
            </>
          }
          body="A general chatbot gives you a summary. TruthLens gives you evidence, context and a next step."
        />
        <div className="mt-14">
          <FeatureBento />
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto mt-28 max-w-5xl px-4 sm:mt-36 sm:px-6">
        <SectionHeading eyebrow="How it works" title="Ten seconds, three steps" />
        <ol className="relative mt-14 grid gap-10 sm:grid-cols-3 sm:gap-6">
          <div
            aria-hidden="true"
            className="absolute top-5 right-[16.6%] left-[16.6%] hidden h-px bg-gradient-to-r from-line via-line-strong to-line sm:block"
          />
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative text-center">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card font-display text-base text-mint-ink shadow-soft">
                {i + 1}
              </span>
              <p className="mt-5 font-medium">{s.title}</p>
              <p className="mx-auto mt-1.5 max-w-64 text-sm leading-relaxed text-ink-3">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Document types */}
      <section className="mx-auto mt-28 max-w-5xl px-4 sm:mt-36 sm:px-6">
        <SectionHeading eyebrow="What it reads" title="Built for the documents people actually sign" />
        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {KINDS.map(({ icon: Icon, title, checks }) => (
            <div key={title} className="rounded-3xl border border-line bg-card p-6 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-mint-soft text-mint-ink">
                <Icon size={20} />
              </span>
              <p className="mt-4 font-medium">{title}</p>
              <ul className="mt-4 flex flex-wrap justify-center gap-1.5">
                {checks.map((c) => (
                  <li key={c} className="rounded-full bg-sunken px-2.5 py-1 text-xs text-ink-3">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto mt-28 max-w-5xl px-4 sm:mt-36 sm:px-6">
        <div className="relative overflow-hidden rounded-[32px] bg-ink px-6 py-16 text-center text-paper sm:py-20">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(50%_70%_at_50%_0%,rgb(94_214_180/0.28),transparent_70%)]"
          />
          <h2 className="relative mx-auto max-w-2xl font-display text-[2.2rem] leading-[1.05] text-balance sm:text-[3.4rem]">
            Your next signature deserves <span className="hl-dark">a second reader.</span>
          </h2>
          <div className="relative mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href="/review/sample"
              className="group inline-flex items-center gap-2 rounded-full bg-mint px-5 py-3 text-sm font-medium text-ink transition-transform active:scale-[0.98]"
            >
              See a sample review
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/compare"
              className="inline-flex items-center rounded-full border border-paper/20 px-5 py-3 text-sm text-paper/90 transition-colors hover:bg-paper/10"
            >
              Compare two policies
            </Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto mt-20 max-w-5xl px-4 pb-10 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-2 border-t border-line pt-8 text-xs text-ink-3 sm:flex-row">
          <span>TruthLens · v1 was runner-up at the Eudia legal AI hackathon</span>
          <span>TruthLens explains documents. It isn&apos;t a substitute for a lawyer.</span>
        </div>
      </footer>
    </main>
  );
}
