"use client";

// Shows known dividends, yield metrics and clearly labelled future scenarios.

import { useMemo } from "react";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import PaymentsRounded from "@mui/icons-material/PaymentsRounded";
import { buildLatestDividendProjection } from "./dividendEstimate";
import { cardBase, text } from "./styles";
import { formatPercent, formatSek } from "./utils";

const SmallMetric = ({ label, value, detail }) => (
  <Box>
    <Typography sx={{ color: text.muted, fontSize: "0.78rem", fontWeight: 700 }}>{label}</Typography>
    <Typography sx={{ color: text.heading, fontSize: "1.22rem", fontWeight: 850, mt: 0.25 }}>{value}</Typography>
    {detail ? <Typography sx={{ color: text.muted, fontSize: "0.75rem", mt: 0.2 }}>{detail}</Typography> : null}
  </Box>
);

export default function DividendCenterCard({
  translate,
  shares,
  avgCost,
  currentPrice,
  fxRate,
  dividendsReceived,
  upcomingDividend,
  lastDividend,
}) {
  const lastDps = Number(lastDividend?.dividendPerShare);
  const projection = useMemo(
    () => buildLatestDividendProjection({ profileShares: shares, fxRate }),
    [fxRate, shares]
  );
  const scenarios = projection?.scenarios ?? [];
  const yieldOnCost = avgCost > 0 && lastDps > 0 ? (lastDps / avgCost) * 100 : null;
  const latestDirectYield = currentPrice > 0 && lastDps > 0 ? (lastDps / currentPrice) * 100 : null;
  const noProposal = upcomingDividend?.status === "no_dividend_proposed";

  return (
    <Paper sx={{ ...cardBase, p: { xs: 2.2, md: 2.8 } }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <PaymentsRounded sx={{ color: "#86efac", fontSize: 20 }} />
            <Typography sx={{ color: text.heading, fontWeight: 850 }}>
              {translate("Ditt utdelningscenter", "Your dividend centre")}
            </Typography>
          </Stack>
          <Typography sx={{ color: text.muted, fontSize: "0.83rem", mt: 0.5 }}>
            {translate("Faktiskt mottaget, senaste nivå och transparenta framtidsscenarier.", "Actual receipts, latest level and transparent future scenarios.")}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={noProposal
            ? translate(`Ingen utdelning föreslagen ${upcomingDividend.announcementDate}`, `No dividend proposed ${upcomingDividend.announcementDate}`)
            : translate("Beslutad utdelning", "Declared dividend")}
          sx={{ alignSelf: "flex-start", color: noProposal ? "#fde68a" : "#86efac", backgroundColor: noProposal ? "rgba(245,158,11,0.13)" : "rgba(34,197,94,0.13)", border: `1px solid ${noProposal ? "rgba(245,158,11,0.32)" : "rgba(34,197,94,0.32)"}` }}
        />
      </Stack>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2.2, mt: 2.5 }}>
        <SmallMetric label={translate("Mottaget totalt", "Total received")} value={formatSek(dividendsReceived)} />
        <SmallMetric
          label={translate("Känt nästa belopp", "Known next amount")}
          value={formatSek((Number(upcomingDividend?.dividendPerShare) || 0) * (Number(shares) || 0))}
          detail={translate(`${Number(upcomingDividend?.dividendPerShare) || 0} SEK/aktie`, `${Number(upcomingDividend?.dividendPerShare) || 0} SEK/share`)}
        />
        <SmallMetric label={translate("Yield on cost", "Yield on cost")} value={formatPercent(yieldOnCost)} detail={translate("senaste DPS / ditt GAV", "latest DPS / your cost basis")} />
        <SmallMetric label={translate("Senaste direktavkastning", "Latest dividend yield")} value={formatPercent(latestDirectYield)} detail={translate("senaste DPS / livekurs", "latest DPS / live price")} />
      </Box>

      <Box sx={{ mt: 2.7, pt: 2.2, borderTop: "1px solid rgba(148,163,184,0.16)" }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={0.7}>
          <Box>
            <Typography sx={{ color: text.subtle, fontWeight: 800 }}>
              {projection
                ? translate(
                    `${projection.targetYear}: potentiell utdelning`,
                    `${projection.targetYear}: potential dividend`
                  )
                : translate("Potentiell utdelning", "Potential dividend")}
            </Typography>
            {projection ? (
              <Typography sx={{ color: text.muted, fontSize: "0.76rem", mt: 0.3 }}>
                {translate(
                  `Efter ${projection.latestQuarter} ${projection.sourceYear} · ${projection.reportedQuarters}/4 kvartal · annualiserad justerad vinst ${projection.annualizedAdjustedProfitEur.toLocaleString("sv-SE", { maximumFractionDigits: 1 })} MEUR · EUR/SEK ${projection.fxRate.toLocaleString("sv-SE", { maximumFractionDigits: 2 })}`,
                  `After ${projection.latestQuarter} ${projection.sourceYear} · ${projection.reportedQuarters}/4 quarters · annualized adjusted profit EUR ${projection.annualizedAdjustedProfitEur.toLocaleString("en-US", { maximumFractionDigits: 1 })}m · EUR/SEK ${projection.fxRate.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
                )}
              </Typography>
            ) : null}
          </Box>
          <Typography sx={{ color: text.muted, fontSize: "0.76rem", maxWidth: 430 }}>
            {translate(
              "25 %, 50 % och 75 % av beräknad helårsvinst – inte en prognos eller ett utdelningsförslag.",
              "25%, 50% and 75% of estimated full-year profit – not a forecast or dividend proposal."
            )}
          </Typography>
        </Stack>
        {scenarios.length ? (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 1.4, mt: 1.5 }}>
            {scenarios.map((scenario) => (
              <Box key={scenario.id} sx={{ p: 1.6, borderRadius: "12px", background: scenario.id === "base" ? "rgba(56,189,248,0.1)" : "rgba(15,23,42,0.45)", border: scenario.id === "base" ? "1px solid rgba(56,189,248,0.3)" : "1px solid rgba(148,163,184,0.14)" }}>
                <Typography sx={{ color: scenario.id === "base" ? "#7dd3fc" : text.muted, fontSize: "0.76rem", fontWeight: 800 }}>
                  {translate(scenario.labelSv, scenario.labelEn)}
                </Typography>
                <Typography sx={{ color: text.heading, fontSize: "1.2rem", fontWeight: 850, mt: 0.3 }}>{formatSek(scenario.cash)}</Typography>
                <Typography sx={{ color: text.muted, fontSize: "0.75rem" }}>{scenario.dividendPerShare.toLocaleString("sv-SE", { maximumFractionDigits: 2 })} SEK/aktie</Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography sx={{ color: text.muted, fontSize: "0.82rem", mt: 1.5 }}>
            {translate(
              "Prognosen visas när rapportdata, aktieantal och EUR/SEK-kurs finns tillgängliga.",
              "The projection appears when report data, share count and the EUR/SEK rate are available."
            )}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
