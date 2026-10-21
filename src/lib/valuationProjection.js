// Projects company cash flows and discounts them at the required EUR equity return.

export const FORECAST_YEARS = 5;

export function projectEquityCashFlows({ fundamentals, margin, growth, terminalGrowth, currentShares, fxRate }) {
  const cashConversion = fundamentals.normalizedOperatingCashFlow / fundamentals.operatingProfit;
  const profitConversion = fundamentals.profit / fundamentals.operatingProfit;
  const capexRatio = fundamentals.capex / fundamentals.revenue;
  const leaseRatio = fundamentals.leaseRepayments / fundamentals.revenue;
  let revenue = fundamentals.revenue;
  return Array.from({ length: FORECAST_YEARS }, (_, index) => {
    const year = index + 1;
    const fadedGrowth = growth + (terminalGrowth - growth) * index / (FORECAST_YEARS - 1);
    revenue *= 1 + fadedGrowth;
    const operatingProfit = revenue * margin / 100;
    const operatingCashFlow = operatingProfit * cashConversion;
    const capex = revenue * capexRatio;
    const leaseRepayments = revenue * leaseRatio;
    const equityCashFlow = operatingCashFlow - capex - leaseRepayments;
    const netProfit = operatingProfit * profitConversion;
    return {
      year, growth: fadedGrowth, margin, revenueMEUR: revenue, operatingProfitMEUR: operatingProfit,
      operatingCashFlowMEUR: operatingCashFlow, capexMEUR: capex, leaseRepaymentsMEUR: leaseRepayments,
      equityCashFlowMEUR: equityCashFlow, netProfitMEUR: netProfit,
      epsSEK: netProfit * 1_000_000 / currentShares * fxRate,
      equityCashFlowPerShareSEK: equityCashFlow * 1_000_000 / currentShares * fxRate,
    };
  });
}

export function discountEquityCashFlows({ forecast, discountRate, terminalGrowth, excessCashMEUR, currentShares, fxRate }) {
  if (discountRate <= terminalGrowth || !forecast.length || !(currentShares > 0) || !(fxRate > 0)) return null;
  const finalCashFlow = forecast.at(-1).equityCashFlowMEUR;
  if (!Number.isFinite(finalCashFlow) || finalCashFlow <= 0) return null;
  const forecastPresentValue = forecast.reduce((sum, year) => sum + year.equityCashFlowMEUR / (1 + discountRate) ** year.year, 0);
  const terminalValue = finalCashFlow * (1 + terminalGrowth) / (discountRate - terminalGrowth);
  const discountedTerminal = terminalValue / (1 + discountRate) ** forecast.length;
  const operatingValue = forecastPresentValue + discountedTerminal;
  const perShare = (value) => value * 1_000_000 / currentShares * fxRate;
  return {
    valueSEK: perShare(operatingValue + excessCashMEUR),
    forecastPresentValueSEK: perShare(forecastPresentValue),
    terminalPresentValueSEK: perShare(discountedTerminal),
    excessCashPerShareSEK: perShare(excessCashMEUR),
    terminalSharePct: operatingValue > 0 ? discountedTerminal / operatingValue * 100 : null,
  };
}
