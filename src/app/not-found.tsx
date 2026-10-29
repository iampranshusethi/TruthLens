import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-4 pt-24 pb-20 text-center sm:px-6">
      <p className="font-display text-[5rem] leading-none text-ink-4">404</p>
      <h1 className="mt-4 font-display text-[2rem] leading-tight">
        This page isn&apos;t in the <span className="hl">agreement.</span>
      </h1>
      <p className="mt-3 text-ink-3">The link may be old, or the page may have moved.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-transform active:scale-[0.98]"
        >
          Review a document
        </Link>
        <Link
          href="/review/sample"
          className="rounded-full border border-line-strong px-5 py-2.5 text-sm text-ink-2 transition-colors hover:bg-card"
        >
          See the sample
        </Link>
      </div>
    </main>
  );
}
