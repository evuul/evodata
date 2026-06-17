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
  buybackCurrentProgramSummary,
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
    scenarioView === "mandate"
      ? buybackMandateSummary ?? computedMandateSummary
      : scenarioView === "current"
        ? buybackCurrentProgramSummary
        : buybackSummary;
  const isMandateView = scenarioView === "mandate";
  const isCurrentProgramView = scenarioView === "current";
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
              : isCurrentProgramView
                ? translate("Scenario: nuvarande program hittills", "Scenario: current program to date")
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
              onClick={() => setScenarioView("current")}
              label={translate("Nuvarande program", "Current program")}
              sx={{
                backgroundColor:
                  scenarioView === "current"
                    ? ownershipChipColors.post.activeBg
                    : ownershipChipColors.post.inactiveBg,
                color: ownershipChipColors.post.color,
                border: scenarioView === "current" ? ownershipChipColors.post.activeBorder : "none",
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
              : isCurrentProgramView
                ? translate(
                    "Antagande: återköpen i nuvarande program makuleras direkt.",
                    "Assumption: buybacks in the current program are cancelled immediately."
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
                : isCurrentProgramView
                  ? `Programmet hittills motsvarar cirka ${programBuybackPct} av nuvarande aktiestock.`
                : "Visar faktiska historiska återköp.",
              isMandateView
                ? `The program repurchases about ${programBuybackPct} of the current share base.`
                : isCurrentProgramView
                  ? `The program to date equals about ${programBuybackPct} of the current share base.`
                : "Shows actual historical buybacks."
            )}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.4 }} flexWrap="wrap">
            <Chip
              size="small"
              clickable
              onClick={() => onChangeView("before")}
              label={translate(
                isMandateView || isCurrentProgramView ? "Före program" : "Före återköp",
                isMandateView || isCurrentProgramView ? "Pre-program" : "Pre-buyback"
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
                isMandateView || isCurrentProgramView ? "Efter program" : "Efter återköp",
                isMandateView || isCurrentProgramView ? "Post-program" : "Post-buyback"
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
              isMandateView
                ? "Ägarlyft från hela programmet"
                : isCurrentProgramView
                  ? "Ägarlyft från nuvarande program"
                  : "Ägarlyft från återköp",
              isMandateView
                ? "Ownership lift from full program"
                : isCurrentProgramView
                  ? "Ownership lift from current program"
                  : "Ownership lift from buybacks"
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
          {isMandateView || isCurrentProgramView ? (
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
              isMandateView
                ? "Värde av hela programmet till dig"
                : isCurrentProgramView
                  ? "Värde av nuvarande program till dig"
                  : "Återköpsvärde till dig",
              isMandateView
                ? "Your share of the full program"
                : isCurrentProgramView
                  ? "Your share of the current program"
                  : "Buyback value to you"
            )}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: text.heading }}>
            {selectedSummary && selectedSummary.buybackBenefit != null ? formatSek(selectedSummary.buybackBenefit) : "–"}
          </Typography>
          <Typography sx={{ color: text.faint }}>
            {translate(
              isMandateView
                ? "Andel av hela 2 md €-programmet"
                : isCurrentProgramView
                  ? "Din andel av genomförda återköp i mandatet"
                  : "Andel av återköp 2025",
              isMandateView
                ? "Your share of the full EUR 2bn program"
                : isCurrentProgramView
                  ? "Your share of completed buybacks in the mandate"
                  : "Your share of 2025 buybacks"
            )}
          </Typography>
          {isCurrentProgramView && selectedSummary?.repurchasedShares ? (
            <Typography sx={{ color: "rgba(148,163,184,0.7)", fontSize: "0.78rem" }}>
              {translate(
                `${formatSek(selectedSummary.buybackSpend)} återköpt sedan ${selectedSummary.startDate}`,
                `${formatSek(selectedSummary.buybackSpend)} repurchased since ${selectedSummary.startDate}`
              )}
            </Typography>
          ) : null}
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
