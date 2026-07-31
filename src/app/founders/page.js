// Server entrypoint and metadata for the public EvoTracker Founders page.

import FoundersPageClient from "./FoundersPageClient";
import { FOUNDER_PROGRAM, FOUNDERS } from "@/app/data/founders";
import { buildPublishedFounders } from "@/lib/founders";

export const metadata = {
  title: "Founders | EvoTracker",
  description: "Meet the early supporters helping keep EvoTracker independent, open, and improving.",
  alternates: { canonical: "/founders" },
};

export default function FoundersPage() {
  return (
    <FoundersPageClient
      founders={buildPublishedFounders(FOUNDERS)}
      minimumDonationSek={FOUNDER_PROGRAM.minimumDonationSek}
    />
  );
}
