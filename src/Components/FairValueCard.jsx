'use client';

import React, { useMemo } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Tooltip,
  Typography,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useFxRateContext } from "../context/FxRateContext";
import { useStockPriceContext } from "../context/StockPriceContext";

/**
 * @typedef {Object} Report
 * @property {number} year
 * @property {string} quarter
 * @property {number=} operatingRevenues MEUR
 * @property {number=} adjustedEarningsPerShare EUR per aktie (kvartal)
 * @property {number=} adjustedOperatingMargin procent
 */

/** --- Hjälpfunktioner --- */
const quarterToNumber = (q) =>
  q === "Q1" ? 1 : q === "Q2" ? 2 : q === "Q3" ? 3 : q === "Q4" ? 4 : 0;

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

const numberFormatter = new Intl.NumberFormat("sv-SE", {
  style: "currency",
  currency: "SEK",
  maximumFractionDigits: 0,
});
const price2Formatter = new Intl.NumberFormat("sv-SE", {
  style: "currency",
  currency: "SEK",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const pct1 = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 1 });
const int0 = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });

const WINDOW_SMOOTH = 8;      // 8 kvartal ≈ 2 år (bra smoothing)
const MAX_FWD_GROWTH = 0.25;  // +25% cap på ettårsprognos
const MIN_FWD_GROWTH = -0.10; // -10% floor
const MIN_PE = 10;
const MAX_PE = 35;

/**
 * Mappa grundmultipel från tillväxt (g) och marginalkvalitet (m).
 * g och m anges som decimaler/%
 */
function basePeFromFundamentals(growthYoY, avgOpMargin) {
  // Grundmultipel från tillväxtband
  const g = growthYoY * 100; // i %
  let pe =
    g <= 0   ? 12 :
    g <= 5   ? 14 :
    g <= 10  ? 16 :
    g <= 15  ? 18 :
    g <= 20  ? 20 :
               22;

  // Kvalitetsjustering från rörelsemarginal
  if (avgOpMargin != null) {
    if (avgOpMargin >= 65) pe += 3;
    else if (avgOpMargin >= 55) pe += 2;
    else if (avgOpMargin >= 45) pe += 1;
    else if (avgOpMargin < 35) pe -= 1;
  }

  return clamp(pe, MIN_PE, 30); // basen blir inte extrem
}

/** Räkna TTM på EPS (senaste 4 kvartal från slutet, med offset om du vill gå bakåt) */
function ttmEps(sorted, offsetFromEnd = 0) {
  const end = sorted.length - offsetFromEnd;
  const start = Math.max(0, end - 4);
  if (end - start < 4) return null;
  return sorted.slice(start, end).reduce((a, r) => a + (Number(r.adjustedEarningsPerShare) || 0), 0);
}

/** Normaliserad årlig EPS från fönster av N kvartal: sumEPS * (4/N) */
function normalizedAnnualEps(sorted, N = WINDOW_SMOOTH) {
  const take = Math.min(N, sorted.length);
  if (take < 4) return null;
  const window = sorted.slice(-take);
  const sumEps = window.reduce((a, r) => a + (Number(r.adjustedEarningsPerShare) || 0), 0);
  return (sumEps * 4) / take;
}

/** Genomsnittlig rörelsemarginal över senaste 4 kvartal */
function avgOpMargin4Q(sorted) {
  const last4 = sorted.slice(-4);
  if (last4.length < 4) return null;
  const sum = last4.reduce((a, r) => a + (Number(r.adjustedOperatingMargin) || 0), 0);
  return sum / 4;
}

/** TTM-omsättning (MEUR) */
function ttmRevenue(sorted) {
  const last4 = sorted.slice(-4);
  if (last4.length < 4) return null;
  return last4.reduce((a, r) => a + (Number(r.operatingRevenues) || 0), 0);
}

const FairValueCard = ({ reports }) => {
  const { rate: fxRate, meta: fxMeta } = useFxRateContext(); // EUR/SEK
  const { stockPrice, error: priceError, lastUpdated } = useStockPriceContext();

  const fx = fxRate ?? 11.0;
  const marketRaw = stockPrice?.price?.regularMarketPrice?.raw;
  const currentPriceSEK =
    !priceError && typeof marketRaw === "number" && Number.isFinite(marketRaw) ? marketRaw : null;

  const {
    latestLabel,
    annualEpsEUR,          // normaliserad årlig EPS i EUR
    annualEpsTTMEUR,       // TTM EPS i EUR
    annualEpsSEK,
    annualEpsTTMSEK,
    avgMargin,
    yoyGrowth,
    revTtmMEUR,
    scenarios,
  } = useMemo(() => {
    const empty = {
      latestLabel: "",
      annualEpsEUR: 0,
      annualEpsTTMEUR: 0,
      annualEpsSEK: 0,
      annualEpsTTMSEK: 0,
      avgMargin: null,
      yoyGrowth: null,
      revTtmMEUR: null,
      scenarios: [],
    };
    if (!Array.isArray(reports) || reports.length === 0 || !fx) return empty;

    const sorted = [...reports].sort((a, b) =>
      a.year !== b.year ? a.year - b.year : quarterToNumber(a.quarter) - quarterToNumber(b.quarter)
    );

    const last = sorted.at(-1);
    const latestLabel = last ? `${last.year} ${last.quarter}` : "";

    // 1) Basnivåer
    const ttmNow = ttmEps(sorted, 0);           // senaste 4Q
    const ttmPrev = ttmEps(sorted, 4);          // föregående 4Q
    const epsNorm = normalizedAnnualEps(sorted, WINDOW_SMOOTH); // 8Q-annualiserad

    if (ttmNow == null || epsNorm == null) return empty;

    // 2) Tillväxt: blandning av YoY (TTM) och läsning från normaliserad trend (om vi vill)
    const yoy = ttmPrev && ttmPrev > 0 ? (ttmNow - ttmPrev) / ttmPrev : 0;
    // (valfritt) 3-års-CAGR går att lägga till om du vill; här håller vi den enkel

    // “base growth” = clampad YoY
    const baseGrowth = clamp(yoy, MIN_FWD_GROWTH, MAX_FWD_GROWTH);

    // 3) Framåtblick: använd normaliserad EPS som startpunkt (robust mot utstickare)
    const forwardEpsBaseEUR = epsNorm * (1 + baseGrowth);

    // 4) Kvalitet (marginal) för multipel-modell
    const avgMargin = avgOpMargin4Q(sorted);

    // 5) Basmultipel från fundamenta, sedan bull/bear runt den
    const peBase = basePeFromFundamentals(baseGrowth, avgMargin);
    const peBull = clamp(Math.round(peBase * 1.20), MIN_PE, MAX_PE);
    const peBear = clamp(Math.round(peBase * 0.80), MIN_PE, MAX_PE);

    // 6) Scenario-tillväxt runt base (små ändringar + cap)
    const bullGrowth = clamp(baseGrowth + 0.05, MIN_FWD_GROWTH, MAX_FWD_GROWTH);
    const bearGrowth = clamp(baseGrowth - 0.05, MIN_FWD_GROWTH, MAX_FWD_GROWTH);

    const fwdEpsBullEUR = epsNorm * (1 + bullGrowth);
    const fwdEpsBearEUR = epsNorm * (1 + bearGrowth);

    // 7) Implied SEK-priser
    const fairSEK = peBase * forwardEpsBaseEUR * fx;
    const bullSEK = peBull * fwdEpsBullEUR * fx;
    const bearSEK = peBear * fwdEpsBearEUR * fx;

    const scenarios = [
      {
        id: "fair",
        label: "Fair Value",
        pe: peBase,
        description: "Normaliserad vinst + multipel baserat på tillväxt/marginal.",
        color: "#22c55e",
        icon: <TrendingUpIcon fontSize="small" />,
        impliedPriceSEK: fairSEK,
        upsidePct: currentPriceSEK ? ((fairSEK - currentPriceSEK) / currentPriceSEK) * 100 : null,
      },
      {
        id: "bull",
        label: "Bull",
        pe: peBull,
        description: "Högre multipel och något starkare vinsttillväxt.",
        color: "#38bdf8",
        icon: <TrendingUpIcon fontSize="small" />,
        impliedPriceSEK: bullSEK,
        upsidePct: currentPriceSEK ? ((bullSEK - currentPriceSEK) / currentPriceSEK) * 100 : null,
      },
      {
        id: "bear",
        label: "Bear",
        pe: peBear,
        description: "Lägre multipel och dämpad vinsttillväxt.",
        color: "#ef4444",
        icon: <TrendingDownIcon fontSize="small" />,
        impliedPriceSEK: bearSEK,
        upsidePct: currentPriceSEK ? ((bearSEK - currentPriceSEK) / currentPriceSEK) * 100 : null,
      },
    ];

    // KPI: intäkter TTM (MEUR)
    const revTtm = ttmRevenue(sorted);
    const annualEpsSEK = epsNorm * fx;
    const annualEpsTTMSEK = ttmNow * fx;

    return {
      latestLabel,
      annualEpsEUR: epsNorm,
      annualEpsTTMEUR: ttmNow,
      annualEpsSEK,
      annualEpsTTMSEK,
      avgMargin,
      yoyGrowth: yoy,
      revTtmMEUR: revTtm,
      scenarios,
    };
  }, [reports, fx, currentPriceSEK]);

  const fxPairLabel = (fxMeta?.base && fxMeta?.quote) ? `${fxMeta.base}/${fxMeta.quote}` : "EUR/SEK";
  const fxStr = fx.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const priceUpdated =
    lastUpdated instanceof Date
      ? new Intl.DateTimeFormat("sv-SE", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(lastUpdated)
      : lastUpdated
      ? new Intl.DateTimeFormat("sv-SE", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(new Date(lastUpdated))
      : null;

  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        color: "#f8fafc",
        borderRadius: "16px",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        boxShadow: "0 18px 40px rgba(0, 0, 0, 0.35)",
      }}
    >
      <CardContent
        sx={{
          p: { xs: 3, md: 4 },
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
        }}
      >
        {/* Header */}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Fair Value
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(226, 232, 240, 0.75)" }}>
              Senast: {latestLabel || "–"} • {fxPairLabel}: {fxStr}
            </Typography>
          </Box>
          <Tooltip
            title="Bygger på ett 8-kvartalsfönster för EPS-normalisering, framåtblickande tillväxt med clamp och multipel som styrs av tillväxt + marginal."
          >
            <Chip
              icon={<InfoOutlinedIcon sx={{ color: "#f8fafc !important" }} />}
              label="Metod"
              sx={{ backgroundColor: "rgba(0, 229, 255, 0.15)", color: "#e0f7ff", fontWeight: 600 }}
            />
          </Tooltip>
        </Box>

        {/* KPI-rad */}
        <Box
          sx={{
            display: "flex", flexDirection: { xs: "column", md: "row" },
            gap: { xs: 2.5, md: 6 }, alignItems: "center", justifyContent: "center",
          }}
        >
          <Box sx={{ minWidth: 220, display: "flex", flexDirection: "column", gap: 0.6 }}>
            <Typography variant="subtitle2" sx={{ color: "rgba(148, 163, 184, 0.75)" }}>
              Aktuell kurs (SEK)
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {currentPriceSEK != null ? price2Formatter.format(currentPriceSEK) : "–"}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(148, 163, 184, 0.75)" }}>
              {priceUpdated ? `Senast uppdaterad ${priceUpdated}` : "Prisdata saknas"}
            </Typography>
          </Box>

          <Box sx={{ minWidth: 220, display: "flex", flexDirection: "column", gap: 0.6 }}>
            <Typography variant="subtitle2" sx={{ color: "rgba(148, 163, 184, 0.75)" }}>
              Normaliserad årlig EPS (SEK)
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {annualEpsSEK ? price2Formatter.format(annualEpsSEK) : "–"}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(148, 163, 184, 0.75)" }}>
              Jämförelse TTM: {annualEpsTTMSEK ? price2Formatter.format(annualEpsTTMSEK) : "–"} SEK
            </Typography>
          </Box>

          {yoyGrowth !== null && (
            <Box sx={{ minWidth: 220, display: "flex", flexDirection: "column", gap: 0.6 }}>
              <Typography variant="subtitle2" sx={{ color: "rgba(148, 163, 184, 0.75)" }}>
                TTM EPS YoY
              </Typography>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, color: (yoyGrowth ?? 0) >= 0 ? "#34d399" : "#f87171" }}
              >
                {(yoyGrowth ?? 0) >= 0 ? "+" : ""}
                {pct1.format((yoyGrowth ?? 0) * 100)}%
              </Typography>
            </Box>
          )}
        </Box>

        {/* Tre små KPI-kort */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                position: "relative",
                overflow: "hidden",
                background: "linear-gradient(135deg, rgba(56, 189, 248, 0.14), rgba(129, 140, 248, 0.12))",
                borderRadius: "14px",
                p: 2.5,
                border: "1px solid rgba(56, 189, 248, 0.55)",
                textAlign: "center",
                boxShadow: "0 16px 30px rgba(15, 23, 42, 0.3)",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  inset: 0,
                  borderRadius: "inherit",
                  borderTop: "3px solid rgba(190, 242, 255, 0.65)",
                  opacity: 0.85,
                  pointerEvents: "none",
                },
              }}
            >
              <Typography variant="subtitle2" sx={{ color: "rgba(148, 163, 184, 0.75)" }}>
                Rörelsemarginal (snitt 4Q)
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {avgMargin != null ? `${pct1.format(avgMargin)}%` : "–"}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                position: "relative",
                overflow: "hidden",
                background: "linear-gradient(135deg, rgba(74, 222, 128, 0.16), rgba(34, 197, 94, 0.12))",
                borderRadius: "14px",
                p: 2.5,
                border: "1px solid rgba(34, 197, 94, 0.55)",
                textAlign: "center",
                boxShadow: "0 16px 30px rgba(15, 23, 42, 0.3)",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  inset: 0,
                  borderRadius: "inherit",
                  borderTop: "3px solid rgba(187, 247, 208, 0.65)",
                  opacity: 0.85,
                  pointerEvents: "none",
                },
              }}
            >
              <Typography variant="subtitle2" sx={{ color: "rgba(148, 163, 184, 0.75)" }}>
                Omsättning TTM (MSEK)
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {revTtmMEUR != null ? int0.format(revTtmMEUR * fx) : "–"}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* SCENARION */}
        <Grid
          container
          spacing={2}
          sx={{ width: "100%", maxWidth: 1200, mx: "auto", justifyContent: "center", alignItems: "stretch" }}
        >
          {scenarios.map((s) => (
            <Grid item xs={12} sm={6} md={4} key={s.id} sx={{ display: "flex" }}>
              <Box
                sx={{
                  background: "rgba(255, 255, 255, 0.03)",
                  borderRadius: "14px",
                  p: 2.5,
                  border: `1px solid ${s.color}44`,
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  height: "100%",
                  flex: 1,
                  minHeight: { xs: 220, sm: 240, md: 260 },
                  justifyContent: "space-between",
                  gap: 1.25,
                }}
              >
                <Chip
                  label={s.label}
                  icon={React.cloneElement(s.icon, { sx: { color: `${s.color} !important` } })}
                  sx={{ backgroundColor: `${s.color}1A`, color: s.color, fontWeight: 600 }}
                />
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {numberFormatter.format(s.impliedPriceSEK)}
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(226, 232, 240, 0.75)" }}>
                  PE {s.pe}x • 1Y fwd EPS (omräknad till SEK) via 8Q-normalisering
                </Typography>
                {typeof s.upsidePct === "number" && (
                  <Typography
                    variant="body2"
                    sx={{ color: (s.upsidePct ?? 0) >= 0 ? "#34d399" : "#f87171", fontWeight: 600 }}
                  >
                    {(s.upsidePct ?? 0) >= 0 ? "+" : ""}
                    {pct1.format(s.upsidePct)}% mot aktuell kurs
                  </Typography>
                )}
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Metod & varningar */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle2" sx={{ color: "#e0f2ff", mb: 1 }}>
            Metod & antaganden
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(226, 232, 240, 0.75)" }}>
            • **Normalisering:** Vi använder 8 kvartal (summa × 4/N) för att få en rättvis årlig EPS.
            <br />
            • **Tillväxt:** 1Y framåtblick baseras på TTM YoY, clampad till [{(MIN_FWD_GROWTH*100).toFixed(0)}%, {(MAX_FWD_GROWTH*100).toFixed(0)}%].
            <br />
            • **Multipel:** Sätts dynamiskt utifrån tillväxt + rörelsemarginal (kvalitet). Bear/Bull = ±20% multipel och ±5 pp tillväxt.
            <br />
            • **Valuta:** EPS i EUR → SEK via {fxPairLabel} {fxStr}.
          </Typography>
        </Box>

        <Alert
          severity="info"
          sx={{
            backgroundColor: "rgba(0, 229, 255, 0.08)",
            color: "#e0f7ff",
            mt: 3,
            border: "1px solid rgba(0, 229, 255, 0.35)",
            textAlign: "center",
            "& .MuiAlert-icon": { color: "#00e5ff" },
          }}
        >
          Notera: Inga engångsposter justeras här. Vill du vara strikt kan vi exkludera outliers,
          lägga till buyback-yield och/eller göra en enkel DCF för korscheck.
        </Alert>
      </CardContent>
    </Card>
  );
};

export default FairValueCard;
