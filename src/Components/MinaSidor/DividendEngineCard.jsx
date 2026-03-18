"use client";

import { Box, Paper, Stack, Typography } from "@mui/material";
import { formatPercent, formatSek } from "./utils";
import { cardBase, statusColors, text } from "./styles";

export default function DividendEngineCard({
  translate,
  dividendYield,
  expectedDividendCash,
  upcomingDividend,
  dividendsReceivedSafe,
  breakEvenDisplay,
  breakEvenPaidBack,
}) {
  const hasNoDividendProposal = upcomingDividend?.status === "no_dividend_proposed";
  return (
    <Paper sx={{ p: 2.5, ...cardBase }}>
      <Typography sx={{ color: text.subtle, textTransform: "uppercase", letterSpacing: 1.1, fontSize: "0.75rem" }}>
        {translate("Utdelningsmaskinen", "Dividend engine")}
      </Typography>
      <Stack spacing={1.5} sx={{ mt: 1 }}>
        <Box>
          <Typography sx={{ color: text.subtle }}>{translate("Direktavkastning", "Yield")}</Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: text.heading }}>
            {dividendYield != null ? formatPercent(dividendYield) : "–"}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ color: text.subtle }}>{translate("Nästa utdelning", "Upcoming dividend")}</Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: text.heading }}>
            {expectedDividendCash != null ? formatSek(expectedDividendCash) : "–"}
          </Typography>
          <Typography sx={{ color: text.faint }}>
            {hasNoDividendProposal
              ? translate(
                  `0 SEK/aktie • Ingen utdelning föreslagen (${upcomingDividend.announcementDate})`,
                  `0 SEK/share • No dividend proposed (${upcomingDividend.announcementDate})`
                )
              : upcomingDividend
              ? translate(
                  `${upcomingDividend.dividendPerShare} SEK/aktie • ${upcomingDividend.date}`,
                  `${upcomingDividend.dividendPerShare} SEK/share • ${upcomingDividend.date}`
                )
              : translate("Ingen utdelning registrerad.", "No dividend recorded.")}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ color: text.subtle }}>{translate("Mottaget hittills", "Dividends received")}</Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: text.heading }}>
            {formatSek(dividendsReceivedSafe)}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ color: text.subtle }}>{translate("Break-even inkl utdelning", "Break-even incl dividends")}</Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: text.heading }}>
            {breakEvenDisplay != null ? formatSek(breakEvenDisplay) : "–"}
          </Typography>
          {breakEvenPaidBack ? (
            <Typography sx={{ color: statusColors.positive }}>
              {translate("Utdelningen har täckt GAV.", "Dividends have covered your cost basis.")}
            </Typography>
          ) : null}
        </Box>
      </Stack>
    </Paper>
  );
}
