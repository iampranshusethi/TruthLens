import type { Metadata } from "next";
import { Suspense } from "react";
import { LiveCompare } from "@/components/compare/live-compare";

export const metadata: Metadata = { title: "Comparison" };

export default function LiveComparePage() {
  // The documents live in this browser, so the comparison loads client-side.
  return (
    <Suspense>
      <LiveCompare />
    </Suspense>
  );
}
