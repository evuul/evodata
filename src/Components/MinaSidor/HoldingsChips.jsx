"use client";

import { Chip, Stack } from "@mui/material";
import { formatSek, formatPercent } from "./utils";
import { chipColors } from "./styles";

export default function HoldingsChips({
  translate,
  profile,
  dividendYield,
  dividendsReceivedSafe,
  gainPercent,
  totalReturnWithDividends,
  totalReturnPctWithDividends,
}) {
  const gainColor = gainPercent != null && gainPercent < 0 ? chipColors.pink : chipColors.green;
  const totalWithDivColor =
    Number.isFinite(totalReturnWithDividends) && totalReturnWithDividends < 0
      ? chipColors.pink
      : chipColors.greenStrong;
  const gavChipColor = {
    backgroundColor: "rgba(148,163,184,0.18)",
    color: "#e2e8f0",
    border: "1px solid rgba(148,163,184,0.38)",
  };

  return (
    <Stack
      direction="row"
      flexWrap="wrap"
      useFlexGap
      sx={{
        columnGap: 1,
        rowGap: 1,
        "& .MuiChip-root": {
          maxWidth: "100%",
          height: { xs: "auto", sm: 32 },
        },
        "& .MuiChip-label": {
          display: "block",
          whiteSpace: { xs: "normal", sm: "nowrap" },
          py: { xs: 0.75, sm: 0 },
        },
      }}
    >
      <Chip
        label={translate(
          `Aktier: ${profile.shares.toLocaleString("sv-SE")}`,
          `Shares: ${profile.shares.toLocaleString("sv-SE")}`
        )}
        sx={chipColors.indigo}
      />
      <Chip
        label={translate(`GAV: ${formatSek(profile.avgCost)}`, `Cost basis: ${formatSek(profile.avgCost)}`)}
        sx={gavChipColor}
      />
      {gainPercent != null && (
        <Chip
          label={translate(
            `Total avkastning: ${formatPercent(gainPercent)}`,
            `Total return: ${formatPercent(gainPercent)}`
          )}
          sx={gainColor}
        />
      )}
      {Number.isFinite(totalReturnWithDividends) && (
        <Chip
          label={translate(
            `Avkastning inkl utdelning: ${formatSek(totalReturnWithDividends)} (${totalReturnPctWithDividends != null ? formatPercent(totalReturnPctWithDividends) : "–"})`,
            `Return incl dividends: ${formatSek(totalReturnWithDividends)} (${totalReturnPctWithDividends != null ? formatPercent(totalReturnPctWithDividends) : "–"})`
          )}
          sx={totalWithDivColor}
        />
      )}
      {dividendYield != null && (
        <Chip
          label={translate(
            `Direktavkastning: ${formatPercent(dividendYield)}`,
            `Dividend yield: ${formatPercent(dividendYield)}`
          )}
          sx={chipColors.green}
        />
      )}
      {Number.isFinite(dividendsReceivedSafe) && dividendsReceivedSafe > 0 && (
        <Chip
          label={translate(
            `Uthämtad utdelning: ${formatSek(dividendsReceivedSafe)}`,
            `Dividends received: ${formatSek(dividendsReceivedSafe)}`
          )}
          sx={chipColors.greenStrong}
        />
      )}
    </Stack>
  );
}
