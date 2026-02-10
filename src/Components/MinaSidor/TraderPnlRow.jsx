"use client";

import { Box, Paper, Stack, Typography } from "@mui/material";
import { formatPercent, formatSek } from "./utils";
import { cardBase, equalHeightCard, gradientCards, statusColors, text } from "./styles";

export default function TraderPnlRow({ translate, pnl }) {
  if (!pnl) return null;

  const cardSx = {
    p: { xs: 2, md: 2.2 },
    ...cardBase,
    ...equalHeightCard,
    width: "100%",
    minHeight: { xs: 150, md: 168 },
    justifyContent: "flex-start",
    gap: { xs: 0.9, md: 1.1 },
  };

  const totalColor = pnl.totalPnl >= 0 ? statusColors.positive : statusColors.negative;
  const realizedColor = pnl.realizedPnl >= 0 ? statusColors.positive : statusColors.negative;
  const unrealizedColor = pnl.unrealizedPnl >= 0 ? statusColors.positive : statusColors.negative;

  return (
    <Stack spacing={1.2}>
      {pnl.missingSellPriceCount ? (
        <Typography sx={{ color: "rgba(251,191,36,0.9)", fontWeight: 800, textAlign: "center" }}>
          {translate(
            `Obs: ${pnl.missingSellPriceCount} säljtransaktion(er) saknar kurs. Realiserat P/L kan vara ofullständigt.`,
            `Note: ${pnl.missingSellPriceCount} sell transaction(s) are missing a price. Realized P/L may be incomplete.`
          )}
        </Typography>
      ) : null}

      <Box
        sx={{
          display: "grid",
          gap: 2.5,
          gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" },
          alignItems: "stretch",
        }}
      >
        <Box sx={{ display: "flex" }}>
          <Paper sx={{ ...cardSx, background: gradientCards.valueChange }}>
            <Typography sx={{ color: text.subtle }}>{translate("Total P/L (inkl utdelning)", "Total P/L (incl dividends)")}</Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, color: totalColor }}>
              {formatSek(pnl.totalPnl)}
            </Typography>
            <Typography sx={{ color: text.faint }}>
              {translate("Realiserat + orealiserat + utdelning", "Realized + unrealized + dividends")}
            </Typography>
          </Paper>
        </Box>

        <Box sx={{ display: "flex" }}>
          <Paper sx={{ ...cardSx, background: "linear-gradient(135deg, rgba(17,94,89,0.35), rgba(15,23,42,0.7))" }}>
            <Typography sx={{ color: text.subtle }}>{translate("Realiserat P/L", "Realized P/L")}</Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, color: realizedColor }}>
              {formatSek(pnl.realizedPnl)}
            </Typography>
            <Typography sx={{ color: text.faint }}>
              {translate("Sålda affärer (FIFO)", "Closed trades (FIFO)")}
            </Typography>
          </Paper>
        </Box>

        <Box sx={{ display: "flex" }}>
          <Paper sx={{ ...cardSx, background: gradientCards.liveValue }}>
            <Typography sx={{ color: text.subtle }}>{translate("Orealiserat P/L", "Unrealized P/L")}</Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, color: unrealizedColor }}>
              {formatSek(pnl.unrealizedPnl)}
            </Typography>
            <Typography sx={{ color: text.faint }}>
              {translate("Nuvarande innehav", "Current position")}
            </Typography>
          </Paper>
        </Box>

        <Box sx={{ display: "flex" }}>
          <Paper sx={{ ...cardSx, background: "linear-gradient(135deg, rgba(30,41,59,0.55), rgba(15,23,42,0.7))" }}>
            <Typography sx={{ color: text.subtle }}>{translate("Courtage totalt", "Total fees")}</Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, color: text.heading }}>
              {formatSek(pnl.feesTotal)}
            </Typography>
            <Typography sx={{ color: text.faint }}>
              {translate("Köp + sälj", "Buys + sells")}
            </Typography>
          </Paper>
        </Box>
      </Box>
    </Stack>
  );
}

