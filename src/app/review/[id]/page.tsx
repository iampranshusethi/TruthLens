import type { Metadata } from "next";
import { Suspense } from "react";
import { LiveReview } from "@/components/review/live-review";

export const metadata: Metadata = { title: "Review" };

export default function ReviewPage() {
  // The document lives in this browser, so the page is a static shell and the review loads client-side.
  return (
    <Suspense>
      <LiveReview />
    </Suspense>
  );
}
