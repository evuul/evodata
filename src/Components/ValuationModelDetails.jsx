'use client';

// Explains the equity DCF decomposition and its report-based cash-flow assumptions.

import { Box, Link, Stack, Typography } from '@mui/material';
import { useLocale } from '@/context/LocaleContext';

export default function ValuationModelDetails({ model, scenario, translate }) {
  const { locale } = useLocale();
  if (!model?.fundamentals || !scenario?.dcfBreakdown) return null;
  const number = (value) => Number.isFinite(value) ? value.toLocaleString(locale === 'en' ? 'en-GB' : 'sv-SE', { maximumFractionDigits: 1 }) : '–';
  const { fundamentals, buybackInfo } = model;
  const breakdown = scenario.dcfBreakdown;
  const cashRows = [
    [translate('Rapporterat operativt kassaflöde', 'Reported operating cash flow'), fundamentals.operatingCashFlow],
    [translate('Skattenormalisering och avdrag för ränteintäkter', 'Tax normalization and removal of interest income'), fundamentals.normalizedOperatingCashFlow - fundamentals.operatingCashFlow],
    [translate('Materiell och immateriell capex', 'Tangible and intangible capex'), -fundamentals.capex],
    [translate('Leasingamortering', 'Lease principal payments'), -fundamentals.leaseRepayments],
    [translate('Kassaflöde till aktieägarna, modellbas', 'Equity cash flow, model baseline'), fundamentals.equityCashFlow],
  ];
  const decomposition = [
    [translate('Nuvärde år 1–5', 'Present value, years 1–5'), breakdown.forecastPresentValueSEK],
    [translate('Nuvärde terminalvärde', 'Present value of terminal value'), breakdown.terminalPresentValueSEK],
    [translate('Överskottskassa i modellen', 'Model excess cash'), breakdown.excessCashPerShareSEK],
  ];
  const sources = model.dataQuality.sourceUrls ?? [];
  return (
    <Box component="section" aria-label={translate('Modellens kassaflöde och terminalvärde', 'Model cash flow and terminal value')} sx={{ width: '100%', maxWidth: 940, mx: 'auto', p: { xs: 1.8, sm: 2.4 }, borderRadius: 3, border: '1px solid rgba(148,163,184,0.25)', bgcolor: 'rgba(15,23,42,0.65)' }}>
      <Typography component="h3" sx={{ color: '#f8fafc', fontSize: 18, fontWeight: 750 }}>{translate('Modellens kassaflöde och terminalvärde', 'Model cash flow and terminal value')}</Typography>
      <Typography data-testid="terminal-share" sx={{ color: '#c4b5fd', fontWeight: 750, my: 1.5 }}>
        {translate('Terminalvärdets andel av DCF:s rörelsevärde', 'Terminal share of DCF operating value')}: {number(breakdown.terminalSharePct)}%
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1 }}>
        {decomposition.map(([label, value]) => (
          <Box key={label} sx={{ p: 1.3, borderRadius: 2, bgcolor: 'rgba(51,65,85,0.35)' }}>
            <Typography sx={{ color: '#cbd5e1', fontSize: 12 }}>{label}</Typography>
            <Typography sx={{ color: '#f8fafc', fontWeight: 750 }}>{number(value)} SEK/{translate('aktie', 'share')}</Typography>
          </Box>
        ))}
      </Box>
      <Stack spacing={0.8} sx={{ my: 2 }}>
        <Typography sx={{ color: '#e2e8f0', fontWeight: 750 }}>{translate('Kassaflödesunderlag · senaste fyra kvartalen · MEUR', 'Cash-flow basis · latest four quarters · MEUR')}</Typography>
        {cashRows.map(([label, value]) => (
          <Stack key={label} direction="row" spacing={2} justifyContent="space-between">
            <Typography sx={{ color: '#cbd5e1', fontSize: 13 }}>{label}</Typography>
            <Typography sx={{ color: '#f8fafc', fontSize: 13, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{number(value)}</Typography>
          </Stack>
        ))}
      </Stack>
      <Typography sx={{ color: '#cbd5e1', fontSize: 12, lineHeight: 1.8 }}>
        {translate(
          `Överskottskassan beräknas efter ${number(buybackInfo.restrictedCashEurM)} MEUR spärrad kassa, ${number(buybackInfo.netCurrentTaxLiabilitiesEurM)} MEUR aktuella skatteåtaganden netto och ${number(buybackInfo.liquidityReserveEurM)} MEUR rörelsereserv.`,
          `Excess cash is calculated after ${number(buybackInfo.restrictedCashEurM)} MEUR restricted cash, ${number(buybackInfo.netCurrentTaxLiabilitiesEurM)} MEUR net current tax obligations and ${number(buybackInfo.liquidityReserveEurM)} MEUR operating reserve.`
        )}
      </Typography>
      <Typography sx={{ color: '#cbd5e1', fontSize: 12, lineHeight: 1.8, mt: 1 }}>
        {translate('Skatt normaliseras till rapporterad skattekostnad. Ränteintäkter efter skatt och skattefria engångsvinster tas bort. Modellen antar oförändrad kassakonvertering, capex/omsättning och leasing/omsättning, inga framtida återköp eller ny upplåning och oförändrad EUR/SEK. Kassan utgår från senaste rapporten minus kända återköp; kassaflöden efter rapporten ingår inte. Leasing betalas i kassaflödet och dras inte av en gång till som skuld.', 'Tax is normalized to the reported tax expense. After-tax interest income and non-taxable one-off profits are removed. The model holds cash conversion, capex/revenue and lease payments/revenue constant, assumes no future buybacks or new borrowing and unchanged EUR/SEK. Cash starts from the latest report less known buybacks; post-report operating cash flows are excluded. Leases are paid through cash flow and are not deducted again as debt.')}
      </Typography>
      <Stack direction="row" gap={1.5} flexWrap="wrap" sx={{ mt: 1 }}>
        {sources.map((url, index) => <Link key={url} href={url} target="_blank" rel="noopener noreferrer" sx={{ color: '#82c1ff', fontSize: 12, py: 1 }}>{translate(`Rapportkälla ${index + 1}`, `Report source ${index + 1}`)}</Link>)}
      </Stack>
    </Box>
  );
}
