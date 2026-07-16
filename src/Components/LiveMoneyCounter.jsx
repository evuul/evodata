'use client';

// Presents a report-based profit pace with clear period and data context.
import { useMemo } from 'react';
import { Box, Chip, Grid, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import useMediaQuery from '@/lib/useMuiMediaQuery';
import financialReports from '@/app/data/financialReports.json';
import { useFxRateContext } from '@/context/FxRateContext';
import { useTranslate } from '@/context/LocaleContext';
import { buildLiveMoneyModel } from '@/lib/liveMoneyModel';

const formatSEK = (value, fractionDigits = 0) => Number.isFinite(value)
  ? value.toLocaleString('sv-SE', { maximumFractionDigits: fractionDigits, minimumFractionDigits: fractionDigits })
  : '–';

const LiveMoneyCounter = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const translate = useTranslate();
  const { rate: fxRate } = useFxRateContext();
  const model = useMemo(
    () => buildLiveMoneyModel({ reports: financialReports?.financialReports, fxRate }),
    [fxRate]
  );
  const reportLabel = model.latestReport ? `${model.latestReport.quarter} ${model.latestReport.year}` : '–';
  const formatMoney = (value) => `${formatSEK(value)} SEK`;

  const paceCards = [
    ['Sekund', model.perSecond, '#38bdf8', 'second'],
    ['Minut', model.perMinute, '#f97316', 'minute'],
    ['Timme', model.perHour, '#34d399', 'hour'],
    ['Dag', model.perDay, '#c084fc', 'day'],
  ];

  const summaryCards = [
    [translate('Kvartal totalt', 'Quarter total'), formatMoney(model.quarterProfitSEK), `${model.profitMEUR.toFixed(2)} M€`],
    [translate('Årets justerade vinst', 'Adjusted profit YTD'), model.ytdProfitMEUR == null ? '–' : `${model.ytdProfitMEUR.toFixed(1)} M€`, translate(`${model.reportedQuarters}/${model.totalQuarters} kvartal rapporterade`, `${model.reportedQuarters}/${model.totalQuarters} quarters reported`)],
    [translate('Rapporterad EPS', 'Reported EPS'), model.eps == null ? '–' : `${formatSEK(model.eps, 2)} EUR`, translate('Justerad EPS i rapportens valuta', 'Adjusted EPS in the report currency')],
    [translate('Referensperiod', 'Reference period'), reportLabel, `FX EUR/SEK ${model.fx.toFixed(2)}`],
  ];

  return (
    <Box sx={{
      width: '100%', maxWidth: 1160, alignSelf: 'center', mx: 'auto',
      px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, md: 4 },
      background: 'linear-gradient(135deg, #0f172a, #1f2937)',
      border: '1px solid rgba(148,163,184,0.18)', borderRadius: { xs: 0, md: '18px' },
      boxShadow: '0 20px 45px rgba(15, 23, 42, 0.45)', color: '#f8fafc',
      display: 'flex', flexDirection: 'column', gap: { xs: 2.5, md: 3 },
    }}>
      <Stack spacing={1.2} alignItems="center" textAlign="center">
        <Typography variant="overline" sx={{ letterSpacing: 1, color: 'rgba(148,163,184,0.75)' }}>{translate('Live Money', 'Live Money')}</Typography>
        <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700 }}>{translate('Vinsttakt', 'Profit pace')}</Typography>
        <Typography sx={{ color: 'rgba(226,232,240,0.7)', maxWidth: 640 }}>
          {translate('Simulerad takt baserad på Evolutions rapporterade justerade nettovinst. Det är en referensmodell – inte faktiska realtidsbetalningar.', "Simulated pace based on Evolution's reported adjusted net profit. It is a reference model, not actual real-time payments.")}
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1} justifyContent="center">
          <Chip size="small" label={translate(`Datakälla: ${reportLabel}`, `Data source: ${reportLabel}`)} sx={{ backgroundColor: 'rgba(52,211,153,0.15)', color: '#bbf7d0' }} />
          <Chip size="small" label={`FX EUR/SEK: ${model.fx.toFixed(2)}`} sx={{ backgroundColor: 'rgba(96,165,250,0.18)', color: '#dbeafe' }} />
        </Stack>
      </Stack>

      <Box sx={{ p: { xs: 2.5, md: 3 }, textAlign: 'center', background: 'rgba(15,23,42,0.55)', border: '1px solid rgba(148,163,184,0.18)', borderRadius: '16px' }}>
        <Typography sx={{ color: 'rgba(148,163,184,0.75)', fontSize: '0.9rem' }}>{translate('≈ per sekund · simulerad', '≈ per second · simulated')}</Typography>
        <Typography variant={isMobile ? 'h3' : 'h2'} sx={{ fontWeight: 700, color: '#f8fafc', fontFeatureSettings: '"tnum"' }}>{formatMoney(model.perSecond)}</Typography>
        <Typography sx={{ color: '#7dd3fc', mt: 0.5 }}>{translate('Kvartal totalt', 'Quarter total')}: {formatMoney(model.quarterProfitSEK)}</Typography>
        <Typography sx={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.8rem', mt: 0.5 }}>{translate(`Genomsnitt över ${model.quarterDays} dagar i ${reportLabel}`, `Average over ${model.quarterDays} days in ${reportLabel}`)}</Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, width: '100%' }}>
        {paceCards.map(([period, value, color, key]) => (
          <Tooltip key={period} title={translate(`Genomsnittlig justerad vinst per ${period.toLowerCase()} baserat på ${reportLabel}.`, `Average adjusted profit per ${key} based on ${reportLabel}.`)}>
            <Box sx={{ p: 2, minHeight: 88, textAlign: 'center', background: 'rgba(148,163,184,0.08)', border: `1px solid ${color}55`, borderRadius: '12px' }}>
              <Typography sx={{ color, fontSize: '0.78rem', letterSpacing: 0.4 }}>{translate(period, key)}</Typography>
              <Typography sx={{ mt: 0.4, fontWeight: 700, fontFeatureSettings: '"tnum"' }}>{formatMoney(value)}</Typography>
            </Box>
          </Tooltip>
        ))}
      </Box>

      <Grid container spacing={1.5} sx={{ width: '100%', m: 0 }}>
        {summaryCards.map(([title, value, subtitle]) => (
          <Grid key={title} size={{ xs: 12, sm: 6, md: 3 }}>
            <Box sx={{ height: '100%', p: 2.25, textAlign: 'center', background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.12)', borderRadius: '12px' }}>
              <Typography sx={{ color: 'rgba(148,163,184,0.75)', fontSize: '0.82rem', fontWeight: 600 }}>{title}</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.4 }}>{value}</Typography>
              <Typography sx={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.78rem' }}>{subtitle}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default LiveMoneyCounter;
