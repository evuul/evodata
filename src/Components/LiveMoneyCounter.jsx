'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Stack,
  Grid,
  Tooltip,
  useTheme,
} from '@mui/material';
import useMediaQuery from '@/lib/useMuiMediaQuery';
import financialReports from '@/app/data/financialReports.json';
import { useFxRateContext } from '@/context/FxRateContext';
import { useStockPriceContext } from '@/context/StockPriceContext';
import { useTranslate } from '@/context/LocaleContext';

const QUARTER_ORDER = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };

const formatSEK = (value, fractionDigits = 0) =>
  Number.isFinite(value)
    ? value.toLocaleString('sv-SE', {
        maximumFractionDigits: fractionDigits,
        minimumFractionDigits: fractionDigits,
      })
    : '–';

const formatCurrency = (value) => `${formatSEK(value, 0)} SEK`;

const findLatestReport = (reports) => {
  if (!Array.isArray(reports)) return null;
  return reports.reduce((latest, current) => {
    const latestYear = Number(latest?.year) || 0;
    const currentYear = Number(current?.year) || 0;
    if (currentYear !== latestYear) {
      return currentYear > latestYear ? current : latest;
    }
    const latestQ = QUARTER_ORDER[latest?.quarter] || 0;
    const currentQ = QUARTER_ORDER[current?.quarter] || 0;
    return currentQ > latestQ ? current : latest;
  }, reports[0]);
};

const quarterDayCount = (year, quarter) => {
  const q = QUARTER_ORDER[quarter] || 0;
  if (!Number.isFinite(year) || !q) return 92;
  const startMonth = (q - 1) * 3;
  const start = new Date(Date.UTC(year, startMonth, 1));
  const end = new Date(Date.UTC(year, startMonth + 3, 0));
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / (24 * 60 * 60 * 1000)) + 1);
};

const LiveMoneyCounter = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const translate = useTranslate();
  const { rate: fxRate } = useFxRateContext();
  const { stockPrice, marketCap } = useStockPriceContext();

  const latestReport = useMemo(
    () => findLatestReport(financialReports?.financialReports),
    []
  );

  const currentYearProfitMEUR = useMemo(() => {
    if (!latestReport) return null;
    const year = latestReport.year;
    const reports = financialReports?.financialReports || [];
    const total = reports
      .filter((r) => r?.year === year)
      .reduce((sum, r) => {
        const val = Number(r?.adjustedProfitForPeriod);
        return sum + (Number.isFinite(val) ? val : 0);
      }, 0);
    return Number.isFinite(total) ? total : null;
  }, [latestReport]);

  const profitMEUR = Number(latestReport?.adjustedProfitForPeriod) || 0;
  const daysInQuarter = quarterDayCount(Number(latestReport?.year), latestReport?.quarter);
  const fx = Number.isFinite(fxRate) && fxRate > 0 ? fxRate : 11.02;
  const totalProfitSEK = profitMEUR * 1_000_000 * fx;
  const perDay = totalProfitSEK / daysInQuarter;
  const perSecond = totalProfitSEK / (daysInQuarter * 24 * 60 * 60);
  const perMinute = perSecond * 60;
  const perHour = perSecond * 3600;

  const currentPrice = Number(stockPrice?.price?.regularMarketPrice?.raw) || null;
  const totalSharesOutstanding =
    currentPrice && Number.isFinite(marketCap)
      ? Math.round(marketCap / currentPrice)
      : null;
  const perShare = totalSharesOutstanding
    ? totalProfitSEK / totalSharesOutstanding
    : null;

  const [counterValue, setCounterValue] = useState(0);

  useEffect(() => {
    if (!(perSecond > 0)) {
      setCounterValue(totalProfitSEK);
      return () => {};
    }
    const start = Date.now();
    const durationMs = 10_000; // animate for 10 seconds up to total
    const tick = () => {
      const elapsed = Date.now() - start;
      if (elapsed >= durationMs) {
        setCounterValue(totalProfitSEK);
        return;
      }
      const progress = elapsed / durationMs;
      setCounterValue(totalProfitSEK * progress);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => {};
  }, [perSecond, totalProfitSEK]);

  const chips = [
    {
      label: translate(`≈ ${formatSEK(perSecond, 0)} SEK / sekund`, `≈ ${formatSEK(perSecond, 0)} SEK / second`),
      tooltip: translate(
        'Genomsnitt baserat på total Q3-vinst dividerat med kvartalets sekunder.',
        "Average based on total Q3 earnings divided by the quarter's seconds."
      ),
      color: '#38bdf8',
      value: perSecond,
    },
    {
      label: translate(`≈ ${formatSEK(perMinute, 0)} SEK / minut`, `≈ ${formatSEK(perMinute, 0)} SEK / minute`),
      tooltip: translate('Genomsnitt per minut.', 'Average per minute.'),
      color: '#f97316',
      value: perMinute,
    },
    {
      label: translate(`≈ ${formatSEK(perHour, 0)} SEK / timme`, `≈ ${formatSEK(perHour, 0)} SEK / hour`),
      tooltip: translate('Genomsnitt per timme.', 'Average per hour.'),
      color: '#34d399',
      value: perHour,
    },
    {
      label: translate(`≈ ${formatSEK(perDay, 0)} SEK / dag`, `≈ ${formatSEK(perDay, 0)} SEK / day`),
      tooltip: translate(`Antag ${daysInQuarter} dagar i ${latestReport?.quarter || "Q?"}.`, `Assumes ${daysInQuarter} days in ${latestReport?.quarter || "Q?"}.`),
      color: '#c084fc',
      value: perDay,
    },
  ];

  const summaryCards = [
    {
      title: translate(`Totalt ${latestReport?.quarter || "Q?"}`, `Total ${latestReport?.quarter || "Q?"}`),
      value: formatCurrency(totalProfitSEK),
      subtitle: translate(`${profitMEUR.toFixed(2)} M€`, `${profitMEUR.toFixed(2)} M€`),
    },
    {
      title: translate('Årets justerade vinst', 'Adjusted profit YTD'),
      value:
        currentYearProfitMEUR != null
          ? `${formatSEK(currentYearProfitMEUR, 1)} M€`
          : '–',
      subtitle:
        currentYearProfitMEUR != null
          ? `${formatCurrency(currentYearProfitMEUR * 1_000_000 * fx)}`
          : translate('Data saknas', 'Data missing'),
    },
    {
      title: translate('Per aktie', 'Per share'),
      value: perShare != null ? `${formatSEK(perShare, 2)} SEK` : '–',
      subtitle: totalSharesOutstanding
        ? translate(`${formatSEK(totalSharesOutstanding)} aktier`, `${formatSEK(totalSharesOutstanding)} shares`)
        : translate('Antal aktier saknas', 'Share count missing'),
    },
    {
      title: translate('Period', 'Period'),
      value: latestReport ? `${latestReport.quarter} ${latestReport.year}` : translate('Okänt', 'Unknown'),
      subtitle: translate('Finansiell rapport', 'Financial report'),
    },
  ];

  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #0f172a, #1f2937)',
        borderRadius: { xs: 0, md: '18px' },
        border: '1px solid rgba(148,163,184,0.18)',
        boxShadow: '0 20px 45px rgba(15, 23, 42, 0.45)',
        color: '#f8fafc',

        // === FULLBREDD / BLEED ===
        mx: { xs: -2, sm: -3, md: 0 },
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 3, md: 4 },
        width: '100%',
        maxWidth: 'min(1700px, 100%)',
        overflow: 'visible',

        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 2.5, md: 3 },
      }}
    >
      <Stack
        direction="column"
        spacing={1.8}
        alignItems="center"
        textAlign="center"
      >
        <Box sx={{ maxWidth: 560 }}>
          <Typography
            variant="overline"
            sx={{ letterSpacing: 1, color: 'rgba(148,163,184,0.75)', textAlign: 'center' }}
          >
            {translate('Live Money', 'Live Money')}
          </Typography>
          <Typography
            variant={isMobile ? 'h5' : 'h4'}
            sx={{ fontWeight: 700, textAlign: 'center' }}
          >
            {translate(
              `${latestReport?.quarter || "Q?"}-vinstindikator`,
              `${latestReport?.quarter || "Q?"} profit indicator`
            )}
          </Typography>
          <Typography
            sx={{
              color: 'rgba(226,232,240,0.7)',
              mt: 1,
              maxWidth: 520,
              mx: 'auto',
              textAlign: 'center',
            }}
          >
            {translate(
              `Realtidssimulering baserad på Evolution's rapporterade justerade nettovinst för senaste kvartal (${latestReport?.quarter || "Q?"}).`,
              `Real-time simulation based on Evolution's reported adjusted net profit for the latest quarter (${latestReport?.quarter || "Q?"}).`
            )}
          </Typography>
        </Box>

        <Stack
          direction="row"
          flexWrap="wrap"
          gap={1}
          justifyContent="center"
          alignItems="center"
        >
          <Chip
            icon={
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#34d399',
                  display: 'inline-block',
                }}
              />
            }
            label={
              latestReport
                ? translate(
                    `Datakälla: ${latestReport.quarter} ${latestReport.year}`,
                    `Data source: ${latestReport.quarter} ${latestReport.year}`
                  )
                : translate('Datakälla saknas', 'Data source missing')
            }
            size="small"
            sx={{
              backgroundColor: 'rgba(52,211,153,0.15)',
              color: '#bbf7d0',
              fontWeight: 500,
            }}
          />
          <Chip
            icon={
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#60a5fa',
                  display: 'inline-block',
                }}
              />
            }
            label={`${translate('FX EUR/SEK', 'FX EUR/SEK')}: ${fx.toFixed(2)}`}
            size="small"
            sx={{
              backgroundColor: 'rgba(96,165,250,0.18)',
              color: '#dbeafe',
              fontWeight: 500,
            }}
          />
        </Stack>
      </Stack>

      <Box
        sx={{
          background: 'rgba(15,23,42,0.55)',
          borderRadius: '16px',
          border: '1px solid rgba(148,163,184,0.18)',
          p: { xs: 2.5, md: 3 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 20% 20%, rgba(59,130,246,0.15), transparent 55%)',
            pointerEvents: 'none',
          }}
        />
        <Stack spacing={2}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              sx={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.9rem' }}
            >
              {translate('Ackumulerat (simulerat)', 'Accumulated (simulated)')}
            </Typography>
            <Typography
              variant={isMobile ? 'h3' : 'h2'}
              sx={{
                fontWeight: 700,
                color: '#f8fafc',
                letterSpacing: 1,
                fontFeatureSettings: '"tnum"',
              }}
            >
              {formatCurrency(counterValue)}
            </Typography>
          </Box>

          <Stack direction="row" flexWrap="wrap" gap={1.2} justifyContent="center">
            {chips.map((chip) => (
              <Tooltip key={chip.label} title={chip.tooltip}>
                <Box
                  sx={{
                    background: 'rgba(15,23,42,0.7)',
                    borderRadius: '12px',
                    border: `1px solid ${chip.color}44`,
                    p: 1.5,
                    minWidth: isMobile ? '100%' : 170,
                    textAlign: 'center',
                  }}
                >
                  <Typography
                    sx={{
                      color: chip.color,
                      fontSize: '0.75rem',
                      letterSpacing: 0.4,
                    }}
                  >
                    {chip.label}
                  </Typography>
                </Box>
              </Tooltip>
            ))}
          </Stack>
        </Stack>
      </Box>

      <Grid container spacing={isMobile ? 1.5 : 2} justifyContent="center">
        {summaryCards.map((card) => (
          <Grid key={card.title} item xs={12} sm={6} md={3}>
            <Box
              sx={{
                background: 'rgba(148,163,184,0.08)',
                borderRadius: '12px',
                border: '1px solid rgba(148,163,184,0.12)',
                p: 2.5,
                textAlign: 'center',
              }}
            >
              <Typography
                sx={{
                  color: 'rgba(148,163,184,0.75)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                {card.title}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#f8fafc' }}>
                {card.value}
              </Typography>
              <Typography
                sx={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.8rem' }}
              >
                {card.subtitle}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default LiveMoneyCounter;
