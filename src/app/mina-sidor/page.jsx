"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Dialog, DialogContent, DialogTitle, Divider, Grid, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLocale, useTranslate } from "@/context/LocaleContext";
import { useStockPriceContext } from "@/context/StockPriceContext";
import { usePlayersLive } from "@/context/PlayersLiveContext";
import dividendData from "@/app/data/dividendData.json";
import buybackDataStatic from "@/app/data/buybackData.json";
import amountOfShares from "@/app/data/amountOfShares.json";
import MinaSidorHeader from "@/Components/MinaSidor/MinaSidorHeader";
import HoldingsChips from "@/Components/MinaSidor/HoldingsChips";
import HoldingsKpiRow from "@/Components/MinaSidor/HoldingsKpiRow";
import OwnershipCards from "@/Components/MinaSidor/OwnershipCards";
import ManageHoldingsModal from "@/Components/MinaSidor/ManageHoldingsModal";
import { pageShell, sectionDivider, sectionHeader, sectionRule, statusColors } from "@/Components/MinaSidor/styles";
import { formatSek } from "@/Components/MinaSidor/utils";

export default function MinaSidorPage() {
  const router = useRouter();
  const translate = useTranslate();
  const { locale } = useLocale();
  const { token, isAuthenticated, initialized, user, changePassword } = useAuth();
  const { stockPrice } = useStockPriceContext();
  const { data: playersData } = usePlayersLive();

  const [profile, setProfile] = useState({ shares: 0, avgCost: 0, acquisitionDate: null, lots: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [buyShares, setBuyShares] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [buyDate, setBuyDate] = useState("");
  const [sellShares, setSellShares] = useState("");
  const [activity, setActivity] = useState([]);
  const [ownershipView, setOwnershipView] = useState("after");
  const [dividendsReceived, setDividendsReceived] = useState("");
  const [dividendInputMode, setDividendInputMode] = useState("manual");
  const [manageOpen, setManageOpen] = useState(false);
  const [setShares, setSetShares] = useState("");
  const [setAvgCost, setSetAvgCost] = useState("");
  const [setAcquisitionDate, setSetAcquisitionDate] = useState("");
  const [profileIdentity, setProfileIdentity] = useState({ firstName: "", lastName: "", email: "" });
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [mailTestLoading, setMailTestLoading] = useState(false);
  const [mailTestMessage, setMailTestMessage] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [adminPanel, setAdminPanel] = useState("tools");
  const [adminActivityLoading, setAdminActivityLoading] = useState(false);
  const [adminActivityError, setAdminActivityError] = useState("");
  const [adminActivityRows, setAdminActivityRows] = useState([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminUsersError, setAdminUsersError] = useState("");
  const [adminUsersRows, setAdminUsersRows] = useState([]);
  const [adminUsersTotal, setAdminUsersTotal] = useState(0);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const contentWrapSx = { width: "100%", maxWidth: 1500, mx: "auto" };
  const [buybackData, setBuybackData] = useState(
    Array.isArray(buybackDataStatic) ? buybackDataStatic : []
  );

  const currentPrice = useMemo(() => {
    const live = stockPrice?.price?.regularMarketPrice;
    const liveRaw = Number(live?.raw ?? live);
    if (Number.isFinite(liveRaw) && liveRaw > 0) return liveRaw;
    return 0;
  }, [stockPrice]);

  const upcomingDividend = useMemo(() => {
    const planned = Array.isArray(dividendData?.plannedDividends)
      ? dividendData.plannedDividends
      : [];
    if (!planned.length) return null;

    const today = new Date();
    const futurePlanned = planned
      .filter((item) => {
        if (!item?.date) return true;
        const date = new Date(item.date);
        return !Number.isNaN(date.getTime()) && date >= today;
      })
      .sort((a, b) => {
        const da = new Date(a?.date || 0).getTime();
        const db = new Date(b?.date || 0).getTime();
        return da - db;
      });

    return futurePlanned[0] ?? null;
  }, []);

  const lastDividend = useMemo(() => {
    const historical = Array.isArray(dividendData?.historicalDividends)
      ? dividendData.historicalDividends
      : [];
    return historical[historical.length - 1] ?? null;
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
    // percent = (change / prevClose) => prevClose = current / (1 + p)
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
  const acquisitionDateValue =
    typeof profile?.acquisitionDate === "string" && profile.acquisitionDate.trim()
      ? profile.acquisitionDate.trim().slice(0, 10)
      : null;
  const estimatedDividendsFromDate = useMemo(() => {
    const lots = Array.isArray(profile?.lots) ? profile.lots : [];
    const historical = Array.isArray(dividendData?.historicalDividends) ? dividendData.historicalDividends : [];
    if (!historical.length) return null;
    const normalizeDate = (value) => {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return null;
      d.setHours(0, 0, 0, 0);
      return d;
    };
    if (lots.length) {
      const total = lots.reduce((sum, lot) => {
        const lotShares = Number(lot?.shares ?? 0);
        if (!(lotShares > 0) || !lot?.date) return sum;
        const lotDate = normalizeDate(lot.date);
        if (!lotDate) return sum;
        const lotDividend = historical.reduce((acc, row) => {
          const perShare = Number(row?.dividendPerShare);
          if (!Number.isFinite(perShare) || !row?.date) return acc;
          const divDate = normalizeDate(row.date);
          if (!divDate) return acc;
          return divDate >= lotDate ? acc + perShare : acc;
        }, 0);
        return sum + lotDividend * lotShares;
      }, 0);
      return total;
    }
    if (!acquisitionDateValue || !(profile.shares > 0)) return null;
    const start = normalizeDate(acquisitionDateValue);
    if (!start) return null;
    const sumPerShare = historical.reduce((sum, row) => {
      const perShare = Number(row?.dividendPerShare);
      if (!Number.isFinite(perShare) || !row?.date) return sum;
      const d = normalizeDate(row.date);
      if (!d) return sum;
      return d >= start ? sum + perShare : sum;
    }, 0);
    return sumPerShare * profile.shares;
  }, [acquisitionDateValue, profile?.lots, profile.shares]);
  const dividendsReceivedSafe =
    dividendInputMode === "acquisition"
      ? Number.isFinite(estimatedDividendsFromDate)
        ? estimatedDividendsFromDate
        : 0
      : hasManualDividends
      ? dividendsReceivedValue
      : 0;
  const totalReturnWithDividends = totalValue + dividendsReceivedSafe - totalCost;
  const totalReturnPctWithDividends =
    totalCost > 0 ? (totalReturnWithDividends / totalCost) * 100 : null;
  const breakEvenWithDividends =
    profile.shares > 0 ? (totalCost - dividendsReceivedSafe) / profile.shares : null;
  const breakEvenPaidBack =
    breakEvenWithDividends != null && Number.isFinite(breakEvenWithDividends) && breakEvenWithDividends <= 0;
  const breakEvenDisplay =
    breakEvenWithDividends != null && Number.isFinite(breakEvenWithDividends)
      ? Math.max(breakEvenWithDividends, 0)
      : null;
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
    if (!playersData) return null;
    return Object.values(playersData).reduce((sum, item) => {
      const val = Number(item?.players);
      return Number.isFinite(val) ? sum + val : sum;
    }, 0);
  }, [playersData]);

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
        // Keep static fallback data if API is unavailable.
      }
    };
    loadBuybacks();
    return () => {
      cancelled = true;
    };
  }, []);

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
    const totalShareholderReturn =
      (Number.isFinite(expectedDividendCash) ? expectedDividendCash : 0) + buybackBenefit;
    const totalShareholderReturnPct =
      totalValue > 0 ? (totalShareholderReturn / totalValue) * 100 : null;

    return {
      ownershipBefore,
      ownershipAfter,
      ownershipLiftPct,
      buybackBenefit,
      totalShareholderReturn,
      totalShareholderReturnPct,
      latestSharesDate: amountOfShares?.[amountOfShares.length - 1]?.date,
    };
  }, [buybackData, expectedDividendCash, profile.shares, totalValue]);

  useEffect(() => {
    if (!user?.email) return;
    try {
      const stored = window.localStorage.getItem(`evodata.holdings.history:${user.email}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setActivity(parsed);
      }
    } catch {
      // ignore
    }
  }, [user?.email]);

  useEffect(() => {
    if (!manageOpen) return;
    setSetShares(profile.shares ? String(profile.shares) : "");
    setSetAvgCost(profile.avgCost ? String(profile.avgCost) : "");
    setSetAcquisitionDate(
      typeof profile.acquisitionDate === "string" && profile.acquisitionDate.trim()
        ? profile.acquisitionDate.slice(0, 10)
        : ""
    );
    setBuyDate(new Date().toISOString().slice(0, 10));
  }, [manageOpen, profile.acquisitionDate, profile.avgCost, profile.shares]);

  useEffect(() => {
    if (!user?.email) return;
    try {
      const stored = window.localStorage.getItem(`evodata.holdings.dividends:${user.email}`);
      if (stored) setDividendsReceived(stored);
    } catch {
      // ignore
    }
  }, [user?.email]);

  useEffect(() => {
    if (!user?.email) return;
    try {
      const stored = window.localStorage.getItem(`evodata.holdings.dividendMode:${user.email}`);
      if (stored === "manual" || stored === "acquisition") {
        setDividendInputMode(stored);
      }
    } catch {
      // ignore
    }
  }, [user?.email]);

  const pushActivity = (entry) => {
    if (!user?.email) return;
    setActivity((prev) => {
      const next = [entry, ...prev].slice(0, 10);
      try {
        window.localStorage.setItem(`evodata.holdings.history:${user.email}`, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleDividendsChange = (event) => {
    const value = event.target.value;
    setDividendsReceived(value);
    if (!user?.email) return;
    try {
      window.localStorage.setItem(`evodata.holdings.dividends:${user.email}`, value);
    } catch {
      // ignore
    }
  };

  const handleDividendModeChange = (nextMode) => {
    if (nextMode !== "manual" && nextMode !== "acquisition") return;
    setDividendInputMode(nextMode);
    if (!user?.email) return;
    try {
      window.localStorage.setItem(`evodata.holdings.dividendMode:${user.email}`, nextMode);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!initialized) return;
    if (!isAuthenticated) {
      router.replace("/login?next=/mina-sidor");
      return;
    }

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
        setProfile(data.profile ?? { shares: 0, avgCost: 0, acquisitionDate: null, lots: [] });
        setError("");
      } catch (err) {
        setError(err?.message || "Något gick fel.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [initialized, isAuthenticated, router, token]);

  const handleBuy = async () => {
    const shares = Number(buyShares);
    const price = Number(buyPrice);
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
      setBuyShares("");
      setBuyPrice("");
      setBuyDate("");
      setError("");
    } catch (err) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  };

  const handleSell = async () => {
    const shares = Number(sellShares);
    if (!(shares > 0)) {
      setError(translate("Ange antal att sälja.", "Enter shares to sell."));
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "sell", shares }),
      });
      if (!res.ok) throw new Error("Kunde inte uppdatera innehav.");
      const data = await res.json();
      setProfile(data.profile ?? profile);
      pushActivity({
        type: "sell",
        shares,
        timestamp: new Date().toISOString(),
      });
      setSellShares("");
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

  const handleSet = async () => {
    const shares = Number(setShares);
    const avgCost = Number(setAvgCost);
    if (!(shares >= 0) || !(avgCost >= 0)) {
      setError(translate("Ange giltiga värden.", "Enter valid values."));
      return;
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
          acquisitionDate: setAcquisitionDate || null,
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
      setManageOpen(false);
    } catch (err) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminMailTest = async () => {
    if (!token) return;
    try {
      setMailTestLoading(true);
      setMailTestMessage("");
      const res = await fetch("/api/admin/mail-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          toEmail: profileIdentity.email || user?.email || "alexander.ek@live.se",
          subject: "EvoData admin mail test",
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMailTestMessage(payload?.error || translate("Mailtest misslyckades.", "Mail test failed."));
        return;
      }
      setMailTestMessage(
        translate(
          `Testmail skickat till ${payload?.toEmail || "din adress"}.`,
          `Test email sent to ${payload?.toEmail || "your address"}.`
        )
      );
    } catch {
      setMailTestMessage(translate("Kunde inte skicka testmail.", "Could not send test email."));
    } finally {
      setMailTestLoading(false);
    }
  };

  const handleAdminMailPreview = async (type) => {
    if (!token) return;
    try {
      setPreviewLoading(true);
      setMailTestMessage("");
      const res = await fetch(`/api/admin/mail-preview?type=${encodeURIComponent(type)}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMailTestMessage(payload?.error || translate("Kunde inte hämta preview.", "Could not load preview."));
        return;
      }
      setPreviewTitle(payload?.subject || (type === "reset" ? "Reset preview" : "Welcome preview"));
      setPreviewHtml(payload?.html || "");
      setPreviewOpen(true);
    } catch {
      setMailTestMessage(translate("Kunde inte hämta preview.", "Could not load preview."));
    } finally {
      setPreviewLoading(false);
    }
  };

  const loadAdminActivity = async () => {
    if (!token) return;
    try {
      setAdminActivityLoading(true);
      setAdminActivityError("");
      const res = await fetch("/api/admin/activity", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAdminActivityRows([]);
        setAdminActivityError(payload?.error || translate("Kunde inte läsa aktivitet.", "Could not load activity."));
        return;
      }
      setAdminActivityRows(Array.isArray(payload?.users) ? payload.users : []);
    } catch {
      setAdminActivityRows([]);
      setAdminActivityError(translate("Kunde inte läsa aktivitet.", "Could not load activity."));
    } finally {
      setAdminActivityLoading(false);
    }
  };

  const loadAdminUsers = async () => {
    if (!token) return;
    try {
      setAdminUsersLoading(true);
      setAdminUsersError("");
      const res = await fetch("/api/admin/users", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAdminUsersRows([]);
        setAdminUsersTotal(0);
        setAdminUsersError(payload?.error || translate("Kunde inte läsa användare.", "Could not load users."));
        return;
      }
      setAdminUsersRows(Array.isArray(payload?.users) ? payload.users : []);
      setAdminUsersTotal(Number(payload?.totalUsers) || 0);
    } catch {
      setAdminUsersRows([]);
      setAdminUsersTotal(0);
      setAdminUsersError(translate("Kunde inte läsa användare.", "Could not load users."));
    } finally {
      setAdminUsersLoading(false);
    }
  };

  const handleOpenPasswordDialog = () => {
    setPasswordError("");
    setPasswordSuccess("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordDialogOpen(true);
  };

  const handleSubmitPasswordChange = async () => {
    if (!token) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(translate("Fyll i alla fält.", "Fill in all fields."));
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError(translate("Nytt lösenord måste vara minst 8 tecken.", "New password must be at least 8 characters."));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(translate("Lösenorden matchar inte.", "Passwords do not match."));
      return;
    }
    try {
      setPasswordLoading(true);
      setPasswordError("");
      setPasswordSuccess("");
      await changePassword({ token, currentPassword, newPassword });
      setPasswordSuccess(translate("Lösenordet är uppdaterat.", "Password updated."));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err?.message || translate("Kunde inte uppdatera lösenord.", "Could not update password."));
    } finally {
      setPasswordLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    let cancelled = false;
    const sendHeartbeat = async () => {
      if (cancelled || typeof window === "undefined") return;
      try {
        await fetch("/api/admin/activity/heartbeat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            path: window.location.pathname,
            panel: "my-page",
            locale,
          }),
        });
      } catch {
        // silent
      }
    };
    sendHeartbeat();
    const id = setInterval(sendHeartbeat, 20 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isAuthenticated, locale, token]);

  useEffect(() => {
    if (!effectiveIsAdmin || !adminMode || !token || adminPanel !== "activity") return;
    let cancelled = false;
    const load = async () => {
      if (cancelled) return;
      await loadAdminActivity();
    };
    load();
    const id = setInterval(load, 20 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [adminMode, adminPanel, effectiveIsAdmin, token]);

  useEffect(() => {
    if (!effectiveIsAdmin || !adminMode || !token || adminPanel !== "users") return;
    let cancelled = false;
    const load = async () => {
      if (cancelled) return;
      await loadAdminUsers();
    };
    load();
    const id = setInterval(load, 20 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [adminMode, adminPanel, effectiveIsAdmin, token]);

  return (
    <Box
      sx={{
        width: "100%",
        py: 0,
        px: 0,
        minHeight: "100vh",
        background: "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(17,28,47,0.98))",
      }}
    >
      <Box
        sx={{
          ...pageShell,
          p: { xs: 2.5, md: 4 },
          width: "100%",
          borderRadius: 0,
          minHeight: "100vh",
        }}
      >
        <Stack spacing={{ xs: 3, md: 4 }} alignItems="center">
          <Box sx={contentWrapSx}>
            <MinaSidorHeader
              translate={translate}
              totalLivePlayers={totalLivePlayers}
              onManageHoldings={() => setManageOpen(true)}
              onOpenPasswordDialog={handleOpenPasswordDialog}
              greetingName={greetingName}
              currentPrice={currentPrice}
              todaysChangePercent={todaysChangePercent}
            />
          </Box>

          <Box sx={contentWrapSx}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                textAlign: "center",
                mt: { xs: 0.5, md: 0 },
              }}
            >
              <Stack spacing={0.2} sx={{ alignItems: "center" }}>
                <Typography sx={{ color: "rgba(226,232,240,0.68)", fontWeight: 700, fontSize: "0.78rem" }}>
                  {translate("Dagens rörelse (ditt innehav)", "Today (your holding)")}
                </Typography>
                <Typography
                  sx={{
                    fontWeight: 900,
                    letterSpacing: 0.2,
                    fontSize: { xs: "1.15rem", md: "1.35rem" },
                    color:
                      Number.isFinite(todaysHoldingChangeSek) && todaysHoldingChangeSek < 0
                        ? "#fecaca"
                        : "#86efac",
                    textShadow:
                      Number.isFinite(todaysHoldingChangeSek) && todaysHoldingChangeSek < 0
                        ? "0 0 18px rgba(248,113,113,0.12)"
                        : "0 0 18px rgba(34,197,94,0.14)",
                  }}
                >
                  {Number.isFinite(todaysHoldingChangeSek)
                    ? `${todaysHoldingChangeSek >= 0 ? "+" : ""}${formatSek(todaysHoldingChangeSek)}`
                    : "–"}
                </Typography>
              </Stack>
            </Box>
          </Box>

          <Box sx={contentWrapSx}>
            <Box sx={{ ...sectionHeader, justifyContent: "center" }}>
              <Box sx={sectionRule} />
              {translate("Översikt", "Overview")}
              <Box sx={sectionRule} />
            </Box>
          </Box>

          <Box sx={{ ...contentWrapSx, display: "flex", justifyContent: "center" }}>
            <HoldingsChips
              translate={translate}
              profile={profile}
              dividendYield={dividendYield}
              dividendsReceivedSafe={dividendsReceivedSafe}
              gainPercent={gainPercent}
              totalReturnWithDividends={totalReturnWithDividends}
              totalReturnPctWithDividends={totalReturnPctWithDividends}
            />
          </Box>

          {error ? <Typography sx={{ color: statusColors.warning, fontWeight: 600 }}>{error}</Typography> : null}

          <Box sx={contentWrapSx}>
            <Box sx={{ ...sectionHeader, justifyContent: "center" }}>
              <Box sx={sectionRule} />
              {translate("Nyckeltal", "Key metrics")}
              <Box sx={sectionRule} />
            </Box>
          </Box>

          <Box sx={contentWrapSx}>
            <HoldingsKpiRow
              translate={translate}
              totalValue={totalValue}
              totalCost={totalCost}
              gain={gain}
              gainPercent={gainPercent}
              expectedDividendCash={expectedDividendCash}
              upcomingDividend={upcomingDividend}
              lastDividend={lastDividend}
            />
          </Box>

          <Box sx={contentWrapSx}>
            <Box sx={{ ...sectionHeader, justifyContent: "center" }}>
              <Box sx={sectionRule} />
              {translate("Återköp & Ägarandel", "Buybacks & Ownership")}
              <Box sx={sectionRule} />
            </Box>
          </Box>

          <Box sx={contentWrapSx}>
            <OwnershipCards
              translate={translate}
              buybackSummary={buybackSummary}
              ownershipView={ownershipView}
              onChangeView={setOwnershipView}
            />
          </Box>

          {effectiveIsAdmin ? (
            <>
              <Box sx={contentWrapSx}>
                <Box sx={{ ...sectionHeader, justifyContent: "center" }}>
                  <Box sx={sectionRule} />
                  {translate("Admin", "Admin")}
                  <Box sx={sectionRule} />
                </Box>
              </Box>
              <Box sx={contentWrapSx}>
                <Stack spacing={2} alignItems="center">
                  <ToggleButtonGroup
                    value={adminMode ? "on" : "off"}
                    exclusive
                    onChange={(_, value) => {
                      if (!value) return;
                      setAdminMode(value === "on");
                    }}
                    size="small"
                    sx={{
                      backgroundColor: "rgba(148,163,184,0.12)",
                      borderRadius: "999px",
                      p: 0.5,
                    }}
                  >
                    <ToggleButton
                      value="off"
                      sx={{
                        textTransform: "none",
                        border: 0,
                        borderRadius: "999px!important",
                        px: 1.6,
                        color: "rgba(226,232,240,0.8)",
                        "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(56,189,248,0.25)" },
                      }}
                    >
                      {translate("Admin vy av", "Admin view off")}
                    </ToggleButton>
                    <ToggleButton
                      value="on"
                      sx={{
                        textTransform: "none",
                        border: 0,
                        borderRadius: "999px!important",
                        px: 1.6,
                        color: "rgba(226,232,240,0.8)",
                        "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(34,197,94,0.28)" },
                      }}
                    >
                      {translate("Admin vy på", "Admin view on")}
                    </ToggleButton>
                  </ToggleButtonGroup>

                  {adminMode ? (
                    <Stack spacing={1.1} alignItems="center">
                      <ToggleButtonGroup
                        value={adminPanel}
                        exclusive
                        onChange={(_, value) => value && setAdminPanel(value)}
                        size="small"
                        sx={{
                          backgroundColor: "rgba(148,163,184,0.12)",
                          borderRadius: "999px",
                          p: 0.5,
                        }}
                      >
                        <ToggleButton
                          value="tools"
                          sx={{
                            textTransform: "none",
                            border: 0,
                            borderRadius: "999px!important",
                            px: 1.4,
                            color: "rgba(226,232,240,0.8)",
                            "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(56,189,248,0.25)" },
                          }}
                        >
                          {translate("Verktyg", "Tools")}
                        </ToggleButton>
                        <ToggleButton
                          value="activity"
                          sx={{
                            textTransform: "none",
                            border: 0,
                            borderRadius: "999px!important",
                            px: 1.4,
                            color: "rgba(226,232,240,0.8)",
                            "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(34,197,94,0.25)" },
                          }}
                        >
                          {translate("Aktivitet", "Activity")}
                        </ToggleButton>
                        <ToggleButton
                          value="users"
                          sx={{
                            textTransform: "none",
                            border: 0,
                            borderRadius: "999px!important",
                            px: 1.4,
                            color: "rgba(226,232,240,0.8)",
                            "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(167,139,250,0.28)" },
                          }}
                        >
                          {translate("Användare", "Users")}
                        </ToggleButton>
                      </ToggleButtonGroup>

                      {adminPanel === "tools" ? (
                      <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
                        <Button
                          variant="outlined"
                          onClick={handleAdminMailTest}
                          disabled={mailTestLoading}
                          sx={{
                            textTransform: "none",
                            borderColor: "rgba(56,189,248,0.45)",
                            color: "#bae6fd",
                            "&:hover": {
                              borderColor: "rgba(56,189,248,0.7)",
                              backgroundColor: "rgba(56,189,248,0.1)",
                            },
                          }}
                        >
                          {mailTestLoading
                            ? translate("Skickar testmail...", "Sending test email...")
                            : translate("Skicka testmail", "Send test email")}
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => handleAdminMailPreview("welcome")}
                          disabled={previewLoading}
                          sx={{
                            textTransform: "none",
                            borderColor: "rgba(34,197,94,0.45)",
                            color: "#bbf7d0",
                            "&:hover": {
                              borderColor: "rgba(34,197,94,0.75)",
                              backgroundColor: "rgba(34,197,94,0.1)",
                            },
                          }}
                        >
                          {translate("Preview welcome", "Preview welcome")}
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => handleAdminMailPreview("reset")}
                          disabled={previewLoading}
                          sx={{
                            textTransform: "none",
                            borderColor: "rgba(167,139,250,0.45)",
                            color: "#ddd6fe",
                            "&:hover": {
                              borderColor: "rgba(167,139,250,0.75)",
                              backgroundColor: "rgba(167,139,250,0.1)",
                            },
                          }}
                        >
                          {translate("Preview reset", "Preview reset")}
                        </Button>
                      </Stack>
                      ) : null}
                      {mailTestMessage ? (
                        <Typography sx={{ color: "rgba(226,232,240,0.78)", textAlign: "center" }}>
                          {mailTestMessage}
                        </Typography>
                      ) : null}

                      {adminPanel === "activity" ? (
                      <Stack spacing={1} sx={{ width: "100%", maxWidth: 980, pt: 1 }}>
                        <Button
                          variant="outlined"
                          onClick={loadAdminActivity}
                          disabled={adminActivityLoading}
                          sx={{
                            alignSelf: "center",
                            textTransform: "none",
                            borderColor: "rgba(148,163,184,0.35)",
                            color: "#e2e8f0",
                            "&:hover": {
                              borderColor: "rgba(148,163,184,0.55)",
                              backgroundColor: "rgba(148,163,184,0.08)",
                            },
                          }}
                        >
                          {adminActivityLoading
                            ? translate("Laddar aktivitet...", "Loading activity...")
                            : translate("Ladda om aktivitet", "Refresh activity")}
                        </Button>

                        {adminActivityError ? (
                          <Typography sx={{ color: statusColors.warning, textAlign: "center" }}>
                            {adminActivityError}
                          </Typography>
                        ) : null}

                        {adminActivityRows.length ? (
                          <Stack spacing={1}>
                            {adminActivityRows.map((row) => {
                              const name = [row?.firstName, row?.lastName].filter(Boolean).join(" ").trim();
                              const email = String(row?.email || "").trim();
                              const identity = name || email || "unknown";
                              const statusLabel = row?.isActive
                                ? translate("Aktiv nu", "Active now")
                                : translate("Inaktiv", "Inactive");
                              const whenLabel = row?.lastSeenAt
                                ? new Date(row.lastSeenAt).toLocaleString(locale === "en" ? "en-GB" : "sv-SE")
                                : "—";
                              const locationLabel = row?.lastPanel
                                ? `${row?.lastPath || "/"} · ${row.lastPanel}`
                                : row?.lastPath || "—";
                              return (
                                <Box
                                  key={row?.email || identity}
                                  sx={{
                                    border: "1px solid rgba(148,163,184,0.22)",
                                    borderRadius: "12px",
                                    background: "rgba(15,23,42,0.45)",
                                    px: 1.4,
                                    py: 1.1,
                                    display: "grid",
                                    gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 2fr" },
                                    gap: 1,
                                  }}
                                >
                                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, minWidth: 0 }}>
                                    <Typography
                                      sx={{
                                        color: "#f8fafc",
                                        fontWeight: 800,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {identity}
                                    </Typography>
                                    {email ? (
                                      <Typography
                                        sx={{
                                          color: "rgba(226,232,240,0.65)",
                                          fontSize: "0.82rem",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {email}
                                      </Typography>
                                    ) : null}
                                  </Box>
                                  <Typography
                                    sx={{
                                      color: row?.isActive ? "#86efac" : "rgba(226,232,240,0.7)",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {statusLabel}
                                  </Typography>
                                  <Typography sx={{ color: "rgba(226,232,240,0.75)" }}>
                                    {translate("Senast", "Last")}: {whenLabel}
                                    {" • "}
                                    {translate("Vy", "View")}: {locationLabel}
                                  </Typography>
                                </Box>
                              );
                            })}
                          </Stack>
                        ) : !adminActivityLoading ? (
                          <Typography sx={{ color: "rgba(226,232,240,0.7)", textAlign: "center" }}>
                            {translate("Ingen aktivitet ännu.", "No activity yet.")}
                          </Typography>
                        ) : null}
                      </Stack>
                      ) : null}

                      {adminPanel === "users" ? (
                        <Stack spacing={1} sx={{ width: "100%", maxWidth: 980, pt: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" flexWrap="wrap">
                            <Typography sx={{ color: "#f8fafc", fontWeight: 700 }}>
                              {translate("Totalt registrerade", "Total registered")}: {adminUsersTotal}
                            </Typography>
                            <Button
                              variant="outlined"
                              onClick={loadAdminUsers}
                              disabled={adminUsersLoading}
                              sx={{
                                textTransform: "none",
                                borderColor: "rgba(148,163,184,0.35)",
                                color: "#e2e8f0",
                                "&:hover": {
                                  borderColor: "rgba(148,163,184,0.55)",
                                  backgroundColor: "rgba(148,163,184,0.08)",
                                },
                              }}
                            >
                              {adminUsersLoading
                                ? translate("Laddar användare...", "Loading users...")
                                : translate("Ladda om användare", "Refresh users")}
                            </Button>
                          </Stack>

                          {adminUsersError ? (
                            <Typography sx={{ color: statusColors.warning, textAlign: "center" }}>
                              {adminUsersError}
                            </Typography>
                          ) : null}

                          {adminUsersRows.length ? (
                            <Stack spacing={1}>
                              {adminUsersRows.map((row) => {
                                const name = [row?.firstName, row?.lastName].filter(Boolean).join(" ").trim();
                                const email = String(row?.email || "").trim();
                                const identity = name || email || "unknown";
                                const statusLabel = row?.isActive
                                  ? translate("Aktiv nu", "Active now")
                                  : translate("Inaktiv", "Inactive");
                                const whenLabel = row?.lastSeenAt
                                  ? new Date(row.lastSeenAt).toLocaleString(locale === "en" ? "en-GB" : "sv-SE")
                                  : translate("Aldrig", "Never");
                                return (
                                  <Box
                                    key={row?.email || identity}
                                    sx={{
                                      border: "1px solid rgba(148,163,184,0.22)",
                                      borderRadius: "12px",
                                      background: "rgba(15,23,42,0.45)",
                                      px: 1.4,
                                      py: 1.1,
                                      display: "grid",
                                      gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 2fr" },
                                      gap: 1,
                                    }}
                                  >
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, minWidth: 0 }}>
                                      <Typography
                                        sx={{
                                          color: "#f8fafc",
                                          fontWeight: 800,
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {identity}
                                      </Typography>
                                      {email ? (
                                        <Typography
                                          sx={{
                                            color: "rgba(226,232,240,0.65)",
                                            fontSize: "0.82rem",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          {email}
                                        </Typography>
                                      ) : null}
                                    </Box>
                                    <Typography
                                      sx={{
                                        color: row?.isActive ? "#86efac" : "rgba(226,232,240,0.7)",
                                        fontWeight: 600,
                                      }}
                                    >
                                      {statusLabel}
                                    </Typography>
                                    <Typography sx={{ color: "rgba(226,232,240,0.75)" }}>
                                      {translate("Senast online", "Last online")}: {whenLabel}
                                    </Typography>
                                  </Box>
                                );
                              })}
                            </Stack>
                          ) : !adminUsersLoading ? (
                            <Typography sx={{ color: "rgba(226,232,240,0.7)", textAlign: "center" }}>
                              {translate("Inga användare ännu.", "No users yet.")}
                            </Typography>
                          ) : null}
                        </Stack>
                      ) : null}
                    </Stack>
                  ) : null}
                </Stack>
              </Box>
            </>
          ) : null}

          <Divider sx={sectionDivider} />

          <Divider sx={sectionDivider} />
        </Stack>
      </Box>

      <ManageHoldingsModal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        translate={translate}
        currentShares={profile.shares}
        currentAvgCost={profile.avgCost}
        buyShares={buyShares}
        buyPrice={buyPrice}
        buyDate={buyDate}
        sellShares={sellShares}
        setShares={setShares}
        setAvgCost={setAvgCost}
        dividendsReceived={dividendsReceived}
        onDividendsChange={handleDividendsChange}
        breakEvenDisplay={breakEvenDisplay}
        breakEvenPaidBack={breakEvenPaidBack}
        onBuySharesChange={(event) => setBuyShares(event.target.value)}
        onBuyPriceChange={(event) => setBuyPrice(event.target.value)}
        onBuyDateChange={(event) => setBuyDate(event.target.value)}
        onSellSharesChange={(event) => setSellShares(event.target.value)}
        onSetSharesChange={(event) => setSetShares(event.target.value)}
        onSetAvgCostChange={(event) => setSetAvgCost(event.target.value)}
        acquisitionDate={setAcquisitionDate}
        onAcquisitionDateChange={(event) => setSetAcquisitionDate(event.target.value)}
        estimatedDividendsFromDate={estimatedDividendsFromDate}
        dividendInputMode={dividendInputMode}
        onDividendInputModeChange={handleDividendModeChange}
        onBuy={handleBuy}
        onSell={handleSell}
        onSet={handleSet}
        loading={loading}
      />

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            background: "rgba(15,23,42,0.96)",
            border: "1px solid rgba(148,163,184,0.2)",
          },
        }}
      >
        <DialogTitle sx={{ color: "#f8fafc", fontWeight: 700 }}>{previewTitle}</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              background: "#0b1220",
              borderRadius: 2,
              border: "1px solid rgba(148,163,184,0.2)",
              p: 1,
            }}
          >
            <iframe
              title="mail-preview"
              srcDoc={previewHtml}
              style={{ width: "100%", height: "560px", border: 0, borderRadius: "8px", background: "#0b1220" }}
            />
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            background: "rgba(15,23,42,0.96)",
            border: "1px solid rgba(148,163,184,0.2)",
          },
        }}
      >
        <DialogTitle sx={{ color: "#f8fafc", fontWeight: 700 }}>
          {translate("Byt lösenord", "Change password")}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.6} sx={{ mt: 0.5 }}>
            {passwordError ? <Alert severity="error">{passwordError}</Alert> : null}
            {passwordSuccess ? <Alert severity="success">{passwordSuccess}</Alert> : null}
            <TextField
              type="password"
              label={translate("Nuvarande lösenord", "Current password")}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              fullWidth
              sx={{
                "& .MuiInputBase-input": { color: "#f8fafc" },
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(148,163,184,0.35)" },
              }}
              InputLabelProps={{ sx: { color: "rgba(226,232,240,0.7)" } }}
            />
            <TextField
              type="password"
              label={translate("Nytt lösenord", "New password")}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              fullWidth
              sx={{
                "& .MuiInputBase-input": { color: "#f8fafc" },
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(148,163,184,0.35)" },
              }}
              InputLabelProps={{ sx: { color: "rgba(226,232,240,0.7)" } }}
            />
            <TextField
              type="password"
              label={translate("Bekräfta nytt lösenord", "Confirm new password")}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              fullWidth
              sx={{
                "& .MuiInputBase-input": { color: "#f8fafc" },
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(148,163,184,0.35)" },
              }}
              InputLabelProps={{ sx: { color: "rgba(226,232,240,0.7)" } }}
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button
                variant="text"
                onClick={() => setPasswordDialogOpen(false)}
                sx={{ color: "rgba(226,232,240,0.75)", textTransform: "none" }}
              >
                {translate("Stäng", "Close")}
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmitPasswordChange}
                disabled={passwordLoading}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  color: "#e0f2fe",
                  background: "linear-gradient(135deg, rgba(37,99,235,0.78), rgba(14,165,233,0.72))",
                  border: "1px solid rgba(125,211,252,0.32)",
                  "&:hover": {
                    background: "linear-gradient(135deg, rgba(59,130,246,0.82), rgba(34,211,238,0.76))",
                  },
                }}
              >
                {passwordLoading ? translate("Sparar...", "Saving...") : translate("Uppdatera lösenord", "Update password")}
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
