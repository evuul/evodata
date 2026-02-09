"use client";

import { Paper, Stack, TextField, Typography } from "@mui/material";
import { formatSek } from "./utils";
import { equalHeightCard, inputLabelSx, inputSx, softCardBase, statusColors, text } from "./styles";

export default function DividendCalculator({
  translate,
  dividendsReceived,
  onChange,
  breakEvenDisplay,
  breakEvenPaidBack,
}) {
  return (
    <Paper sx={{ p: 2.5, ...softCardBase, ...equalHeightCard }}>
      <Typography sx={{ color: text.subtle }}>{translate("Utdelningskalkylator", "Dividend break-even")}</Typography>
      <Typography sx={{ color: text.muted, mb: 1 }}>
        {translate(
          "Ange hur mycket utdelning du redan fått.",
          "Enter how much dividend you have already received."
        )}
      </Typography>
      <TextField
        label={translate("Totalt mottagen utdelning (SEK)", "Total dividends received (SEK)")}
        type="number"
        value={dividendsReceived}
        onChange={onChange}
        fullWidth
        InputLabelProps={{ sx: inputLabelSx }}
        InputProps={{ sx: { color: "#f8fafc" } }}
        sx={inputSx}
      />
      <Stack spacing={1} sx={{ mt: 2 }}>
        <Typography sx={{ color: text.subtle }}>
          {translate("Break-even inkl utdelning", "Break-even incl dividends")}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, color: text.heading }}>
          {breakEvenDisplay != null ? formatSek(breakEvenDisplay) : "–"}
        </Typography>
        {breakEvenPaidBack ? (
          <Typography sx={{ color: statusColors.positive }}>
            {translate("Utdelningen har täckt GAV.", "Dividends have covered your cost basis.")}
          </Typography>
        ) : null}
      </Stack>
    </Paper>
  );
}
