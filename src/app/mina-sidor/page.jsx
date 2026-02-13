"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Checkbox, Divider, FormControlLabel, Stack, Typography, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLocale, useTranslate } from "@/context/LocaleContext";
import { useStockPriceContext } from "@/context/StockPriceContext";
import { usePlayersLive } from "@/context/PlayersLiveContext";
import MinaSidorHeader from "@/Components/MinaSidor/MinaSidorHeader";
import HoldingsChips from "@/Components/MinaSidor/HoldingsChips";
import HoldingsKpiRow from "@/Components/MinaSidor/HoldingsKpiRow";
import TraderPnlRow from "@/Components/MinaSidor/TraderPnlRow";
import OwnershipCards from "@/Components/MinaSidor/OwnershipCards";
import ManageHoldingsModal from "@/Components/MinaSidor/ManageHoldingsModal";
import HoldingsHistoryChart from "@/Components/MinaSidor/HoldingsHistoryChart";
import ValuationSignalCard from "@/Components/MinaSidor/ValuationSignalCard";
import SupportModal from "@/Components/MinaSidor/SupportModal";
import { pageShell, sectionDivider, sectionHeader, sectionRule, statusColors } from "@/Components/MinaSidor/styles";
import { formatSek } from "@/Components/MinaSidor/utils";

import dividendData from "@/app/data/dividendData.json";

import { usePortfolioData } from "@/app/mina-sidor/hooks/usePortfolioData";
import { usePortfolioActions } from "@/app/mina-sidor/hooks/usePortfolioActions";
import { useAdminTools } from "@/app/mina-sidor/hooks/useAdminTools";
import { AdminPanel } from "@/app/mina-sidor/components/AdminPanel";
import { AdminDialogs } from "@/app/mina-sidor/components/AdminDialogs";
import { AccountSettingsDialog } from "@/app/mina-sidor/components/AccountSettingsDialog";
import { AdminSupportInboxDialog } from "@/app/mina-sidor/components/AdminSupportInboxDialog";

export default function MinaSidorPage() {
  const translate = useTranslate();
  const { locale } = useLocale();
  const router = useRouter();
  const { token, isAuthenticated, initialized, user, changePassword, logout } = useAuth();
  const { stockPrice } = useStockPriceContext();
  const { data: playersLive } = usePlayersLive();

  // --- Portfolio Data Hook ---
  const {
    profile, setProfile,
    loading, setLoading,
    error, setError,
    profileIdentity, setProfileIdentity,
    effectiveIsAdmin,
    isSubscriber,
    athEmailEnabled, setAthEmailEnabled,
    dailyAvgEmailEnabled, setDailyAvgEmailEnabled,
    dividendsReceived, setDividendsReceived,
    dividendInputMode, setDividendInputMode,
    isTraderMode, setIsTraderMode,
    buybackData,

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
    todaysHoldingChangeSek,
    estimatedDividendsFromDate,
    estimatedDividendsFromTransactions,
    dividendsReceivedSafe,
    totalReturnWithDividends,
    totalReturnPctWithDividends,
    traderPnl,
    breakEvenDisplay,
    breakEvenPaidBack,
    buybackSummary,
    greetingName,
    totalLivePlayers
  } = usePortfolioData({ token, user, isAuthenticated, initialized, stockPrice, playersLive });

  // --- Portfolio Actions Hook ---
  const {
    handleBuy,
    handleSell,
    handleReset,
    handleSet,
    handleImportTransactions
  } = usePortfolioActions({ token, user, profile, setProfile, setLoading, setError, translate });

  // --- Admin Tools Hook ---
  const adminTools = useAdminTools({ token, effectiveIsAdmin, locale, translate });
  const {
    adminMode, setAdminMode,
    adminPanel, setAdminPanel
  } = adminTools;

  // --- Local State ---
  const [ownershipView, setOwnershipView] = useState("after");
  const [manageOpen, setManageOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportIndicator, setSupportIndicator] = useState(null); // null | "open" | "reply"
  const [adminSupportInboxOpen, setAdminSupportInboxOpen] = useState(false);

  // Manage Modal State (local to page or extract? keeping local as it's UI state)
  const [buyShares, setBuyShares] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [buyDate, setBuyDate] = useState("");
  const [sellShares, setSellShares] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [setShares, setSetShares] = useState("");
  const [setAvgCost, setSetAvgCost] = useState("");
  const [setAcquisitionDate, setSetAcquisitionDate] = useState("");

  const [notificationsSaving, setNotificationsSaving] = useState(false);

  const triggerSupportPreview = (type) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("evodata.support.notify.preview", {
        detail: { type },
      })
    );
  };

  const handleOpenSupport = async () => {
    if (effectiveIsAdmin) {
      setAdminSupportInboxOpen(true);
      try {
        await adminTools.loadAdminSupport?.();
      } catch {
        // ignore
      }
      return;
    }
    setSupportOpen(true);
  };

  // --- Handlers ---

  const handleOpenManage = () => {
    setSetShares(profile.shares ? String(profile.shares) : "");
    setSetAvgCost(profile.avgCost ? String(profile.avgCost) : "");
    setSetAcquisitionDate(
      typeof profile.acquisitionDate === "string" && profile.acquisitionDate.trim()
        ? profile.acquisitionDate.slice(0, 10)
        : ""
    );
    setBuyDate(new Date().toISOString().slice(0, 10));
    setManageOpen(true);
  };

  const onDividendsChange = (e) => {
    const value = e.target.value;
    setDividendsReceived(value);
    if (user?.email) {
      try {
        window.localStorage.setItem(`evodata.holdings.dividends:${user.email}`, value);
      } catch { }
    }
  };

  const onDividendModeChange = (nextMode) => {
    if (nextMode !== "manual" && nextMode !== "acquisition") return;
    setDividendInputMode(nextMode);
    if (user?.email) {
      try {
        window.localStorage.setItem(`evodata.holdings.dividendMode:${user.email}`, nextMode);
      } catch { }
    }
  };

  const onImportTransactions = async (payload) => {
    await handleImportTransactions(payload);
    onDividendModeChange("acquisition");
    setManageOpen(false);
  };

  const onTraderModeChange = (checked) => {
    setIsTraderMode(checked);
    if (user?.email) {
      try {
        window.localStorage.setItem(`evodata.ui.traderMode:${user.email}`, checked ? "1" : "0");
      } catch { }
    }
  };

  const saveAthEmailEnabled = async (nextValue) => {
    if (!token) return;
    try {
      setNotificationsSaving(true);
      const res = await fetch("/api/user/notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ athEmail: Boolean(nextValue) }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "Could not save notifications.");
      }
      setAthEmailEnabled(Boolean(payload?.notifications?.athEmail));
    } catch (err) {
      setError(err?.message || translate("Kunde inte spara inställningen.", "Could not save setting."));
      setAthEmailEnabled((prev) => prev); // no-op
    } finally {
      setNotificationsSaving(false);
    }
  };

  const saveDailyAvgEmailEnabled = async (nextValue) => {
    if (!token) return;
    try {
      setNotificationsSaving(true);
      const res = await fetch("/api/user/notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ dailyAvgEmail: Boolean(nextValue) }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "Could not save notifications.");
      }
      setDailyAvgEmailEnabled(Boolean(payload?.notifications?.dailyAvgEmail));
    } catch (err) {
      setError(err?.message || translate("Kunde inte spara inställningen.", "Could not save setting."));
      setDailyAvgEmailEnabled((prev) => prev); // no-op
    } finally {
      setNotificationsSaving(false);
    }
  };

  const handleSaveProfileSettings = async ({ firstName, lastName }) => {
    if (!token) throw new Error(translate("Inte inloggad.", "Not logged in."));
    const res = await fetch("/api/user/account", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ firstName, lastName }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(payload?.error || translate("Kunde inte uppdatera profil.", "Could not update profile."));
    }
    setProfileIdentity((prev) => ({
      ...prev,
      firstName: payload?.user?.firstName ?? firstName,
      lastName: payload?.user?.lastName ?? lastName,
    }));
  };

  const handleChangePasswordSettings = async ({ currentPassword, newPassword }) => {
    if (!token) throw new Error(translate("Inte inloggad.", "Not logged in."));
    await changePassword({ token, currentPassword, newPassword });
  };

  const handleDeleteAccount = async ({ currentPassword, confirmation }) => {
    if (!token) throw new Error(translate("Inte inloggad.", "Not logged in."));
    const res = await fetch("/api/user/account", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, confirmation }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(payload?.error || translate("Kunde inte radera kontot.", "Could not delete account."));
    }
    logout();
    router.push("/");
  };

  // Support Indicator Logic (move to page effect)
  const loadSupportIndicator = async () => {
    if (!token) return;
    try {
      if (effectiveIsAdmin) {
        const res = await fetch("/api/admin/support/tickets", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        const tickets = Array.isArray(data?.tickets) ? data.tickets : [];
        const hasOpenUnanswered = tickets.some(
          (t) => String(t?.status || "").toLowerCase() === "open" && !Boolean(t?.hasReply)
        );
        setSupportIndicator(hasOpenUnanswered ? "open" : null);
        return;
      }

      const res = await fetch("/api/support/tickets", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const tickets = Array.isArray(data?.tickets) ? data.tickets : [];
      const hasReply = tickets.some((t) => t?.hasReply && t?.status === "answered");
      const hasOpen = tickets.some((t) => t?.status === "open");
      setSupportIndicator(hasReply ? "reply" : hasOpen ? "open" : null);
    } catch { }
  };

  useEffect(() => {
    if (!token || !isAuthenticated) {
      setSupportIndicator(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await loadSupportIndicator();
    };
    run();
    const id = setInterval(run, 60 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAuthenticated, effectiveIsAdmin]);

  // --- UI Constants ---
  const contentWrapSx = { width: "100%", maxWidth: 1500, mx: "auto" };

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
        <Stack spacing={{ xs: 2, md: 4 }} alignItems="center">
          <Box sx={contentWrapSx}>
            <MinaSidorHeader
              translate={translate}
              totalLivePlayers={totalLivePlayers}
              onManageHoldings={handleOpenManage}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenSupport={handleOpenSupport}
              supportIndicator={supportIndicator}
              athEmailEnabled={athEmailEnabled}
              dailyAvgEmailEnabled={dailyAvgEmailEnabled}
              notificationsSaving={notificationsSaving}
              onToggleAthEmail={(nextValue) => {
                setAthEmailEnabled(Boolean(nextValue));
                saveAthEmailEnabled(Boolean(nextValue));
              }}
              onToggleDailyAvgEmail={(nextValue) => {
                setDailyAvgEmailEnabled(Boolean(nextValue));
                saveDailyAvgEmailEnabled(Boolean(nextValue));
              }}
              isAdminView={effectiveIsAdmin}
              onPreviewUserSupportNotice={() => triggerSupportPreview("user")}
              onPreviewAdminSupportNotice={() => triggerSupportPreview("admin")}
              greetingName={greetingName}
              currentPrice={currentPrice}
              todaysChangePercent={todaysChangePercent}
              isTraderMode={isTraderMode}
              onToggleTraderMode={onTraderModeChange}
            />

            {/* Merged "Today Holding" Stat to reduce gap */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                textAlign: "center",
                mt: { xs: 0, md: 0 }, // Removed mt because Header has some mb
              }}
            >
              <Stack spacing={0.2} sx={{ alignItems: "center" }}>
                <Typography sx={{ color: "rgba(226,232,240,0.68)", fontWeight: 700, fontSize: { xs: "0.95rem", md: "0.85rem" } }}>
                  {translate("Dagens rörelse (ditt innehav)", "Today (your holding)")}
                </Typography>
                <Typography
                  sx={{
                    fontWeight: 900,
                    letterSpacing: 0.2,
                    fontSize: { xs: "1.55rem", md: "1.35rem" },
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

          {isTraderMode ? (
            <Box sx={contentWrapSx}>
              <TraderPnlRow translate={translate} pnl={traderPnl} />
            </Box>
          ) : null}

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

          <Box sx={contentWrapSx}>
            <Box sx={{ ...sectionHeader, justifyContent: "center" }}>
              <Box sx={sectionRule} />
              {translate("Utdelning & Innehav", "Dividends & Holdings")}
              <Box sx={sectionRule} />
            </Box>
          </Box>

          <Box sx={contentWrapSx}>
            <HoldingsHistoryChart
              translate={translate}
              profile={profile}
              historicalDividends={
                Array.isArray(dividendData?.historicalDividends) ? dividendData.historicalDividends : []
              }
            />
          </Box>

          <Box sx={contentWrapSx}>
            <Box sx={{ ...sectionHeader, justifyContent: "center" }}>
              <Box sx={sectionRule} />
              {translate("Värderingssignal", "Valuation signal")}
              <Box sx={sectionRule} />
            </Box>
          </Box>

          <Box sx={contentWrapSx}>
            <ValuationSignalCard
              translate={translate}
              currentPrice={currentPrice}
              isUnlocked={Boolean(effectiveIsAdmin || isSubscriber)}
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
                    <AdminPanel
                      adminPanel={adminPanel}
                      setAdminPanel={setAdminPanel}
                      translate={translate}
                      locale={locale}
                      {...adminTools}
                      profileIdentity={profileIdentity}
                      user={user}
                    />
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
        sellPrice={sellPrice}
        setShares={setShares}
        setAvgCost={setAvgCost}
        dividendsReceived={dividendsReceived}
        onDividendsChange={onDividendsChange}
        breakEvenDisplay={breakEvenDisplay}
        breakEvenPaidBack={breakEvenPaidBack}
        onBuySharesChange={(event) => setBuyShares(event.target.value)}
        onBuyPriceChange={(event) => setBuyPrice(event.target.value)}
        onBuyDateChange={(event) => setBuyDate(event.target.value)}
        onSellSharesChange={(event) => setSellShares(event.target.value)}
        onSellPriceChange={(event) => setSellPrice(event.target.value)}
        onSetSharesChange={(event) => setSetShares(event.target.value)}
        onSetAvgCostChange={(event) => setSetAvgCost(event.target.value)}
        acquisitionDate={setAcquisitionDate}
        onAcquisitionDateChange={(event) => setSetAcquisitionDate(event.target.value)}
        estimatedDividendsFromDate={
          Number.isFinite(dividendsReceivedSafe) && dividendInputMode === "acquisition"
            ? dividendsReceivedSafe
            : Number.isFinite(estimatedDividendsFromTransactions)
            ? estimatedDividendsFromTransactions
            : estimatedDividendsFromDate
        }
        dividendInputMode={dividendInputMode}
        onDividendInputModeChange={onDividendModeChange}
        onBuy={() => handleBuy({ shares: Number(buyShares), price: Number(buyPrice), buyDate }).then(() => { setBuyShares(""); setBuyPrice(""); setBuyDate(""); })}
        onSell={() => handleSell({ shares: Number(sellShares), price: Number(sellPrice) }).then(() => { setSellShares(""); setSellPrice(""); })}
        onSet={() => handleSet({ shares: Number(setShares), avgCost: Number(setAvgCost), acquisitionDate: setAcquisitionDate }).then((success) => { if (success) setManageOpen(false); })}
        onImportTransactions={onImportTransactions}
        loading={loading}
      />

      <SupportModal
        open={supportOpen}
        onClose={() => {
          setSupportOpen(false);
          loadSupportIndicator();
        }}
        translate={translate}
        token={token}
      />

      <AdminSupportInboxDialog
        open={adminSupportInboxOpen}
        onClose={() => setAdminSupportInboxOpen(false)}
        translate={translate}
        locale={locale}
        loading={adminTools.adminSupportLoading}
        error={adminTools.adminSupportError}
        rows={adminTools.adminSupportRows}
        onRefresh={adminTools.loadAdminSupport}
        onOpenTicket={(id) => adminTools.openAdminSupportTicket?.(id)}
      />

      <AdminDialogs
        {...adminTools}
        translate={translate}
      />

      <AccountSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        translate={translate}
        email={profileIdentity?.email || user?.email || ""}
        firstName={profileIdentity?.firstName || user?.firstName || ""}
        lastName={profileIdentity?.lastName || user?.lastName || ""}
        onSaveProfile={handleSaveProfileSettings}
        onChangePassword={handleChangePasswordSettings}
        onDeleteAccount={handleDeleteAccount}
      />
    </Box>
  );
}
