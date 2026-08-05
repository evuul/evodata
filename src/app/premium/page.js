// Publishes metadata for the public Premium membership information page.

import PremiumPageClient from "./PremiumPageClient";

export const metadata = {
  title: "Premium | EvoTracker",
  description: "Learn how voluntary support unlocks Premium access and helps develop EvoTracker.",
};

export default function PremiumPage() {
  return <PremiumPageClient />;
}
