"use client";

import { ReviewScreen } from "@/components/review/review-screen";
import { replayReview } from "@/lib/replay";
import { sampleRental } from "@/lib/samples/rental";

/** The sample replays saved results through the real review UI, at no API cost (decisions.md D13). */
export function SampleReview() {
  return (
    <ReviewScreen
      subject={{ ...sampleRental, isSample: true }}
      run={(emit) => {
        emit({ type: "meta", kind: "rental", title: sampleRental.title, otherParty: "landlord", engine: "sample" });
        return replayReview(sampleRental, emit);
      }}
    />
  );
}
