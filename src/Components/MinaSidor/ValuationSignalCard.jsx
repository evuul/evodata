"use client";

import { useMemo } from "react";
import { Box, Chip, Grid, LinearProgress, Stack, Tooltip, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
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
  if (kind === "forwardPe") {
    if (value <= 12) return { sv: "Billigt", en: "Cheap", color: "#34d399", ratio: 25 };
    if (value <= 18) return { sv: "Rimligt", en: "Fair", color: "#7dd3fc", ratio: 50 };
    if (value <= 24) return { sv: "Högt", en: "High", color: "#facc15", ratio: 75 };
    return { sv: "Dyrt", en: "Expensive", color: "#f87171", ratio: 92 };
  }
  if (kind === "peg") {
    if (value < 0) return { sv: "Neg tillväxt", en: "Negative growth", color: "#f87171", ratio: 92 };
    if (value <= 1) return { sv: "Bra", en: "Good", color: "#34d399", ratio: 30 };
    if (value <= 1.5) return { sv: "Rimlig", en: "Fair", color: "#7dd3fc", ratio: 55 };
    if (value <= 2.2) return { sv: "Hög", en: "High", color: "#facc15", ratio: 78 };
    return { sv: "Ansträngd", en: "Stretched", color: "#f87171", ratio: 92 };
  }
  if (kind === "pb") {
    if (value <= 3) return { sv: "Låg", en: "Low", color: "#34d399", ratio: 30 };
    if (value <= 5) return { sv: "Rimlig", en: "Fair", color: "#7dd3fc", ratio: 52 };
    if (value <= 7) return { sv: "Hög", en: "High", color: "#facc15", ratio: 76 };
    return { sv: "Dyr", en: "Expensive", color: "#f87171", ratio: 90 };
  }
  if (kind === "ps") {
    if (value <= 5) return { sv: "Låg", en: "Low", color: "#34d399", ratio: 30 };
    if (value <= 8) return { sv: "Rimlig", en: "Fair", color: "#7dd3fc", ratio: 52 };
    if (value <= 12) return { sv: "Hög", en: "High", color: "#facc15", ratio: 76 };
    return { sv: "Dyr", en: "Expensive", color: "#f87171", ratio: 90 };
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

function MetricBox({ label, value, moodLabel, moodColor, ratio, tooltip }) {
  return (
    <Box
      sx={{
        p: 1.4,
        borderRadius: "14px",
        background: "rgba(30,41,59,0.6)",
        border: "1px solid rgba(148,163,184,0.2)",
        height: "100%",
        minHeight: 128,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.7 }}>
        <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.8)" }}>
          {label}
        </Typography>
        {tooltip ? (
          <Tooltip title={tooltip} arrow placement="top">
            <InfoOutlinedIcon
              sx={{
                fontSize: 14,
                color: "rgba(148,163,184,0.85)",
                cursor: "help",
              }}
            />
          </Tooltip>
        ) : null}
      </Stack>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.8 }}>
        <Typography variant="h6" sx={{ color: "#f8fafc", fontWeight: 800, lineHeight: 1.1 }}>
          {value}
        </Typography>
        <Typography variant="caption" sx={{ color: moodColor, fontWeight: 700 }}>
          {moodLabel}
        </Typography>
      </Stack>
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
  const fwdPeMetricLabel = Number.isFinite(signal?.metrics?.forwardPe)
    ? `${num1.format(signal.metrics.forwardPe)}x`
    : "–";
  const pegMetricLabel = Number.isFinite(signal?.metrics?.peg) ? `${num1.format(signal.metrics.peg)}x` : "–";
  const pbMetricLabel = Number.isFinite(signal?.metrics?.pBook) ? `${num1.format(signal.metrics.pBook)}x` : "–";
  const psMetricLabel = Number.isFinite(signal?.metrics?.pSales) ? `${num1.format(signal.metrics.pSales)}x` : "–";
  const evEbitdaMetricLabel = Number.isFinite(signal?.metrics?.evEbitda)
    ? `${num1.format(signal.metrics.evEbitda)}x`
    : "–";
  const peMood = metricMood("pe", signal?.metrics?.pe);
  const fwdPeMood = metricMood("forwardPe", signal?.metrics?.forwardPe);
  const pegMood = metricMood("peg", signal?.metrics?.peg);
  const pbMood = metricMood("pb", signal?.metrics?.pBook);
  const psMood = metricMood("ps", signal?.metrics?.pSales);
  const evMood = metricMood("ev", signal?.metrics?.evEbitda);
  const hasPenalties = Array.isArray(signal?.penalties) && signal.penalties.length > 0;
  const metricTooltips = {
    pe: translate(
      "P/E visar priset i relation till vinst per aktie (LTM). Lägre kan betyda billigare värdering.",
      "P/E shows price relative to earnings per share (LTM). Lower can indicate a cheaper valuation."
    ),
    forwardPe: translate(
      "Forward P/E använder framåtblickande vinstestimat (NTM) istället för historisk vinst.",
      "Forward P/E uses forward-looking earnings (NTM) instead of trailing earnings."
    ),
    peg: translate(
      "PEG = P/E delat med tillväxttakt. Runt 1 brukar tolkas som mer balanserad värdering.",
      "PEG = P/E divided by growth rate. Around 1 is often seen as a more balanced valuation."
    ),
    pb: translate(
      "P/B jämför priset mot bokfört eget kapital per aktie.",
      "P/B compares share price to book value per share."
    ),
    ps: translate(
      "P/S jämför bolagets börsvärde mot omsättning (LTM).",
      "P/S compares market capitalization to revenue (LTM)."
    ),
    evEbitda: translate(
      "EV/EBITDA jämför enterprise value med EBITDA och används för att jämföra värdering mellan bolag.",
      "EV/EBITDA compares enterprise value to EBITDA and is used to compare valuation across companies."
    ),
  };

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

        <Box
          sx={{
            display: "grid",
            gap: 1.4,
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              md: "repeat(3, minmax(0, 1fr))",
              lg: "repeat(6, minmax(0, 1fr))",
            },
          }}
        >
          <MetricBox
            label={translate("P/E (LTM)", "P/E (LTM)")}
            value={peMetricLabel}
            moodLabel={translate(peMood.sv, peMood.en)}
            moodColor={peMood.color}
            ratio={peMood.ratio}
            tooltip={metricTooltips.pe}
          />
          <MetricBox
            label={translate("Forward P/E (NTM)", "Forward P/E (NTM)")}
            value={fwdPeMetricLabel}
            moodLabel={translate(fwdPeMood.sv, fwdPeMood.en)}
            moodColor={fwdPeMood.color}
            ratio={fwdPeMood.ratio}
            tooltip={metricTooltips.forwardPe}
          />
          <MetricBox
            label={translate("PEG", "PEG")}
            value={pegMetricLabel}
            moodLabel={translate(pegMood.sv, pegMood.en)}
            moodColor={pegMood.color}
            ratio={pegMood.ratio}
            tooltip={metricTooltips.peg}
          />
          <MetricBox
            label={translate("P/B", "P/B")}
            value={pbMetricLabel}
            moodLabel={translate(pbMood.sv, pbMood.en)}
            moodColor={pbMood.color}
            ratio={pbMood.ratio}
            tooltip={metricTooltips.pb}
          />
          <MetricBox
            label={translate("P/S", "P/S")}
            value={psMetricLabel}
            moodLabel={translate(psMood.sv, psMood.en)}
            moodColor={psMood.color}
            ratio={psMood.ratio}
            tooltip={metricTooltips.ps}
          />
          <MetricBox
            label={translate("EV/EBITDA (LTM)", "EV/EBITDA (LTM)")}
            value={evEbitdaMetricLabel}
            moodLabel={translate(evMood.sv, evMood.en)}
            moodColor={evMood.color}
            ratio={evMood.ratio}
            tooltip={metricTooltips.evEbitda}
          />
        </Box>
      </Stack>
    </Box>
  );
}
