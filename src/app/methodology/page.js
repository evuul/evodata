// Makes the existing source and methodology explanations available without an account.

import PublicInformationLayout from "@/Components/PublicInformationLayout";
import FaqPanel from "@/Components/FaqPanel";

export const metadata = {
  title: "Metodik och datakällor | EvoTracker",
  description: "Datakällor, beräkningar och begränsningar bakom EvoTrackers spelartrender och prognoser.",
  alternates: { canonical: "/methodology" },
};

export default function MethodologyPage() {
  return (
    <PublicInformationLayout titleSv="Metodik och datakällor" titleEn="Methodology and data sources">
      <FaqPanel />
    </PublicInformationLayout>
  );
}
