import type { DocKind, Priority } from "@/lib/types";

const SIGNALS: Record<DocKind, RegExp[]> = {
  rental: [
    /\blicen[cs]or\b/i,
    /\blicen[cs]ee\b/i,
    /\blessor\b/i,
    /\blessee\b/i,
    /\btenan(t|cy)\b/i,
    /\blandlord\b/i,
    /\brent(al)?\b/i,
    /\bleave and licen[cs]e\b/i,
    /\bsecurity deposit\b/i,
    /\bpremises\b/i,
    /\block-?in\b/i,
  ],
  insurance: [
    /\binsured\b/i,
    /\binsurer\b/i,
    /\bpolicy ?holder\b/i,
    /\bsum insured\b/i,
    /\bpremium\b/i,
    /\bco-?pay(ment)?\b/i,
    /\bwaiting period\b/i,
    /\bhospitali[sz]ation\b/i,
    /\bclaim(s)?\b/i,
    /\bexclusions?\b/i,
    /\bcashless\b/i,
  ],
  contract: [
    /\bemploye[er]\b/i,
    /\bemployment\b/i,
    /\bsalary\b/i,
    /\bctc\b/i,
    /\bnon-?compete\b/i,
    /\bnon-?solicit/i,
    /\bconfidential/i,
    /\bnotice period\b/i,
    /\bservice provider\b/i,
    /\bconsultant\b/i,
    /\bborrower\b/i,
    /\blender\b/i,
    /\bemi\b/i,
    /\binvoice\b/i,
  ],
};

/** Guesses the document type from keyword counts. The model confirms or corrects it. */
export function detectKind(text: string): DocKind {
  const sample = text.slice(0, 20_000);
  let best: DocKind = "contract";
  let bestScore = 0;
  for (const kind of Object.keys(SIGNALS) as DocKind[]) {
    const score = SIGNALS[kind].reduce((n, re) => n + (sample.match(new RegExp(re, "gi"))?.length ?? 0), 0);
    if (score > bestScore) {
      best = kind;
      bestScore = score;
    }
  }
  return best;
}

export const KIND_LABEL: Record<DocKind, string> = {
  rental: "Rental agreement",
  insurance: "Insurance policy",
  contract: "Contract",
};

/** Who the user would negotiate with, used in "Message your …". */
export const OTHER_PARTY: Record<DocKind, string> = {
  rental: "landlord",
  insurance: "insurer",
  contract: "the other party",
};

/** What users can say matters to them, per document type. Ids are referenced by findings. */
export const PRIORITIES: Record<DocKind, Priority[]> = {
  rental: [
    { id: "deposit", label: "Get my deposit back" },
    { id: "exit", label: "Leave early if needed" },
    { id: "costs", label: "No surprise charges" },
    { id: "repairs", label: "Owner handles repairs" },
    { id: "privacy", label: "Privacy at home" },
    { id: "pets", label: "Pets allowed" },
  ],
  insurance: [
    { id: "limits", label: "No hidden limits" },
    { id: "claims", label: "Easy claims" },
    { id: "waiting", label: "Short waiting periods" },
    { id: "premium", label: "Low premium" },
    { id: "maternity", label: "Maternity cover" },
    { id: "opd", label: "Doctor visits (OPD)" },
  ],
  contract: [
    { id: "pay", label: "Fair pay and payment terms" },
    { id: "exit", label: "Freedom to leave" },
    { id: "future", label: "No limits on my next job" },
    { id: "costs", label: "No penalties or hidden fees" },
    { id: "workload", label: "Reasonable hours and scope" },
    { id: "ip", label: "Own my work" },
  ],
};
