import type { Severity } from "@/lib/types";

export const SEVERITY: Record<
  Severity,
  { label: string; plural: string; mark: string; badge: string; dot: string; ring: string }
> = {
  risk: {
    label: "Risk",
    plural: "risks",
    mark: "bg-risk-soft text-risk-ink",
    badge: "bg-risk-soft text-risk-ink",
    dot: "bg-risk",
    ring: "ring-risk/40",
  },
  caution: {
    label: "Caution",
    plural: "cautions",
    mark: "bg-caution-soft text-caution-ink",
    badge: "bg-caution-soft text-caution-ink",
    dot: "bg-caution",
    ring: "ring-caution/40",
  },
  fair: {
    label: "Fair",
    plural: "fair",
    mark: "bg-fair-soft text-fair-ink",
    badge: "bg-fair-soft text-fair-ink",
    dot: "bg-fair",
    ring: "ring-fair/40",
  },
};
