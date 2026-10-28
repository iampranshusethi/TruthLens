import type { Metadata } from "next";
import { ReviewScreen } from "@/components/review/review-screen";
import { sampleRental } from "@/lib/samples/rental";

export const metadata: Metadata = { title: "Sample rental agreement" };

export default function SampleReviewPage() {
  return <ReviewScreen analysis={sampleRental} />;
}
