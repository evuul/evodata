"use client";

// Combines portfolio transactions, eligible dividends and upcoming company events.

import { useMemo } from "react";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import ReceiptLongRounded from "@mui/icons-material/ReceiptLongRounded";
import { buildPortfolioTimeline } from "@/lib/portfolioDashboard";
import { cardBase, text } from "./styles";
import { formatSek } from "./utils";

const formatDate = (value, locale) => {
  if (!value) return "–";
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "sv-SE", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00Z`));
};

export default function PortfolioTimelineCard({
  translate,
  locale,
  profile,
  historicalDividends,
  calendarEvents,
  todayYmd,
  onManage,
}) {
  const timeline = useMemo(
    () => buildPortfolioTimeline({
      transactions: profile?.transactions,
      lots: profile?.lots,
      historicalDividends,
      calendarEvents,
      todayYmd,
    }),
    [calendarEvents, historicalDividends, profile?.lots, profile?.transactions, todayYmd]
  );

  const historyLabel = (item) => {
    if (item.type === "buy") return translate(`Köp: ${item.shares.toLocaleString("sv-SE")} aktier`, `Buy: ${item.shares.toLocaleString("sv-SE")} shares`);
    if (item.type === "sell") return translate(`Försäljning: ${item.shares.toLocaleString("sv-SE")} aktier`, `Sale: ${item.shares.toLocaleString("sv-SE")} shares`);
    return translate(`Utdelning för ${item.shares.toLocaleString("sv-SE")} aktier`, `Dividend for ${item.shares.toLocaleString("sv-SE")} shares`);
  };

  return (
    <Paper sx={{ ...cardBase, p: { xs: 2.2, md: 2.8 } }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1.5}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <ReceiptLongRounded sx={{ color: "#f0abfc", fontSize: 20 }} />
            <Typography sx={{ color: text.heading, fontWeight: 850 }}>{translate("Din ägartidslinje", "Your ownership timeline")}</Typography>
          </Stack>
          <Typography sx={{ color: text.muted, fontSize: "0.82rem", mt: 0.5 }}>
            {translate("Köp, försäljningar, utdelningar och nästa bolagshändelse.", "Purchases, sales, dividends and the next company event.")}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            size="small"
            label={timeline.source === "transactions"
              ? translate("Komplett transaktionshistorik", "Transaction history")
              : timeline.source === "lots"
              ? translate("Baserad på aktuella köp", "Based on current lots")
              : translate("Historik saknas", "History missing")}
            sx={{ color: timeline.source === "transactions" ? "#86efac" : "#fde68a", backgroundColor: "rgba(148,163,184,0.1)", border: "1px solid rgba(148,163,184,0.22)" }}
          />
          <Button size="small" variant="outlined" onClick={onManage} sx={{ textTransform: "none", whiteSpace: "nowrap" }}>
            {translate("Hantera", "Manage")}
          </Button>
        </Stack>
      </Stack>

      {timeline.upcoming.length ? (
        <Box sx={{ mt: 2.3 }}>
          <Typography sx={{ color: text.muted, fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8 }}>
            {translate("Nästa händelser", "Next events")}
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 1.2, mt: 1 }}>
            {timeline.upcoming.map((event) => (
              <Stack key={event.id} direction="row" spacing={1.2} sx={{ p: 1.4, borderRadius: "12px", background: "rgba(124,58,237,0.09)", border: "1px solid rgba(167,139,250,0.22)" }}>
                <CalendarMonthRounded sx={{ color: "#c4b5fd", fontSize: 20, mt: 0.1 }} />
                <Box>
                  <Typography sx={{ color: text.heading, fontWeight: 800, fontSize: "0.9rem" }}>{locale === "en" ? event.titleEn : event.titleSv}</Typography>
                  <Typography sx={{ color: text.muted, fontSize: "0.78rem" }}>{formatDate(event.date, locale)}</Typography>
                </Box>
              </Stack>
            ))}
          </Box>
        </Box>
      ) : null}

      <Box sx={{ mt: 2.3 }}>
        <Typography sx={{ color: text.muted, fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8 }}>
          {translate("Senaste aktivitet", "Recent activity")}
        </Typography>
        <Stack sx={{ mt: 0.8 }}>
          {timeline.history.length ? timeline.history.map((item) => (
            <Stack key={item.id} direction="row" justifyContent="space-between" alignItems="center" gap={2} sx={{ py: 1.15, borderBottom: "1px solid rgba(148,163,184,0.11)" }}>
              <Box>
                <Typography sx={{ color: text.soft, fontWeight: 700, fontSize: "0.88rem" }}>{historyLabel(item)}</Typography>
                <Typography sx={{ color: text.muted, fontSize: "0.75rem" }}>{formatDate(item.date, locale)}</Typography>
              </Box>
              <Typography sx={{ color: item.type === "dividend" ? "#86efac" : text.subtle, fontWeight: 800, whiteSpace: "nowrap", fontSize: "0.86rem" }}>
                {item.type === "dividend" ? `+${formatSek(item.cash)}` : item.price > 0 ? formatSek(item.price) : "–"}
              </Typography>
            </Stack>
          )) : (
            <Typography sx={{ color: text.muted, py: 2 }}>{translate("Lägg till dina köp för att bygga tidslinjen.", "Add your purchases to build the timeline.")}</Typography>
          )}
        </Stack>
      </Box>
    </Paper>
  );
}
