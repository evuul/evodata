"use client";

// Presents portfolio transactions and eligible dividend history.

import { useMemo } from "react";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
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
  todayYmd,
  onManage,
  onManageTransactions,
}) {
  const timeline = useMemo(
    () => buildPortfolioTimeline({
      transactions: profile?.transactions,
      lots: profile?.lots,
      historicalDividends,
      todayYmd,
    }),
    [historicalDividends, profile?.lots, profile?.transactions, todayYmd]
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
            {translate("Köp, försäljningar och utdelningar i kronologisk ordning.", "Purchases, sales and dividends in chronological order.")}
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
            {translate("Lägg till", "Add")}
          </Button>
          <Button size="small" variant="contained" onClick={onManageTransactions} sx={{ textTransform: "none", whiteSpace: "nowrap" }}>
            {translate("Transaktioner", "Transactions")}
          </Button>
        </Stack>
      </Stack>

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
