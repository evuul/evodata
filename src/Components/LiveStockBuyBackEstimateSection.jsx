'use client';

// Forecast and capital allocation section for the live buyback dashboard.

import { Box, Stack, Typography } from "@mui/material";

export default function LiveStockBuyBackEstimateSection({
  translate,
  FORECAST_BUYBACK_LABEL,
  FORECAST_DIVIDEND_LABEL,
  FORECAST_RETAINED_LABEL,
  FORECAST_CAPITAL_UPDATE_DATE,
  hasFullYear2025Reported,
  profit2025EurM,
  estimateBuybackEur,
  estimateBuybackSek,
  estimateDividendEur,
  estimateDividendSek,
  estimateRetainedSek,
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
      <Stack spacing={{ xs: 1.4, md: 2 }} alignItems="stretch">
        <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.8)", letterSpacing: 1.2 }}>
          {translate("EST / Prognos 2026 (baserat på 2025)", "EST / Forecast 2026 (based on 2025)")}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "rgba(191,219,254,0.88)",
            background: "rgba(30,41,59,0.45)",
            border: "1px solid rgba(96,165,250,0.25)",
            borderRadius: "12px",
            px: 1.5,
            py: 1.1,
          }}
        >
          {translate(
            `Uppdaterat efter styrelsens besked ${FORECAST_CAPITAL_UPDATE_DATE}: ingen utdelning föreslås för 2025. Forecasten antar ${FORECAST_BUYBACK_LABEL} återköp, ${FORECAST_DIVIDEND_LABEL} utdelning och ${FORECAST_RETAINED_LABEL} kvar i kassan tills nytt mandat kommuniceras.`,
            `Updated after the Board's ${FORECAST_CAPITAL_UPDATE_DATE} announcement: no dividend is proposed for 2025. The forecast assumes ${FORECAST_BUYBACK_LABEL} buybacks, ${FORECAST_DIVIDEND_LABEL} dividends, and ${FORECAST_RETAINED_LABEL} retained cash until a new mandate is communicated.`
          )}
        </Typography>

        <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 1.6, md: 2.2 }} alignItems="stretch" flexWrap="wrap">
          <Box
            sx={{
              flex: { xs: "0 0 auto", md: "1 1 260px" },
              background: "linear-gradient(135deg, rgba(56,189,248,0.18), rgba(15,23,42,0.6))",
              border: "1px solid rgba(56,189,248,0.35)",
              borderRadius: "14px",
              p: { xs: 1.6, md: 2 },
            }}
          >
            <Typography variant="subtitle2" sx={{ color: "rgba(226,232,240,0.85)", fontWeight: 700 }}>
              {hasFullYear2025Reported
                ? translate("Rapporterad helårsvinst 2025", "Reported full-year profit 2025")
                : translate("Antagen vinst 2025", "Assumed profit 2025")}
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: { xs: "1.05rem", md: "1.18rem" }, color: "#f8fafc" }}>
              {Number.isFinite(profit2025EurM)
                ? translate(`${profit2025EurM.toFixed(1)} M€`, `${profit2025EurM.toFixed(1)} M€`)
                : translate("Saknar 2025‑data", "Missing 2025 data")}
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
              {translate(
                `Antagande: ${FORECAST_BUYBACK_LABEL} återköp / ${FORECAST_DIVIDEND_LABEL} utdelning / ${FORECAST_RETAINED_LABEL} kvar`,
                `Assumption: ${FORECAST_BUYBACK_LABEL} buybacks / ${FORECAST_DIVIDEND_LABEL} dividends / ${FORECAST_RETAINED_LABEL} retained`
              )}
            </Typography>
          </Box>

          <Box
            sx={{
              flex: { xs: "0 0 auto", md: "1 1 260px" },
              background: "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(15,23,42,0.6))",
              border: "1px solid rgba(16,185,129,0.35)",
              borderRadius: "14px",
              p: { xs: 1.6, md: 2 },
            }}
          >
            <Typography variant="subtitle2" sx={{ color: "rgba(226,232,240,0.85)", fontWeight: 700 }}>
              {translate(`Återköpsbudget (${FORECAST_BUYBACK_LABEL})`, `Buyback budget (${FORECAST_BUYBACK_LABEL})`)}
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: { xs: "1.05rem", md: "1.18rem" }, color: "#f8fafc" }}>
              {Number.isFinite(estimateBuybackEur) ? `${fmtEuroMillions(estimateBuybackEur)}` : "–"}
            </Typography>
            <Typography sx={{ color: "rgba(226,232,240,0.75)" }}>
              {Number.isFinite(estimateBuybackSek) ? `${fmtCurrency(estimateBuybackSek)}` : "–"}
            </Typography>
          </Box>

          <Box
            sx={{
              flex: { xs: "0 0 auto", md: "1 1 260px" },
              background: "linear-gradient(135deg, rgba(168,85,247,0.18), rgba(15,23,42,0.6))",
              border: "1px solid rgba(168,85,247,0.35)",
              borderRadius: "14px",
              p: { xs: 1.6, md: 2 },
            }}
          >
            <Typography variant="subtitle2" sx={{ color: "rgba(226,232,240,0.85)", fontWeight: 700 }}>
              {translate(`Utdelningspott (${FORECAST_DIVIDEND_LABEL})`, `Dividend pool (${FORECAST_DIVIDEND_LABEL})`)}
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: { xs: "1.05rem", md: "1.18rem" }, color: "#f8fafc" }}>
              {Number.isFinite(estimateDividendEur) ? `${fmtEuroMillions(estimateDividendEur)}` : "–"}
            </Typography>
            <Typography sx={{ color: "rgba(226,232,240,0.75)" }}>
              {Number.isFinite(estimateDividendSek) ? `${fmtCurrency(estimateDividendSek)}` : "–"}
            </Typography>
            <Typography variant="body2" sx={{ color: "#cbd5f5", fontWeight: 600 }}>
              {Number.isFinite(estimateRetainedSek)
                ? translate(
                    `${fmtCurrency(estimateRetainedSek)} stannar i balansräkningen`,
                    `${fmtCurrency(estimateRetainedSek)} stays on the balance sheet`
                  )
                : translate("Behöver vinst och FX.", "Needs profit and FX.")}
            </Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 1.6, md: 2.2 }} alignItems="stretch" flexWrap="wrap">
          <Box
            sx={{
              flex: { xs: "0 0 auto", md: "1 1 260px" },
              background: "linear-gradient(135deg, rgba(56,189,248,0.14), rgba(15,23,42,0.6))",
              border: "1px solid rgba(56,189,248,0.35)",
              borderRadius: "14px",
              p: { xs: 1.6, md: 2 },
            }}
          >
            <Typography variant="subtitle2" sx={{ color: "rgba(226,232,240,0.85)", fontWeight: 700 }}>
              {translate("Kapacitet vid kurs", "Capacity at price")}
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: { xs: "1.05rem", md: "1.18rem" }, color: "#f8fafc" }}>
              {Number.isFinite(estimateSharesAffordable) && Number.isFinite(currentSharePrice)
                ? translate(
                    `≈ ${fmtNum(estimateSharesAffordable)} aktier vid ${fmtCurrency(currentSharePrice)}`,
                    `≈ ${fmtNum(estimateSharesAffordable)} shares at ${fmtCurrency(currentSharePrice)}`
                  )
                : translate("Ingen livekurs tillgänglig.", "No live price available.")}
            </Typography>
            <Typography sx={{ fontWeight: 700, color: "#f8fafc", fontSize: { xs: "1.05rem", md: "1.18rem" } }}>
              {Number.isFinite(estimateSharePercent)
                ? translate(
                    `${fmtPercent(estimateSharePercent)} av aktiestocken`,
                    `${fmtPercent(estimateSharePercent)} of share base`
                  )
                : translate("Beräknas när kurs finns.", "Calculated when price is available.")}
            </Typography>
          </Box>

          <Box
            sx={{
              flex: { xs: "0 0 auto", md: "1 1 260px" },
              background: "linear-gradient(135deg, rgba(245,158,11,0.18), rgba(15,23,42,0.6))",
              border: "1px solid rgba(245,158,11,0.35)",
              borderRadius: "14px",
              p: { xs: 1.6, md: 2 },
            }}
          >
            <Typography variant="subtitle2" sx={{ color: "rgba(226,232,240,0.85)", fontWeight: 700 }}>
              {translate("EPS‑effekt (estimat)", "EPS impact (estimate)")}
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: { xs: "1.05rem", md: "1.18rem" }, color: "#f8fafc" }}>
              {Number.isFinite(eps2025) && Number.isFinite(estimateProFormaEps)
                ? translate(`${eps2025.toFixed(2)} € → ${estimateProFormaEps.toFixed(2)} €`, `${eps2025.toFixed(2)} € → ${estimateProFormaEps.toFixed(2)} €`)
                : translate("Behöver 2025‑EPS.", "Needs 2025 EPS.")}
            </Typography>
            <Typography sx={{ fontWeight: 700, color: "#f8fafc", fontSize: { xs: "1.05rem", md: "1.18rem" } }}>
              {Number.isFinite(estimateEpsLift)
                ? translate(`≈ ${estimateEpsLift >= 0 ? '+' : ''}${estimateEpsLift.toFixed(1)}% EPS`, `≈ ${estimateEpsLift >= 0 ? '+' : ''}${estimateEpsLift.toFixed(1)}% EPS`)
                : translate("Beräknas när data finns.", "Calculated when data is available.")}
            </Typography>
            <Typography variant="body2" sx={{ color: "#cbd5f5", fontWeight: 600 }}>
              {translate(
                `Antag avslut till årsskiftet (${yearEndLabel.year}) • ${fmtNum(yearEndLabel.daysLeft)} dagar kvar`,
                `Assumes completion by year‑end (${yearEndLabel.year}) • ${fmtNum(yearEndLabel.daysLeft)} days left`
              )}
            </Typography>
          </Box>

          <Box
            sx={{
              flex: { xs: "0 0 auto", md: "1 1 260px" },
              background: "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(15,23,42,0.6))",
              border: "1px solid rgba(59,130,246,0.35)",
              borderRadius: "14px",
              p: { xs: 1.6, md: 2 },
            }}
          >
            <Typography variant="subtitle2" sx={{ color: "rgba(226,232,240,0.85)", fontWeight: 700 }}>
              {translate("Utdelning per aktie (est)", "Dividend per share (est)")}
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: { xs: "1.05rem", md: "1.18rem" }, color: "#f8fafc" }}>
              {Number.isFinite(dividendPerShareEur)
                ? translate(`${dividendPerShareEur.toFixed(2)} €`, `${dividendPerShareEur.toFixed(2)} €`)
                : translate("Saknar data", "Missing data")}
            </Typography>
            <Typography sx={{ color: "rgba(226,232,240,0.75)" }}>
              {Number.isFinite(dividendPerShareSek) ? `${dividendPerShareSek.toFixed(2)} SEK` : "–"}
            </Typography>
            <Typography variant="body2" sx={{ color: "#cbd5f5", fontWeight: 600 }}>
              {Number.isFinite(sharesAfterBuyback)
                ? translate(`Kvarvarande aktier: ${fmtNum(sharesAfterBuyback)}`, `Shares after buyback: ${fmtNum(sharesAfterBuyback)}`)
                : translate("Beräknas när kurs finns.", "Calculated when price is available.")}
            </Typography>
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
}
