import type { Comparison } from "@/lib/types";

/** Two fictional family-floater health policies with the same ₹10 lakh cover. */
export const sampleInsurance: Comparison = {
  id: "sample-insurance",
  kind: "insurance",
  title: "Family health insurance · ₹10 lakh cover",
  options: [
    {
      id: "shield",
      name: "Shield Health Optima",
      provider: "Aarohan General Insurance",
      fileName: "Shield_Optima_policy_wording.pdf",
      price: "₹18,400 / year",
    },
    {
      id: "navya",
      name: "Navya Family Floater",
      provider: "Meridian Health Insurance",
      fileName: "Navya_Floater_brochure_and_wording.pdf",
      price: "₹15,900 / year",
    },
  ],
  priorities: [
    { id: "premium", label: "Low premium", defaultWeight: 2 },
    { id: "limits", label: "No hidden limits", defaultWeight: 3 },
    { id: "waiting", label: "Short waiting periods", defaultWeight: 2 },
    { id: "maternity", label: "Maternity cover", defaultWeight: 0 },
    { id: "opd", label: "Doctor visits (OPD)", defaultWeight: 1 },
    { id: "claims", label: "Easy claims", defaultWeight: 2 },
  ],
  rows: [
    {
      id: "premium",
      topic: "Yearly premium",
      priority: "premium",
      cells: {
        shield: { value: "₹18,400", score: 6 },
        navya: { value: "₹15,900", score: 8 },
      },
    },
    {
      id: "room",
      topic: "Hospital room rent",
      priority: "limits",
      cells: {
        shield: { value: "Any single private room, no cap", score: 9, quote: "Single private room, without any sub-limit" },
        navya: {
          value: "Capped at ₹10,000 a day",
          score: 4,
          quote: "Room rent up to 1% of Sum Insured per day; all associated expenses shall be payable proportionately",
        },
      },
    },
    {
      id: "copay",
      topic: "Co-pay on claims",
      priority: "limits",
      cells: {
        shield: { value: "None", score: 10 },
        navya: { value: "You pay 10% of every claim", score: 4, quote: "a co-payment of 10% shall apply on each and every admissible claim" },
      },
    },
    {
      id: "exclusions",
      topic: "How clearly exclusions are listed",
      priority: "limits",
      cells: {
        shield: { value: "Full list in Annexure II", score: 8 },
        navya: { value: "Open-ended wording", score: 3, quote: "and such other exclusions as may be specified by the Company from time to time" },
      },
    },
    {
      id: "ped",
      topic: "Waiting period for existing illnesses",
      priority: "waiting",
      cells: {
        shield: { value: "3 years", score: 5 },
        navya: { value: "2 years", score: 8 },
      },
    },
    {
      id: "initial",
      topic: "Initial waiting period",
      priority: "waiting",
      cells: {
        shield: { value: "30 days", score: 7 },
        navya: { value: "30 days", score: 7 },
      },
    },
    {
      id: "maternity",
      topic: "Maternity",
      priority: "maternity",
      cells: {
        shield: { value: "Covered after 4 years, up to ₹50,000", score: 5 },
        navya: { value: "Not covered", score: 0, quote: "Maternity expenses, childbirth and related complications are excluded" },
      },
    },
    {
      id: "opd",
      topic: "Doctor visits (OPD)",
      priority: "opd",
      cells: {
        shield: { value: "Not covered", score: 0 },
        navya: { value: "Up to ₹5,000 a year", score: 7 },
      },
    },
    {
      id: "network",
      topic: "Cashless hospitals",
      priority: "claims",
      cells: {
        shield: { value: "9,800 hospitals", score: 8 },
        navya: { value: "6,200 hospitals", score: 6 },
      },
    },
    {
      id: "cashless",
      topic: "Cashless approval time",
      priority: "claims",
      cells: {
        shield: { value: "Within 1 hour", score: 9, quote: "Cashless authorisation shall be communicated within one (1) hour" },
        navya: { value: "Not stated", score: 3 },
      },
    },
  ],
};
