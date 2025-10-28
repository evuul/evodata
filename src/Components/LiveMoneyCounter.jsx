'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Stack,
  Grid,
  Tooltip,
  LinearProgress,
  useTheme,
} from '@mui/material';
import useMediaQuery from '@/lib/useMuiMediaQuery';
import financialReports from '@/app/data/financialReports.json';
import { useFxRateContext } from '@/context/FxRateContext';
import { useStockPriceContext } from '@/context/StockPriceContext';

const Q3_DAYS = 92; // approx number of days in Q3

const formatSEK = (value, fractionDigits = 0) =>
  Number.isFinite(value)
    ? value.toLocaleString('sv-SE', {
        maximumFractionDigits: fractionDigits,
        minimumFractionDigits: fractionDigits,
      })
    : '–';

const formatCurrency = (value) => `${formatSEK(value, 0)} SEK`;

const findLatestQ3Report = (reports) => {
  if (!Array.isArray(reports)) return null;
  const q3Reports = reports.filter((r) => r?.quarter === 'Q3');
  if (!q3Reports.length) return null;
  return q3Reports.reduce((latest, current) =>
    current.year > (latest?.year ?? 0) ? current : latest
  , q3Reports[0]);
};

const LiveMoneyCounter = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { rate: fxRate } = useFxRateContext();
  const { stockPrice, marketCap } = useStockPriceContext();

  const latestQ3 = useMemo(
    () => findLatestQ3Report(financialReports?.financialReports),
    []
  );
  const currentYearProfitMEUR = useMemo(() => {
    if (!latestQ3) return null;
    const year = latestQ3.year;
    const reports = financialReports?.financialReports || [];
    const total = reports
      .filter((r) => r?.year === year)
      .reduce((sum, r) => {
        const val = Number(r?.adjustedProfitForPeriod);
        return sum + (Number.isFinite(val) ? val : 0);
      }, 0);
    return Number.isFinite(total) ? total : null;
  }, [latestQ3]);

  const profitMEUR = Number(latestQ3?.adjustedProfitForPeriod) || 0;
  const fx = Number.isFinite(fxRate) && fxRate > 0 ? fxRate : 11.02;
  const totalProfitSEK = profitMEUR * 1_000_000 * fx;
  const perDay = totalProfitSEK / Q3_DAYS;
  const perSecond = totalProfitSEK / (Q3_DAYS * 24 * 60 * 60);
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
      label: `≈ ${formatSEK(perSecond, 0)} SEK / sekund`,
      tooltip: 'Genomsnitt baserat på total Q3-vinst dividerat med kvartalets sekunder.',
      color: '#38bdf8',
      value: perSecond,
    },
    {
      label: `≈ ${formatSEK(perMinute, 0)} SEK / minut`,
      tooltip: 'Genomsnitt per minut.',
      color: '#f97316',
      value: perMinute,
    },
    {
      label: `≈ ${formatSEK(perHour, 0)} SEK / timme`,
      tooltip: 'Genomsnitt per timme.',
      color: '#34d399',
      value: perHour,
    },
    {
      label: `≈ ${formatSEK(perDay, 0)} SEK / dag`,
      tooltip: `Antag ${Q3_DAYS} dagar i Q3.`,
      color: '#c084fc',
      value: perDay,
    },
  ];

  const summaryCards = [
    {
      title: 'Totalt Q3',
      value: formatCurrency(totalProfitSEK),
      subtitle: `${profitMEUR.toFixed(2)} M€`,
    },
    {
      title: 'Årets justerade vinst',
      value:
        currentYearProfitMEUR != null
          ? `${formatSEK(currentYearProfitMEUR, 1)} M€`
          : '–',
      subtitle:
        currentYearProfitMEUR != null
          ? `${formatCurrency(currentYearProfitMEUR * 1_000_000 * fx)}`
          : 'Data saknas',
    },
    {
      title: 'Per aktie',
      value: perShare != null ? `${formatSEK(perShare, 2)} SEK` : '–',
      subtitle: totalSharesOutstanding
        ? `${formatSEK(totalSharesOutstanding)} aktier`
        : 'Antal aktier saknas',
    },
    {
      title: 'Period',
      value: latestQ3 ? `${latestQ3.quarter} ${latestQ3.year}` : 'Okänt',
      subtitle: 'Finansiell rapport',
    },
  ];

  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #0f172a, #1f2937)',
        borderRadius: '18px',
        border: '1px solid rgba(148,163,184,0.18)',
        boxShadow: '0 20px 45px rgba(15, 23, 42, 0.45)',
        color: '#f8fafc',
        padding: { xs: 3, md: 4 },
        width: '100%',
        maxWidth: '1200px',
        margin: '16px auto',
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 2.5, md: 3 },
      }}
    >
      <Stack
        direction={isMobile ? 'column' : 'row'}
        spacing={isMobile ? 1.5 : 2.5}
        alignItems={isMobile ? 'flex-start' : 'center'}
        justifyContent="space-between"
      >
        <Box>
          <Typography
            variant="overline"
            sx={{ letter_spacing: 1, color: 'rgba(148,163,184,0.75)' }}
          >
            Live Money
          </Typography>
          <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700 }}>
            Q3-vinstindikator
          </Typography>
          <Typography
            sx={{
              color: 'rgba(226,232,240,0.7)',
              mt: 1,
              maxWidth: 520,
            }}
          >
            Realtidssimulering baserad på Evolution&apos;s rapporterade justerade
            nettovinst för senaste Q3.
          </Typography>
        </Box>

        <Stack direction="row" flexWrap="wrap" gap={1} justifyContent={isMobile ? 'flex-start' : 'flex-end'}>
          <Chip
            icon={<span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />}
            label={
              latestQ3
                ? `Datakälla: ${latestQ3.quarter} ${latestQ3.year}`
                : 'Datakälla saknas'
            }
            size="small"
            sx={{
              backgroundColor: 'rgba(52,211,153,0.15)',
              color: '#bbf7d0',
              fontWeight: 500,
            }}
          />
          <Chip
            icon={<span style={{ width: 8, height: 8, borderRadius: '50%', background: '#60a5fa', display: 'inline-block' }} />}
            label={`FX EUR/SEK: ${fx.toFixed(2)}`}
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
            background: 'radial-gradient(circle at 20% 20%, rgba(59,130,246,0.15), transparent 55%)',
            pointerEvents: 'none',
          }}
        />
        <Stack spacing={2}>
          <Box>
            <Typography
              sx={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.9rem' }}
            >
              Ackumulerat (simulerat)
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

            <Stack direction="row" flexWrap="wrap" gap={1.2}>
              {chips.map((chip) => (
                <Tooltip key={chip.label} title={chip.tooltip}>
                  <Box
                    sx={{
                      background: 'rgba(15,23,42,0.7)',
                      borderRadius: '12px',
                      border: `1px solid ${chip.color}44`,
                      p: 1.5,
                      minWidth: isMobile ? '100%' : 170,
                    }}
                  >
                    <Typography sx={{ color: chip.color, fontSize: '0.75rem', letterSpacing: 0.4 }}>
                      {chip.label}
                    </Typography>
                  </Box>
                </Tooltip>
              ))}
            </Stack>
        </Stack>
      </Box>

      <Grid container spacing={isMobile ? 1.5 : 2}>
        {summaryCards.map((card) => (
          <Grid key={card.title} item xs={12} sm={6} md={3}>
            <Box
              sx={{
                background: 'rgba(148,163,184,0.08)',
                borderRadius: '12px',
                border: '1px solid rgba(148,163,184,0.12)',
                p: 2.5,
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
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: '#f8fafc' }}
              >
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
