"use client";

// Shows the documented forecast, reported outcome and the reason for the next calibration.

import { Box, Typography } from "@mui/material";

const number = (value) => value.toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 3 });
const signedPercent = (value) => `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;

export default function RevenueForecastOutcome({ outcome, translate }) {
  if (!outcome) return null;
  const [year, quarter] = outcome.period.split(" ");
  return (
    <Box component="section" aria-label={translate("Prognos mot utfall", "Forecast versus actual")} sx={{ mb: 3, p: { xs: 1.5, sm: 2.5 }, borderRadius: 3, border: "1px solid rgba(148,163,184,0.2)", background: "rgba(15,23,42,0.45)" }}>
      <Typography variant="h6" sx={{ fontWeight: 750, mb: 1 }}>
        {translate(`Prognos mot utfall · ${quarter} ${year}`, `Forecast versus actual · ${quarter} ${year}`)}
      </Typography>
      <Typography sx={{ color: "#cbd5e1", fontSize: "0.85rem", mb: 2 }}>
        {translate(
          `Dokumenterat estimat från ${outcome.documentedOn}. Spelarunderlag: ${outcome.days}/${outcome.totalDays} dagar. Estimatet bevaras när modellen uppdateras.`,
          `Estimate documented on ${outcome.documentedOn}. Player coverage: ${outcome.days}/${outcome.totalDays} days. The estimate is preserved when the model changes.`,
        )}
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" }, gap: 2 }}>
        {[[translate("Total omsättning", "Total revenue"), outcome.total], ["Live", outcome.live], ["RNG", outcome.rng]].map(([label, metric]) => (
          <Box key={label}>
            <Typography sx={{ fontWeight: 700 }}>{label}</Typography>
            <Typography sx={{ color: "#93c5fd", fontSize: "0.85rem", mt: 0.5 }}>
              {translate("Estimat", "Estimate")}: {number(metric.estimated)} MEUR
            </Typography>
            <Typography sx={{ color: "#e2e8f0", fontSize: "0.85rem" }}>
              {translate("Utfall", "Actual")}: {number(metric.actual)} MEUR
            </Typography>
            <Typography sx={{ color: Math.abs(metric.errorPercent) <= 1 ? "#6ee7b7" : "#fca5a5", fontWeight: 750, mt: 0.5 }}>
              {signedPercent(metric.errorPercent)} ({number(metric.difference)} MEUR)
            </Typography>
          </Box>
        ))}
      </Box>
      <Typography sx={{ color: "#94a3b8", fontSize: "0.8rem", mt: 2 }}>
        {translate("Avvikelse = (estimat − utfall) / utfall. Positivt värde betyder överskattning.", "Error = (estimate − actual) / actual. A positive value means overestimation.")}
        {outcome.withinRange === false && translate(
          ` Utfallet låg utanför det då visade intervallet ${number(outcome.range.low)}–${number(outcome.range.high)} MEUR.`,
          ` Actual revenue was outside the displayed range of ${number(outcome.range.low)}–${number(outcome.range.high)} MEUR.`,
        )}
      </Typography>
      <Typography sx={{ color: "#cbd5e1", fontSize: "0.85rem", mt: 1.5 }}>
        {translate(
          "Från Q4 2026 används senaste rapporterade kvartalets Live-intäkt per observerad spelare. Q3:s referens är cirka 8,1 % lägre än det tidigare Q1/Q2-snittet. RNG behåller sin trendmodell. Ändringen är ännu inte validerad mot nya kvartalsutfall; spelmix och Brasilienstängningen kan påverka Q4.",
          "From Q4 2026, Live uses the latest reported quarter's revenue per observed player. The Q3 reference is about 8.1% below the previous Q1/Q2 average. RNG retains its trend model. The change has not yet been validated against new quarterly outcomes; game mix and the Brazil closure may affect Q4.",
        )}
      </Typography>
    </Box>
  );
}
