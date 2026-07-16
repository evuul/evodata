"use client";

// Renders the authenticated portfolio dashboard and coordinates its feature sections.

import { useCallback, useEffect, useState } from "react";
import { Box, Button, Divider, Stack, Typography, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLocale, useTranslate } from "@/context/LocaleContext";
import { useStockPriceContext } from "@/context/StockPriceContext";
import { useFxRateContext } from "@/context/FxRateContext";
import { usePlayersLive } from "@/context/PlayersLiveContext";
import MinaSidorHeader from "@/Components/MinaSidor/MinaSidorHeader";
import PortfolioHeroCard from "@/Components/MinaSidor/PortfolioHeroCard";
import ReturnBreakdownCard from "@/Components/MinaSidor/ReturnBreakdownCard";
import DividendCenterCard from "@/Components/MinaSidor/DividendCenterCard";
import PortfolioTimelineCard from "@/Components/MinaSidor/PortfolioTimelineCard";
import BuyImpactSimulatorCard from "@/Components/MinaSidor/BuyImpactSimulatorCard";
import TraderPnlRow from "@/Components/MinaSidor/TraderPnlRow";
import OwnershipCards from "@/Components/MinaSidor/OwnershipCards";
import ManageHoldingsModal from "@/Components/MinaSidor/ManageHoldingsModal";
import HoldingsHistoryChart from "@/Components/MinaSidor/HoldingsHistoryChart";
import ValuationSignalCard from "@/Components/MinaSidor/ValuationSignalCard";
import SupportModal from "@/Components/MinaSidor/SupportModal";
import { pageShell, sectionDivider, sectionHeader, sectionRule, statusColors } from "@/Components/MinaSidor/styles";

import dividendData from "@/app/data/dividendData.json";
import outstandingShares from "@/app/data/amountOfShares.json";
import financialCalendarEvents from "@/app/data/financialCalendar";
import { getStockholmTodayYmd } from "@/lib/livePlayersControlPanel";

import { usePortfolioData } from "@/app/mina-sidor/hooks/usePortfolioData";
import { usePortfolioActions } from "@/app/mina-sidor/hooks/usePortfolioActions";
import { useAdminTools } from "@/app/mina-sidor/hooks/useAdminTools";
import { useMinaSidorInbox } from "@/app/mina-sidor/hooks/useMinaSidorInbox";
import { AdminPanel } from "@/app/mina-sidor/components/AdminPanel";
import { AdminDialogs } from "@/app/mina-sidor/components/AdminDialogs";
import { AccountSettingsDialog } from "@/app/mina-sidor/components/AccountSettingsDialog";
import { AdminSupportInboxDialog } from "@/app/mina-sidor/components/AdminSupportInboxDialog";
import { fetchAuthJson } from "@/lib/clientApi";

export default function MinaSidorPage() {
  const translate = useTranslate();
  const { locale } = useLocale();
  const router = useRouter();
  const { token, isAuthenticated, initialized, user, changePassword, logout } = useAuth();
  const { stockPrice } = useStockPriceContext();
  const { rate: fxRate } = useFxRateContext();
  const {
    data: playersLive,
    lobbyStats,
    GAMES: playerGames,
    lastUpdated: playersLastUpdated,
  } = usePlayersLive();

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

    currentPrice,
    upcomingDividend,
    lastDividend,
    totalValue,
    totalCost,
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
    buybackMandateSummary,
    greetingName,
    totalLivePlayers,
    livePlayersMeta,
  } = usePortfolioData({
    token,
    user,
    isAuthenticated,
    initialized,
    stockPrice,
    playersLive,
    playerGames,
    playersLastUpdated,
    fxRate,
  });

  // --- Portfolio Actions Hook ---
  const {
    handleBuy,
    handleSell,
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

  const {
    supportIndicator,
    privateMessages,
    privateMessagesLoading,
    privateMessagesError,
    privateMessagesUnread,
    loadSupportIndicator,
    dismissPrivateMessages,
  } = useMinaSidorInbox({ token, isAuthenticated, effectiveIsAdmin, translate });

  const triggerSupportPreview = useCallback((type) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("evodata.support.notify.preview", {
        detail: { type },
      })
    );
  }, []);

  const handleOpenSupport = useCallback(async () => {
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
  }, [adminTools, effectiveIsAdmin]);

  const showPrivateMessagesBox = Boolean(privateMessages.length);

  useEffect(() => {
    if (!isAuthenticated || typeof window === "undefined") return;
    const shouldOpenSupport = new URLSearchParams(window.location.search).get("support") === "1";
    if (!shouldOpenSupport) return;
    handleOpenSupport();
  }, [handleOpenSupport, isAuthenticated]);

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
      const payload = await fetchAuthJson(token, "/api/user/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athEmail: Boolean(nextValue) }),
      });
      setAthEmailEnabled(Boolean(payload?.notifications?.athEmail));
    } catch (err) {
      setError(err?.message || translate("Kunde inte spara inställningen.", "Could not save setting."));
    } finally {
      setNotificationsSaving(false);
    }
  };

  const saveDailyAvgEmailEnabled = async (nextValue) => {
    if (!token) return;
    try {
      setNotificationsSaving(true);
      const payload = await fetchAuthJson(token, "/api/user/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyAvgEmail: Boolean(nextValue) }),
      });
      setDailyAvgEmailEnabled(Boolean(payload?.notifications?.dailyAvgEmail));
    } catch (err) {
      setError(err?.message || translate("Kunde inte spara inställningen.", "Could not save setting."));
    } finally {
      setNotificationsSaving(false);
    }
  };

  const handleSaveProfileSettings = async ({ firstName, lastName }) => {
    if (!token) throw new Error(translate("Inte inloggad.", "Not logged in."));
    const payload = await fetchAuthJson(token, "/api/user/account", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName }),
    });
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
    await fetchAuthJson(token, "/api/user/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, confirmation }),
    });
    logout();
    router.push("/");
  };

  // --- UI Constants ---
  const contentWrapSx = { width: "100%", maxWidth: 1500, mx: "auto" };
  const dashboardTodayYmd = getStockholmTodayYmd();
  const dividendScenarioYear = Number(dashboardTodayYmd.slice(0, 4)) + 1;

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
              livePlayersMeta={livePlayersMeta}
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
              hourlyComparison={lobbyStats?.hourlyComparison ?? null}
            />

            {privateMessagesLoading ? (
              <Typography sx={{ color: "rgba(226,232,240,0.7)", mt: 1 }}>
                {translate("Laddar privata meddelanden...", "Loading private messages...")}
              </Typography>
            ) : showPrivateMessagesBox ? (
              <Box
                sx={{
                  mt: 1.2,
                  borderRadius: "14px",
                  border: "1px solid rgba(59,130,246,0.28)",
                  background: "rgba(30,58,138,0.14)",
                  p: { xs: 1.2, md: 1.4 },
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.9, gap: 1 }}>
                  <Typography sx={{ color: "#bfdbfe", fontWeight: 800 }}>
                    {translate("Personliga meddelanden från admin", "Personal messages from admin")}
                    {privateMessagesUnread > 0 ? ` (${privateMessagesUnread} nya)` : ""}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={dismissPrivateMessages}
                    sx={{
                      textTransform: "none",
                      borderColor: "rgba(255,255,255,0.45)",
                      color: "rgba(255,255,255,0.92)",
                      minWidth: "auto",
                      px: 1.2,
                      py: 0.35,
                      "&:hover": {
                        borderColor: "rgba(255,255,255,0.8)",
                        backgroundColor: "rgba(255,255,255,0.08)",
                      },
                    }}
                  >
                    {translate("Stäng meddelanden", "Close messages")}
                  </Button>
                </Stack>
                <Stack spacing={0.9}>
                  {privateMessages.slice(0, 3).map((item) => (
                    <Box
                      key={item?.id || item?.createdAt}
                      sx={{
                        borderRadius: "10px",
                        border: "1px solid rgba(148,163,184,0.2)",
                        background: "rgba(15,23,42,0.45)",
                        p: 1,
                      }}
                    >
                      <Typography sx={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.92rem" }}>
                        {item?.subject || "—"}
                      </Typography>
                      <Typography sx={{ color: "rgba(226,232,240,0.88)", whiteSpace: "pre-wrap", mt: 0.35 }}>
                        {item?.message || "—"}
                      </Typography>
                      <Typography sx={{ color: "rgba(148,163,184,0.72)", fontSize: "0.78rem", mt: 0.45 }}>
                        {(item?.fromName || item?.fromEmail || "Admin")}
                        {" • "}
                        {item?.createdAt
                          ? new Date(item.createdAt).toLocaleString(locale === "en" ? "en-GB" : "sv-SE")
                          : "—"}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            ) : null}
            {privateMessagesError ? (
              <Typography sx={{ color: statusColors.warning, mt: 1 }}>
                {privateMessagesError}
              </Typography>
            ) : null}

          </Box>

          <Box sx={contentWrapSx}>
            <PortfolioHeroCard
              translate={translate}
              totalValue={totalValue}
              totalCost={totalCost}
              totalReturn={totalReturnWithDividends}
              totalReturnPct={totalReturnPctWithDividends}
              todaysHoldingChangeSek={todaysHoldingChangeSek}
              todaysChangePercent={todaysChangePercent}
              shares={profile.shares}
              avgCost={profile.avgCost}
              currentPrice={currentPrice}
              dividendsReceived={dividendsReceivedSafe}
              onManage={handleOpenManage}
            />
          </Box>

          {error ? <Typography sx={{ color: statusColors.warning, fontWeight: 600 }}>{error}</Typography> : null}

          <Box sx={contentWrapSx}>
            <Box sx={{ ...sectionHeader, justifyContent: "center" }}>
              <Box sx={sectionRule} />
              {translate("Din avkastning", "Your return")}
              <Box sx={sectionRule} />
            </Box>
          </Box>

          <Box sx={contentWrapSx}>
            <ReturnBreakdownCard
              translate={translate}
              totalCost={totalCost}
              totalValue={totalValue}
              dividendsReceived={dividendsReceivedSafe}
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
              {translate("Återköp & ditt ägande", "Buybacks & your ownership")}
              <Box sx={sectionRule} />
            </Box>
          </Box>

          <Box sx={contentWrapSx}>
            <OwnershipCards
              translate={translate}
              buybackSummary={buybackSummary}
              buybackMandateSummary={buybackMandateSummary}
              profileShares={profile.shares}
              currentPrice={currentPrice}
              fxRate={fxRate}
              sharesData={outstandingShares}
              dividendsReceivedSafe={dividendsReceivedSafe}
              totalValue={totalValue}
              ownershipView={ownershipView}
              onChangeView={setOwnershipView}
            />
          </Box>

          <Box sx={contentWrapSx}>
            <Box sx={{ ...sectionHeader, justifyContent: "center" }}>
              <Box sx={sectionRule} />
              {translate("Utdelning", "Dividends")}
              <Box sx={sectionRule} />
            </Box>
          </Box>

          <Box sx={contentWrapSx}>
            <DividendCenterCard
              translate={translate}
              shares={profile.shares}
              avgCost={profile.avgCost}
              currentPrice={currentPrice}
              dividendsReceived={dividendsReceivedSafe}
              upcomingDividend={upcomingDividend}
              lastDividend={lastDividend}
              targetYear={dividendScenarioYear}
            />
          </Box>

          <Box sx={contentWrapSx}>
            <Box sx={{ ...sectionHeader, justifyContent: "center" }}>
              <Box sx={sectionRule} />
              {translate("Historik & nästa händelser", "History & next events")}
              <Box sx={sectionRule} />
            </Box>
          </Box>

          <Box sx={contentWrapSx}>
            <PortfolioTimelineCard
              translate={translate}
              locale={locale}
              profile={profile}
              historicalDividends={
                Array.isArray(dividendData?.historicalDividends) ? dividendData.historicalDividends : []
              }
              calendarEvents={financialCalendarEvents}
              todayYmd={dashboardTodayYmd}
              onManage={handleOpenManage}
            />
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
              {translate("Verktyg", "Tools")}
              <Box sx={sectionRule} />
            </Box>
          </Box>

          <Box sx={contentWrapSx}>
            <BuyImpactSimulatorCard
              translate={translate}
              profile={profile}
              currentPrice={currentPrice}
              upcomingDividend={upcomingDividend}
              lastDividend={lastDividend}
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
