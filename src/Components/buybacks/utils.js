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
      yearly[year] = {
        Datum: year,
        Antal_aktier: (yearly[year]?.Antal_aktier || 0) + i.Antal_aktier,
        Transaktionsvärde: (yearly[year]?.Transaktionsvärde || 0) + (i.Transaktionsvärde || 0),
      };
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
      monthly[key] = {
        Datum: key,
        Antal_aktier: (monthly[key]?.Antal_aktier || 0) + i.Antal_aktier,
        Transaktionsvärde: (monthly[key]?.Transaktionsvärde || 0) + (i.Transaktionsvärde || 0),
      };
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
      weekly[key] = {
        Datum: key,
        Antal_aktier: (weekly[key]?.Antal_aktier || 0) + i.Antal_aktier,
        Transaktionsvärde: (weekly[key]?.Transaktionsvärde || 0) + (i.Transaktionsvärde || 0),
      };
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
  const positive = (data || []).filter((i) => Number(i?.Antal_aktier) > 0);
  if (!positive.length) return { averageDaily: 0, averagePrice: 0 };

  const sharesTotal = positive.reduce((sum, item) => sum + (Number(item.Antal_aktier) || 0), 0);
  const valueTotal = positive.reduce((sum, item) => sum + (Number(item.Transaktionsvärde) || 0), 0);
  const averagePrice = sharesTotal > 0 ? valueTotal / sharesTotal : 0;

  const firstDate = new Date(Math.min(...positive.map((item) => new Date(item.Datum))));
  const lastDate = new Date(Math.max(...positive.map((item) => new Date(item.Datum))));
  const tradingDays = countTradingDays(firstDate, lastDate);

  const averageDaily = tradingDays > 0 ? sharesTotal / tradingDays : 0;
  return { averageDaily, averagePrice };
};

export const calculateEstimatedCompletion = (remainingCash, transactions) => {
  if (!Array.isArray(transactions) || !transactions.length) return null;
  if (!Number.isFinite(remainingCash) || remainingCash <= 0) return null;

  const positive = transactions.filter((item) => Number(item?.Antal_aktier) > 0);
  if (!positive.length) return null;

  const sharesTotal = positive.reduce((sum, item) => sum + (Number(item.Antal_aktier) || 0), 0);
  const valueTotal = positive.reduce((sum, item) => sum + (Number(item.Transaktionsvärde) || 0), 0);
  if (!sharesTotal || !valueTotal) return null;

  const averagePrice = valueTotal / sharesTotal;
  if (!Number.isFinite(averagePrice) || averagePrice <= 0) return null;

  const firstDate = new Date(Math.min(...positive.map((item) => new Date(item.Datum))));
  const lastDate = new Date(Math.max(...positive.map((item) => new Date(item.Datum))));
  const tradingDays = countTradingDays(firstDate, lastDate);
  if (!tradingDays) return null;

  const averageDailyShares = sharesTotal / tradingDays;
  if (!Number.isFinite(averageDailyShares) || averageDailyShares <= 0) return null;

  const remainingSharesToBuy = remainingCash / averagePrice;
  if (!Number.isFinite(remainingSharesToBuy) || remainingSharesToBuy <= 0) {
    return {
      currentProgramAverageDailyShares: averageDailyShares,
      daysToCompletion: 0,
      estimatedCompletionDate: null,
    };
  }

  const daysToCompletion = remainingSharesToBuy / averageDailyShares;
  const today = new Date();
  let estimatedCompletionDate = new Date(today);
  let remainingTradingDays = Math.ceil(daysToCompletion);
  let safetyCounter = 0;
  while (remainingTradingDays > 0 && safetyCounter < 2000) {
    estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + 1);
    const dow = estimatedCompletionDate.getDay();
    if (dow !== 0 && dow !== 6) {
      remainingTradingDays -= 1;
    }
    safetyCounter += 1;
  }

  return {
    currentProgramAverageDailyShares: averageDailyShares,
    daysToCompletion: Math.ceil(daysToCompletion),
    estimatedCompletionDate:
      remainingTradingDays <= 0
        ? estimatedCompletionDate.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })
        : null,
  };
};

function countTradingDays(startDate, endDate) {
  if (!(startDate instanceof Date) || !(endDate instanceof Date)) return 0;
  if (Number.isNaN(startDate.valueOf()) || Number.isNaN(endDate.valueOf())) return 0;
  if (endDate < startDate) return 0;
  let tradingDays = 0;
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) tradingDays += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return tradingDays;
}
