"use client";

import { useMemo } from "react";
import { Box, Chip, Grid, LinearProgress, Stack, Typography } from "@mui/material";
import financialReportsData from "@/app/data/financialReports.json";
import amountOfShares from "@/app/data/amountOfShares.json";
import { computeValuationSignal } from "@/lib/valuationSignal";
import { useFxRateContext } from "@/context/FxRateContext";
import valuationConfig from "@/app/data/valuationConfig.json";

const num1 = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 1 });

const signalStyleMap = {
  strong_buy: {
    bg: "rgba(34,197,94,0.18)",
    border: "1px solid rgba(34,197,94,0.45)",
    color: "#86efac",
    sv: "Starkt köp",
    en: "Strong buy",
  },
  accumulate: {
    bg: "rgba(56,189,248,0.18)",
    border: "1px solid rgba(56,189,248,0.45)",
    color: "#7dd3fc",
    sv: "Öka",
    en: "Accumulate",
  },
  hold: {
    bg: "rgba(250,204,21,0.16)",
    border: "1px solid rgba(250,204,21,0.4)",
    color: "#fde68a",
    sv: "Avvakta",
    en: "Hold",
  },
  watch: {
    bg: "rgba(248,113,113,0.14)",
    border: "1px solid rgba(248,113,113,0.4)",
    color: "#fca5a5",
    sv: "Vänta",
    en: "Wait",
  },
  unknown: {
    bg: "rgba(148,163,184,0.14)",
    border: "1px solid rgba(148,163,184,0.35)",
    color: "#cbd5e1",
    sv: "Ingen signal",
    en: "No signal",
  },
};

const scoreBand = (score) => {
  if (!Number.isFinite(score)) return "unknown";
  if (score >= 75) return "strong";
  if (score >= 60) return "good";
  if (score >= 45) return "neutral";
  return "weak";
};

const bandText = (band, translate) => {
  if (band === "strong") return translate("Hög kvalitet", "High quality");
  if (band === "good") return translate("Bra nivå", "Good level");
  if (band === "neutral") return translate("Neutral", "Neutral");
  if (band === "weak") return translate("Svag nivå", "Weak level");
  return translate("Otillräcklig data", "Insufficient data");
};

const metricMood = (kind, value) => {
  if (!Number.isFinite(value)) return { sv: "N/A", en: "N/A", color: "#94a3b8", ratio: 0 };
  const t = valuationConfig?.thresholds || {};
  if (kind === "pe") {
    const g = Number(t?.pe?.greenMax ?? 15);
    const y = Number(t?.pe?.yellowMax ?? 20);
    const r = Number(t?.pe?.redMin ?? 25);
    const ratio = Math.max(0, Math.min(100, ((value - g) / Math.max(0.01, r - g)) * 100));
    if (value <= g) return { sv: "Billigt", en: "Cheap", color: "#34d399", ratio };
    if (value <= y) return { sv: "Rimligt", en: "Fair", color: "#7dd3fc", ratio };
    if (value <= r) return { sv: "Dyrt", en: "Expensive", color: "#facc15", ratio };
    return { sv: "Mycket dyrt", en: "Very expensive", color: "#f87171", ratio };
  }
  if (kind === "fcf") {
    const g = Number(t?.fcfYieldPct?.greenMin ?? 5);
    const y = Number(t?.fcfYieldPct?.yellowMin ?? 3);
    const r = Number(t?.fcfYieldPct?.redMax ?? 2);
    const ratio = Math.max(0, Math.min(100, ((g - value) / Math.max(0.01, g - r)) * 100));
    if (value >= g) return { sv: "Starkt", en: "Strong", color: "#34d399", ratio };
    if (value >= y) return { sv: "OK", en: "OK", color: "#7dd3fc", ratio };
    if (value >= r) return { sv: "Svagt", en: "Weak", color: "#facc15", ratio };
    return { sv: "Mycket svagt", en: "Very weak", color: "#f87171", ratio };
  }
  const g = Number(t?.evEbitda?.greenMax ?? 10);
  const y = Number(t?.evEbitda?.yellowMax ?? 14);
  const r = Number(t?.evEbitda?.redMin ?? 18);
  const ratio = Math.max(0, Math.min(100, ((value - g) / Math.max(0.01, r - g)) * 100));
  if (value <= g) return { sv: "Attraktiv", en: "Attractive", color: "#34d399", ratio };
  if (value <= y) return { sv: "Rimlig", en: "Fair", color: "#7dd3fc", ratio };
  if (value <= r) return { sv: "Hög", en: "High", color: "#facc15", ratio };
  return { sv: "Ansträngd", en: "Stretched", color: "#f87171", ratio };
};

function MetricBox({ label, value, moodLabel, moodColor, ratio }) {
  return (
    <Box
      sx={{
        p: 1.4,
        borderRadius: "14px",
        background: "rgba(30,41,59,0.6)",
        border: "1px solid rgba(148,163,184,0.2)",
        height: "100%",
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.4 }}>
        <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.8)" }}>
          {label}
        </Typography>
        <Typography variant="caption" sx={{ color: moodColor, fontWeight: 700 }}>
          {moodLabel}
        </Typography>
      </Stack>
      <Typography variant="h6" sx={{ color: "#f8fafc", fontWeight: 800, lineHeight: 1.1 }}>{value}</Typography>
      <LinearProgress
        variant="determinate"
        value={Math.max(0, Math.min(100, ratio))}
        sx={{
          mt: 1.1,
          height: 6,
          borderRadius: 99,
          backgroundColor: "rgba(15,23,42,0.5)",
          "& .MuiLinearProgress-bar": { borderRadius: 99, backgroundColor: moodColor },
        }}
      />
    </Box>
  );
}

export default function ValuationSignalCard({ translate, currentPrice, isUnlocked }) {
  const { rate: fxRate } = useFxRateContext();
  const reports = Array.isArray(financialReportsData?.financialReports) ? financialReportsData.financialReports : [];
  const latestSharesM = Number(amountOfShares?.[amountOfShares.length - 1]?.sharesOutstanding);
  const marketCapSEK =
    Number.isFinite(currentPrice) && Number.isFinite(latestSharesM)
      ? currentPrice * latestSharesM * 1_000_000
      : null;

  const signal = useMemo(
    () =>
      computeValuationSignal({
        reports,
        currentPriceSEK: currentPrice,
        marketCapSEK,
        fxRate: Number(fxRate) || 11,
      }),
    [reports, currentPrice, marketCapSEK, fxRate]
  );

  if (!isUnlocked) {
    return (
      <Box
        sx={{
          borderRadius: "18px",
          border: "1px dashed rgba(148,163,184,0.4)",
          background: "rgba(15,23,42,0.62)",
          p: { xs: 2, sm: 2.4 },
        }}
      >
        <Stack spacing={1}>
          <Typography variant="h6" sx={{ color: "#f8fafc", fontWeight: 700 }}>
            {translate("Värderingssignal", "Valuation signal")}
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(203,213,225,0.82)" }}>
            {translate(
              "Låst funktion. Tillgänglig för prenumeranter och admin.",
              "Locked feature. Available for subscribers and admin."
            )}
          </Typography>
        </Stack>
      </Box>
    );
  }

  const signalStyle = signalStyleMap[signal.signal] || signalStyleMap.unknown;
  const signalLabel = translate(signalStyle.sv, signalStyle.en);
  const band = scoreBand(signal?.score);
  const bandLabel = bandText(band, translate);
  const scorePct = Number.isFinite(signal?.score) ? Math.max(0, Math.min(100, signal.score)) : 0;

  const peMetricLabel = Number.isFinite(signal?.metrics?.pe) ? `${num1.format(signal.metrics.pe)}x` : "–";
  const fcfYieldMetricLabel = Number.isFinite(signal?.metrics?.fcfYieldPct)
    ? `${signal.metrics.fcfYieldPct >= 0 ? "+" : ""}${num1.format(signal.metrics.fcfYieldPct)}%`
    : "–";
  const evEbitdaMetricLabel = Number.isFinite(signal?.metrics?.evEbitda)
    ? `${num1.format(signal.metrics.evEbitda)}x`
    : "–";
  const peMood = metricMood("pe", signal?.metrics?.pe);
  const fcfMood = metricMood("fcf", signal?.metrics?.fcfYieldPct);
  const evMood = metricMood("ev", signal?.metrics?.evEbitda);
  const hasPenalties = Array.isArray(signal?.penalties) && signal.penalties.length > 0;

  return (
    <Box
      sx={{
        borderRadius: "20px",
        border: "1px solid rgba(148,163,184,0.26)",
        background: "linear-gradient(140deg, rgba(10,18,35,0.9), rgba(12,26,46,0.8))",
        p: { xs: 2, sm: 2.4 },
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: "radial-gradient(circle at 12% 0%, rgba(56,189,248,0.16), transparent 50%)",
        }}
      />
      <Stack spacing={1.6}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
        >
          <Typography variant="subtitle1" sx={{ color: "#f8fafc", fontWeight: 700 }}>
            {translate("Värderingssignal (Traffic Light)", "Valuation signal (Traffic Light)")}
          </Typography>
          <Chip
            label={signalLabel}
            sx={{
              backgroundColor: signalStyle.bg,
              border: signalStyle.border,
              color: signalStyle.color,
              fontWeight: 700,
              borderRadius: "999px",
            }}
          />
        </Stack>

        <Grid container spacing={1.4} alignItems="stretch">
          <Grid item xs={12} md={5}>
            <Box
              sx={{
                borderRadius: "16px",
                border: "1px solid rgba(148,163,184,0.22)",
                background: "rgba(15,23,42,0.5)",
                p: 1.6,
                height: "100%",
              }}
            >
              <Stack spacing={0.9}>
                <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.85)" }}>
                  {translate("Model score", "Model score")}
                </Typography>
                <Stack direction="row" spacing={1.2} alignItems="baseline">
                  <Typography variant="h4" sx={{ color: "#f8fafc", fontWeight: 900, lineHeight: 1 }}>
                    {signal.ok ? `${signal.score}/100` : "–"}
                  </Typography>
                  <Typography variant="body2" sx={{ color: signalStyle.color, fontWeight: 700 }}>
                    {bandLabel}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={scorePct}
                  sx={{
                    height: 8,
                    borderRadius: 99,
                    backgroundColor: "rgba(15,23,42,0.65)",
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 99,
                      backgroundColor: signalStyle.color,
                    },
                  }}
                />
                <Typography variant="caption" sx={{ color: "rgba(203,213,225,0.72)" }}>
                  {translate(
                    `Baspoäng ${signal.baseScore ?? "–"} • avdrag ${signal.penaltyPoints ?? "–"}`,
                    `Base score ${signal.baseScore ?? "–"} • penalties ${signal.penaltyPoints ?? "–"}`
                  )}
                </Typography>
                {signal?.meta?.latestQuarter ? (
                  <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.78)" }}>
                    {translate(`Senaste kvartal: ${signal.meta.latestQuarter}`, `Latest quarter: ${signal.meta.latestQuarter}`)}
                  </Typography>
                ) : null}
              </Stack>
            </Box>
          </Grid>
          <Grid item xs={12} md={7}>
            <Box
              sx={{
                borderRadius: "16px",
                border: hasPenalties
                  ? "1px solid rgba(248,113,113,0.35)"
                  : "1px solid rgba(52,211,153,0.35)",
                background: hasPenalties ? "rgba(127,29,29,0.15)" : "rgba(6,78,59,0.15)",
                p: 1.6,
                height: "100%",
              }}
            >
              <Stack spacing={0.8}>
                <Typography variant="subtitle2" sx={{ color: "#f8fafc", fontWeight: 700 }}>
                  {translate("Snabb tolkning", "Quick interpretation")}
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.9)" }}>
                  {hasPenalties
                    ? translate(
                        "Modellen ser varningsflaggor i trenden. Fokusera på att följa nästa rapport innan du ökar aggressivt.",
                        "The model sees warning flags in the trend. Focus on the next report before increasing aggressively."
                      )
                    : translate(
                        "Fundamenta ser stabila ut enligt modellen. Läget är bättre för gradvis ökning än för att jaga kortsiktiga rörelser.",
                        "Fundamentals look stable in the model. The setup is better for gradual accumulation than short-term chasing."
                      )}
                </Typography>
                {hasPenalties ? (
                  <Stack spacing={0.4}>
                    {signal.penalties.slice(0, 2).map((p) => (
                      <Typography key={p.key} variant="caption" sx={{ color: "#fecaca" }}>
                        • {translate("Varningsflagga", "Warning")}: {p.message}
                      </Typography>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="caption" sx={{ color: "#bbf7d0" }}>
                    {translate("Inga aktiva varningsflaggor i modellen just nu.", "No active warning flags in the model right now.")}
                  </Typography>
                )}
              </Stack>
            </Box>
          </Grid>
        </Grid>

        <Grid container spacing={1.4}>
          <Grid item xs={12} sm={4}>
            <MetricBox
              label={translate("P/E (LTM)", "P/E (LTM)")}
              value={peMetricLabel}
              moodLabel={translate(peMood.sv, peMood.en)}
              moodColor={peMood.color}
              ratio={peMood.ratio}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <MetricBox
              label={translate("FCF Yield (LTM)", "FCF Yield (LTM)")}
              value={fcfYieldMetricLabel}
              moodLabel={translate(fcfMood.sv, fcfMood.en)}
              moodColor={fcfMood.color}
              ratio={fcfMood.ratio}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <MetricBox
              label={translate("EV/EBITDA (LTM)", "EV/EBITDA (LTM)")}
              value={evEbitdaMetricLabel}
              moodLabel={translate(evMood.sv, evMood.en)}
              moodColor={evMood.color}
              ratio={evMood.ratio}
            />
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
}
