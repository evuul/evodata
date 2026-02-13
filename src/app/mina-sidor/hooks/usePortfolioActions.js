
import { useState, useEffect } from "react";

export function usePortfolioActions({ token, user, profile, setProfile, setLoading, setError, translate }) {
    const [activity, setActivity] = useState([]);

    useEffect(() => {
        if (!user?.email) return;
        try {
            const stored = window.localStorage.getItem(`evodata.holdings.history:${user.email}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) setActivity(parsed);
            }
        } catch { }
    }, [user?.email]);

    const pushActivity = (entry) => {
        if (!user?.email) return;
        setActivity((prev) => {
            const next = [entry, ...prev].slice(0, 10);
            try {
                window.localStorage.setItem(`evodata.holdings.history:${user.email}`, JSON.stringify(next));
            } catch { }
            return next;
        });
    };

    const handleBuy = async ({ shares, price, buyDate }) => {
        if (!(shares > 0) || !(price > 0) || !buyDate) {
            setError(translate("Ange antal, pris och datum.", "Enter shares, price and date."));
            return;
        }
        try {
            setLoading(true);
            const res = await fetch("/api/user/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ action: "buy", shares, price, buyDate }),
            });
            if (!res.ok) throw new Error("Kunde inte uppdatera innehav.");
            const data = await res.json();
            setProfile(data.profile ?? profile);
            pushActivity({
                type: "buy",
                shares,
                price,
                buyDate,
                timestamp: new Date().toISOString(),
            });
            setError("");
        } catch (err) {
            setError(err?.message || "Något gick fel.");
        } finally {
            setLoading(false);
        }
    };

    const handleSell = async ({ shares, price }) => {
        if (!(shares > 0) || !(price > 0)) {
            setError(translate("Ange antal och pris.", "Enter shares and price."));
            return;
        }
        try {
            setLoading(true);
            const res = await fetch("/api/user/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ action: "sell", shares, price }),
            });
            if (!res.ok) throw new Error("Kunde inte uppdatera innehav.");
            const data = await res.json();
            setProfile(data.profile ?? profile);
            pushActivity({
                type: "sell",
                shares,
                price,
                timestamp: new Date().toISOString(),
            });
            setError("");
        } catch (err) {
            setError(err?.message || "Något gick fel.");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        if (!window.confirm(translate("Vill du verkligen nollställa ditt innehav?", "Reset your holdings?"))) {
            return;
        }
        try {
            setLoading(true);
            const res = await fetch("/api/user/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ action: "reset" }),
            });
            if (!res.ok) throw new Error("Kunde inte nollställa innehavet.");
            const data = await res.json();
            setProfile(data.profile ?? profile);
            pushActivity({
                type: "reset",
                timestamp: new Date().toISOString(),
            });
            setError("");
        } catch (err) {
            setError(err?.message || "Något gick fel.");
        } finally {
            setLoading(false);
        }
    };

    const handleSet = async ({ shares, avgCost, acquisitionDate }) => {
        if (!(shares >= 0) || !(avgCost >= 0)) {
            setError(translate("Ange giltiga värden.", "Enter valid values."));
            return null; // Return null to indicate failure
        }
        try {
            setLoading(true);
            const res = await fetch("/api/user/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    action: "set",
                    shares,
                    avgCost,
                    acquisitionDate: acquisitionDate || null,
                }),
            });
            if (!res.ok) throw new Error("Kunde inte spara ändringar.");
            const data = await res.json();
            setProfile(data.profile ?? profile);
            pushActivity({
                type: "set",
                timestamp: new Date().toISOString(),
            });
            setError("");
            return true; // Return true to indicate success
        } catch (err) {
            setError(err?.message || "Något gick fel.");
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleImportTransactions = async (input) => {
        const payload =
            Array.isArray(input)
                ? { transactions: input, dividendTotal: null }
                : {
                    transactions: Array.isArray(input?.transactions) ? input.transactions : [],
                    dividendTotal: Number.isFinite(Number(input?.dividendTotal))
                        ? Number(input.dividendTotal)
                        : null,
                };
        const transactions = payload.transactions;
        if (!token) {
            throw new Error(translate("Inte inloggad.", "Not logged in."));
        }
        if ((!Array.isArray(transactions) || !transactions.length) && !(payload.dividendTotal > 0)) {
            throw new Error(translate("Ingen transaktionsdata.", "No transaction data."));
        }
        try {
            setLoading(true);
            setError("");
            const res = await fetch("/api/user/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ action: "importTransactions", transactions, dividendTotal: payload.dividendTotal }),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(payload?.error || translate("Importen misslyckades.", "Import failed."));
            }
            setProfile(payload.profile ?? profile);
            pushActivity({
                type: "import",
                timestamp: new Date().toISOString(),
            });
            setError("");
        } finally {
            setLoading(false);
        }
    };

    return {
        activity,
        handleBuy,
        handleSell,
        handleReset,
        handleSet,
        handleImportTransactions
    };
}
