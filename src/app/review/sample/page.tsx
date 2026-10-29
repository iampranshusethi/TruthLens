import type { Metadata } from "next";
import { SampleReview } from "@/components/review/sample-review";

export const metadata: Metadata = { title: "Sample rental agreement" };

export default function SampleReviewPage() {
  return <SampleReview />;
}
