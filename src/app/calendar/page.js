// Offers the sourced investor calendar publicly, including event downloads.

import PublicInformationLayout from "@/Components/PublicInformationLayout";
import FinancialCalendarPanel from "@/Components/FinancialCalendarPanel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Finansiell kalender | EvoTracker",
  description: "Evolutions rapportdatum, bolagsstämmor och investerarhändelser. Spara händelser i din kalender.",
  alternates: { canonical: "/calendar" },
};

export default function CalendarPage() {
  return (
    <PublicInformationLayout titleSv="Evolutions kalender" titleEn="Evolution calendar">
      <FinancialCalendarPanel />
    </PublicInformationLayout>
  );
}
