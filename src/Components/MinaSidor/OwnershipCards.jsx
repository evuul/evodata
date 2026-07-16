"use client";

// Shows the personal ownership effect of the current buyback program.

import { useState } from "react";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import { formatOwnershipPercent, formatPercent, formatSek } from "./utils";
import { cardBase, equalHeightCard, ownershipChipColors, statusColors, text } from "./styles";
import { buildOwnershipImpact } from "@/lib/portfolioDashboard";

export default function OwnershipCards({
  translate,
  buybackSummary,
  buybackMandateSummary,
  profileShares,
  ownershipView,
  onChangeView,
}) {
  const [scenarioView, setScenarioView] = useState("actual");
  const selectedSummary =
    scenarioView === "mandate" ? buybackMandateSummary : buybackSummary;
  const isMandateView = scenarioView === "mandate";
  const fallbackOwnershipImpact = buildOwnershipImpact({
    shares: profileShares,
    ownershipLiftPct: selectedSummary?.ownershipLiftPct,
  });
  const equivalentExtraShares = Number.isFinite(selectedSummary?.equivalentExtraShares)
    ? selectedSummary.equivalentExtraShares
    : fallbackOwnershipImpact.equivalentExtraShares;
  const personalBuybackValueSek = Number.isFinite(selectedSummary?.personalBuybackValueSek)
    ? selectedSummary.personalBuybackValueSek
    : null;
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
              ? translate("Nuvarande program: hela mandatet", "Current program: full mandate")
              : translate("Nuvarande program: genomfört", "Current program: completed")}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.8 }} flexWrap="wrap">
            <Chip
              size="small"
              clickable
              onClick={() => setScenarioView("actual")}
              label={translate("Genomfört", "Completed")}
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
                  "Genomfört plus återstående mandat. Framtida återköp beräknas till dagens kurs.",
                  "Completed execution plus the remaining mandate. Future buybacks use today's price."
                )
              : translate(
                  "Faktiska återköp sedan 19 maj 2026, justerat efter köpdatum för dina nuvarande aktieposter.",
                  "Actual buybacks since May 19, 2026, adjusted for the purchase dates of your current lots."
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
                ? "Visar möjlig effekt på ditt nuvarande innehav om mandatet används fullt ut."
                : "Visar endast den del av programmet som berör dina aktier.",
              isMandateView
                ? "Shows the possible effect on your current holding if the mandate is fully used."
                : "Shows only the part of the program that affects your shares."
            )}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.4 }} flexWrap="wrap">
            <Chip
              size="small"
              clickable
              onClick={() => onChangeView("before")}
              label={translate(
                isMandateView ? "Före program" : "Före effekt",
                isMandateView ? "Pre-program" : "Before impact"
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
                isMandateView ? "Efter program" : "Nu",
                isMandateView ? "Post-program" : "Now"
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
              isMandateView ? "Möjligt ägarlyft från hela programmet" : "Ditt ägarlyft hittills",
              isMandateView ? "Possible ownership lift from full program" : "Your ownership lift so far"
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
              label={translate(isMandateView ? "Före program" : "Före effekt", isMandateView ? "Pre-program" : "Before impact")}
              sx={{ backgroundColor: ownershipChipColors.pre.inactiveBg, color: ownershipChipColors.pre.color }}
            />
            <Chip
              size="small"
              label={translate(isMandateView ? "Efter program" : "Nu", isMandateView ? "Post-program" : "Now")}
              sx={{ backgroundColor: ownershipChipColors.post.inactiveBg, color: ownershipChipColors.post.color }}
            />
          </Stack>
        </Paper>
      </Box>
      <Box sx={{ display: "flex" }}>
        <Paper sx={cardSx}>
          <Typography sx={{ color: text.subtle }}>
            {translate(
              "Motsvarande extra aktier",
              "Equivalent extra shares"
            )}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#86efac" }}>
            {Number.isFinite(equivalentExtraShares)
              ? `+${equivalentExtraShares.toLocaleString("sv-SE", { maximumFractionDigits: 1 })}`
              : "–"}
          </Typography>
          <Typography sx={{ color: text.faint }}>
            {translate(
              "Så många extra aktier motsvarar ökningen av din relativa ägarandel, utan att du köper fler.",
              "The equivalent number of extra shares represented by your higher relative ownership, without buying more."
            )}
          </Typography>
        </Paper>
      </Box>
      <Box sx={{ display: "flex" }}>
        <Paper sx={cardSx}>
          <Typography sx={{ color: text.subtle }}>
            {translate(
              isMandateView ? "Möjlig andel av hela programmet" : "Din andel av genomförda återköp",
              isMandateView ? "Possible share of the full program" : "Your share of completed buybacks"
            )}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#86efac" }}>
            {personalBuybackValueSek != null ? formatSek(personalBuybackValueSek) : "–"}
          </Typography>
          <Typography sx={{ color: text.faint }}>
            {isMandateView
              ? translate(
                  "Genomförd andel plus uppskattad andel av återstående mandat. Det är inte en utbetalning.",
                  "Completed share plus an estimated share of the remaining mandate. This is not a payout."
                )
              : selectedSummary?.traceableShares > 0
                ? translate(
                    "Din proportionella andel av kapitalet Evolution använt efter respektive köpdatum. Det är inte en utbetalning.",
                    "Your proportional share of the capital Evolution has used after each purchase date. This is not a payout."
                  )
                : translate(
                    "Lägg in köpdatum för att beräkna den personliga effekten.",
                    "Add purchase dates to calculate the personal impact."
                  )}
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
