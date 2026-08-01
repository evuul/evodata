"use client";

// Presents the forecast headline, revenue mix, and data coverage.

import { Box, Chip, LinearProgress, Stack, Typography } from "@mui/material";

const formatMillion = (value) =>
  Number.isFinite(value)
    ? value.toLocaleString("sv-SE", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })
    : "–";

const formatSignedPercent = (value) => {
  if (!Number.isFinite(value)) return null;
  return `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}%`;
};

function StatusCard({ label, value, helper, children, accent = "#93c5fd" }) {
  return (
    <Box
      sx={{
        height: "100%",
        p: { xs: 2, md: 2.4 },
        borderRadius: "14px",
        border: "1px solid rgba(148,163,184,0.16)",
        background: "rgba(15,23,42,0.48)",
      }}
    >
      <Typography
        sx={{
          color: "rgba(148,163,184,0.82)",
          fontSize: "0.78rem",
          fontWeight: 700,
          letterSpacing: 0.7,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ color: accent, fontSize: "1.35rem", fontWeight: 800, mt: 0.7 }}>
        {value}
      </Typography>
      <Typography sx={{ color: "rgba(226,232,240,0.66)", fontSize: "0.84rem", mt: 0.4 }}>
        {helper}
      </Typography>
      {children}
    </Box>
  );
}

export default function RevenueForecastSummary({
  forecast,
  liveForecast,
  range,
  quarterProgress,
  playerCoverage,
  averagePlayers,
  forecastPeriodLabel,
  isCurrentForecastPeriod,
  trendText,
  trendTextColor,
  translate,
}) {
  const hasTotalForecast = Number.isFinite(forecast?.total);
  const exactForecast = hasTotalForecast ? forecast.total : liveForecast;
  const liveValue = Number.isFinite(forecast?.live) ? forecast.live : liveForecast;
  const rngValue = Number.isFinite(forecast?.rng) ? forecast.rng : null;
  const mixTotal =
    Number.isFinite(liveValue) && Number.isFinite(rngValue) ? liveValue + rngValue : null;
  const liveShare = mixTotal > 0 ? Math.min(100, Math.max(0, (liveValue / mixTotal) * 100)) : 100;
  const comparisonPercent = hasTotalForecast ? forecast.deltaPct : null;
  const hasTotalComparison =
    hasTotalForecast &&
    Number.isFinite(forecast?.delta) &&
    Number.isFinite(comparisonPercent) &&
    forecast?.priorPeriodLabel;
  const summaryTrendText = hasTotalComparison
    ? translate(
        `Totalprognosen ligger ${forecast.delta >= 0 ? "över" : "under"} ${
          forecast.priorPeriodLabel
        } med ${formatMillion(Math.abs(forecast.delta))} MEUR (${formatSignedPercent(
          comparisonPercent,
        )}).`,
        `The total forecast is ${forecast.delta >= 0 ? "above" : "below"} ${
          forecast.priorPeriodLabel
        } by ${formatMillion(Math.abs(forecast.delta))} MEUR (${formatSignedPercent(
          comparisonPercent,
        )}).`,
      )
    : trendText;
  const summaryTrendColor = hasTotalComparison
    ? forecast.delta >= 0
      ? "#34d399"
      : "#f87171"
    : trendTextColor;
  const coveragePercent =
    playerCoverage.expectedDays > 0
      ? Math.min(100, Math.round((playerCoverage.observedDays / playerCoverage.expectedDays) * 100))
      : 100;

  return (
    <Box sx={{ mt: { xs: 1.8, md: 3.5 } }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 7fr) minmax(0, 5fr)" },
          gap: { xs: 2, md: 2.5 },
        }}
      >
        <Box>
          <Box
            sx={{
              height: "100%",
              p: { xs: 1.65, sm: 3, md: 3.5 },
              borderRadius: "18px",
              border: "1px solid rgba(148,163,184,0.16)",
              background: "rgba(15,23,42,0.58)",
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              gap={1}
            >
              <Box>
                <Typography
                  sx={{
                    color: "rgba(226,232,240,0.72)",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  {hasTotalForecast
                    ? translate("Total omsättningsprognos", "Total revenue forecast")
                    : translate("Live-omsättningsprognos", "Live revenue forecast")}
                </Typography>
                <Typography sx={{ color: "rgba(226,232,240,0.62)", fontSize: "0.85rem", mt: 0.4 }}>
                  {forecastPeriodLabel}
                </Typography>
              </Box>
              <Chip
                size="small"
                label={translate("Exakt modellvärde", "Exact model output")}
                sx={{
                  color: "rgba(226,232,240,0.82)",
                  bgcolor: "rgba(148,163,184,0.12)",
                  fontWeight: 700,
                }}
              />
            </Stack>

            <Typography
              component="p"
              sx={{
                color: "#f8fafc",
                fontSize: { xs: "2.35rem", sm: "3.5rem", md: "4rem" },
                fontWeight: 850,
                lineHeight: 1,
                letterSpacing: "-0.045em",
                mt: { xs: 2.3, md: 2.8 },
              }}
            >
              {formatMillion(exactForecast)}{" "}
              <Box component="span" sx={{ color: "rgba(226,232,240,0.72)", fontSize: "0.42em" }}>
                MEUR
              </Box>
            </Typography>

            <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center" sx={{ mt: 2 }}>
              {Number.isFinite(comparisonPercent) && (
                <Chip
                  size="small"
                  label={`${formatSignedPercent(comparisonPercent)} ${translate(
                    `mot ${forecast.priorPeriodLabel}`,
                    `vs ${forecast.priorPeriodLabel}`,
                  )}`}
                  sx={{
                    color: comparisonPercent >= 0 ? "#6ee7b7" : "#fca5a5",
                    bgcolor:
                      comparisonPercent >= 0
                        ? "rgba(16,185,129,0.12)"
                        : "rgba(248,113,113,0.12)",
                    fontWeight: 750,
                  }}
                />
              )}
              {range && (
                <Typography sx={{ color: "rgba(226,232,240,0.8)", fontWeight: 650 }}>
                  {translate("Säkerhetsintervall", "Safety range")}{" "}
                  <Box component="span" sx={{ color: "#f8fafc" }}>
                    {formatMillion(range.low)}–{formatMillion(range.high)} MEUR
                  </Box>
                </Typography>
              )}
            </Stack>

            <Typography sx={{ color: summaryTrendColor, mt: 2, lineHeight: 1.55 }}>
              {summaryTrendText}
            </Typography>
            {range && (
              <Typography sx={{ color: "rgba(148,163,184,0.68)", fontSize: "0.78rem", mt: 1 }}>
                {range.sampleSize > 0
                  ? translate(
                      `Intervallet bygger på modellens historiska medianfel (${range.sampleSize} kvartal).`,
                      `The range uses the model's historical median error (${range.sampleSize} quarters).`,
                    )
                  : translate(
                      "Intervallet använder modellens standardsäkerhet tills mer historik finns.",
                      "The range uses the model's default safety margin until more history is available.",
                    )}
              </Typography>
            )}
          </Box>
        </Box>

        <Box>
          <Box
            sx={{
              height: "100%",
              p: { xs: 1.65, sm: 3, md: 3.5 },
              borderRadius: "18px",
              border: "1px solid rgba(148,163,184,0.16)",
              background: "rgba(15,23,42,0.58)",
            }}
          >
            <Typography variant="h6" sx={{ color: "#f8fafc", fontWeight: 780 }}>
              {translate("Prognosens fördelning", "Forecast mix")}
            </Typography>
            <Typography sx={{ color: "rgba(148,163,184,0.76)", fontSize: "0.85rem", mt: 0.4 }}>
              {translate(
                "Live och RNG visas separat men summeras i modellvärdet.",
                "Live and RNG are shown separately and combined in the model output.",
              )}
            </Typography>

            <Box
              aria-label={translate("Fördelning mellan Live och RNG", "Revenue split between Live and RNG")}
              sx={{
                display: "flex",
                height: 12,
                mt: { xs: 2, md: 3 },
                overflow: "hidden",
                borderRadius: 999,
                bgcolor: "rgba(148,163,184,0.14)",
              }}
            >
              <Box sx={{ width: `${liveShare}%`, bgcolor: "#38bdf8" }} />
              {Number.isFinite(rngValue) && (
                <Box sx={{ width: `${100 - liveShare}%`, bgcolor: "#facc15" }} />
              )}
            </Box>

            <Stack spacing={1.6} sx={{ mt: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: "#38bdf8" }} />
                  <Typography sx={{ color: "rgba(226,232,240,0.8)" }}>Live</Typography>
                </Stack>
                <Typography sx={{ color: "#f8fafc", fontWeight: 800 }}>
                  {formatMillion(liveValue)} MEUR
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: "#facc15" }} />
                  <Typography sx={{ color: "rgba(226,232,240,0.8)" }}>RNG</Typography>
                </Stack>
                <Box sx={{ textAlign: "right" }}>
                  <Typography sx={{ color: "#f8fafc", fontWeight: 800 }}>
                    {formatMillion(rngValue)} MEUR
                  </Typography>
                  {Number.isFinite(forecast?.rngGrowth) && (
                    <Typography sx={{ color: "rgba(250,204,21,0.78)", fontSize: "0.75rem" }}>
                      {formatSignedPercent(forecast.rngGrowth)} QoQ
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Stack>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
            gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))" },
          gap: { xs: 1.5, md: 2 },
          mt: { xs: 2, md: 2.5 },
        }}
      >
        <Box sx={{ gridColumn: { xs: "1 / -1", sm: "auto" } }}>
          <StatusCard
            label={translate("Kvartalsstatus", "Quarter status")}
            value={`${quarterProgress.progressPercent}%`}
            helper={`${quarterProgress.elapsedDays}/${quarterProgress.totalDays} ${translate(
              "dagar",
              "days",
            )} · ${
              isCurrentForecastPeriod
                ? translate("pågående", "current")
                : translate("stängt", "closed")
            }`}
            accent="#6ee7b7"
          >
            <LinearProgress
              variant="determinate"
              value={quarterProgress.progressPercent}
              sx={{
                mt: 1.5,
                height: 5,
                borderRadius: 99,
                bgcolor: "rgba(148,163,184,0.18)",
                "& .MuiLinearProgress-bar": {
                  background: "linear-gradient(90deg, #34d399, #38bdf8)",
                },
              }}
            />
          </StatusCard>
        </Box>
        <Box>
          <StatusCard
            label={translate("Snittspelare", "Average players")}
            value={Number(averagePlayers || 0).toLocaleString("sv-SE")}
            helper={translate("Under prognosperioden", "During the forecast period")}
          />
        </Box>
        <Box>
          <StatusCard
            label={translate("Datatäckning", "Data coverage")}
            value={`${coveragePercent}%`}
            helper={`${playerCoverage.observedDays}/${playerCoverage.expectedDays} ${translate(
              "avslutade dagar",
              "completed days",
            )}`}
            accent={playerCoverage.incomplete ? "#fde68a" : "#6ee7b7"}
          />
        </Box>
      </Box>
    </Box>
  );
}
