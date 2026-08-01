"use client";

// Shows the next report and company event above the Mina sidor navigation.

import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import EventRounded from "@mui/icons-material/EventRounded";
import AssessmentRounded from "@mui/icons-material/AssessmentRounded";
import NextLink from "next/link";
import { useMemo } from "react";
import { buildCalendarHighlights } from "@/lib/financialCalendar";
import { cardBase, text } from "./styles";

const formatDate = (value, locale) =>
  new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00Z`));

const timingLabel = (daysUntil, translate) => {
  if (daysUntil === 0) return translate("Idag", "Today");
  if (daysUntil === 1) return translate("Imorgon", "Tomorrow");
  return translate(`Om ${daysUntil} dagar`, `In ${daysUntil} days`);
};

function HighlightCard({ type, event, locale, translate }) {
  if (!event) return null;
  const isReport = type === "report";
  const title = locale === "en" ? event.titleEn : event.titleSv;

  return (
    <Box
      component={NextLink}
      href="/?panel=calendar"
      aria-label={translate(
        `Öppna kalendern för ${title}`,
        `Open the calendar for ${title}`
      )}
      sx={{
        display: "block",
        minWidth: 0,
        p: { xs: 1.35, sm: 1.55 },
        borderRadius: "13px",
        color: "inherit",
        textDecoration: "none",
        background: "rgba(15,23,42,0.42)",
        border: isReport
          ? "1px solid rgba(56,189,248,0.28)"
          : "1px solid rgba(167,139,250,0.28)",
        transition: "border-color 160ms ease, background 160ms ease",
        "&:hover": {
          borderColor: isReport ? "rgba(125,211,252,0.55)" : "rgba(196,181,253,0.55)",
          background: "rgba(30,41,59,0.62)",
        },
        "&:focus-visible": {
          outline: "2px solid #7dd3fc",
          outlineOffset: 2,
        },
      }}
    >
      <Stack direction="row" spacing={1.2} alignItems="center">
        <Box
          sx={{
            width: 36,
            height: 36,
            flex: "0 0 auto",
            display: "grid",
            placeItems: "center",
            borderRadius: "11px",
            color: isReport ? "#7dd3fc" : "#c4b5fd",
            background: isReport ? "rgba(14,165,233,0.12)" : "rgba(139,92,246,0.14)",
          }}
        >
          {isReport ? <AssessmentRounded fontSize="small" /> : <EventRounded fontSize="small" />}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              color: isReport ? "#7dd3fc" : "#c4b5fd",
              fontSize: "0.68rem",
              fontWeight: 850,
              letterSpacing: 0.8,
              textTransform: "uppercase",
            }}
          >
            {isReport
              ? translate("Nästa rapport", "Next report")
              : translate("Nästa event", "Next event")}
          </Typography>
          <Typography
            sx={{
              color: text.heading,
              fontSize: { xs: "0.86rem", sm: "0.92rem" },
              fontWeight: 800,
              mt: 0.1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: { xs: "normal", sm: "nowrap" },
            }}
          >
            {title}
          </Typography>
          <Typography sx={{ color: text.muted, fontSize: "0.75rem", mt: 0.15 }}>
            {formatDate(event.date, locale)}
            {event.time ? ` · ${event.time}` : ""}
            <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
              {` · ${timingLabel(event.daysUntil, translate)}`}
            </Box>
          </Typography>
        </Box>
        <Chip
          size="small"
          label={timingLabel(event.daysUntil, translate)}
          sx={{
            display: { xs: "none", sm: "flex" },
            flex: "0 0 auto",
            color: isReport ? "#bae6fd" : "#ddd6fe",
            background: isReport ? "rgba(14,165,233,0.13)" : "rgba(139,92,246,0.14)",
            border: isReport
              ? "1px solid rgba(56,189,248,0.25)"
              : "1px solid rgba(167,139,250,0.25)",
            fontWeight: 750,
          }}
        />
      </Stack>
    </Box>
  );
}

export default function UpcomingCalendarHighlights({
  events,
  todayYmd,
  locale,
  translate,
}) {
  const highlights = useMemo(
    () => buildCalendarHighlights(events, todayYmd),
    [events, todayYmd]
  );
  if (!highlights.nextReport && !highlights.nextEvent) return null;

  return (
    <Paper sx={{ ...cardBase, p: { xs: 1.6, md: 1.8 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        gap={1}
      >
        <Stack direction="row" spacing={0.8} alignItems="center">
          <CalendarMonthRounded sx={{ color: "#a5b4fc", fontSize: 19 }} />
          <Typography sx={{ color: text.soft, fontSize: "0.82rem", fontWeight: 800 }}>
            {translate("Kommande i kalendern", "Coming up")}
          </Typography>
        </Stack>
        <Button
          component={NextLink}
          href="/?panel=calendar"
          size="small"
          sx={{
            alignSelf: { xs: "flex-start", sm: "center" },
            color: "#a5b4fc",
            fontSize: "0.75rem",
            fontWeight: 750,
            textTransform: "none",
            px: 0.5,
          }}
        >
          {translate("Visa kalender", "View calendar")}
        </Button>
      </Stack>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          gap: 1,
          mt: 1.15,
        }}
      >
        <HighlightCard
          type="report"
          event={highlights.nextReport}
          locale={locale}
          translate={translate}
        />
        <HighlightCard
          type="event"
          event={highlights.nextEvent}
          locale={locale}
          translate={translate}
        />
      </Box>
    </Paper>
  );
}
