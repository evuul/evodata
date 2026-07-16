"use client";

// Summarizes the user's ownership change from completed buybacks.

import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import { formatOwnershipPercent, formatPercent, formatSek } from "./utils";
import { cardBase, ownershipChipColors, statusColors, text } from "./styles";

export default function OwnershipStoryCard({
  translate,
  buybackSummary,
  ownershipView,
  onChangeView,
}) {
  return (
    <Paper sx={{ p: 2.5, ...cardBase }}>
      <Typography sx={{ color: text.subtle, textTransform: "uppercase", letterSpacing: 1.1, fontSize: "0.75rem" }}>
        {translate("Ägarandel & återköp", "Equity story")}
      </Typography>
      <Stack spacing={1.5} sx={{ mt: 1 }}>
        <Box>
          <Typography sx={{ color: text.subtle }}>
            {ownershipView === "before"
              ? translate("Din ägarandel (före återköp)", "Your ownership (pre-buyback)")
              : translate("Din ägarandel (efter återköp)", "Your ownership (post-buyback)")}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: text.heading }}>
            {buybackSummary
              ? formatOwnershipPercent(
                  (ownershipView === "before" ? buybackSummary.ownershipBefore : buybackSummary.ownershipAfter) * 100
                )
              : "–"}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
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
        </Box>
        <Box>
          <Typography sx={{ color: text.subtle }}>{translate("Ägarlyft från återköp", "Lift from buybacks")}</Typography>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color:
                buybackSummary?.ownershipLiftPct != null && buybackSummary.ownershipLiftPct >= 0
                  ? statusColors.positive
                  : statusColors.negative,
            }}
          >
            {buybackSummary?.ownershipLiftPct != null ? formatPercent(buybackSummary.ownershipLiftPct) : "–"}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ color: text.subtle }}>{translate("Illustrativ andel av återköpsbelopp", "Illustrative share of buyback spend")}</Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: text.heading }}>
            {buybackSummary ? formatSek(buybackSummary.illustrativeBuybackAllocation) : "–"}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ color: text.subtle }}>{translate("Mottagna utdelningar", "Dividends received")}</Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: text.heading }}>
            {buybackSummary ? formatSek(buybackSummary.dividendIncome) : "–"}
          </Typography>
          <Typography sx={{ color: text.faint }}>
            {buybackSummary?.dividendIncomePct != null
              ? translate(
                  `${formatPercent(buybackSummary.dividendIncomePct)} av nuvärdet`,
                  `${formatPercent(buybackSummary.dividendIncomePct)} of current value`
                )
              : translate("Faktiskt registrerade utdelningar", "Dividends actually recorded")}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}
