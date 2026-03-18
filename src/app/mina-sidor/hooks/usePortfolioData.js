
import { useState, useMemo, useEffect } from "react";
import dividendData from "@/app/data/dividendData.json";
import buybackDataStatic from "@/app/data/buybackData.json";
import amountOfShares from "@/app/data/amountOfShares.json";
import { computeTraderPnl } from "@/Components/MinaSidor/pnl";
import { isBuyEligibleForDividend, resolveDividendExDate } from "@/lib/dividendEligibility";

const NO_DIVIDEND_PROPOSAL = {
    date: "2026-03-18",
    announcementDate: "2026-03-18",
    dividendPerShare: 0,
    status: "no_dividend_proposed",
};

export function usePortfolioData({ token, user, isAuthenticated, initialized, stockPrice, playersLive }) {
    const [profile, setProfile] = useState({ shares: 0, avgCost: 0, acquisitionDate: null, lots: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [profileIdentity, setProfileIdentity] = useState({ firstName: "", lastName: "", email: "" });
    const [isAdminUser, setIsAdminUser] = useState(false);
    const [isSubscriber, setIsSubscriber] = useState(false);
    const [athEmailEnabled, setAthEmailEnabled] = useState(false);
    const [dailyAvgEmailEnabled, setDailyAvgEmailEnabled] = useState(false);

    const [dividendsReceived, setDividendsReceived] = useState("");
    const [dividendInputMode, setDividendInputMode] = useState("manual");
    const [hasStoredDividendMode, setHasStoredDividendMode] = useState(false);
    const [isTraderMode, setIsTraderMode] = useState(false);
    const [buybackData, setBuybackData] = useState(
        Array.isArray(buybackDataStatic) ? buybackDataStatic : []
    );

    // -- Data Fetching --

    useEffect(() => {
        if (!initialized) return;
        if (!isAuthenticated) return;

        const loadProfile = async () => {
            try {
                setLoading(true);
                const res = await fetch("/api/user/profile", {
                    headers: { Authorization: `Bearer ${token}` },
                    cache: "no-store",
                });
                if (!res.ok) throw new Error("Kunde inte läsa profil.");
                const data = await res.json();
                setProfileIdentity({
                    firstName: data.firstName ?? "",
                    lastName: data.lastName ?? "",
                    email: data.email ?? "",
                });
                setIsAdminUser(Boolean(data.isAdmin));
                setIsSubscriber(Boolean(data.isSubscriber));
                setAthEmailEnabled(Boolean(data?.notifications?.athEmail));
                setDailyAvgEmailEnabled(Boolean(data?.notifications?.dailyAvgEmail));
                setProfile(data.profile ?? { shares: 0, avgCost: 0, acquisitionDate: null, lots: [] });
                setError("");
            } catch (err) {
                setError(err?.message || "Något gick fel.");
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [initialized, isAuthenticated, token]);

    useEffect(() => {
        let cancelled = false;
        const loadBuybacks = async () => {
            try {
                const res = await fetch("/api/buybacks/data", { cache: "no-store" });
                if (!res.ok) return;
                const json = await res.json();
                if (cancelled) return;
                const currentRows = Array.isArray(json?.current) ? json.current : [];
                setBuybackData(currentRows);
            } catch {
                // Keep static fallback data
            }
        };
        loadBuybacks();
        return () => {
            cancelled = true;
        };
    }, []);

    // -- Local Storage Sync --

    useEffect(() => {
        if (!user?.email) return;
        try {
            const stored = window.localStorage.getItem(`evodata.holdings.dividends:${user.email}`);
            if (stored) setDividendsReceived(stored);
        } catch { }
    }, [user?.email]);

    useEffect(() => {
        if (!user?.email) return;
        try {
            const stored = window.localStorage.getItem(`evodata.holdings.dividendMode:${user.email}`);
            if (stored === "manual" || stored === "acquisition") {
                setDividendInputMode(stored);
                setHasStoredDividendMode(true);
            } else {
                setHasStoredDividendMode(false);
            }
        } catch { }
    }, [user?.email]);

    // Auto-pick date-based dividends for imported users unless they have an explicit manual setup.
    useEffect(() => {
        const txCount = Array.isArray(profile?.transactions) ? profile.transactions.length : 0;
        if (txCount <= 0) return;
        if (dividendInputMode === "acquisition") return;

        const manualValue = Number(dividendsReceived);
        const hasManualValue =
            String(dividendsReceived ?? "").trim() !== "" && Number.isFinite(manualValue);

        if (!hasStoredDividendMode || !hasManualValue) {
            setDividendInputMode("acquisition");
        }
    }, [dividendInputMode, dividendsReceived, hasStoredDividendMode, profile?.transactions]);

    useEffect(() => {
        if (!user?.email) return;
        try {
            const raw = window.localStorage.getItem(`evodata.ui.traderMode:${user.email}`) || "";
            setIsTraderMode(raw === "1");
        } catch { }
    }, [user?.email]);

    // -- Calculations --

    const currentPrice = useMemo(() => {
        const live = stockPrice?.price?.regularMarketPrice;
        const liveRaw = Number(live?.raw ?? live);
        if (Number.isFinite(liveRaw) && liveRaw > 0) return liveRaw;
        return 0;
    }, [stockPrice]);

    const declaredUpcomingDividend = useMemo(() => {
        const planned = Array.isArray(dividendData?.plannedDividends)
            ? dividendData.plannedDividends
            : [];
        if (!planned.length) return null;

        const today = new Date();
        const todayMs = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999);

        const toDayEndMs = (value) => {
            if (!value) return null;
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) return null;
            return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999);
        };

        const activeDeclared = planned
            .map((item) => {
                const dps = Number(item?.dividendPerShare);
                if (!(Number.isFinite(dps) && dps > 0)) return null;
                const exMs = toDayEndMs(item?.exDate || item?.date);
                const payMs = toDayEndMs(item?.paymentDate || item?.payDate || item?.payoutDate);
                const anchorMs = exMs ?? payMs ?? Number.MAX_SAFE_INTEGER;
                const isActiveUntilPayment =
                    Number.isFinite(payMs) ? payMs >= todayMs : Number.isFinite(exMs) ? exMs >= todayMs : false;
                return {
                    ...item,
                    dividendPerShare: dps,
                    __anchorMs: anchorMs,
                    __isActiveUntilPayment: isActiveUntilPayment,
                };
            })
            .filter((item) => item && item.__isActiveUntilPayment)
            .sort((a, b) => (a.__anchorMs || 0) - (b.__anchorMs || 0));

        return activeDeclared[0] ?? null;
    }, []);
    const upcomingDividend = useMemo(
        () => declaredUpcomingDividend ?? NO_DIVIDEND_PROPOSAL,
        [declaredUpcomingDividend]
    );

    const lastDividend = useMemo(() => {
        const historical = Array.isArray(dividendData?.historicalDividends)
            ? dividendData.historicalDividends
            : [];
        if (!historical.length) return null;
        return [...historical]
            .filter((row) => row?.date)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(-1)[0] ?? null;
    }, []);

    const totalValue = profile.shares * currentPrice;
    const totalCost = profile.shares * profile.avgCost;
    const gain = totalValue - totalCost;
    const gainPercent = totalCost > 0 ? (gain / totalCost) * 100 : null;
    const upcomingDividendPerShare = upcomingDividend?.dividendPerShare ?? null;
    const referenceDividendPerShare =
        upcomingDividend?.dividendPerShare ?? lastDividend?.dividendPerShare ?? null;
    const expectedDividendCash =
        Number.isFinite(upcomingDividendPerShare) ? profile.shares * upcomingDividendPerShare : null;
    const dividendYield =
        currentPrice > 0 && Number.isFinite(referenceDividendPerShare)
            ? (referenceDividendPerShare / currentPrice) * 100
            : null;

    const todaysChangePercent = Number(stockPrice?.price?.regularMarketChangePercent?.raw ?? null);

    const todaysChangePerShare = useMemo(() => {
        if (!Number.isFinite(currentPrice) || currentPrice <= 0) return null;
        if (!Number.isFinite(todaysChangePercent)) return null;
        const p = todaysChangePercent / 100;
        if (p <= -0.999999) return null;
        const prevClose = currentPrice / (1 + p);
        const change = currentPrice - prevClose;
        return Number.isFinite(change) ? change : null;
    }, [currentPrice, todaysChangePercent]);

    const todaysHoldingChangeSek = useMemo(() => {
        if (!(profile.shares > 0)) return null;
        if (!Number.isFinite(todaysChangePerShare)) return null;
        return profile.shares * todaysChangePerShare;
    }, [profile.shares, todaysChangePerShare]);

    const dividendsReceivedValue = Number(dividendsReceived);
    const hasManualDividends = dividendsReceived !== "" && Number.isFinite(dividendsReceivedValue);
    const importedDividendTotal = Number(profile?.importedDividendTotal);
    const importedDividendTotalSafe =
        Number.isFinite(importedDividendTotal) && importedDividendTotal >= 0
            ? importedDividendTotal
            : null;
    const acquisitionDateValue =
        typeof profile?.acquisitionDate === "string" && profile.acquisitionDate.trim()
            ? profile.acquisitionDate.trim().slice(0, 10)
            : null;

    const estimatedDividendsFromDate = useMemo(() => {
        const lots = Array.isArray(profile?.lots) ? profile.lots : [];
        const historical = Array.isArray(dividendData?.historicalDividends) ? dividendData.historicalDividends : [];
        if (!historical.length) return null;
        if (lots.length) {
            const total = lots.reduce((sum, lot) => {
                const lotShares = Number(lot?.shares ?? 0);
                if (!(lotShares > 0) || !lot?.date) return sum;
                const lotDividend = historical.reduce((acc, row) => {
                    const perShare = Number(row?.dividendPerShare);
                    if (!Number.isFinite(perShare) || perShare <= 0) return acc;
                    return isBuyEligibleForDividend(lot.date, row) ? acc + perShare : acc;
                }, 0);
                return sum + lotDividend * lotShares;
            }, 0);
            return total;
        }
        if (!acquisitionDateValue || !(profile.shares > 0)) return null;
        const sumPerShare = historical.reduce((sum, row) => {
            const perShare = Number(row?.dividendPerShare);
            if (!Number.isFinite(perShare) || perShare <= 0) return sum;
            return isBuyEligibleForDividend(acquisitionDateValue, row) ? sum + perShare : sum;
        }, 0);
        return sumPerShare * profile.shares;
    }, [acquisitionDateValue, profile?.lots, profile.shares]);

    const estimatedDividendsFromTransactionsMeta = useMemo(() => {
        const historical = Array.isArray(dividendData?.historicalDividends) ? dividendData.historicalDividends : [];
        const txs = Array.isArray(profile?.transactions) ? profile.transactions : [];
        if (!historical.length || !txs.length) return null;

        const normalizedTxs = txs
            .map((tx) => ({
                type: tx?.type === "buy" || tx?.type === "sell" ? tx.type : null,
                date: typeof tx?.date === "string" ? tx.date.slice(0, 10) : null,
                shares: Math.abs(Math.round(Number(tx?.shares))),
            }))
            .filter(
                (tx) =>
                    (tx.type === "buy" || tx.type === "sell") &&
                    /^\d{4}-\d{2}-\d{2}$/.test(String(tx.date || "")) &&
                    Number.isFinite(tx.shares) &&
                    tx.shares > 0
            )
            .sort((a, b) => {
                const c = a.date.localeCompare(b.date);
                if (c !== 0) return c;
                if (a.type !== b.type) return a.type === "buy" ? -1 : 1;
                return 0;
            });

        if (!normalizedTxs.length) return null;

        const dividends = historical
            .map((row) => ({
                exDate: resolveDividendExDate(row),
                dividendPerShare: Number(row?.dividendPerShare),
            }))
            .filter(
                (row) =>
                    /^\d{4}-\d{2}-\d{2}$/.test(String(row.exDate || "")) &&
                    Number.isFinite(row.dividendPerShare) &&
                    row.dividendPerShare > 0
            )
            .sort((a, b) => a.exDate.localeCompare(b.exDate));

        if (!dividends.length) return null;

        let txIndex = 0;
        let holdings = 0;
        let total = 0;
        let counted = 0;
        let firstIncludedExDate = null;
        let lastIncludedExDate = null;

        for (const div of dividends) {
            while (txIndex < normalizedTxs.length && normalizedTxs[txIndex].date < div.exDate) {
                const tx = normalizedTxs[txIndex];
                if (tx.type === "buy") holdings += tx.shares;
                else holdings = Math.max(0, holdings - tx.shares);
                txIndex += 1;
            }
            if (holdings > 0) {
                total += holdings * div.dividendPerShare;
                counted += 1;
                if (!firstIncludedExDate) firstIncludedExDate = div.exDate;
                lastIncludedExDate = div.exDate;
            }
        }

        return {
            total,
            counted,
            firstIncludedExDate,
            lastIncludedExDate,
        };
    }, [profile?.transactions]);

    const estimatedDividendsFromTransactions = Number.isFinite(estimatedDividendsFromTransactionsMeta?.total)
        ? estimatedDividendsFromTransactionsMeta.total
        : null;

    const autoEstimatedDividends =
        Number.isFinite(importedDividendTotalSafe)
            ? importedDividendTotalSafe
            : Number.isFinite(estimatedDividendsFromTransactions)
            ? estimatedDividendsFromTransactions
            : Number.isFinite(estimatedDividendsFromDate)
                ? estimatedDividendsFromDate
                : null;

    const dividendsReceivedSafe =
        dividendInputMode === "manual"
            ? hasManualDividends
                ? dividendsReceivedValue
                : Number.isFinite(autoEstimatedDividends)
                    ? autoEstimatedDividends
                    : 0
            : Number.isFinite(autoEstimatedDividends)
                ? autoEstimatedDividends
                : 0;

    const totalReturnWithDividends = totalValue + dividendsReceivedSafe - totalCost;
    const totalReturnPctWithDividends =
        totalCost > 0 ? (totalReturnWithDividends / totalCost) * 100 : null;

    const traderPnl = useMemo(() => {
        if (!isTraderMode) return null;
        return computeTraderPnl({
            transactions: profile?.transactions,
            currentPrice,
            dividendsReceived: dividendsReceivedSafe,
        });
    }, [currentPrice, dividendsReceivedSafe, isTraderMode, profile?.transactions]);

    const breakEvenWithDividends =
        profile.shares > 0 ? (totalCost - dividendsReceivedSafe) / profile.shares : null;
    const breakEvenPaidBack =
        breakEvenWithDividends != null && Number.isFinite(breakEvenWithDividends) && breakEvenWithDividends <= 0;
    const breakEvenDisplay =
        breakEvenWithDividends != null && Number.isFinite(breakEvenWithDividends)
            ? Math.max(breakEvenWithDividends, 0)
            : null;

    const buybackSummary = useMemo(() => {
        const latestShares = amountOfShares?.[amountOfShares.length - 1]?.sharesOutstanding;
        const currentOutstanding = Number.isFinite(latestShares) ? latestShares * 1_000_000 : null;
        const totalBuybackShares = Array.isArray(buybackData)
            ? buybackData.reduce((sum, row) => sum + (Number(row["Antal_aktier"]) || 0), 0)
            : 0;
        const totalBuybackSpend = Array.isArray(buybackData)
            ? buybackData.reduce((sum, row) => sum + (Number(row["Transaktionsvärde"]) || 0), 0)
            : 0;

        if (!Number.isFinite(currentOutstanding) || currentOutstanding <= 0) {
            return null;
        }

        const preBuybackOutstanding = currentOutstanding + totalBuybackShares;
        const ownershipBefore = preBuybackOutstanding > 0 ? profile.shares / preBuybackOutstanding : 0;
        const ownershipAfter = profile.shares / currentOutstanding;
        const ownershipLiftPct =
            ownershipBefore > 0 ? ((ownershipAfter / ownershipBefore) - 1) * 100 : null;
        const buybackBenefit = ownershipBefore > 0 ? totalBuybackSpend * ownershipBefore : 0;

        const dividendBenefit =
            Number.isFinite(dividendsReceivedSafe) && dividendsReceivedSafe > 0
                ? dividendsReceivedSafe
                : 0;
        const totalShareholderReturn =
            (Number.isFinite(dividendBenefit) ? dividendBenefit : 0) + buybackBenefit;
        const totalShareholderReturnPct =
            totalValue > 0 ? (totalShareholderReturn / totalValue) * 100 : null;

        return {
            ownershipBefore,
            ownershipAfter,
            ownershipLiftPct,
            buybackBenefit,
            dividendBenefit,
            dividendCountedExDates: estimatedDividendsFromTransactionsMeta?.counted ?? null,
            dividendExDateFrom: estimatedDividendsFromTransactionsMeta?.firstIncludedExDate ?? null,
            dividendExDateTo: estimatedDividendsFromTransactionsMeta?.lastIncludedExDate ?? null,
            totalShareholderReturn,
            totalShareholderReturnPct,
            latestSharesDate: amountOfShares?.[amountOfShares.length - 1]?.date,
        };
    }, [buybackData, dividendsReceivedSafe, estimatedDividendsFromTransactionsMeta, profile.shares, totalValue]);

    const greetingName = useMemo(() => {
        const first = String(user?.firstName || profileIdentity.firstName || "").trim();
        if (first) return first;
        const email = String(user?.email || profileIdentity.email || "").trim();
        if (!email) return "";
        if (email.toLowerCase() === "alexander.ek@live.se") return "Alexander";
        const localPart = email.split("@")[0] || "";
        const maybeFirst = localPart.split(/[._-]/)[0] || localPart;
        return maybeFirst ? maybeFirst.charAt(0).toUpperCase() + maybeFirst.slice(1) : "";
    }, [profileIdentity.email, profileIdentity.firstName, user?.email, user?.firstName]);

    const effectiveIsAdmin = useMemo(
        () =>
            Boolean(user?.isAdmin) ||
            isAdminUser ||
            String(user?.email || profileIdentity.email || "").toLowerCase() === "alexander.ek@live.se",
        [isAdminUser, profileIdentity.email, user?.email, user?.isAdmin]
    );

    const totalLivePlayers = useMemo(() => {
        if (!playersLive) return null;
        return Object.values(playersLive).reduce((sum, item) => {
            const val = Number(item?.players);
            return Number.isFinite(val) ? sum + val : sum;
        }, 0);
    }, [playersLive]);

    return {
        profile, setProfile,
        loading, setLoading,
        error, setError,
        profileIdentity, setProfileIdentity,
        isAdminUser,
        isSubscriber,
        effectiveIsAdmin,
        athEmailEnabled, setAthEmailEnabled,
        dailyAvgEmailEnabled, setDailyAvgEmailEnabled,

        dividendsReceived, setDividendsReceived,
        dividendInputMode, setDividendInputMode,
        isTraderMode, setIsTraderMode,
        buybackData,

        // Calculated
        currentPrice,
        upcomingDividend,
        lastDividend,
        totalValue,
        totalCost,
        gain,
        gainPercent,
        expectedDividendCash,
        dividendYield,
        todaysChangePercent,
        todaysChangePerShare,
        todaysHoldingChangeSek,
        estimatedDividendsFromDate,
        estimatedDividendsFromTransactions,
        estimatedDividendsFromTransactionsMeta,
        dividendsReceivedSafe,
        totalReturnWithDividends,
        totalReturnPctWithDividends,
        traderPnl,
        breakEvenDisplay,
        breakEvenPaidBack,
        buybackSummary,
        greetingName,
        totalLivePlayers
    };
}
