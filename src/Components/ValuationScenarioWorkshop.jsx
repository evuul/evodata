'use client';

// Renders editable valuation assumptions and their five-year operating outcome.

import { Box, Button, Chip, Slider, Stack, Typography } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import TuneIcon from '@mui/icons-material/Tune';

const number1 = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 1 });
const currency2 = new Intl.NumberFormat('sv-SE', {
  style: 'currency',
  currency: 'SEK',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const CONTROL_CONFIG = [
  { key: 'growth', labelSv: 'Tillväxt nästa år', labelEn: 'Next-year growth', step: 0.1, toUi: (value) => value * 100, fromUi: (value) => value / 100, format: (value) => `${number1.format(value)}%` },
  { key: 'margin', labelSv: 'Rörelsemarginal', labelEn: 'Operating margin', step: 0.1, toUi: (value) => value, fromUi: (value) => value, format: (value) => `${number1.format(value)}%` },
  { key: 'pe', labelSv: 'Forward P/E', labelEn: 'Forward P/E', step: 0.1, toUi: (value) => value, fromUi: (value) => value, format: (value) => `${number1.format(value)}x` },
  { key: 'discountRate', labelSv: 'Avkastningskrav (WACC)', labelEn: 'Discount rate (WACC)', step: 0.25, toUi: (value) => value * 100, fromUi: (value) => value / 100, format: (value) => `${number1.format(value)}%` },
  { key: 'terminalGrowth', labelSv: 'Terminal tillväxt', labelEn: 'Terminal growth', step: 0.25, toUi: (value) => value * 100, fromUi: (value) => value / 100, format: (value) => `${number1.format(value)}%` },
];

const panelSx = {
  borderRadius: '18px',
  border: '1px solid rgba(167,139,250,0.28)',
  background: 'linear-gradient(145deg, rgba(88,28,135,0.14), rgba(15,23,42,0.7))',
};

function AssumptionControl({ config, assumptions, limits, onChange, translate }) {
  const value = config.toUi(assumptions[config.key]);
  const bounds = limits[config.key];
  const min = config.toUi(bounds.min);
  const configuredMax = config.toUi(bounds.max);
  const max = config.key === 'terminalGrowth'
    ? Math.min(configuredMax, assumptions.discountRate * 100 - 0.5)
    : configuredMax;
  const label = translate(config.labelSv, config.labelEn);

  return (
    <Box sx={{ width: '100%', minWidth: 0 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
        <Typography variant="caption" sx={{ color: 'rgba(203,213,225,0.78)' }}>{label}</Typography>
        <Typography variant="body2" sx={{ color: '#ddd6fe', fontWeight: 800 }}>{config.format(value)}</Typography>
      </Stack>
      <Slider
        aria-label={label}
        value={value}
        min={min}
        max={max}
        step={config.step}
        valueLabelDisplay="auto"
        valueLabelFormat={config.format}
        onChange={(_, nextValue) => onChange(config.key, config.fromUi(Number(nextValue)))}
        sx={{ color: '#a78bfa', mt: 0.4, '& .MuiSlider-thumb': { width: 16, height: 16 }, '& .MuiSlider-rail': { opacity: 0.22 } }}
      />
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="caption" sx={{ color: 'rgba(100,116,139,0.72)' }}>{config.format(min)}</Typography>
        <Typography variant="caption" sx={{ color: 'rgba(100,116,139,0.72)' }}>{config.format(max)}</Typography>
      </Stack>
    </Box>
  );
}

export default function ValuationScenarioWorkshop({ assumptions, limits, forecast = [], onChange, onReset, translate }) {
  const maxRevenue = Math.max(...forecast.map((item) => item.revenueMEUR), 1);

  return (
    <Box
      data-testid="valuation-scenario-workshop"
      sx={{
        ...panelSx,
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: 940,
        alignSelf: 'center',
        marginInline: 'auto',
        p: { xs: 1.8, sm: 2.4 },
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1.2}>
        <Box>
          <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap">
            <TuneIcon sx={{ color: '#c4b5fd', fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ color: '#f8fafc', fontWeight: 800 }}>{translate('Scenarioverkstad', 'Scenario workshop')}</Typography>
            <Chip size="small" label={translate('Sparas automatiskt', 'Auto-saved')} sx={{ color: '#ddd6fe', bgcolor: 'rgba(139,92,246,0.15)' }} />
          </Stack>
          <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.72)', display: 'block', mt: 0.35 }}>
            {translate('Tillväxten tonas gradvis mot terminalvärdet under fem år.', 'Growth gradually fades toward the terminal rate over five years.')}
          </Typography>
        </Box>
        <Button size="small" variant="outlined" startIcon={<RestartAltIcon />} onClick={onReset} sx={{ color: '#c4b5fd', borderColor: 'rgba(167,139,250,0.38)', textTransform: 'none' }}>
          {translate('Återställ till bas', 'Reset to base')}
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))' }, gap: { xs: 1.4, sm: 2 }, width: '100%', maxWidth: 880, mx: 'auto', mt: 2 }}>
        {CONTROL_CONFIG.map((config) => (
          <AssumptionControl key={config.key} config={config} assumptions={assumptions} limits={limits} onChange={onChange} translate={translate} />
        ))}
      </Box>

      <Box sx={{ width: '100%', maxWidth: 880, mx: 'auto', mt: 2.2 }}>
        <Typography variant="subtitle2" sx={{ color: '#e2e8f0', fontWeight: 750 }}>{translate('Beräknat femårsutfall', 'Calculated five-year outcome')}</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(5, minmax(0, 1fr))' }, gap: 1, mt: 1 }}>
          {forecast.map((item) => (
            <Box key={item.year} sx={{ p: 1.25, borderRadius: '13px', bgcolor: 'rgba(15,23,42,0.62)', border: '1px solid rgba(148,163,184,0.14)', minWidth: 0 }}>
              <Typography variant="caption" sx={{ color: '#c4b5fd', fontWeight: 800 }}>{translate(`År ${item.year}`, `Year ${item.year}`)}</Typography>
              <Typography sx={{ color: '#f8fafc', fontWeight: 800, mt: 0.35 }}>{number1.format(item.revenueMEUR)} MEUR</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.74)', display: 'block' }}>EPS {currency2.format(item.epsSEK)} · {number1.format(item.growth * 100)}%</Typography>
              <Box sx={{ height: 4, borderRadius: 999, bgcolor: 'rgba(51,65,85,0.7)', mt: 0.9, overflow: 'hidden' }}>
                <Box sx={{ width: `${Math.max(8, (item.revenueMEUR / maxRevenue) * 100)}%`, height: '100%', bgcolor: '#a78bfa', borderRadius: 999 }} />
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
