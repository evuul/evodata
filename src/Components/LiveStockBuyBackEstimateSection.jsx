'use client';

// Compact forecast brief for the live buyback dashboard.

import { Box, Chip, Stack, Typography } from "@mui/material";

const MetricCard = ({ accent, title, value, note, badge }) => (
  <Box
    sx={{
      flex: { xs: "1 1 100%", md: "1 1 260px" },
      background: accent,
      borderRadius: "14px",
      border: "1px solid rgba(148,163,184,0.18)",
      p: { xs: 1.6, md: 2 },
      minWidth: 0,
    }}
  >
    <Typography variant="subtitle2" sx={{ color: "rgba(226,232,240,0.82)", fontWeight: 700 }}>
      {title}
    </Typography>
    <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.05rem", md: "1.2rem" }, color: "#f8fafc", mt: 0.4 }}>
      {value}
    </Typography>
    {badge && (
      <Chip
        label={badge}
        size="small"
        sx={{
          mt: 1,
          backgroundColor: "rgba(15,23,42,0.68)",
          color: "#cbd5e1",
          border: "1px solid rgba(148,163,184,0.24)",
          fontWeight: 600,
        }}
      />
    )}
    {note && (
      <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.74)", mt: 1, lineHeight: 1.55 }}>
        {note}
      </Typography>
    )}
  </Box>
);

export default function LiveStockBuyBackEstimateSection({
  translate,
  FORECAST_CAPITAL_UPDATE_DATE,
  estimateBuybackEur,
  estimateBuybackSek,
  estimateSharesAffordable,
  currentSharePrice,
  estimateSharePercent,
  eps2025,
  estimateProFormaEps,
  estimateEpsLift,
  yearEndLabel,
  dividendPerShareEur,
  dividendPerShareSek,
  sharesAfterBuyback,
  fmtNum,
  fmtPercent,
  fmtCurrency,
  fmtEuroMillions,
}) {
  return (
    <Box
      sx={{
        mt: 2,
        background: "rgba(15,23,42,0.55)",
        border: "1px solid rgba(148,163,184,0.18)",
        borderRadius: { xs: "14px", md: "16px" },
        mx: { xs: -3, sm: -3, md: -4 },
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2, md: 2.5 },
      }}
    >
      <Stack spacing={{ xs: 1.2, md: 1.6 }}>
        <Box>
          <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.8)", letterSpacing: 1.2 }}>
            {translate("EST / Forecast 2026", "EST / Forecast 2026")}
          </Typography>
          <Typography sx={{ color: "rgba(226,232,240,0.8)", mt: 0.6, lineHeight: 1.6, maxWidth: 860 }}>
            {translate(
              `Uppdaterat efter styrelsens besked ${FORECAST_CAPITAL_UPDATE_DATE}: rutan räknar på hela nya återköpsmandatet och vad det betyder på nuvarande kurs.`,
              `Updated after the Board's ${FORECAST_CAPITAL_UPDATE_DATE} announcement: this view uses the full new buyback mandate and shows what it means at the current price.`
            )}
          </Typography>
        </Box>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1.4} alignItems="stretch">
          <MetricCard
            accent="linear-gradient(135deg, rgba(56,189,248,0.16), rgba(15,23,42,0.58))"
            title={translate("Återköpsbudget", "Buyback budget")}
            value={Number.isFinite(estimateBuybackEur) ? `${fmtEuroMillions(estimateBuybackEur)}` : "–"}
            badge={Number.isFinite(estimateBuybackSek) ? `${fmtCurrency(estimateBuybackSek)} SEK` : null}
            note={translate(
              "Hela nya mandatet, inte den gamla vinstmodellen.",
              "The full new mandate, not the old profit model."
            )}
          />

          <MetricCard
            accent="linear-gradient(135deg, rgba(16,185,129,0.16), rgba(15,23,42,0.58))"
            title={translate("Kapacitet vid kurs", "Capacity at price")}
            value={
              Number.isFinite(estimateSharesAffordable) && Number.isFinite(currentSharePrice)
                ? translate(
                    `≈ ${fmtNum(estimateSharesAffordable)} aktier`,
                    `≈ ${fmtNum(estimateSharesAffordable)} shares`
                  )
                : translate("Ingen livekurs", "No live price")
            }
            badge={
              Number.isFinite(estimateSharePercent)
                ? translate(`${fmtPercent(estimateSharePercent)} av aktiestocken`, `${fmtPercent(estimateSharePercent)} of share base`)
                : null
            }
            note={translate(
              Number.isFinite(currentSharePrice)
                ? `Vid ${fmtCurrency(currentSharePrice)} per aktie.`
                : "Behöver aktuell kurs för att räkna kapacitet.",
              Number.isFinite(currentSharePrice)
                ? `At ${fmtCurrency(currentSharePrice)} per share.`
                : "Needs a current share price to calculate capacity."
            )}
          />

          <MetricCard
            accent="linear-gradient(135deg, rgba(245,158,11,0.16), rgba(15,23,42,0.58))"
            title={translate("EPS-effekt", "EPS impact")}
            value={
              Number.isFinite(eps2025) && Number.isFinite(estimateProFormaEps)
                ? translate(`${eps2025.toFixed(2)} € → ${estimateProFormaEps.toFixed(2)} €`, `${eps2025.toFixed(2)} € → ${estimateProFormaEps.toFixed(2)} €`)
                : translate("Saknar EPS-data", "Missing EPS data")
            }
            badge={
              Number.isFinite(estimateEpsLift)
                ? translate(`≈ ${estimateEpsLift >= 0 ? "+" : ""}${estimateEpsLift.toFixed(1)}%`, `≈ ${estimateEpsLift >= 0 ? "+" : ""}${estimateEpsLift.toFixed(1)}%`)
                : null
            }
            note={translate(
              Number.isFinite(sharesAfterBuyback)
                ? `Kvarvarande aktier efter återköp: ${fmtNum(sharesAfterBuyback)}.`
                : `Antag avslut till årsskiftet ${yearEndLabel.year}.`,
              Number.isFinite(sharesAfterBuyback)
                ? `Shares after buyback: ${fmtNum(sharesAfterBuyback)}.`
                : `Assumes completion by year-end ${yearEndLabel.year}.`
            )}
          />
        </Stack>

        <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.72)", lineHeight: 1.6 }}>
          {translate(
            "Det här visar full återköpspotential om hela mandatet används på nuvarande kurs. Makuleringseffekten syns i EPS-raden.",
            "This shows the full buyback potential if the entire mandate is used at the current price. The cancellation effect is shown in the EPS row."
          )}
        </Typography>
      </Stack>
    </Box>
  );
}
