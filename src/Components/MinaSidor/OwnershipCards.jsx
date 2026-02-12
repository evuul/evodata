"use client";

import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import { formatOwnershipPercent, formatPercent, formatSek } from "./utils";
import { cardBase, equalHeightCard, ownershipChipColors, statusColors, text } from "./styles";

export default function OwnershipCards({ translate, buybackSummary, ownershipView, onChangeView }) {
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
        <Paper sx={cardSx}>
          <Typography sx={{ color: text.subtle }}>
            {ownershipView === "before"
              ? translate("Din ägarandel (före återköp)", "Your ownership (pre-buyback)")
              : translate("Din ägarandel (efter återköp)", "Your ownership (post-buyback)")}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: text.heading }}>
            {buybackSummary
              ? formatOwnershipPercent(
                  (ownershipView === "before" ? buybackSummary.ownershipBefore : buybackSummary.ownershipAfter) * 100
                )
              : "–"}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.4 }} flexWrap="wrap">
            <Chip
              size="small"
              clickable
              onClick={() => onChangeView("before")}
              label={translate("Före återköp", "Pre-buyback")}
              sx={{
                backgroundColor:
                  ownershipView === "before"
                    ? ownershipChipColors.pre.activeBg
                    : ownershipChipColors.pre.inactiveBg,
                color: ownershipChipColors.pre.color,
                border: ownershipView === "before" ? ownershipChipColors.pre.activeBorder : "none",
              }}
            />
            <Chip
              size="small"
              clickable
              onClick={() => onChangeView("after")}
              label={translate("Efter återköp", "Post-buyback")}
              sx={{
                backgroundColor:
                  ownershipView === "after"
                    ? ownershipChipColors.post.activeBg
                    : ownershipChipColors.post.inactiveBg,
                color: ownershipChipColors.post.color,
                border: ownershipView === "after" ? ownershipChipColors.post.activeBorder : "none",
              }}
            />
          </Stack>
        </Paper>
      </Box>
      <Box sx={{ display: "flex" }}>
        <Paper sx={cardSx}>
          <Typography sx={{ color: text.subtle }}>
            {translate("Ägarlyft från återköp", "Ownership lift from buybacks")}
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              color:
                buybackSummary?.ownershipLiftPct != null && buybackSummary.ownershipLiftPct >= 0
                  ? statusColors.positive
                  : statusColors.negative,
            }}
          >
            {buybackSummary?.ownershipLiftPct != null ? formatPercent(buybackSummary.ownershipLiftPct) : "–"}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.4 }} flexWrap="wrap">
            <Chip
              size="small"
              label={translate("Före återköp", "Pre-buyback")}
              sx={{ backgroundColor: ownershipChipColors.pre.inactiveBg, color: ownershipChipColors.pre.color }}
            />
            <Chip
              size="small"
              label={translate("Efter återköp", "Post-buyback")}
              sx={{ backgroundColor: ownershipChipColors.post.inactiveBg, color: ownershipChipColors.post.color }}
            />
          </Stack>
        </Paper>
      </Box>
      <Box sx={{ display: "flex" }}>
        <Paper sx={cardSx}>
          <Typography sx={{ color: text.subtle }}>{translate("Återköpsvärde till dig", "Buyback value to you")}</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: text.heading }}>
            {buybackSummary ? formatSek(buybackSummary.buybackBenefit) : "–"}
          </Typography>
          <Typography sx={{ color: text.faint }}>
            {translate("Andel av återköp 2025", "Your share of 2025 buybacks")}
          </Typography>
        </Paper>
      </Box>
      <Box sx={{ display: "flex" }}>
        <Paper sx={cardSx}>
          <Typography sx={{ color: text.subtle }}>{translate("Total aktieägaravkastning", "Total shareholder return")}</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: text.heading }}>
            {buybackSummary ? formatSek(buybackSummary.totalShareholderReturn) : "–"}
          </Typography>
          <Typography sx={{ color: text.faint }}>
            {buybackSummary?.totalShareholderReturnPct != null
              ? translate(
                  `${formatPercent(buybackSummary.totalShareholderReturnPct)} av nuvärdet`,
                  `${formatPercent(buybackSummary.totalShareholderReturnPct)} of current value`
                )
              : translate("Utdelning + återköp", "Dividend + buybacks")}
          </Typography>
          {buybackSummary?.dividendBenefit != null ? (
            <Typography sx={{ color: "rgba(226,232,240,0.55)", fontSize: "0.82rem" }}>
              {translate(
                `Utdelning (mottagen): ${formatSek(buybackSummary.dividendBenefit)} + återköp: ${formatSek(buybackSummary.buybackBenefit)}`,
                `Dividends (received): ${formatSek(buybackSummary.dividendBenefit)} + buybacks: ${formatSek(buybackSummary.buybackBenefit)}`
              )}
            </Typography>
          ) : null}
          {buybackSummary?.dividendExDateFrom && buybackSummary?.dividendExDateTo ? (
            <Typography sx={{ color: "rgba(148,163,184,0.7)", fontSize: "0.78rem" }}>
              {translate(
                `X-datum inkluderade: ${buybackSummary.dividendExDateFrom} → ${buybackSummary.dividendExDateTo} (${buybackSummary.dividendCountedExDates ?? 0} st)`,
                `Ex-dates included: ${buybackSummary.dividendExDateFrom} to ${buybackSummary.dividendExDateTo} (${buybackSummary.dividendCountedExDates ?? 0})`
              )}
            </Typography>
          ) : null}
        </Paper>
      </Box>
    </Box>
  );
}
