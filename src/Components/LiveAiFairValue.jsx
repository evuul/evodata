'use client';

// Presents the driver-based fair value model in the compact Evolution dashboard layout.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import InsightsIcon from '@mui/icons-material/Insights';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { useTheme } from '@mui/material/styles';
import { useFxRateContext } from '@/context/FxRateContext';
import { useStockPriceContext } from '@/context/StockPriceContext';
import { useTranslate } from '@/context/LocaleContext';
import { computeFairValueInsights, resolveFairValueReports } from '@/lib/fairValueUtils';

const currency0 = new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 });
const currency2 = new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const number1 = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 1 });
const number2 = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 });

const SCENARIO_STYLE = {
  fair: { color: '#22c55e', Icon: InsightsIcon, sv: 'Bas', en: 'Base' },
  bull: { color: '#38bdf8', Icon: TrendingUpIcon, sv: 'Bull', en: 'Bull' },
  bear: { color: '#f87171', Icon: TrendingDownIcon, sv: 'Bear', en: 'Bear' },
};

const WARNING_LABELS = {
  invalid_reports: ['Ogiltiga rapportrader ignorerades', 'Invalid report rows were ignored'],
  duplicate_periods: ['Dubbletter i kvartalsdata togs bort', 'Duplicate quarters were removed'],
  non_consecutive_quarters: ['Kvartalsserien innehåller luckor', 'The quarterly series contains gaps'],
  not_enough_reports: ['Minst åtta sammanhängande kvartal krävs', 'Eight consecutive quarters are required'],
  invalid_fx: ['Giltig EUR/SEK-kurs saknas', 'A valid EUR/SEK rate is missing'],
  missing_shares: ['Aktiesnapshot saknas; återköp påverkar inte EPS', 'Share snapshot missing; buybacks do not affect EPS'],
  missing_buyback_data: ['Genomförda återköp saknas', 'Executed buybacks are missing'],
  buybacks_exceed_reported_cash: ['Återköp efter rapporten överstiger rapporterad kassa', 'Post-report buybacks exceed reported cash'],
  scenario_ordering: ['Scenarioordningen behöver granskas', 'Scenario ordering needs review'],
};

const panelSx = {
  borderRadius: '18px',
  border: '1px solid rgba(148,163,184,0.18)',
  background: 'rgba(15,23,42,0.58)',
};

const toPriceNumber = (value) => {
  const number = Number(value?.raw ?? value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const formatPercent = (value, digits = 1) =>
  Number.isFinite(value)
    ? `${value >= 0 ? '+' : ''}${value.toLocaleString('sv-SE', { maximumFractionDigits: digits })}%`
    : '–';

const formatTime = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('sv-SE', { hour: '2-digit', minute: '2-digit' }).format(date);
};

const formatMillions = (value, suffix) =>
  Number.isFinite(value) ? `${number1.format(value / 1_000_000)} ${suffix}` : '–';
const formatSek0 = (value) => Number.isFinite(value) ? currency0.format(value) : '–';
const formatSek2 = (value) => Number.isFinite(value) ? currency2.format(value) : '–';

function MetricCard({ label, value, helper, color = '#e2e8f0', sx = {} }) {
  return (
    <Box sx={{ ...panelSx, p: 2, height: '100%', ...sx }}>
      <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.82)' }}>{label}</Typography>
      <Typography variant="h6" sx={{ color, fontWeight: 800, mt: 0.35 }}>{value}</Typography>
      {helper && <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.68)', display: 'block', mt: 0.45 }}>{helper}</Typography>}
    </Box>
  );
}

function ScenarioCard({ scenario, selected, onSelect, translate }) {
  const style = SCENARIO_STYLE[scenario.id] ?? SCENARIO_STYLE.fair;
  const Icon = style.Icon;
  return (
    <Box
      component="button"
      type="button"
      onClick={() => onSelect(scenario.id)}
      aria-pressed={selected}
      sx={{
        ...panelSx,
        width: '100%',
        minHeight: 148,
        p: { xs: 1.8, sm: 2.2 },
        textAlign: 'left',
        cursor: 'pointer',
        color: 'inherit',
        background: selected ? `linear-gradient(145deg, ${style.color}22, rgba(15,23,42,0.82))` : 'rgba(15,23,42,0.64)',
        border: selected ? `1px solid ${style.color}66` : '1px solid rgba(148,163,184,0.18)',
        transition: 'border-color 160ms ease, transform 160ms ease',
        '&:hover': { borderColor: `${style.color}88`, transform: 'translateY(-1px)' },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" spacing={0.7} alignItems="center">
          <Icon sx={{ color: style.color, fontSize: 18 }} />
          <Typography variant="subtitle2" sx={{ color: style.color, fontWeight: 750 }}>{translate(style.sv, style.en)}</Typography>
        </Stack>
        {selected && <Chip size="small" label={translate('Vald', 'Selected')} sx={{ height: 21, color: style.color, bgcolor: `${style.color}1c` }} />}
      </Stack>
      <Typography variant="h5" sx={{ color: '#f8fafc', fontWeight: 850, mt: 1.1 }}>{formatSek0(scenario.impliedPriceSEK)}</Typography>
      <Typography variant="body2" sx={{ color: scenario.upsidePct >= 0 ? '#86efac' : '#fca5a5', fontWeight: 700, mt: 0.2 }}>{formatPercent(scenario.upsidePct)} {translate('mot kurs', 'vs price')}</Typography>
      <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.72)', display: 'block', mt: 0.6 }}>{number2.format(scenario.pe)}x P/E · {number1.format(scenario.discountRate * 100)}% WACC</Typography>
    </Box>
  );
}

export default function LiveAiFairValue({ reports = [], buybackData = [], sharesData = [] }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const translate = useTranslate();
  const [liveReports, setLiveReports] = useState(reports);
  const [liveBuybackData, setLiveBuybackData] = useState(buybackData);
  const [buybackMeta, setBuybackMeta] = useState(null);
  const [scenarioId, setScenarioId] = useState('fair');
  const { rate: fxRate, loading: fxLoading, meta: fxMeta, lastUpdated: fxUpdated, error: fxError } = useFxRateContext();
  const { stockPrice, loading: priceLoading, lastUpdated: priceUpdated, error: priceError } = useStockPriceContext();

  const fx = Number(fxRate);
  const currentPriceSEK = useMemo(() => {
    const regular = toPriceNumber(stockPrice?.price?.regularMarketPrice);
    return regular ?? toPriceNumber(stockPrice?.price?.regularMarketPreviousClose ?? stockPrice?.price?.previousClose);
  }, [stockPrice]);
  const effectiveReports = resolveFairValueReports(liveReports, reports);
  const effectiveBuybacks = Array.isArray(liveBuybackData) && liveBuybackData.length ? liveBuybackData : buybackData;
  const fairValue = useMemo(() => computeFairValueInsights({ reports: effectiveReports, buybackData: effectiveBuybacks, sharesData, fxRate: fx, currentPriceSEK }), [currentPriceSEK, effectiveBuybacks, effectiveReports, fx, sharesData]);

  useEffect(() => {
    if (!fairValue.scenarios.some((scenario) => scenario.id === scenarioId)) setScenarioId(fairValue.scenarios[0]?.id ?? 'fair');
  }, [fairValue.scenarios, scenarioId]);
  const handleScenarioChange = useCallback((_, value) => { if (value) setScenarioId(value); }, []);
  const activeScenario = fairValue.scenarios.find((scenario) => scenario.id === scenarioId) ?? fairValue.scenarios[0] ?? null;
  const activeStyle = SCENARIO_STYLE[activeScenario?.id] ?? SCENARIO_STYLE.fair;
  const buyback = fairValue.buybackInfo;
  const dataUnavailable = fairValue.scenarios.length === 0;

  useEffect(() => {
    let active = true;
    fetch('/api/financial-reports', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then((data) => {
      if (active && Array.isArray(data?.financialReports) && data.financialReports.length) setLiveReports(data.financialReports);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/buybacks/data', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then((data) => {
      if (!active) return;
      if (Array.isArray(data?.combined)) setLiveBuybackData(data.combined);
      setBuybackMeta(data);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const rangeLabel = Number.isFinite(fairValue.valuationRange.low) ? `${formatSek0(fairValue.valuationRange.low)}–${formatSek0(fairValue.valuationRange.high)}` : '–';
  const midpointLabel = formatSek0(fairValue.valuationRange.midpoint);
  const fxPair = fxMeta?.base && fxMeta?.quote ? `${fxMeta.base}/${fxMeta.quote}` : 'EUR/SEK';
  const warnings = fairValue.dataQuality?.warnings ?? [];
  const scenarioOptions = fairValue.scenarios.map((scenario) => ({ ...scenario, style: SCENARIO_STYLE[scenario.id] ?? SCENARIO_STYLE.fair }));

  return (
    <Box sx={{ width: '100%', background: 'linear-gradient(140deg, rgba(15,23,42,0.96), rgba(12,20,35,0.94))', borderRadius: '24px', border: '1px solid rgba(148,163,184,0.18)', boxShadow: '0 28px 60px rgba(2,6,23,0.48)', px: { xs: 2, sm: 3, md: 3.6 }, py: { xs: 2.5, sm: 3.2 } }}>
      <Stack spacing={{ xs: 2.2, sm: 2.8 }} sx={{ width: '100%', maxWidth: 1160, alignSelf: 'center', marginInline: 'auto' }}>
        <Stack spacing={1.1} alignItems="center" textAlign="center">
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" flexWrap="wrap">
            <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ color: '#f8fafc', fontWeight: 800 }}>{translate('Fair value-modell', 'Fair value model')}</Typography>
            <Chip size="small" icon={<InsightsIcon sx={{ color: '#bae6fd !important' }} />} label={translate('Modell v2', 'Model v2')} sx={{ color: '#bae6fd', bgcolor: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.3)' }} />
            {fairValue.latestLabel && <Chip size="small" label={translate(`Rapport ${fairValue.latestLabel}`, `Report ${fairValue.latestLabel}`)} sx={{ color: '#cbd5e1', bgcolor: 'rgba(148,163,184,0.1)' }} />}
          </Stack>
          <Typography variant="body2" sx={{ color: 'rgba(203,213,225,0.72)', maxWidth: 680 }}>
            {translate('Driverbaserad värdering med DCF, forward P/E och verifierade återköp.', 'Driver-based valuation using DCF, forward P/E, and verified buybacks.')}
          </Typography>
          <Stack direction="row" spacing={0.8} flexWrap="wrap" justifyContent="center">
            <Chip size="small" icon={<CurrencyExchangeIcon sx={{ color: '#c4b5fd !important' }} />} label={`${fxPair} ${Number.isFinite(fx) ? number2.format(fx) : '–'}`} sx={{ color: '#ddd6fe', bgcolor: 'rgba(139,92,246,0.12)' }} />
            <Chip size="small" icon={<AccessTimeIcon sx={{ color: '#bfdbfe !important' }} />} label={translate(`Kurs ${formatTime(priceUpdated) ?? '–'}`, `Price ${formatTime(priceUpdated) ?? '–'}`)} sx={{ color: '#bfdbfe', bgcolor: 'rgba(59,130,246,0.11)' }} />
            <Chip size="small" label={fairValue.dataQuality?.status === 'good' ? translate('Datakvalitet: god', 'Data quality: good') : translate('Datakvalitet: kontrollera', 'Data quality: review')} color={fairValue.dataQuality?.status === 'good' ? 'success' : 'warning'} variant="outlined" />
          </Stack>
        </Stack>

        {dataUnavailable ? (
          <Box sx={{ ...panelSx, p: 3 }}><Stack direction="row" spacing={1} alignItems="center"><WarningAmberRoundedIcon sx={{ color: '#fbbf24' }} /><Typography sx={{ color: '#e2e8f0' }}>{translate('Modellen kan inte beräknas. Kontrollera EUR/SEK och åtta sammanhängande kvartal.', 'The model cannot be calculated. Check EUR/SEK and eight consecutive quarters.')}</Typography></Stack></Box>
        ) : (
          <>
            <ToggleButtonGroup value={scenarioId} exclusive onChange={handleScenarioChange} size="small" sx={{ alignSelf: 'center', display: 'flex', gap: 1, '& .MuiToggleButtonGroup-grouped': { border: '1px solid rgba(148,163,184,0.24) !important' } }}>
              {scenarioOptions.map((scenario) => <ToggleButton key={scenario.id} value={scenario.id} sx={{ borderRadius: '999px !important', color: 'rgba(203,213,225,0.78)', bgcolor: 'rgba(15,23,42,0.5)', textTransform: 'none', px: { xs: 1.8, sm: 3 }, '&.Mui-selected': { color: scenario.style.color, bgcolor: `${scenario.style.color}1f`, borderColor: `${scenario.style.color}66 !important` } }}>{translate(scenario.style.sv, scenario.style.en)}</ToggleButton>)}
            </ToggleButtonGroup>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2, width: '100%', maxWidth: 940, alignSelf: 'center', marginInline: 'auto' }}>
              <Box>
                <MetricCard label={translate('Aktuell kurs', 'Current price')} value={formatSek2(currentPriceSEK)} helper={translate(`Uppdaterad ${formatTime(priceUpdated) ?? '–'}`, `Updated ${formatTime(priceUpdated) ?? '–'}`)} />
              </Box>
              <Box>
                <Box sx={{ ...panelSx, p: 2.2, height: '100%', textAlign: 'center', background: `linear-gradient(145deg, ${activeStyle.color}20, rgba(15,23,42,0.78))`, borderColor: `${activeStyle.color}55` }}>
                  <Stack direction="row" spacing={0.7} justifyContent="center" alignItems="center"><activeStyle.Icon sx={{ color: activeStyle.color }} /><Typography variant="subtitle2" sx={{ color: activeStyle.color, fontWeight: 750 }}>{translate(activeStyle.sv, activeStyle.en)} · Fair value</Typography></Stack>
                  <Typography variant="h3" sx={{ color: '#f8fafc', fontWeight: 850, mt: 0.55 }}>{formatSek0(activeScenario?.impliedPriceSEK)}</Typography>
                  <Typography sx={{ color: activeScenario?.upsidePct >= 0 ? '#86efac' : '#fca5a5', fontWeight: 750 }}>{formatPercent(activeScenario?.upsidePct)} {translate('mot kurs', 'vs price')}</Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.75)', display: 'block', mt: 0.55 }}>{translate(`Intervall ${rangeLabel}`, `Range ${rangeLabel}`)}</Typography>
                </Box>
              </Box>
              <Box>
                <MetricCard label={translate('Antaganden', 'Assumptions')} value={`${formatPercent(activeScenario?.growth * 100)} tillväxt`} helper={`${number1.format(activeScenario?.margin)}% marginal · ${number2.format(activeScenario?.pe)}x P/E · ${number1.format(activeScenario?.discountRate * 100)}% WACC`} />
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5, width: '100%', maxWidth: 940, alignSelf: 'center', marginInline: 'auto' }}>
              {scenarioOptions.map((scenario) => <ScenarioCard key={scenario.id} scenario={scenario} selected={scenario.id === scenarioId} onSelect={setScenarioId} translate={translate} />)}
            </Box>

            <Box sx={{ ...panelSx, p: { xs: 1.7, sm: 2.2 }, width: '100%', maxWidth: 940, alignSelf: 'center', marginInline: 'auto', background: 'rgba(15,23,42,0.42)' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
                <Box><Typography variant="subtitle1" sx={{ color: '#f8fafc', fontWeight: 750 }}>{translate('Värderingsbrygga', 'Valuation bridge')}</Typography><Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.72)' }}>{translate('Två metoder, ett tydligt sammanvägt värde', 'Two methods, one transparent blended value')}</Typography></Box>
                <Typography variant="h6" sx={{ color: activeStyle.color, fontWeight: 800 }}>{midpointLabel}</Typography>
              </Stack>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5, mt: 0.2, maxWidth: 760, mx: 'auto' }}>
                <MetricCard label="Owner earnings-DCF" value={formatSek0(activeScenario?.dcfValueSEK)} helper={`${number1.format(activeScenario?.discountRate * 100)}% WACC · ${number1.format(activeScenario?.terminalGrowth * 100)}% terminal`} color="#a7f3d0" />
                <MetricCard label="Forward P/E" value={formatSek0(activeScenario?.peValueSEK)} helper={`${number2.format(activeScenario?.pe)}x · EPS ${formatSek2(activeScenario?.fwdEpsSEK)}`} color="#bae6fd" />
                <MetricCard label={translate('Sammanvägt', 'Blended')} value={formatSek0(activeScenario?.impliedPriceSEK)} helper={translate('55% DCF · 45% P/E', '55% DCF · 45% P/E')} color={activeStyle.color} />
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5, width: '100%', maxWidth: 940, alignSelf: 'center', marginInline: 'auto' }}>
              <Box sx={{ ...panelSx, p: { xs: 1.7, sm: 2.2 }, minWidth: 0 }}><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography variant="subtitle1" sx={{ color: '#f8fafc', fontWeight: 750 }}>{translate('Verifierade återköp', 'Verified buybacks')}</Typography><Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.7)' }}>{translate(`Sedan ${buyback?.snapshotDate ?? '–'}`, `Since ${buyback?.snapshotDate ?? '–'}`)}</Typography></Box><Chip size="small" label={translate('Faktiskt utfall', 'Observed')} sx={{ color: '#a7f3d0', bgcolor: 'rgba(34,197,94,0.11)' }} /></Stack><Grid container spacing={1} sx={{ mt: 0.7 }}><Grid item xs={6} sm={3}><MetricCard label={translate('Aktier', 'Shares')} value={formatMillions(buyback?.executedSharesAfterSnapshot, 'M')} /></Grid><Grid item xs={6} sm={3}><MetricCard label={translate('Kassa', 'Cash')} value={Number.isFinite(buyback?.executedSpendAfterSnapshotSek) ? `${number1.format(buyback.executedSpendAfterSnapshotSek / 1_000_000_000)} md` : '–'} /></Grid><Grid item xs={6} sm={3}><MetricCard label={translate('Aktier nu', 'Shares now')} value={formatMillions(buyback?.currentShares, 'M')} /></Grid><Grid item xs={6} sm={3}><MetricCard label="EPS" value={formatPercent((buyback?.executedEpsBoost ?? 0) * 100)} /></Grid></Grid><Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.7)', display: 'block', mt: 1 }}>{translate(`Kvarvarande mandat ${Number.isFinite(buyback?.remainingMandateSek) ? `${number1.format(buyback.remainingMandateSek / 1_000_000_000)} md SEK` : '–'} · outnyttjat mandat räknas inte in.`, `Remaining authorization ${Number.isFinite(buyback?.remainingMandateSek) ? `${number1.format(buyback.remainingMandateSek / 1_000_000_000)}bn SEK` : '–'} · unused authorization is excluded.`)}</Typography></Box>
              <Box sx={{ ...panelSx, p: { xs: 1.7, sm: 2.2 }, minWidth: 0 }}><Typography variant="subtitle1" sx={{ color: '#f8fafc', fontWeight: 750 }}>{translate('DCF-känslighet', 'DCF sensitivity')}</Typography><Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.7)' }}>{translate('WACC rader · terminal tillväxt kolumner', 'WACC rows · terminal growth columns')}</Typography><Box sx={{ display: 'grid', gridTemplateColumns: '54px repeat(3, 1fr)', gap: 0.5, mt: 1.2 }}><Box />{fairValue.sensitivity.terminalGrowthRates.map((rate) => <Typography key={rate} variant="caption" sx={{ textAlign: 'center', color: '#94a3b8' }}>{number1.format(rate * 100)}%</Typography>)}{fairValue.sensitivity.discountRates.flatMap((rate, rowIndex) => [<Typography key={`r-${rate}`} variant="caption" sx={{ color: '#94a3b8', alignSelf: 'center' }}>{number1.format(rate * 100)}%</Typography>, ...fairValue.sensitivity.values[rowIndex].map((value, columnIndex) => <Box key={`${rate}-${columnIndex}`} sx={{ py: 0.7, textAlign: 'center', borderRadius: '8px', bgcolor: rate === 0.1 && columnIndex === 1 ? 'rgba(34,197,94,0.16)' : 'rgba(30,41,59,0.7)' }}><Typography variant="caption" sx={{ color: '#e2e8f0', fontWeight: 700 }}>{formatSek0(value)}</Typography></Box>),])}</Box></Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 1.2, width: '100%', maxWidth: 940, alignSelf: 'center', marginInline: 'auto' }}><MetricCard label="TTM EPS" value={formatSek2(fairValue.annualEpsTTMSEK)} /><MetricCard label={translate('Normaliserad EPS', 'Normalized EPS')} value={formatSek2(fairValue.annualEpsNormSEK)} helper="8Q" /><MetricCard label={translate('Owner earnings/aktie', 'Owner earnings/share')} value={formatSek2(fairValue.ownerEarningsPerShareSEK)} helper="OCF − 12% capex" /><MetricCard label={translate('Bas: omsättning', 'Base: revenue')} value={formatPercent(fairValue.revenueGrowth * 100)} helper="65% TTM · 35% senaste kvartal" /></Box>
          </>
        )}

        {warnings.length > 0 && <Box sx={{ ...panelSx, p: 1.7, borderColor: 'rgba(245,158,11,0.3)', bgcolor: 'rgba(120,53,15,0.12)' }}><Stack direction="row" spacing={1} alignItems="flex-start"><WarningAmberRoundedIcon sx={{ color: '#fbbf24', fontSize: 19 }} /><Box><Typography variant="subtitle2" sx={{ color: '#fde68a' }}>{translate('Datakontroll', 'Data review')}</Typography>{warnings.map((warning) => { const label = WARNING_LABELS[warning] ?? [warning, warning]; return <Typography key={warning} variant="caption" sx={{ display: 'block', color: 'rgba(254,243,199,0.78)' }}>• {translate(label[0], label[1])}</Typography>; })}</Box></Stack></Box>}

        <Divider sx={{ borderColor: 'rgba(148,163,184,0.16)' }} />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Stack direction="row" spacing={0.7} alignItems="flex-start"><InfoOutlinedIcon sx={{ color: '#93c5fd', fontSize: 18, mt: 0.1 }} /><Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.72)' }}>{translate('Transparent modell: DCF med fem års avtagande tillväxt, 15% likviditetsreserv och explicit WACC. Återköp räknas först när de är verifierade.', 'Transparent model: DCF with five years of fading growth, 15% liquidity reserve, and explicit WACC. Buybacks are included only after verification.')}</Typography></Stack>
          <Typography variant="caption" sx={{ color: 'rgba(100,116,139,0.8)', whiteSpace: { md: 'nowrap' } }}>{translate(`Kurs ${priceError ? 'fel' : 'OK'} · FX ${fxError ? 'fel' : 'OK'} · återköp ${buybackMeta?.updatedAt ? formatTime(buybackMeta.updatedAt) : 'fallback'} · FX ${formatTime(fxUpdated) ?? '–'}`, `Price ${priceError ? 'error' : 'OK'} · FX ${fxError ? 'error' : 'OK'} · buybacks ${buybackMeta?.updatedAt ? formatTime(buybackMeta.updatedAt) : 'fallback'} · FX ${formatTime(fxUpdated) ?? '–'}`)}</Typography>
        </Stack>
        {(fxLoading || priceLoading) && <LinearProgress sx={{ height: 4, borderRadius: 999, bgcolor: 'rgba(30,41,59,0.7)', '& .MuiLinearProgress-bar': { bgcolor: '#38bdf8', borderRadius: 999 } }} />}
      </Stack>
    </Box>
  );
}
