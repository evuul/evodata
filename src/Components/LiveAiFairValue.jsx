'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Grid,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  LinearProgress,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import { useFxRateContext } from '@/context/FxRateContext';
import { useStockPriceContext } from '@/context/StockPriceContext';
import { computeFairValueInsights, MIN_FWD_GROWTH, MAX_FWD_GROWTH } from '@/lib/fairValueUtils';

const currency0 = new Intl.NumberFormat('sv-SE', {
  style: 'currency',
  currency: 'SEK',
  maximumFractionDigits: 0,
});

const currency2 = new Intl.NumberFormat('sv-SE', {
  style: 'currency',
  currency: 'SEK',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const pct1 = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 1 });
const num1 = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 1 });
const int0 = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 });

const scenarioPalette = {
  fair: { color: '#22c55e', Icon: TrendingUpIcon, label: 'Fair' },
  bull: { color: '#38bdf8', Icon: TrendingUpIcon, label: 'Bull' },
  bear: { color: '#ef4444', Icon: TrendingDownIcon, label: 'Bear' },
};

const defaultScenario = { color: '#38bdf8', Icon: TrendingUpIcon, label: 'Fair' };

const toPriceNumber = (value) => {
  const raw = Number(value?.raw ?? value);
  return Number.isFinite(raw) && raw > 0 ? raw : null;
};

const formatTime = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('sv-SE', { hour: '2-digit', minute: '2-digit' }).format(date);
};

const formatDateTime = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export default function LiveAiFairValue({ reports = [], buyback }) {
  const {
    rate: fxRate,
    loading: fxLoading,
    meta: fxMeta,
    lastUpdated: fxUpdated,
    error: fxError,
  } = useFxRateContext();
  const {
    stockPrice,
    loading: priceLoading,
    lastUpdated: priceUpdated,
    error: priceError,
  } = useStockPriceContext();

  const fx = Number(fxRate);
  const fxPairLabel =
    fxMeta?.base && fxMeta?.quote ? `${fxMeta.base}/${fxMeta.quote}` : 'EUR/SEK';
  const fxFormatted = Number.isFinite(fx)
    ? fx.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '–';

  const currentPriceSEK = useMemo(() => {
    const price = toPriceNumber(stockPrice?.price?.regularMarketPrice);
    if (price != null) return price;
    const close = toPriceNumber(stockPrice?.price?.regularMarketPreviousClose ?? stockPrice?.price?.previousClose);
    return close;
  }, [stockPrice]);

  const fairValue = useMemo(
    () =>
      computeFairValueInsights({
        reports,
        buyback,
        fxRate: fx,
        currentPriceSEK,
      }),
    [reports, buyback, fx, currentPriceSEK]
  );

  const [scenarioId, setScenarioId] = useState(() => fairValue.scenarios[0]?.id ?? 'fair');

  useEffect(() => {
    if (!fairValue.scenarios.length) return;
    if (!fairValue.scenarios.some((scenario) => scenario.id === scenarioId)) {
      setScenarioId(fairValue.scenarios[0].id);
    }
  }, [fairValue.scenarios, scenarioId]);

  const handleScenarioChange = useCallback((_, next) => {
    if (next) setScenarioId(next);
  }, []);

  const activeScenario =
    fairValue.scenarios.find((scenario) => scenario.id === scenarioId) ??
    fairValue.scenarios[0] ??
    null;

  const scenarioInfo = activeScenario
    ? scenarioPalette[activeScenario.id] ?? defaultScenario
    : defaultScenario;

  const impliedPriceLabel =
    activeScenario && Number.isFinite(activeScenario.impliedPriceSEK)
      ? currency0.format(activeScenario.impliedPriceSEK)
      : '–';

  const upsideValue =
    activeScenario && Number.isFinite(activeScenario.upsidePct) ? activeScenario.upsidePct : null;
  const upsideLabel =
    upsideValue != null
      ? `${upsideValue >= 0 ? '+' : ''}${pct1.format(upsideValue)}%`
      : '–';
  const upsideProgress =
    upsideValue != null ? Math.max(Math.min(upsideValue + 50, 100), 0) : null;

  const fwdEpsLabel =
    activeScenario && Number.isFinite(activeScenario.fwdEpsSEK)
      ? currency2.format(activeScenario.fwdEpsSEK)
      : '–';

  const growthLabel =
    activeScenario && Number.isFinite(activeScenario.growth)
      ? `${activeScenario.growth >= 0 ? '+' : ''}${pct1.format(activeScenario.growth * 100)}%`
      : '–';

  const buybackLabel =
    activeScenario && Number.isFinite(activeScenario.buybackRate)
      ? `${Math.round(activeScenario.buybackRate * 100)}%`
      : '–';

  const ttmEpsLabel = Number.isFinite(fairValue.annualEpsTTMSEK)
    ? currency2.format(fairValue.annualEpsTTMSEK)
    : '–';

  const normEpsLabel = Number.isFinite(fairValue.annualEpsNormSEK)
    ? currency2.format(fairValue.annualEpsNormSEK)
    : '–';

  const marginLabel =
    fairValue.avgMargin != null ? `${num1.format(fairValue.avgMargin)}%` : '–';

  const revenueLabel =
    fairValue.revTtmMEUR != null && Number.isFinite(fairValue.revTtmMEUR) && Number.isFinite(fx)
      ? `${int0.format(fairValue.revTtmMEUR * fx)} MSEK`
      : '–';

  const bbBoostLabel =
    fairValue.bbInfo && Number.isFinite(fairValue.bbInfo.baseBoostPct)
      ? `+${pct1.format(fairValue.bbInfo.baseBoostPct)}%`
      : '–';

  const scenarioOptions = fairValue.scenarios.map((scenario) => {
    const palette = scenarioPalette[scenario.id] ?? defaultScenario;
    return {
      id: scenario.id,
      label: palette.label ?? scenario.label,
      color: palette.color,
    };
  });

  const dataUnavailable = fairValue.scenarios.length === 0;

  return (
    <Box
      sx={{
        background: 'linear-gradient(140deg, rgba(15,23,42,0.95), rgba(12,20,35,0.92))',
        borderRadius: '24px',
        border: '1px solid rgba(148,163,184,0.18)',
        boxShadow: '0 28px 60px rgba(15,23,42,0.55)',
        px: { xs: 2.4, sm: 3, md: 3.6 },
        py: { xs: 2.8, sm: 3.2, md: 3.4 },
      }}
    >
      <Stack spacing={{ xs: 2.4, sm: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 1.4, sm: 2 }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1.2} alignItems="center">
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#f8fafc' }}>
              Live AI Fair Value
            </Typography>
            <Chip
              size="small"
              icon={<AutoAwesomeIcon sx={{ color: '#fef9c3 !important' }} />}
              label="AI"
              sx={{
                backgroundColor: 'rgba(250,204,21,0.16)',
                color: '#fde047',
                borderRadius: '999px',
                border: '1px solid rgba(250,204,21,0.35)',
                fontWeight: 600,
              }}
            />
            {fairValue.latestLabel && (
              <Chip
                size="small"
                icon={<InfoOutlinedIcon sx={{ color: '#bae6fd !important' }} />}
                label={`Rapport: ${fairValue.latestLabel}`}
                sx={{
                  backgroundColor: 'rgba(56,189,248,0.12)',
                  color: '#bae6fd',
                  borderRadius: '999px',
                  border: '1px solid rgba(56,189,248,0.38)',
                  fontWeight: 600,
                }}
              />
            )}
          </Stack>

          <Stack direction="row" spacing={1.2} flexWrap="wrap">
            <Chip
              size="small"
              icon={<CurrencyExchangeIcon sx={{ color: '#c4b5fd !important' }} />}
              label={`${fxPairLabel} ${fxFormatted}`}
              sx={{
                backgroundColor: 'rgba(196,181,253,0.12)',
                color: '#ddd6fe',
                borderRadius: '10px',
                border: '1px solid rgba(196,181,253,0.35)',
              }}
            />
            <Chip
              size="small"
              icon={<AccessTimeIcon sx={{ color: '#fda4af !important' }} />}
              label={`Kurs uppd: ${formatTime(priceUpdated) ?? '–'}`}
              sx={{
                backgroundColor: 'rgba(244,114,182,0.12)',
                color: '#fda4af',
                borderRadius: '10px',
                border: '1px solid rgba(244,114,182,0.35)',
              }}
            />
            <Chip
              size="small"
              icon={<AccessTimeIcon sx={{ color: '#bfdbfe !important' }} />}
              label={`FX uppd: ${formatTime(fxUpdated) ?? '–'}`}
              sx={{
                backgroundColor: 'rgba(96,165,250,0.12)',
                color: '#bfdbfe',
                borderRadius: '10px',
                border: '1px solid rgba(96,165,250,0.35)',
              }}
            />
          </Stack>
        </Stack>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 1.6, sm: 2.4 }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
        >
          <Typography variant="body2" sx={{ color: 'rgba(226,232,240,0.72)', maxWidth: 600 }}>
            Normaliserad AI-modell väger samman 8Q EPS, clampad tillväxt och nettoåterköp för att uppskatta värderingsspann. Välj scenario för att se antaganden och potentiell uppsida.
          </Typography>
          {scenarioOptions.length > 0 && (
            <ToggleButtonGroup
              value={scenarioId}
              exclusive
              onChange={handleScenarioChange}
              size="small"
              sx={{
                backgroundColor: 'rgba(15,23,42,0.6)',
                borderRadius: '999px',
                p: '4px',
              }}
            >
              {scenarioOptions.map((option) => (
                <ToggleButton
                  key={option.id}
                  value={option.id}
                  sx={{
                    px: 2.4,
                    borderRadius: '999px !important',
                    border: 'none',
                    color: 'rgba(226,232,240,0.78)',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&.Mui-selected': {
                      color: option.color,
                      backgroundColor: `${option.color}1A`,
                      border: `1px solid ${option.color}44`,
                    },
                    '&:not(.Mui-selected)': {
                      backgroundColor: 'transparent',
                    },
                  }}
                >
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}
        </Stack>

        <Divider sx={{ borderColor: 'rgba(148,163,184,0.18)' }} />

        {dataUnavailable ? (
          <Box
            sx={{
              background: 'rgba(15,23,42,0.75)',
              borderRadius: '18px',
              border: '1px dashed rgba(148,163,184,0.35)',
              p: 3,
            }}
          >
            <Typography variant="body1" sx={{ color: 'rgba(226,232,240,0.82)', fontWeight: 500 }}>
              AI:n saknar tillräcklig kvartalsdata för att beräkna ett värde. Säkerställ att minst 8 kvartal med EPS finns i underlaget.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={{ xs: 2.4, sm: 3 }}>
            <Grid container spacing={2.4}>
              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    background: 'rgba(15,23,42,0.7)',
                    borderRadius: '18px',
                    border: '1px solid rgba(148,163,184,0.25)',
                    p: 2.8,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.6,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle2" sx={{ color: 'rgba(148,163,184,0.8)' }}>
                      Aktuell kurs
                    </Typography>
                    {(priceLoading || priceError) && (
                      <Chip
                        size="small"
                        label={priceLoading ? 'Live' : 'Fel'}
                        sx={{
                          height: 22,
                          backgroundColor: priceError
                            ? 'rgba(248,113,113,0.15)'
                            : 'rgba(129,140,248,0.2)',
                          color: priceError ? '#fca5a5' : '#c4b5fd',
                          borderRadius: '999px',
                        }}
                      />
                    )}
                  </Stack>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#f8fafc' }}>
                    {currentPriceSEK != null ? currency2.format(currentPriceSEK) : '–'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.7)' }}>
                    Uppdaterad {formatDateTime(priceUpdated) ?? 'okänt'}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    background: `${scenarioInfo.color}12`,
                    borderRadius: '18px',
                    border: `1px solid ${scenarioInfo.color}40`,
                    p: 2.8,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.4,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      background: `radial-gradient(circle at 20% 0%, ${scenarioInfo.color}22, transparent 60%)`,
                      pointerEvents: 'none',
                    }}
                  />
                  <Stack direction="row" spacing={1} alignItems="center">
                    <scenarioInfo.Icon sx={{ color: scenarioInfo.color }} />
                    <Typography variant="subtitle2" sx={{ color: scenarioInfo.color, fontWeight: 600 }}>
                      AI {scenarioInfo.label}
                    </Typography>
                  </Stack>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: '#f8fafc' }}>
                    {impliedPriceLabel}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: upsideValue != null && upsideValue < 0 ? '#f87171' : '#34d399',
                      fontWeight: 600,
                    }}
                  >
                    {upsideLabel} mot aktuell kurs
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(226,232,240,0.75)' }}>
                    PE {activeScenario?.pe ?? '–'}x • 1Y fwd EPS {fwdEpsLabel}
                  </Typography>
                  <Box>
                    <LinearProgress
                      variant={upsideProgress != null ? 'determinate' : 'indeterminate'}
                      value={upsideProgress ?? 0}
                      sx={{
                        height: 6,
                        borderRadius: 999,
                        backgroundColor: 'rgba(15,23,42,0.5)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 999,
                          backgroundColor: scenarioInfo.color,
                        },
                      }}
                    />
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    background: 'rgba(15,23,42,0.7)',
                    borderRadius: '18px',
                    border: '1px solid rgba(148,163,184,0.25)',
                    p: 2.8,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.1,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: 'rgba(148,163,184,0.75)' }}>
                    Antaganden (scenario)
                  </Typography>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" sx={{ color: 'rgba(226,232,240,0.75)' }}>
                      Tillväxt (1Y)
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#f8fafc', fontWeight: 600 }}>
                      {growthLabel}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" sx={{ color: 'rgba(226,232,240,0.75)' }}>
                      Nettoåterköp
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#f8fafc', fontWeight: 600 }}>
                      {buybackLabel}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" sx={{ color: 'rgba(226,232,240,0.75)' }}>
                      EPS-boost (base)
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#f8fafc', fontWeight: 600 }}>
                      {bbBoostLabel}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.7)' }}>
                    Modellen clampas mellan {(MIN_FWD_GROWTH * 100).toFixed(0)}% och {(MAX_FWD_GROWTH * 100).toFixed(0)}% tillväxt.
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Grid container spacing={2.4}>
              <Grid item xs={12} sm={6} md={3}>
                <Box
                  sx={{
                    background: 'rgba(56,189,248,0.1)',
                    borderRadius: '16px',
                    border: '1px solid rgba(56,189,248,0.3)',
                    p: 2,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: 'rgba(148,163,184,0.75)' }}>
                    EPS (TTM, SEK)
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700 }}>
                    {ttmEpsLabel}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Box
                  sx={{
                    background: 'rgba(34,197,94,0.1)',
                    borderRadius: '16px',
                    border: '1px solid rgba(34,197,94,0.3)',
                    p: 2,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: 'rgba(148,163,184,0.75)' }}>
                    EPS (Normaliserad)
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700 }}>
                    {normEpsLabel}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Box
                  sx={{
                    background: 'rgba(139,92,246,0.1)',
                    borderRadius: '16px',
                    border: '1px solid rgba(139,92,246,0.3)',
                    p: 2,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: 'rgba(148,163,184,0.75)' }}>
                    Rörelsemarginal (4Q snitt)
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700 }}>
                    {marginLabel}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Box
                  sx={{
                    background: 'rgba(96,165,250,0.1)',
                    borderRadius: '16px',
                    border: '1px solid rgba(96,165,250,0.3)',
                    p: 2,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: 'rgba(148,163,184,0.75)' }}>
                    Omsättning TTM
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700 }}>
                    {revenueLabel}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Stack>
        )}

        <Divider sx={{ borderColor: 'rgba(148,163,184,0.18)' }} />

        <Stack spacing={1.4}>
          <Stack direction="row" spacing={0.8} alignItems="center">
            <InfoOutlinedIcon sx={{ fontSize: 18, color: '#93c5fd' }} />
            <Typography variant="subtitle2" sx={{ color: '#cbd5f5', fontWeight: 600 }}>
              Metod & begränsningar
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: 'rgba(203,213,225,0.8)' }}>
            • AI-normaliserad EPS baseras på 8 kvartal och förlängs 12 månader framåt.<br />
            • Tillväxt clampas mellan {(MIN_FWD_GROWTH * 100).toFixed(0)}% och {(MAX_FWD_GROWTH * 100).toFixed(0)}%, multipeln justeras efter marginalkvalitet.<br />
            • Nettoåterköp antas öka EPS enligt 1/(1−y); scenarier varierar både multipel och kassaanvändning.<br />
            • Datahämtning live: aktiekurs {priceError ? 'fel vid hämtning' : 'OK'}, FX {fxError ? 'fel vid hämtning' : 'OK'}.
          </Typography>
        </Stack>

        {(fxLoading || priceLoading) && (
          <LinearProgress
            sx={{
              mt: 1,
              height: 4,
              borderRadius: 999,
              backgroundColor: 'rgba(15,23,42,0.4)',
              '& .MuiLinearProgress-bar': { borderRadius: 999, backgroundColor: '#38bdf8' },
            }}
          />
        )}
      </Stack>
    </Box>
  );
}
