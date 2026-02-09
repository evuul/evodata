"use client";

import { Box, Paper, Typography } from "@mui/material";
import { formatPercent, formatSek } from "./utils";
import { cardBase, equalHeightCard, gradientCards, statusColors, text } from "./styles";

export default function HoldingsKpiRow({
  translate,
  totalValue,
  totalCost,
  gain,
  gainPercent,
  expectedDividendCash,
  upcomingDividend,
  lastDividend,
}) {
  const cardSx = {
    p: { xs: 2, md: 2.2 },
    ...cardBase,
    ...equalHeightCard,
    width: "100%",
    minHeight: { xs: 150, md: 168 },
    justifyContent: "flex-start",
    gap: { xs: 0.9, md: 1.1 },
  };

  return (
    <Box
      sx={{
        display: "grid",
        gap: 2.5,
        gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" },
        alignItems: "stretch",
      }}
    >
      <Box sx={{ display: "flex" }}>
        <Paper sx={{ ...cardSx, background: gradientCards.liveValue }}>
          <Typography sx={{ color: text.subtle }}>{translate("Livevärde", "Live value")}</Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: text.heading }}>
            {formatSek(totalValue)}
          </Typography>
          <Typography sx={{ color: text.faint }}>
            {translate("Aktier × livekurs", "Shares × live price")}
          </Typography>
        </Paper>
      </Box>
      <Box sx={{ display: "flex" }}>
        <Paper sx={{ ...cardSx, background: gradientCards.costBasis }}>
          <Typography sx={{ color: text.subtle }}>{translate("Totalt anskaffningsvärde", "Total cost basis")}</Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: text.heading }}>
            {formatSek(totalCost)}
          </Typography>
          <Typography sx={{ color: text.faint }}>{translate("Aktier × GAV", "Shares × cost basis")}</Typography>
        </Paper>
      </Box>
      <Box sx={{ display: "flex" }}>
        <Paper sx={{ ...cardSx, background: gradientCards.valueChange }}>
          <Typography sx={{ color: text.subtle }}>{translate("Värdeförändring", "Value change")}</Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              color: gain >= 0 ? statusColors.positive : statusColors.negative,
            }}
          >
            {formatSek(gain)}
          </Typography>
          <Typography sx={{ color: text.faint }}>{formatPercent(gainPercent)}</Typography>
        </Paper>
      </Box>
      <Box sx={{ display: "flex" }}>
        <Paper sx={{ ...cardSx, background: gradientCards.dividend }}>
          <Typography sx={{ color: text.subtle }}>{translate("Kommande utdelning", "Upcoming dividend")}</Typography>
          {expectedDividendCash != null ? (
            <Typography variant="h4" sx={{ fontWeight: 800, color: text.heading }}>
              {formatSek(expectedDividendCash)}
            </Typography>
          ) : (
            <Typography variant="h6" sx={{ fontWeight: 700, color: text.heading }}>
              {translate("Inväntar besked", "Awaiting announcement")}
            </Typography>
          )}
          <Typography sx={{ color: text.faint }}>
            {upcomingDividend
              ? translate(
                  `${upcomingDividend.dividendPerShare} SEK/aktie`,
                  `${upcomingDividend.dividendPerShare} SEK/share`
                )
              : lastDividend
              ? translate(
                  `Senast: ${lastDividend.dividendPerShare} SEK/aktie`,
                  `Last paid: ${lastDividend.dividendPerShare} SEK/share`
                )
              : translate("Ingen utdelning registrerad.", "No dividend recorded.")}
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
