// Server entrypoint and metadata for the public EvoTracker Founders page.

import FoundersPageClient from "./FoundersPageClient";
import { FOUNDER_PROGRAM, FOUNDERS } from "@/app/data/founders";
import { buildPublishedFounders } from "@/lib/founders";
import { getUserKey, mgetJson } from "@/lib/authStore";

export const revalidate = 300;

export const metadata = {
  title: "Founders | EvoTracker",
  description: "Meet the early supporters helping keep EvoTracker independent, open, and improving.",
  alternates: { canonical: "/founders" },
};

export default async function FoundersPage() {
  const users = await mgetJson(FOUNDERS.map((founder) => getUserKey(founder.accountEmail))).catch(() => []);
  const publishedIds = new Set(
    FOUNDERS
      .filter((_, index) => users[index]?.founderPublic === true)
      .map((founder) => founder.id)
  );
  return (
    <FoundersPageClient
      founders={buildPublishedFounders(FOUNDERS, { publishedIds })}
      minimumDonationSek={FOUNDER_PROGRAM.minimumDonationSek}
      maximumFounders={FOUNDER_PROGRAM.maximumFounders}
      qualifiedFounderCount={Math.min(
        FOUNDERS.filter((founder) => founder.qualified === true).length,
        FOUNDER_PROGRAM.maximumFounders
      )}
    />
  );
}
