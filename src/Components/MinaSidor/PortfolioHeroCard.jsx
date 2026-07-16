"use client";

// Presents the user's most important holding and return metrics in one overview.

import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import AccountBalanceWalletRounded from "@mui/icons-material/AccountBalanceWalletRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import { cardBase, statusColors, text } from "./styles";
import { formatPercent, formatSek } from "./utils";

const Metric = ({ label, value, detail, color = text.heading }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography sx={{ color: text.muted, fontSize: "0.78rem", fontWeight: 700 }}>{label}</Typography>
    <Typography sx={{ color, fontSize: { xs: "1rem", md: "1.12rem" }, fontWeight: 850, mt: 0.25 }}>
      {value}
    </Typography>
    {detail ? <Typography sx={{ color: text.muted, fontSize: "0.75rem", mt: 0.2 }}>{detail}</Typography> : null}
  </Box>
);

export default function PortfolioHeroCard({
  translate,
  totalValue,
  totalCost,
  totalReturn,
  totalReturnPct,
  todaysHoldingChangeSek,
  todaysChangePercent,
  shares,
  avgCost,
  currentPrice,
  dividendsReceived,
  onManage,
}) {
  const returnColor = totalReturn >= 0 ? statusColors.positive : statusColors.negative;
  const todayColor = Number.isFinite(todaysHoldingChangeSek) && todaysHoldingChangeSek < 0
    ? statusColors.negative
    : statusColors.positive;

  return (
    <Paper
      sx={{
        ...cardBase,
        overflow: "hidden",
        position: "relative",
        p: { xs: 2.2, md: 3.2 },
        background:
          "radial-gradient(circle at 85% 0%, rgba(56,189,248,0.18), transparent 32%), linear-gradient(135deg, rgba(15,23,42,0.96), rgba(17,39,67,0.88))",
        boxShadow: "0 24px 60px rgba(2,6,23,0.32)",
      }}
    >
      <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 2.2, md: 4 }} justifyContent="space-between">
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <AccountBalanceWalletRounded sx={{ color: "#7dd3fc", fontSize: 20 }} />
            <Typography sx={{ color: text.subtle, fontWeight: 800, letterSpacing: 0.4 }}>
              {translate("Ditt innehav idag", "Your holding today")}
            </Typography>
          </Stack>
          <Typography
            component="p"
            sx={{ color: text.heading, fontWeight: 900, fontSize: { xs: "2.15rem", md: "3rem" }, lineHeight: 1.08, mt: 1 }}
          >
            {formatSek(totalValue)}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.2 }}>
            <Chip
              size="small"
              label={translate(
                `Idag ${Number.isFinite(todaysHoldingChangeSek) && todaysHoldingChangeSek >= 0 ? "+" : ""}${formatSek(todaysHoldingChangeSek)} (${formatPercent(todaysChangePercent)})`,
                `Today ${Number.isFinite(todaysHoldingChangeSek) && todaysHoldingChangeSek >= 0 ? "+" : ""}${formatSek(todaysHoldingChangeSek)} (${formatPercent(todaysChangePercent)})`
              )}
              sx={{ color: todayColor, backgroundColor: `${todayColor}16`, border: `1px solid ${todayColor}45`, fontWeight: 750 }}
            />
            <Chip
              size="small"
              label={translate(`${shares.toLocaleString("sv-SE")} aktier`, `${shares.toLocaleString("sv-SE")} shares`)}
              sx={{ color: "#dbeafe", backgroundColor: "rgba(59,130,246,0.14)", border: "1px solid rgba(96,165,250,0.3)" }}
            />
          </Stack>
        </Box>

        <Stack sx={{ minWidth: { md: 255 }, alignItems: { xs: "flex-start", md: "flex-end" } }}>
          <Typography sx={{ color: text.muted, fontSize: "0.82rem", fontWeight: 700 }}>
            {translate("Total avkastning inkl. utdelning", "Total return incl. dividends")}
          </Typography>
          <Typography sx={{ color: returnColor, fontSize: { xs: "1.55rem", md: "1.9rem" }, fontWeight: 900 }}>
            {totalReturn >= 0 ? "+" : ""}{formatSek(totalReturn)}
          </Typography>
          <Typography sx={{ color: returnColor, fontWeight: 800 }}>{formatPercent(totalReturnPct)}</Typography>
          <Button
            variant="contained"
            startIcon={<EditRounded />}
            onClick={onManage}
            sx={{ mt: 1.5, textTransform: "none", fontWeight: 800, borderRadius: "999px", px: 2.1 }}
          >
            {translate("Hantera innehav", "Manage holdings")}
          </Button>
        </Stack>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(5, minmax(0, 1fr))" },
          gap: { xs: 1.8, md: 2.5 },
          mt: { xs: 2.4, md: 3.2 },
          pt: { xs: 2, md: 2.4 },
          borderTop: "1px solid rgba(148,163,184,0.16)",
        }}
      >
        <Metric label={translate("Investerat kapital", "Invested capital")} value={formatSek(totalCost)} />
        <Metric label={translate("Mottagen utdelning", "Dividends received")} value={formatSek(dividendsReceived)} color="#86efac" />
        <Metric label={translate("GAV", "Cost basis")} value={formatSek(avgCost)} />
        <Metric label={translate("Livekurs", "Live price")} value={formatSek(currentPrice)} />
        <Metric
          label={translate("Avkastning", "Return")}
          value={formatPercent(totalReturnPct)}
          detail={translate("inklusive utdelning", "including dividends")}
          color={returnColor}
        />
      </Box>
    </Paper>
  );
}
