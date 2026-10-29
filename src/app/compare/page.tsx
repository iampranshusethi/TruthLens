import type { Metadata } from "next";
import { CompareIntake } from "@/components/compare/compare-intake";

export const metadata: Metadata = { title: "Compare" };

export default function ComparePage() {
  return <CompareIntake />;
}
