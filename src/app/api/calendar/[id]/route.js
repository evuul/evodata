// Downloads a sourced public calendar entry without accessing account data.

import financialCalendarEvents from "@/app/data/financialCalendar";
import { buildEventCalendar } from "@/lib/calendarExport";

export async function GET(request, { params }) {
  const { id } = await params;
  const event = financialCalendarEvents.find((candidate) => candidate.id === id);
  if (!event) return new Response("Event not found", { status: 404 });
  const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "sv";
  const calendar = buildEventCalendar(event, { locale });
  if (!calendar) return new Response("Event unavailable", { status: 404 });
  return new Response(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="evotracker-${event.id}.ics"`,
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
