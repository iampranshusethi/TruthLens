import type { Metadata } from "next";
import { SampleCompare } from "@/components/compare/sample-compare";

export const metadata: Metadata = { title: "Sample comparison" };

export default function SampleComparePage() {
  return <SampleCompare />;
}
