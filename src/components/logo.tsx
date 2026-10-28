import Link from "next/link";

/** The v1 mint dot, grown into a lens: a filled disc with a glint. */
export function LogoMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="var(--mint)" />
      <circle cx="10" cy="10" r="5.5" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.5" />
      <circle cx="7.5" cy="7.5" r="1.6" fill="#fff" fillOpacity="0.9" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-[15px] font-medium tracking-tight text-ink">
      <LogoMark />
      TruthLens
    </Link>
  );
}
