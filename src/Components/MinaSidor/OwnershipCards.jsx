"use client";

import { useMemo, useState } from "react";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import { formatOwnershipPercent, formatPercent, formatSek } from "./utils";
import { cardBase, equalHeightCard, ownershipChipColors, statusColors, text } from "./styles";
import { computeFullBuybackMandateSummary } from "@/lib/buybackOwnership";

export default function OwnershipCards({
  translate,
  buybackSummary,
  buybackMandateSummary,
  profileShares,
  currentPrice,
  fxRate,
  sharesData,
  dividendsReceivedSafe,
  totalValue,
  ownershipView,
  onChangeView,
}) {
  const [scenarioView, setScenarioView] = useState("actual");
  const computedMandateSummary = useMemo(
    () =>
      computeFullBuybackMandateSummary({
        profileShares,
        currentPriceSEK: currentPrice,
        fxRate,
        sharesData,
        dividendsReceived: dividendsReceivedSafe,
        totalValue,
      }),
    [currentPrice, dividendsReceivedSafe, fxRate, profileShares, sharesData, totalValue]
  );
  const selectedSummary =
    scenarioView === "mandate" ? buybackMandateSummary ?? computedMandateSummary : buybackSummary;
  const isMandateView = scenarioView === "mandate";
  const programBuybackPct = selectedSummary?.buybackYieldPct != null ? formatPercent(selectedSummary.buybackYieldPct) : "–";
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
            {isMandateView
              ? translate("Scenario: hela återköpsprogrammet", "Scenario: full buyback program")
              : translate("Scenario: riktiga återköp", "Scenario: actual buybacks")}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.8 }} flexWrap="wrap">
            <Chip
              size="small"
              clickable
              onClick={() => setScenarioView("actual")}
              label={translate("Riktiga återköp", "Actual buybacks")}
              sx={{
                backgroundColor:
                  scenarioView === "actual"
                    ? ownershipChipColors.pre.activeBg
                    : ownershipChipColors.pre.inactiveBg,
                color: ownershipChipColors.pre.color,
                border: scenarioView === "actual" ? ownershipChipColors.pre.activeBorder : "none",
              }}
            />
            <Chip
              size="small"
              clickable
              onClick={() => setScenarioView("mandate")}
              label={translate("Hela 2 md €-programmet", "Full EUR 2bn program")}
              sx={{
                backgroundColor:
                  scenarioView === "mandate"
                    ? ownershipChipColors.post.activeBg
                    : ownershipChipColors.post.inactiveBg,
                color: ownershipChipColors.post.color,
                border: scenarioView === "mandate" ? ownershipChipColors.post.activeBorder : "none",
              }}
            />
          </Stack>
          <Typography sx={{ color: text.faint, mt: 1 }}>
            {isMandateView
              ? translate(
                  "Antagande: hela programmet återköps på nuvarande kurs.",
                  "Assumption: the full program is bought back at the current price."
                )
              : translate(
                  "Antagande: faktiska historiska återköp som redan genomförts.",
                  "Assumption: actual historical buybacks already completed."
                )}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: text.heading }}>
            {selectedSummary
              ? formatOwnershipPercent(
                  Number.isFinite(ownershipView === "before" ? selectedSummary.ownershipBefore : selectedSummary.ownershipAfter)
                    ? (ownershipView === "before" ? selectedSummary.ownershipBefore : selectedSummary.ownershipAfter) * 100
                    : NaN
                )
              : "–"}
          </Typography>
          <Typography sx={{ color: text.faint, fontSize: "0.82rem" }}>
            {translate(
              isMandateView
                ? `Programmet återköper cirka ${programBuybackPct} av nuvarande aktiestock.`
                : "Visar faktiska historiska återköp.",
              isMandateView
                ? `The program repurchases about ${programBuybackPct} of the current share base.`
                : "Shows actual historical buybacks."
            )}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.4 }} flexWrap="wrap">
            <Chip
              size="small"
              clickable
              onClick={() => onChangeView("before")}
              label={translate(
                isMandateView ? "Före program" : "Före återköp",
                isMandateView ? "Pre-program" : "Pre-buyback"
              )}
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
              label={translate(
                isMandateView ? "Efter program" : "Efter återköp",
                isMandateView ? "Post-program" : "Post-buyback"
              )}
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
            {translate(
              isMandateView ? "Ägarlyft från hela programmet" : "Ägarlyft från återköp",
              isMandateView ? "Ownership lift from full program" : "Ownership lift from buybacks"
            )}
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              color:
                selectedSummary?.ownershipLiftPct != null && selectedSummary.ownershipLiftPct >= 0
                  ? statusColors.positive
                  : statusColors.negative,
            }}
          >
            {selectedSummary?.ownershipLiftPct != null ? formatPercent(selectedSummary.ownershipLiftPct) : "–"}
          </Typography>
          {isMandateView ? (
            <Typography sx={{ color: text.faint, fontSize: "0.82rem" }}>
              {selectedSummary?.hasHoldings
                ? translate(
                    "Din ägarandel ökar när samma antal aktier delas på färre utestående aktier.",
                    "Your ownership rises because the same number of shares is spread over fewer outstanding shares."
                  )
                : translate(
                    "Lägg in dina innehav för att räkna din personliga ägarökning.",
                    "Add your holdings to calculate your personal ownership lift."
                  )}
            </Typography>
          ) : null}
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
          <Typography sx={{ color: text.subtle }}>
            {translate(
              isMandateView ? "Värde av hela programmet till dig" : "Återköpsvärde till dig",
              isMandateView ? "Your share of the full program" : "Buyback value to you"
            )}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: text.heading }}>
            {selectedSummary && selectedSummary.buybackBenefit != null ? formatSek(selectedSummary.buybackBenefit) : "–"}
          </Typography>
          <Typography sx={{ color: text.faint }}>
            {translate(
              isMandateView ? "Andel av hela 2 md €-programmet" : "Andel av genomförda återköp",
              isMandateView ? "Your share of the full EUR 2bn program" : "Your share of completed buybacks"
            )}
          </Typography>
        </Paper>
      </Box>
      <Box sx={{ display: "flex" }}>
        <Paper sx={cardSx}>
          <Typography sx={{ color: text.subtle }}>{translate("Total aktieägaravkastning", "Total shareholder return")}</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: text.heading }}>
            {selectedSummary && selectedSummary.totalShareholderReturn != null ? formatSek(selectedSummary.totalShareholderReturn) : "–"}
          </Typography>
          <Typography sx={{ color: text.faint }}>
            {selectedSummary?.totalShareholderReturnPct != null
              ? translate(
                  `${formatPercent(selectedSummary.totalShareholderReturnPct)} av nuvärdet`,
                  `${formatPercent(selectedSummary.totalShareholderReturnPct)} of current value`
                )
              : translate("Utdelning + återköp", "Dividend + buybacks")}
          </Typography>
          {selectedSummary?.dividendBenefit != null ? (
            <Typography sx={{ color: "rgba(226,232,240,0.55)", fontSize: "0.82rem" }}>
              {translate(
                `Utdelning (mottagen): ${formatSek(selectedSummary.dividendBenefit)} + återköp: ${formatSek(selectedSummary.buybackBenefit)}`,
                `Dividends (received): ${formatSek(selectedSummary.dividendBenefit)} + buybacks: ${formatSek(selectedSummary.buybackBenefit)}`
              )}
            </Typography>
          ) : null}
          {selectedSummary?.dividendExDateFrom && selectedSummary?.dividendExDateTo ? (
            <Typography sx={{ color: "rgba(148,163,184,0.7)", fontSize: "0.78rem" }}>
              {translate(
                `X-datum inkluderade: ${selectedSummary.dividendExDateFrom} → ${selectedSummary.dividendExDateTo} (${selectedSummary.dividendCountedExDates ?? 0} st)`,
                `Ex-dates included: ${selectedSummary.dividendExDateFrom} to ${selectedSummary.dividendExDateTo} (${selectedSummary.dividendCountedExDates ?? 0})`
              )}
            </Typography>
          ) : null}
        </Paper>
      </Box>
    </Box>
  );
}
