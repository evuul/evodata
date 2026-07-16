"use client";

// Displays sourced Evolution investor events as a responsive financial agenda.

import { useMemo, useState } from "react";
import {
  Box,
  Chip,
  Divider,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import ScheduleRounded from "@mui/icons-material/ScheduleRounded";
import financialCalendarEvents from "@/app/data/financialCalendar";
import { useLocale, useTranslate } from "@/context/LocaleContext";
import { getStockholmTodayYmd } from "@/lib/livePlayersControlPanel";
import { filterCalendarEvents, prepareFinancialCalendar } from "@/lib/financialCalendar";

const CATEGORY_COLORS = {
  report: { color: "#7dd3fc", bg: "rgba(56,189,248,0.14)", border: "rgba(56,189,248,0.34)" },
  governance: { color: "#c4b5fd", bg: "rgba(139,92,246,0.14)", border: "rgba(139,92,246,0.34)" },
  industry: { color: "#fcd34d", bg: "rgba(245,158,11,0.14)", border: "rgba(245,158,11,0.34)" },
};

const dateFromYmd = (value) => new Date(`${value}T12:00:00Z`);

function formatEventDate(event, locale) {
  const language = locale === "en" ? "en-GB" : "sv-SE";
  const formatter = new Intl.DateTimeFormat(language, { day: "numeric", month: "long", year: "numeric" });
  const start = formatter.format(dateFromYmd(event.date));
  if (!event.endDate || event.endDate === event.date) return start;
  return `${start}–${formatter.format(dateFromYmd(event.endDate))}`;
}

function DateBadge({ event, locale }) {
  const language = locale === "en" ? "en-GB" : "sv-SE";
  const date = dateFromYmd(event.date);
  const month = new Intl.DateTimeFormat(language, { month: "short" }).format(date).replace(".", "");
  const startDay = date.getUTCDate();
  const endDay = event.endDate && event.endDate !== event.date ? dateFromYmd(event.endDate).getUTCDate() : null;

  return (
    <Box
      sx={{
        width: 62,
        minWidth: 62,
        borderRadius: "14px",
        px: 1,
        py: 0.8,
        textAlign: "center",
        background: "rgba(15,23,42,0.72)",
        border: "1px solid rgba(148,163,184,0.22)",
      }}
    >
      <Typography sx={{ color: "#f8fafc", fontWeight: 900, fontSize: "1.18rem", lineHeight: 1.1 }}>
        {endDay ? `${startDay}–${endDay}` : startDay}
      </Typography>
      <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.82)", textTransform: "uppercase", fontWeight: 800 }}>
        {month}
      </Typography>
    </Box>
  );
}

function EventCard({ event, locale, translate, past = false }) {
  const colors = CATEGORY_COLORS[event.category] ?? CATEGORY_COLORS.report;
  const categoryLabel =
    event.category === "governance"
      ? translate("Bolagsstyrning", "Governance")
      : event.category === "industry"
      ? translate("Branschevent", "Industry event")
      : translate("Rapport", "Report");
  const title = locale === "en" ? event.titleEn : event.titleSv;
  const description = locale === "en" ? event.descriptionEn : event.descriptionSv;
  const sourceLabel = locale === "en" ? event.sourceLabelEn : event.sourceLabelSv;

  return (
    <Box
      sx={{
        display: "flex",
        gap: { xs: 1.25, sm: 1.6 },
        alignItems: "flex-start",
        borderRadius: "16px",
        p: { xs: 1.3, sm: 1.6 },
        background: past ? "rgba(15,23,42,0.3)" : "rgba(15,23,42,0.55)",
        border: `1px solid ${past ? "rgba(148,163,184,0.14)" : colors.border}`,
        opacity: past ? 0.76 : 1,
      }}
    >
      <DateBadge event={event} locale={locale} />
      <Stack spacing={0.55} sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" gap={0.7} flexWrap="wrap" alignItems="center">
          <Chip
            size="small"
            label={categoryLabel}
            sx={{ height: 23, color: colors.color, backgroundColor: colors.bg, border: `1px solid ${colors.border}`, fontWeight: 700 }}
          />
          {event.status === "today" || event.status === "ongoing" ? (
            <Chip size="small" label={translate("Pågår", "Ongoing")} sx={{ height: 23, color: "#86efac", backgroundColor: "rgba(34,197,94,0.14)" }} />
          ) : null}
        </Stack>
        <Typography sx={{ color: "#f8fafc", fontWeight: 800, fontSize: { xs: "0.98rem", sm: "1.08rem" } }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: "rgba(203,213,225,0.78)", lineHeight: 1.55 }}>
          {description}
        </Typography>
        <Stack direction="row" gap={1.2} flexWrap="wrap" alignItems="center">
          <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.78)" }}>
            {formatEventDate(event, locale)}{event.time ? ` · ${event.time} CEST` : ""}
          </Typography>
          <Link
            href={event.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            sx={{ color: "#7dd3fc", fontSize: "0.76rem", display: "inline-flex", alignItems: "center", gap: 0.35 }}
          >
            {sourceLabel} <OpenInNewRounded sx={{ fontSize: 13 }} />
          </Link>
        </Stack>
      </Stack>
    </Box>
  );
}

export default function FinancialCalendarPanel() {
  const translate = useTranslate();
  const { locale } = useLocale();
  const [category, setCategory] = useState("all");
  const calendar = useMemo(
    () => prepareFinancialCalendar(financialCalendarEvents, getStockholmTodayYmd()),
    []
  );
  const upcoming = filterCalendarEvents(calendar.upcoming, category);
  const past = filterCalendarEvents(calendar.past, category);
  const nextEvent = calendar.nextEvent;
  const nextTitle = nextEvent ? (locale === "en" ? nextEvent.titleEn : nextEvent.titleSv) : null;
  const nextTiming =
    calendar.daysToNext === 0
      ? translate("Idag", "Today")
      : calendar.daysToNext === 1
      ? translate("Imorgon", "Tomorrow")
      : translate(`Om ${calendar.daysToNext} dagar`, `In ${calendar.daysToNext} days`);
  const filters = [
    { value: "all", sv: "Alla", en: "All" },
    { value: "report", sv: "Rapporter", en: "Reports" },
    { value: "governance", sv: "Bolagsstyrning", en: "Governance" },
    { value: "industry", sv: "Branschevent", en: "Industry events" },
  ];

  return (
    <Box
      sx={{
        width: "100%",
        mx: { xs: -2, sm: -3, md: -4 },
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 3, md: 4 },
        borderRadius: { xs: 0, md: "18px" },
        background: "linear-gradient(135deg, #0f172a, #111c2f)",
        color: "#f8fafc",
      }}
    >
      <Stack spacing={{ xs: 2.2, md: 3 }} sx={{ maxWidth: 1060, mx: "auto" }}>
        <Stack spacing={0.8} alignItems="center" textAlign="center">
          <CalendarMonthRounded sx={{ color: "#7dd3fc", fontSize: 34 }} />
          <Typography variant="h4" sx={{ fontWeight: 850, fontSize: { xs: "1.8rem", sm: "2.2rem" } }}>
            {translate("Finansiell kalender", "Financial calendar")}
          </Typography>
          <Typography sx={{ color: "rgba(203,213,225,0.76)", maxWidth: 720, lineHeight: 1.6 }}>
            {translate(
              "Officiellt bekräftade rapporter, bolagshändelser och relevanta investerardatum för Evolution.",
              "Officially confirmed reports, corporate events and relevant investor dates for Evolution."
            )}
          </Typography>
        </Stack>

        {nextEvent ? (
          <Box sx={{ p: { xs: 1.7, sm: 2.2 }, borderRadius: "18px", background: "linear-gradient(135deg, rgba(14,116,144,0.24), rgba(30,41,59,0.56))", border: "1px solid rgba(56,189,248,0.34)" }}>
            <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }}>
              <Stack spacing={0.45}>
                <Typography variant="overline" sx={{ color: "#7dd3fc", fontWeight: 800, letterSpacing: 1.1 }}>
                  {translate("Nästa händelse", "Next event")}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 850 }}>{nextTitle}</Typography>
                <Typography variant="body2" sx={{ color: "rgba(203,213,225,0.78)" }}>
                  {formatEventDate(nextEvent, locale)}{nextEvent.time ? ` · ${nextEvent.time} CEST` : ""}
                </Typography>
              </Stack>
              <Chip
                icon={<ScheduleRounded />}
                label={nextTiming}
                sx={{ color: "#e0f2fe", backgroundColor: "rgba(56,189,248,0.18)", border: "1px solid rgba(56,189,248,0.35)", fontWeight: 800 }}
              />
            </Stack>
          </Box>
        ) : null}

        <Stack direction="row" gap={0.8} flexWrap="wrap" justifyContent="center">
          {filters.map((filter) => (
            <Chip
              key={filter.value}
              clickable
              onClick={() => setCategory(filter.value)}
              label={translate(filter.sv, filter.en)}
              sx={{
                color: category === filter.value ? "#f8fafc" : "rgba(203,213,225,0.78)",
                backgroundColor: category === filter.value ? "rgba(56,189,248,0.24)" : "rgba(148,163,184,0.1)",
                border: category === filter.value ? "1px solid rgba(56,189,248,0.4)" : "1px solid transparent",
                fontWeight: category === filter.value ? 800 : 600,
              }}
            />
          ))}
        </Stack>

        <Stack spacing={1.25}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>{translate("Kommande", "Upcoming")}</Typography>
          {upcoming.length ? upcoming.map((event) => (
            <EventCard key={event.id} event={event} locale={locale} translate={translate} />
          )) : (
            <Typography sx={{ color: "rgba(148,163,184,0.75)" }}>{translate("Inga kommande händelser i den här kategorin.", "No upcoming events in this category.")}</Typography>
          )}
        </Stack>

        {past.length ? (
          <>
            <Divider sx={{ borderColor: "rgba(148,163,184,0.16)" }} />
            <Stack spacing={1.25}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>{translate("Tidigare under 2026", "Earlier in 2026")}</Typography>
              {past.map((event) => (
                <EventCard key={event.id} event={event} locale={locale} translate={translate} past />
              ))}
            </Stack>
          </>
        ) : null}

        <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.65)", textAlign: "center", lineHeight: 1.55 }}>
          {translate(
            "Endast officiellt publicerade datum visas. Kalendern innehåller inga uppskattade rapportdatum och uppdateras när Evolution publicerar ny information.",
            "Only officially published dates are shown. The calendar contains no estimated report dates and is updated when Evolution publishes new information."
          )}
        </Typography>
      </Stack>
    </Box>
  );
}
