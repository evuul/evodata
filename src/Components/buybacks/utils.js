// Shared constants and utilities for StockBuybackInfo

// Totala aktier över tid (utan att ta hänsyn till indragningar)
export const totalSharesData = [
  { date: "2019", totalShares: 181622725 },
  { date: "2020", totalShares: 183927915 },
  { date: "2021", totalShares: 215111115 },
  { date: "2022", totalShares: 213771346 },
  { date: "2023", totalShares: 213566498 },
  { date: "2024", totalShares: 209562751 },
  { date: "2025", totalShares: 204462162 },
];

export const calculateEvolutionOwnershipPerYear = (data) => {
  const ownershipByYear = {};
  let cumulativeShares = 0;
  data.forEach((item) => {
    const year = item.Datum.split("-")[0];
    cumulativeShares += item.Antal_aktier;
    ownershipByYear[year] = cumulativeShares;
  });
  return Object.keys(ownershipByYear)
    .map((year) => ({ date: year, shares: ownershipByYear[year] }))
    .sort((a, b) => a.date - b.date);
};

export const calculateCancelledShares = (data) =>
  data.filter((item) => item.Antal_aktier < 0).reduce((sum, item) => sum + Math.abs(item.Antal_aktier), 0);

export const calculateShareholderReturns = (dividendData, buybackData) => {
  const dividendsByYear = {};
  (dividendData.historicalDividends || []).forEach((dividend) => {
    const year = new Date(dividend.date).getFullYear();
    const totalSharesForYear = totalSharesData.find((s) => s.date === String(year))?.totalShares || 0;
    const totalDividend = (dividend.dividendPerShare || 0) * totalSharesForYear;
    dividendsByYear[year] = (dividendsByYear[year] || 0) + totalDividend;
  });
  (dividendData.plannedDividends || []).forEach((planned) => {
    const year = new Date(planned.exDate).getFullYear();
    const totalSharesForYear = totalSharesData.find((s) => s.date === String(year))?.totalShares || 0;
    const totalDividend = (planned.dividendPerShare || 0) * totalSharesForYear;
    dividendsByYear[year] = (dividendsByYear[year] || 0) + totalDividend;
  });
  const buybacksByYear = {};
  (buybackData || []).forEach((buyback) => {
    if (buyback.Antal_aktier > 0) {
      const year = new Date(buyback.Datum).getFullYear();
      buybacksByYear[year] = (buybacksByYear[year] || 0) + (buyback.Transaktionsvärde || 0);
    }
  });
  const years = new Set([...Object.keys(dividendsByYear), ...Object.keys(buybacksByYear)]);
  const combinedData = Array.from(years)
    .map((y) => ({
      year: Number(y),
      dividends: dividendsByYear[y] || 0,
      buybacks: buybacksByYear[y] || 0,
    }))
    .sort((a, b) => a.year - b.year);
  const total = combinedData.reduce((s, y) => s + y.dividends + y.buybacks, 0);
  const totalDividends = combinedData.reduce((s, y) => s + y.dividends, 0);
  const totalBuybacks = combinedData.reduce((s, y) => s + y.buybacks, 0);
  const latestYear = combinedData.length ? combinedData[combinedData.length - 1].year : null;
  const latestYearData = combinedData.find((d) => d.year === latestYear);
  const latestYearReturns = latestYearData ? latestYearData.dividends + latestYearData.buybacks : 0;
  return { combinedData, total, totalDividends, totalBuybacks, latestYearReturns, latestYear };
};

export const buybackDataForGraphDaily = (data) => (data || []).filter((item) => item.Antal_aktier > 0);

export const buybackDataForGraphYearly = (data) => {
  const yearly = {};
  (data || [])
    .filter((i) => i.Antal_aktier > 0)
    .forEach((i) => {
      const year = i.Datum.split('-')[0];
      yearly[year] = { Datum: year, Antal_aktier: (yearly[year]?.Antal_aktier || 0) + i.Antal_aktier };
    });
  return Object.values(yearly).sort((a, b) => a.Datum.localeCompare(b.Datum));
};

export const buybackDataForGraphMonthly = (data) => {
  const monthly = {};
  (data || [])
    .filter((i) => i.Antal_aktier > 0)
    .forEach((i) => {
      const [year, month] = i.Datum.split('-').slice(0, 2);
      const key = `${year}-${month}`;
      monthly[key] = { Datum: key, Antal_aktier: (monthly[key]?.Antal_aktier || 0) + i.Antal_aktier };
    });
  return Object.values(monthly).sort((a, b) => a.Datum.localeCompare(b.Datum));
};

export const buybackDataForGraphWeekly = (data) => {
  const weekly = {};
  (data || [])
    .filter((i) => i.Antal_aktier > 0)
    .forEach((i) => {
      const date = new Date(i.Datum);
      const year = date.getFullYear();
      const firstDayOfYear = new Date(year, 0, 1);
      const daysOffset = (firstDayOfYear.getDay() + 6) % 7;
      const daysSinceYearStart = Math.floor((date - firstDayOfYear) / (1000 * 60 * 60 * 24));
      const weekNumber = Math.ceil((daysSinceYearStart + daysOffset + 1) / 7);
      const key = `${year}-V${String(weekNumber).padStart(2, '0')}`;
      weekly[key] = { Datum: key, Antal_aktier: (weekly[key]?.Antal_aktier || 0) + i.Antal_aktier };
    });
  return Object.values(weekly).sort((a, b) => a.Datum.localeCompare(b.Datum));
};

export const getIsoWeekBounds = (dateLike) => {
  const d = new Date(dateLike);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const monday = new Date(d);
  const diffToMonday = (day + 6) % 7;
  monday.setDate(d.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
};

export const getBusinessWeekBounds = (dateLike) => {
  const { monday } = getIsoWeekBounds(dateLike);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);
  return { monday, friday };
};

export const getLastWeekBuybacks = (data) => {
  if (!data || data.length === 0) return { periodStart: null, periodEnd: null, entries: [], totalShares: 0, totalValue: 0 };
  const positive = data.filter((d) => d.Antal_aktier > 0);
  if (positive.length === 0) return { periodStart: null, periodEnd: null, entries: [], totalShares: 0, totalValue: 0 };
  const maxTime = Math.max(...positive.map((d) => new Date(d.Datum).getTime()));
  const { monday, friday } = getBusinessWeekBounds(maxTime);
  const entries = positive
    .filter((d) => {
      const t = new Date(d.Datum).getTime();
      return t >= monday.getTime() && t <= friday.getTime();
    })
    .sort((a, b) => new Date(a.Datum) - new Date(b.Datum));
  const totalShares = entries.reduce((sum, d) => sum + (d.Antal_aktier || 0), 0);
  const totalValue = entries.reduce((sum, d) => sum + (d.Transaktionsvärde || 0), 0);
  return { periodStart: monday, periodEnd: friday, entries, totalShares, totalValue };
};

export const getPreviousWeekBuybacks = (data, currentWeekStart) => {
  if (!data || !currentWeekStart) return { periodStart: null, periodEnd: null, entries: [], totalShares: 0, totalValue: 0 };
  const prevStart = new Date(currentWeekStart);
  prevStart.setHours(0, 0, 0, 0);
  prevStart.setDate(prevStart.getDate() - 7);
  const prevEnd = new Date(prevStart);
  prevEnd.setDate(prevStart.getDate() + 4);
  prevEnd.setHours(23, 59, 59, 999);
  const positive = data.filter((d) => d.Antal_aktier > 0);
  const entries = positive
    .filter((d) => {
      const t = new Date(d.Datum).getTime();
      return t >= prevStart.getTime() && t <= prevEnd.getTime();
    })
    .sort((a, b) => new Date(a.Datum) - new Date(b.Datum));
  const totalShares = entries.reduce((sum, d) => sum + (d.Antal_aktier || 0), 0);
  const totalValue = entries.reduce((sum, d) => sum + (d.Transaktionsvärde || 0), 0);
  return { periodStart: prevStart, periodEnd: prevEnd, entries, totalShares, totalValue };
};

export const calculateBuybackStats = (transactions) => {
  const positive = (transactions || []).filter((i) => i.Antal_aktier > 0);
  if (!positive.length) return { sharesBought: 0, averagePrice: 0 };
  const totalSharesBought = positive.reduce((s, i) => s + (i.Antal_aktier || 0), 0);
  const totalTransactionValue = positive.reduce((s, i) => s + (i.Transaktionsvärde || 0), 0);
  const averagePrice = totalSharesBought > 0 ? totalTransactionValue / totalSharesBought : 0;
  return { sharesBought: totalSharesBought, averagePrice };
};

export const calculateAverageDailyBuyback = (data) => {
  const positive = (data || []).filter((i) => i.Antal_aktier > 0);
  if (!positive.length) return { averageDaily: 0, averagePrice: 0 };
  const firstDate = new Date(positive[0].Datum);
  // Använd dagens datum för beräkning
  const today = new Date();
  const daysDifference = Math.ceil((today - firstDate) / (1000 * 60 * 60 * 24));
  const totalSharesBought = positive.reduce((s, i) => s + (i.Antal_aktier || 0), 0);
  const totalTransactionValue = positive.reduce((s, i) => s + (i.Transaktionsvärde || 0), 0);
  const averagePrice = totalSharesBought > 0 ? totalTransactionValue / totalSharesBought : 0;
  const averageDaily = daysDifference > 0 ? totalSharesBought / daysDifference : 0;
  return { averageDaily, averagePrice };
};

export const calculateEstimatedCompletion = (remainingCash, transactions) => {
  const totalShares = (transactions || []).reduce((s, i) => s + (i.Antal_aktier || 0), 0);
  const totalValue = (transactions || []).reduce((s, i) => s + (i.Transaktionsvärde || 0), 0);
  const averagePrice = totalShares > 0 ? totalValue / totalShares : 0;
  const firstDate = new Date(Math.min(...(transactions || []).map((i) => new Date(i.Datum))));
  const lastDate = new Date(Math.max(...(transactions || []).map((i) => new Date(i.Datum))));
  let tradingDays = 0;
  let currentDate = new Date(firstDate);
  while (currentDate <= lastDate) {
    const dow = currentDate.getDay();
    if (dow !== 0 && dow !== 6) tradingDays++;
    currentDate.setDate(currentDate.getDate() + 1);
  }
  const averageDailyShares = tradingDays > 0 ? totalShares / tradingDays : 0;
  const remainingSharesToBuy = averagePrice > 0 ? remainingCash / averagePrice : 0;
  const daysToCompletion = averageDailyShares > 0 ? remainingSharesToBuy / averageDailyShares : 0;
  // Starta från dagens datum
  const today = new Date();
  let estimatedCompletionDate = new Date(today);
  let remainingTradingDays = Math.ceil(daysToCompletion);
  while (remainingTradingDays > 0) {
    estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + 1);
    const dow = estimatedCompletionDate.getDay();
    if (dow !== 0 && dow !== 6) remainingTradingDays--;
  }
  return {
    currentProgramAverageDailyShares: averageDailyShares,
    daysToCompletion: Math.ceil(daysToCompletion),
    estimatedCompletionDate: estimatedCompletionDate.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' }),
  };
};
