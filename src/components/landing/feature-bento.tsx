import { BadgeCheck, Copy, MessageCircle, Scale, SlidersHorizontal } from "lucide-react";

function Card({
  className = "",
  icon: Icon,
  title,
  body,
  children,
}: {
  className?: string;
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col overflow-hidden rounded-3xl border border-line bg-card ${className}`}>
      <div className="relative flex min-h-48 flex-1 items-center justify-center bg-sunken/40 p-6" aria-hidden="true">
        {children}
      </div>
      <div className="border-t border-line p-6">
        <p className="flex items-center gap-2 font-medium">
          <span className="text-mint-ink">
            <Icon size={17} />
          </span>
          {title}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-3">{body}</p>
      </div>
    </div>
  );
}

export function FeatureBento() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card
        className="md:col-span-2"
        icon={BadgeCheck}
        title="Every point is traced to your document"
        body="Each finding quotes the exact clause it's about, and that quote is checked word for word before you see it. If it isn't in your document, it isn't in your review."
      >
        <div className="relative w-full max-w-md">
          <p className="rounded-2xl border border-line bg-card px-5 py-4 font-doc text-[15px] leading-relaxed text-ink-3 shadow-soft">
            …refundable within sixty (60) days of vacating the premises,{" "}
            <mark className="rounded bg-risk-soft px-0.5 text-risk-ink">
              subject to deductions at the Licensor&apos;s sole discretion
            </mark>
            .
          </p>
          <span className="absolute -right-2 -bottom-4 inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs text-paper shadow-lift sm:-right-6">
            <BadgeCheck size={13} className="text-mint" /> Found verbatim in clause 4
          </span>
        </div>
      </Card>

      <Card
        icon={Scale}
        title="Knows what's normal"
        body="A number means little on its own. You see how each term compares with what's typical."
      >
        <div className="w-full max-w-60 space-y-4 text-xs">
          <p className="text-ink-3">Cost of leaving 3 months early</p>
          <div>
            <div className="mb-1.5 flex justify-between text-ink-2">
              <span>This agreement</span>
              <span className="tabular-nums">₹2,80,000</span>
            </div>
            <div className="h-2 rounded-full bg-risk/80" />
          </div>
          <div>
            <div className="mb-1.5 flex justify-between text-ink-2">
              <span>Typical</span>
              <span className="tabular-nums">₹56,000</span>
            </div>
            <div className="h-2 w-1/5 rounded-full bg-fair/80" />
          </div>
        </div>
      </Card>

      <Card
        icon={SlidersHorizontal}
        title="Ranks on what you care about"
        body="Comparing policies or flats? Tell it what matters and the ranking updates as you move."
      >
        <div className="w-full max-w-60 space-y-3 text-xs">
          {[
            ["No hidden limits", 85],
            ["Low premium", 40],
            ["Maternity cover", 65],
          ].map(([label, v]) => (
            <div key={label}>
              <p className="mb-1.5 text-ink-2">{label}</p>
              <div className="relative h-1.5 rounded-full bg-line">
                <div className="h-full rounded-full bg-mint" style={{ width: `${v}%` }} />
                <span
                  className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-mint bg-card shadow-soft"
                  style={{ left: `${v}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card
        className="md:col-span-2"
        icon={MessageCircle}
        title="Tells you what to say"
        body="Every problem clause comes with a fairer wording and a polite message you can send your landlord, insurer or employer as it is."
      >
        <div className="w-full max-w-md">
          <div className="ml-auto max-w-sm rounded-2xl rounded-br-md bg-mint-soft px-4 py-3 text-sm leading-relaxed text-mint-ink shadow-soft">
            Hi, before I sign, could we change clause 4 so deductions from the deposit are limited to unpaid dues and
            documented damage? Happy to do a joint inspection with photos.
          </div>
          <div className="mt-2 flex justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-card px-2.5 py-1 text-xs text-ink-2">
              <Copy size={12} /> Copy message
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
