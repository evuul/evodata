"use client";

// Compares public account benefits using the same history limits as access checks.

import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { useTranslate } from "@/context/LocaleContext";
import { STANDARD_HISTORY_MAX_DAYS, EXTENDED_HISTORY_MAX_DAYS } from "@/lib/historyRange";
import { PREMIUM_PROGRAM } from "@/config/premiumProgram";
import { FOUNDER_PROGRAM } from "@/config/founderProgram";
import { panelSx } from "./landingStyles";

export default function AccessComparison() {
  const translate = useTranslate();
  const yes = translate("Ingår", "Included");
  const no = "–";
  const rows = [
    [translate("Gameshows & rapporter", "Gameshows & reports"), yes, yes, yes],
    [translate("Historik, upp till", "History, up to"), ...[STANDARD_HISTORY_MAX_DAYS, EXTENDED_HISTORY_MAX_DAYS, EXTENDED_HISTORY_MAX_DAYS].map((days) => translate(`${days} dagar`, `${days} days`))],
    ["Extended lobby", no, yes, yes],
    [translate("CSV-export", "CSV export"), no, yes, yes],
    [translate("Åtkomst", "Access"), translate("Kostnadsfritt", "Free"), translate(`${PREMIUM_PROGRAM.monthlyDonationSek} kr / ${PREMIUM_PROGRAM.accessDaysPerMonth} dagar`, `SEK ${PREMIUM_PROGRAM.monthlyDonationSek} / ${PREMIUM_PROGRAM.accessDaysPerMonth} days`), translate(`${FOUNDER_PROGRAM.minimumDonationSek} kr totalt · permanent`, `SEK ${FOUNDER_PROGRAM.minimumDonationSek} total · permanent`)],
  ];

  return (
    <Box component="section" aria-labelledby="access-comparison-title" sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, pb: { xs: 5.5, md: 8 } }}>
      <Typography component="h2" id="access-comparison-title" sx={{ fontSize: { xs: 26, md: 34 }, fontWeight: 780, mb: 2 }}>{translate("Välj den åtkomst du behöver", "Choose the access you need")}</Typography>
      <TableContainer sx={{ ...panelSx, borderRadius: 3 }}>
        <Table aria-label={translate("Jämförelse av kontonivåer", "Account access comparison")} sx={{ tableLayout: "fixed", "& th, & td": { color: "#e2e8f0", borderColor: "rgba(148,163,184,0.18)", p: { xs: 1, sm: 2 }, fontSize: { xs: 12, sm: 14 }, overflowWrap: "anywhere" } }}>
          <TableHead><TableRow>
            {[translate("Funktion", "Feature"), translate("Gratis", "Free"), "Premium", "Founder"].map((label) => <TableCell key={label} scope="col" sx={{ fontWeight: 800 }}>{label}</TableCell>)}
          </TableRow></TableHead>
          <TableBody>{rows.map(([label, ...values]) => (
            <TableRow key={label}>
              <TableCell component="th" scope="row">{label}</TableCell>
              {values.map((value, index) => <TableCell key={index}>{value}</TableCell>)}
            </TableRow>
          ))}</TableBody>
        </Table>
      </TableContainer>
      <Typography sx={{ color: "#cbd5e1", fontSize: 13, mt: 1.5, lineHeight: 1.6 }}>
        {translate("Historiken varierar mellan spel och vyer och beror på när insamlingen började. Donationer är frivilliga. Founder-platser är begränsade; flera donationer räknas ihop.", "History varies by game and view and depends on when collection began. Donations are voluntary. Founder places are limited; multiple donations are added together.")}
      </Typography>
    </Box>
  );
}
