// Calculates personal ownership effects from completed and hypothetical buybacks.
import {
  CURRENT_BUYBACK_EXECUTION_START_DATE,
  DEFAULT_BUYBACK_MANDATE_CASH_EUR,
  normalizeBuybackExecutions,
  summarizeBuybackExecution,
} from "./buybackMandate.js";

const normalizeDate = (value) => {
  if (typeof value !== "string") return null;
  const date = value.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(`${date}T00:00:00Z`))
    ? date
    : null;
};

const normalizeHoldingLots = ({ profileShares, lots, acquisitionDate }) => {
  const normalizedLots = (Array.isArray(lots) ? lots : [])
    .map((lot) => {
      const shares = Math.abs(Math.round(Number(lot?.shares)));
      const date = normalizeDate(lot?.date);
      return shares > 0 && date ? { shares, date } : null;
    })
    .filter(Boolean);

  if (normalizedLots.length > 0) return normalizedLots;

  const shares = Math.abs(Math.round(Number(profileShares)));
  const date = normalizeDate(acquisitionDate);
  return shares > 0 && date ? [{ shares, date }] : [];
};

const getLatestOutstandingShares = (sharesData = []) => {
  if (!Array.isArray(sharesData) || sharesData.length === 0) return null;
  const latest = sharesData.at(-1);
  const sharesOutstanding = Number(latest?.sharesOutstanding);
  if (!Number.isFinite(sharesOutstanding) || sharesOutstanding <= 0) return null;
  return sharesOutstanding > 1e6 ? sharesOutstanding : sharesOutstanding * 1e6;
};

export const computeFullBuybackMandateSummary = ({
  profileShares,
  currentPriceSEK,
  fxRate,
  sharesData,
  buybackData = [],
  personalActualSummary = null,
  dividendsReceived = 0,
  totalValue = 0,
  mandateCashEur = DEFAULT_BUYBACK_MANDATE_CASH_EUR,
  programStartDate = CURRENT_BUYBACK_EXECUTION_START_DATE,
} = {}) => {
  const shares = Number(profileShares);
  const currentPrice = Number(currentPriceSEK);
  const fx = Number(fxRate);
  const execution = summarizeBuybackExecution({
    buybackData,
    sharesData,
    fxRate,
    mandateCashEur,
    mandateStartDate: programStartDate,
  });
  const currentOutstanding = execution.currentShares ?? getLatestOutstandingShares(sharesData);
  const mandateEur = Number(mandateCashEur);

  if (
    !Number.isFinite(currentPrice) ||
    currentPrice <= 0 ||
    !Number.isFinite(fx) ||
    fx <= 0 ||
    !Number.isFinite(currentOutstanding) ||
    currentOutstanding <= 0 ||
    !Number.isFinite(mandateEur) ||
    mandateEur <= 0
  ) {
    return null;
  }

  const mandateSek = mandateEur * fx;
  const executedSpendSek = Number(execution.executedSpendInMandateSek) || 0;
  const remainingMandateSek = Math.max(mandateSek - executedSpendSek, 0);
  const futureRepurchasedShares = remainingMandateSek / currentPrice;
  const postBuybackOutstanding = currentOutstanding - futureRepurchasedShares;

  if (!Number.isFinite(postBuybackOutstanding) || postBuybackOutstanding <= 0) {
    return null;
  }

  const hasHoldings = Number.isFinite(shares) && shares > 0;
  const ownershipAfter = hasHoldings ? shares / postBuybackOutstanding : null;
  const completedLiftPct = Number(personalActualSummary?.ownershipLiftPct);
  const completedLiftFactor = Number.isFinite(completedLiftPct) && completedLiftPct >= 0
    ? 1 + completedLiftPct / 100
    : 1;
  const futureLiftFactor = currentOutstanding / postBuybackOutstanding;
  const ownershipLiftPct = hasHoldings
    ? (completedLiftFactor * futureLiftFactor - 1) * 100
    : null;
  const ownershipBefore = ownershipAfter && ownershipLiftPct != null
    ? ownershipAfter / (1 + ownershipLiftPct / 100)
    : null;
  const illustrativeBuybackAllocation = ownershipBefore && ownershipBefore > 0 ? mandateSek * ownershipBefore : null;
  const dividendIncome = Number.isFinite(dividendsReceived) && dividendsReceived > 0 ? dividendsReceived : 0;
  const dividendIncomePct =
    Number.isFinite(dividendIncome) && Number.isFinite(totalValue) && totalValue > 0
      ? (dividendIncome / totalValue) * 100
      : null;
  const repurchasedShares = execution.executedSharesInMandate + futureRepurchasedShares;
  const programStartOutstanding = currentOutstanding + execution.executedSharesInMandate;
  const buybackYieldPct = programStartOutstanding > 0
    ? (repurchasedShares / programStartOutstanding) * 100
    : null;
  const equivalentExtraShares = ownershipLiftPct != null ? shares * (ownershipLiftPct / 100) : null;
  const completedPersonalBuybackValueSek = Number(personalActualSummary?.personalBuybackValueSek);
  const futurePersonalBuybackValueSek = hasHoldings
    ? remainingMandateSek * (shares / currentOutstanding)
    : null;
  const personalBuybackValueSek = hasHoldings && futurePersonalBuybackValueSek != null
    ? (Number.isFinite(completedPersonalBuybackValueSek) ? completedPersonalBuybackValueSek : 0) + futurePersonalBuybackValueSek
    : null;

  return {
    ownershipBefore,
    ownershipAfter,
    ownershipLiftPct,
    illustrativeBuybackAllocation,
    dividendIncome,
    dividendIncomePct,
    mandateSek,
    remainingMandateSek,
    executedSpendSek,
    buybackYieldPct,
    hasHoldings,
    repurchasedShares,
    futureRepurchasedShares,
    equivalentExtraShares,
    personalBuybackValueSek,
    futurePersonalBuybackValueSek,
    currentOutstanding,
    postBuybackOutstanding,
    programStartDate,
    latestBuybackDate: execution.latestBuybackDate,
    traceableShares: personalActualSummary?.traceableShares ?? (hasHoldings ? shares : 0),
    benefitedShares: hasHoldings ? shares : 0,
  };
};

export const computePersonalCurrentProgramSummary = ({
  profileShares,
  lots,
  acquisitionDate,
  buybackData = [],
  sharesData = [],
  programStartDate = CURRENT_BUYBACK_EXECUTION_START_DATE,
} = {}) => {
  const shares = Math.max(0, Number(profileShares) || 0);
  const normalizedStartDate = normalizeDate(programStartDate);
  if (!normalizedStartDate) return null;

  const execution = summarizeBuybackExecution({
    buybackData,
    sharesData,
    mandateStartDate: normalizedStartDate,
  });
  const currentOutstanding = execution.currentShares;
  if (!(currentOutstanding > 0)) return null;

  const programRows = normalizeBuybackExecutions(buybackData)
    .filter((row) => row.date >= normalizedStartDate);
  const holdingLots = normalizeHoldingLots({ profileShares: shares, lots, acquisitionDate });
  const traceableShares = holdingLots.reduce((sum, lot) => sum + lot.shares, 0);
  const programStartOutstanding = currentOutstanding + execution.executedSharesInMandate;
  let benefitedShares = 0;
  let equivalentExtraShares = 0;
  let personalBuybackValueSek = 0;
  let outstandingBeforeExecution = programStartOutstanding;

  for (const row of programRows) {
    const eligibleShares = holdingLots.reduce((sum, lot) => {
      const lotPredatesProgram = lot.date < normalizedStartDate;
      return lotPredatesProgram || row.date > lot.date ? sum + lot.shares : sum;
    }, 0);
    if (eligibleShares > 0 && outstandingBeforeExecution > 0) {
      personalBuybackValueSek += row.spendSek * (eligibleShares / outstandingBeforeExecution);
    }
    outstandingBeforeExecution = Math.max(outstandingBeforeExecution - row.shares, 1);
  }

  for (const lot of holdingLots) {
    const repurchasedAfterPurchase = programRows.reduce((sum, row) => {
      const lotPredatesProgram = lot.date < normalizedStartDate;
      return lotPredatesProgram || row.date > lot.date ? sum + row.shares : sum;
    }, 0);
    if (!(repurchasedAfterPurchase > 0)) continue;

    benefitedShares += lot.shares;
    const outstandingWhenEffectStarts = currentOutstanding + repurchasedAfterPurchase;
    equivalentExtraShares += lot.shares * (outstandingWhenEffectStarts / currentOutstanding - 1);
  }

  const hasHoldings = shares > 0;
  const hasTraceableHoldings = hasHoldings && traceableShares > 0;
  const ownershipLiftPct = hasTraceableHoldings
    ? (equivalentExtraShares / shares) * 100
    : null;
  const ownershipAfter = hasHoldings ? shares / currentOutstanding : null;
  const ownershipBefore = ownershipAfter && ownershipLiftPct != null
    ? ownershipAfter / (1 + ownershipLiftPct / 100)
    : null;

  return {
    ownershipBefore,
    ownershipAfter,
    ownershipLiftPct,
    equivalentExtraShares: hasTraceableHoldings ? equivalentExtraShares : null,
    personalBuybackValueSek: hasTraceableHoldings ? personalBuybackValueSek : null,
    buybackYieldPct: programStartOutstanding > 0
      ? (execution.executedSharesInMandate / programStartOutstanding) * 100
      : null,
    repurchasedShares: execution.executedSharesInMandate,
    buybackSpendSek: execution.executedSpendInMandateSek,
    currentOutstanding,
    programStartOutstanding,
    programStartDate: normalizedStartDate,
    latestBuybackDate: programRows.at(-1)?.date ?? null,
    hasHoldings,
    traceableShares,
    benefitedShares,
    untraceableShares: Math.max(shares - traceableShares, 0),
  };
};
