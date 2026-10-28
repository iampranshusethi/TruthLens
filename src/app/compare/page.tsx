import type { Metadata } from "next";
import { CompareScreen } from "@/components/compare/compare-screen";
import { sampleInsurance } from "@/lib/samples/insurance";

export const metadata: Metadata = { title: "Compare" };

export default function ComparePage() {
  return <CompareScreen comparison={sampleInsurance} />;
}
