// Exposes the public privacy information with dedicated search metadata.

import PrivacyPageClient from "./PrivacyPageClient";

export const metadata = {
  title: "Integritet | EvoTracker",
  description: "Så hanterar EvoTracker kontouppgifter, portföljdata, lokal lagring och kontoradering.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <PrivacyPageClient />;
}
