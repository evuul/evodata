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

const quarterToNumber = (q) =>
  q === "Q1" ? 1 : q === "Q2" ? 2 : q === "Q3" ? 3 : q === "Q4" ? 4 : 0;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const currency0 = new Intl.NumberFormat("sv-SE", {
  style: "currency",
  currency: "SEK",
  maximumFractionDigits: 0,
});

const currency2 = new Intl.NumberFormat("sv-SE", {
  style: "currency",
  currency: "SEK",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const pct1 = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 1 });
const int0 = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });

const WINDOW_SMOOTH = 8;
const MAX_FWD_GROWTH = 0.25;
const MIN_FWD_GROWTH = -0.1;
const MIN_PE = 10;
const MAX_PE = 35;
const MIN_BBY = 0.0;
const MAX_BBY = 0.08;

function basePeFromFundamentals(growthYoY, avgOpMargin) {
  const g = (growthYoY ?? 0) * 100;

  let pe =
    g <= 0
      ? 12
      : g <= 5
      ? 14
      : g <= 10
      ? 16
      : g <= 15
      ? 18
      : g <= 20
      ? 20
      : 22;

  if (avgOpMargin != null) {
    if (avgOpMargin >= 65) pe += 3;
    else if (avgOpMargin >= 55) pe += 2;
    else if (avgOpMargin >= 45) pe += 1;
    else if (avgOpMargin < 35) pe -= 1;
  }

  return clamp(pe, MIN_PE, 30);
}

function ttmEps(sortedReports, offsetFromEnd = 0) {
  const end = sortedReports.length - offsetFromEnd;
  const start = Math.max(0, end - 4);
  if (end - start < 4) return null;
  return sortedReports
    .slice(start, end)
    .reduce((acc, r) => acc + (Number(r.adjustedEarningsPerShare) || 0), 0);
}

function normalizedAnnualEps(sortedReports, quarters = WINDOW_SMOOTH) {
  const take = Math.min(quarters, sortedReports.length);
  if (take < 4) return null;
  const window = sortedReports.slice(-take);
  const sumEps = window.reduce(
    (acc, r) => acc + (Number(r.adjustedEarningsPerShare) || 0),
    0
  );
  return (sumEps * 4) / take;
}

function avgOpMargin4Q(sortedReports) {
  const last4 = sortedReports.slice(-4);
  if (last4.length < 4) return null;
  const sum = last4.reduce(
    (acc, r) => acc + (Number(r.adjustedOperatingMargin) || 0),
    0
  );
  return sum / 4;
}

function ttmRevenue(sortedReports) {
  const last4 = sortedReports.slice(-4);
  if (last4.length < 4) return null;
  return last4.reduce(
    (acc, r) => acc + (Number(r.operatingRevenues) || 0),
    0
  );
}

function epsBoostFromBuybacks(yieldValue) {
  const y = clamp(Number(yieldValue) || 0, MIN_BBY, MAX_BBY);
  return 1 / (1 - y) - 1;
}

/**
 * @param {{ reports: Report[], buyback?: { base?: number, bull?: number, bear?: number } }} props
 */
const FairValueCard = ({
  reports,
  buyback = { base: 0.03, bull: 0.04, bear: 0.02 },
}) => {
  const { rate: fxRate, meta: fxMeta } = useFxRateContext();
  const { stockPrice, error: priceError } = useStockPriceContext();

  const fx =
    typeof fxRate === "number" && Number.isFinite(fxRate) ? fxRate : null;

  const fxPairLabel =
    fxMeta?.base && fxMeta?.quote ? `${fxMeta.base}/${fxMeta.quote}` : "EUR/SEK";
  const fxStr =
    typeof fx === "number"
      ? fx.toLocaleString("sv-SE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "–";

  const marketRaw = stockPrice?.price?.regularMarketPrice?.raw;
  const currentPriceSEK =
    !priceError && typeof marketRaw === "number" && Number.isFinite(marketRaw)
      ? marketRaw
      : null;

  const {
    latestLabel,
    annualEpsTTMSEK,
    annualEpsNormSEK,
    avgMargin,
    yoyGrowth,
    revTtmMEUR,
    scenarios,
    bbInfo,
  } = useMemo(() => {
    const empty = {
      latestLabel: "",
      annualEpsTTMSEK: 0,
      annualEpsNormSEK: 0,
      avgMargin: null,
      yoyGrowth: null,
      revTtmMEUR: null,
      scenarios: [],
      bbInfo: { base: 0, bull: 0, bear: 0, baseBoostPct: 0 },
    };

    if (!Array.isArray(reports) || reports.length === 0 || !fx) {
      return empty;
    }

    const sorted = [...reports].sort((a, b) =>
      a.year !== b.year
        ? a.year - b.year
        : quarterToNumber(a.quarter) - quarterToNumber(b.quarter)
    );

    const last = sorted.at(-1);
    const latestLabel = last ? `${last.year} ${last.quarter}` : "";

    const ttmNow = ttmEps(sorted, 0);
    const ttmPrev = ttmEps(sorted, 4);
    const epsNorm = normalizedAnnualEps(sorted, WINDOW_SMOOTH);
    if (ttmNow == null || epsNorm == null) {
      return empty;
    }

    const yoy = ttmPrev && ttmPrev > 0 ? (ttmNow - ttmPrev) / ttmPrev : 0;
    const baseGrowth = clamp(yoy, MIN_FWD_GROWTH, MAX_FWD_GROWTH);

    const avgMargin = avgOpMargin4Q(sorted);
    const peBase = basePeFromFundamentals(baseGrowth, avgMargin);
    const peBull = clamp(Math.round(peBase * 1.2), MIN_PE, MAX_PE);
    const peBear = clamp(Math.round(peBase * 0.8), MIN_PE, MAX_PE);

    const bullGrowth = clamp(
      baseGrowth + 0.05,
      MIN_FWD_GROWTH,
      MAX_FWD_GROWTH
    );
    const bearGrowth = clamp(
      baseGrowth - 0.05,
      MIN_FWD_GROWTH,
      MAX_FWD_GROWTH
    );

    const bbBase = clamp(buyback?.base ?? 0.03, MIN_BBY, MAX_BBY);
    const bbBull = clamp(
      buyback?.bull ?? bbBase + 0.01,
      MIN_BBY,
      MAX_BBY
    );
    const bbBear = clamp(
      buyback?.bear ?? Math.max(0, bbBase - 0.01),
      MIN_BBY,
      MAX_BBY
    );

    const fwdEpsBaseEUR = (epsNorm * (1 + baseGrowth)) / (1 - bbBase);
    const fwdEpsBullEUR = (epsNorm * (1 + bullGrowth)) / (1 - bbBull);
    const fwdEpsBearEUR = (epsNorm * (1 + bearGrowth)) / (1 - bbBear);

    const fairSEK = peBase * fwdEpsBaseEUR * fx;
    const bullSEK = peBull * fwdEpsBullEUR * fx;
    const bearSEK = peBear * fwdEpsBearEUR * fx;

    const scenarios = [
      {
        id: "fair",
        label: "Fair Value",
        pe: peBase,
        description: `Normaliserad vinst + ${Math.round(
          bbBase * 100
        )}% nettoåterköp.`,
        color: "#22c55e",
        icon: <TrendingUpIcon fontSize="small" />,
        impliedPriceSEK: fairSEK,
        upsidePct:
          currentPriceSEK && currentPriceSEK > 0
            ? ((fairSEK - currentPriceSEK) / currentPriceSEK) * 100
            : null,
      },
      {
        id: "bull",
        label: "Bull",
        pe: peBull,
        description: `Starkare tillväxt + ${Math.round(
          bbBull * 100
        )}% nettoåterköp.`,
        color: "#38bdf8",
        icon: <TrendingUpIcon fontSize="small" />,
        impliedPriceSEK: bullSEK,
        upsidePct:
          currentPriceSEK && currentPriceSEK > 0
            ? ((bullSEK - currentPriceSEK) / currentPriceSEK) * 100
            : null,
      },
      {
        id: "bear",
        label: "Bear",
        pe: peBear,
        description: `Dämpad tillväxt + ${Math.round(
          bbBear * 100
        )}% nettoåterköp.`,
        color: "#ef4444",
        icon: <TrendingDownIcon fontSize="small" />,
        impliedPriceSEK: bearSEK,
        upsidePct:
          currentPriceSEK && currentPriceSEK > 0
            ? ((bearSEK - currentPriceSEK) / currentPriceSEK) * 100
            : null,
      },
    ];

    const revTtm = ttmRevenue(sorted);
    const annualEpsTTMSEK = ttmNow * fx;
    const annualEpsNormSEK = epsNorm * fx;

    return {
      latestLabel,
      annualEpsTTMSEK,
      annualEpsNormSEK,
      avgMargin,
      yoyGrowth: yoy,
      revTtmMEUR: revTtm,
      scenarios,
      bbInfo: {
        base: bbBase,
        bull: bbBull,
        bear: bbBear,
        baseBoostPct: epsBoostFromBuybacks(bbBase) * 100,
      },
    };
  }, [reports, fx, currentPriceSEK, buyback]);

  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        color: "#f8fafc",
        borderRadius: "16px",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
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
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Fair Value (inkl. återköp)
            </Typography>
          </Box>
          <Tooltip
            title="8Q-normaliserad EPS → framåtblickande tillväxt med clamp → EPS-boost via nettoåterköp → multipel baserad på tillväxt + marginal."
          >
            <Chip
              icon={<InfoOutlinedIcon sx={{ color: "#f8fafc !important" }} />}
              label="Metod"
              sx={{
                backgroundColor: "rgba(0,229,255,0.15)",
                color: "#e0f7ff",
                fontWeight: 600,
              }}
            />
          </Tooltip>
        </Box>

        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: { xs: 2, md: 4 },
            alignItems: "stretch",
            justifyContent: "center",
          }}
        >
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              background: "rgba(255,255,255,0.04)",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.06)",
              p: 2,
              textAlign: "center",
            }}
          >
            <Typography variant="subtitle2" sx={{ color: "rgba(148,163,184,0.75)" }}>
              Aktuell kurs (SEK)
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {currentPriceSEK != null ? currency2.format(currentPriceSEK) : "–"}
            </Typography>
          </Box>

          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              background: "rgba(255,255,255,0.04)",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.06)",
              p: 2,
              textAlign: "center",
            }}
          >
            <Typography variant="subtitle2" sx={{ color: "rgba(148,163,184,0.75)" }}>
              EPS (TTM, SEK)
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {annualEpsTTMSEK ? currency2.format(annualEpsTTMSEK) : "–"}
            </Typography>
          </Box>

          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              background: "rgba(255,255,255,0.04)",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.06)",
              p: 2,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: 0.6,
              justifyContent: "center",
            }}
          >
            <Typography variant="subtitle2" sx={{ color: "rgba(148,163,184,0.75)" }}>
              Nettoåterköp (antagande)
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                display: "flex",
                flexWrap: "wrap",
                gap: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Box component="span" sx={{ color: "#22c55e", fontWeight: 700 }}>
                Base {Math.round((bbInfo?.base ?? 0) * 100)}%
              </Box>
              <Box component="span" sx={{ color: "#38bdf8", fontWeight: 700 }}>
                Bull {Math.round((bbInfo?.bull ?? 0) * 100)}%
              </Box>
              <Box component="span" sx={{ color: "#ef4444", fontWeight: 700 }}>
                Bear {Math.round((bbInfo?.bear ?? 0) * 100)}%
              </Box>
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.75)" }}>
              EPS-boost (base): +{pct1.format(bbInfo?.baseBoostPct ?? 0)}%-enheter
            </Typography>
          </Box>
        </Box>

        <Grid
          container
          spacing={2}
          sx={{ mb: 3, justifyContent: "center", alignItems: "stretch" }}
        >
          <Grid item xs={12} sm={8} md={5} lg={4}>
            <Box
              sx={{
                background: "rgba(56,189,248,0.08)",
                borderRadius: "14px",
                p: 2.5,
                border: "1px solid rgba(56,189,248,0.4)",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 16px 30px rgba(15,23,42,0.28)",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  inset: 0,
                  borderRadius: "inherit",
                  borderTop: "3px solid rgba(190,242,255,0.65)",
                  pointerEvents: "none",
                },
              }}
            >
              <Typography variant="subtitle2" sx={{ color: "rgba(148,163,184,0.75)" }}>
                Rörelsemarginal (snitt 4Q)
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {avgMargin != null ? `${pct1.format(avgMargin)}%` : "–"}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={8} md={5} lg={4}>
            <Box
              sx={{
                background: "rgba(34,197,94,0.08)",
                borderRadius: "14px",
                p: 2.5,
                border: "1px solid rgba(34,197,94,0.4)",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 16px 30px rgba(15,23,42,0.28)",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  inset: 0,
                  borderRadius: "inherit",
                  borderTop: "3px solid rgba(187,247,208,0.65)",
                  pointerEvents: "none",
                },
              }}
            >
              <Typography variant="subtitle2" sx={{ color: "rgba(148,163,184,0.75)" }}>
                Omsättning TTM (MSEK)
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {revTtmMEUR != null ? int0.format(revTtmMEUR * fx) : "–"}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Grid
          container
          spacing={2}
          sx={{
            width: "100%",
            maxWidth: 1200,
            mx: "auto",
            justifyContent: "center",
            alignItems: "stretch",
          }}
        >
          {scenarios.map((scenario) => (
            <Grid item xs={12} sm={6} md={4} key={scenario.id} sx={{ display: "flex" }}>
              <Box
                sx={{
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "14px",
                  p: 2.5,
                  border: `1px solid ${scenario.color}44`,
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
                  label={scenario.label}
                  icon={React.cloneElement(scenario.icon, {
                    sx: { color: `${scenario.color} !important` },
                  })}
                  sx={{
                    backgroundColor: `${scenario.color}1A`,
                    color: scenario.color,
                    fontWeight: 600,
                  }}
                />
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {currency0.format(scenario.impliedPriceSEK)}
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.75)" }}>
                  PE {scenario.pe}x • 1Y fwd EPS (inkl. buybacks)
                </Typography>
                {typeof scenario.upsidePct === "number" && (
                  <Typography
                    variant="body2"
                    sx={{
                      color:
                        (scenario.upsidePct ?? 0) >= 0 ? "#34d399" : "#f87171",
                      fontWeight: 600,
                    }}
                  >
                    {(scenario.upsidePct ?? 0) >= 0 ? "+" : ""}
                    {pct1.format(scenario.upsidePct)}% mot aktuell kurs
                  </Typography>
                )}
              </Box>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle2" sx={{ color: "#e0f2ff", mb: 1 }}>
            Metod & antaganden
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.75)" }}>
            • 8 kvartal normaliserar EPS innan prognos; tillväxt clampas mellan {(MIN_FWD_GROWTH * 100).toFixed(0)}% och{" "}
            {(MAX_FWD_GROWTH * 100).toFixed(0)}%.
            <br />
            • Nettoåterköp antas ge EPS-boost via 1/(1−y). Scenarier: base {Math.round((bbInfo?.base ?? 0) * 100)}%, bull{" "}
            {Math.round((bbInfo?.bull ?? 0) * 100)}%, bear {Math.round((bbInfo?.bear ?? 0) * 100)}%.
            <br />
            • Multipeln baseras på tillväxt + marginalkvalitet; bull/bear varierar multipel ±20% och tillväxt ±5 pp.
            <br />
            • Alla belopp visas i SEK med {fxPairLabel} {fxStr}; omsättning anges i MSEK.
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
          AI har analyserat rapporterna och genererat dessa scenarier – betrakta dem inte som finansiell rådgivning.
        </Alert>
      </CardContent>
    </Card>
  );
};

export default FairValueCard;
