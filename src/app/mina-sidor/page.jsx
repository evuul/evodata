"use client";

// Renders the authenticated portfolio dashboard and coordinates its feature sections.

import { Suspense, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Box, Button, CircularProgress, Divider, Stack, Typography } from "@mui/material";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLocale, useTranslate } from "@/context/LocaleContext";
import { useStockPriceContext } from "@/context/StockPriceContext";
import { useFxRateContext } from "@/context/FxRateContext";
import { usePlayersLive } from "@/context/PlayersLiveContext";
import MinaSidorHeader from "@/Components/MinaSidor/MinaSidorHeader";
import PortfolioHeroCard from "@/Components/MinaSidor/PortfolioHeroCard";
import ReturnBreakdownCard from "@/Components/MinaSidor/ReturnBreakdownCard";
import TraderPnlRow from "@/Components/MinaSidor/TraderPnlRow";
import OwnershipCards from "@/Components/MinaSidor/OwnershipCards";
import MinaSidorSectionNav from "@/Components/MinaSidor/MinaSidorSectionNav";
import UpcomingCalendarHighlights from "@/Components/MinaSidor/UpcomingCalendarHighlights";
import SupportCallout from "@/Components/SupportCallout";
import DeferredSection from "@/Components/DeferredSection";
import { pageShell, sectionDivider, sectionHeader, sectionRule, statusColors } from "@/Components/MinaSidor/styles";

import dividendData from "@/app/data/dividendData.json";
import financialCalendarEvents from "@/app/data/financialCalendar";
import { getStockholmTodayYmd } from "@/lib/livePlayersControlPanel";

import { usePortfolioData } from "@/app/mina-sidor/hooks/usePortfolioData";
import { usePortfolioActions } from "@/app/mina-sidor/hooks/usePortfolioActions";
import { useAdminTools } from "@/app/mina-sidor/hooks/useAdminTools";
import { useMinaSidorInbox } from "@/app/mina-sidor/hooks/useMinaSidorInbox";
import { fetchAuthJson } from "@/lib/clientApi";
import { buildMinaSidorViewHref, normalizeMinaSidorView } from "@/lib/minaSidorNavigation";

const SectionLoader = () => <Box sx={{ minHeight: 220 }} />;
const DividendCenterCard = dynamic(() => import("@/Components/MinaSidor/DividendCenterCard"), { loading: SectionLoader });
const PortfolioTimelineCard = dynamic(() => import("@/Components/MinaSidor/PortfolioTimelineCard"), { loading: SectionLoader });
const BuyImpactSimulatorCard = dynamic(() => import("@/Components/MinaSidor/BuyImpactSimulatorCard"), { loading: SectionLoader });
const HoldingsHistoryChart = dynamic(() => import("@/Components/MinaSidor/HoldingsHistoryChart"), { loading: SectionLoader });
const TransactionManagerDialog = dynamic(() => import("@/Components/MinaSidor/TransactionManagerDialog"));
const ValuationSignalCard = dynamic(() => import("@/Components/MinaSidor/ValuationSignalCard"), { loading: SectionLoader });
const ManageHoldingsModal = dynamic(() => import("@/Components/MinaSidor/ManageHoldingsModal"));
const SupportModal = dynamic(() => import("@/Components/MinaSidor/SupportModal"));
const AdminPanel = dynamic(() => import("@/app/mina-sidor/components/AdminPanel").then((module) => module.AdminPanel));
const AdminDialogs = dynamic(() => import("@/app/mina-sidor/components/AdminDialogs").then((module) => module.AdminDialogs));
const AccountSettingsDialog = dynamic(() =>
  import("@/app/mina-sidor/components/AccountSettingsDialog").then((module) => module.AccountSettingsDialog)
);
const AdminSupportInboxDialog = dynamic(() =>
  import("@/app/mina-sidor/components/AdminSupportInboxDialog").then((module) => module.AdminSupportInboxDialog)
);

const contentWrapSx = { width: "100%", maxWidth: 1500, mx: "auto" };

const SectionHeading = ({ children }) => (
  <Box sx={contentWrapSx}>
    <Box sx={{ ...sectionHeader, justifyContent: "center" }}>
      <Box sx={sectionRule} />
      {children}
      <Box sx={sectionRule} />
    </Box>
  </Box>
);

const PageFallback = () => (
  <Box
    sx={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      background: "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(17,28,47,0.98))",
    }}
  >
    <CircularProgress size={30} sx={{ color: "#7dd3fc" }} />
  </Box>
);

export default function MinaSidorPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <MinaSidorContent />
    </Suspense>
  );
}

function MinaSidorContent() {
  const translate = useTranslate();
  const { locale } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shouldLoadBuybacks = searchParams.get("vy") === "agande";
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
    isFounder,
    founderSince,
    founderPublic, setFounderPublic,
    lobbyAthEmailEnabled, setLobbyAthEmailEnabled,
    gameAthEmailEnabled, setGameAthEmailEnabled,
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
    user,
    isAuthenticated,
    initialized,
    stockPrice,
    playersLive,
    playerGames,
    playersLastUpdated,
    fxRate,
    loadBuybacks: shouldLoadBuybacks,
  });

  // --- Portfolio Actions Hook ---
  const {
    handleBuy,
    handleSell,
    handleSet,
    handleImportTransactions,
    handleUpdateTransaction,
    handleDeleteTransaction,
  } = usePortfolioActions({ token, user, profile, setProfile, setLoading, setError, translate });

  // --- Admin Tools Hook ---
  const inboxIdentity = profileIdentity?.email || user?.email || "";
  const adminTools = useAdminTools({ token, identity: inboxIdentity, effectiveIsAdmin, locale, translate });
  const {
    adminPanel, setAdminPanel
  } = adminTools;

  // --- Local State ---
  const [ownershipView, setOwnershipView] = useState("after");
  const [manageOpen, setManageOpen] = useState(false);
  const [transactionsOpen, setTransactionsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [adminSupportInboxOpen, setAdminSupportInboxOpen] = useState(false);
  const [privateMessagesOpen, setPrivateMessagesOpen] = useState(false);

  // Manage Modal State (local to page or extract? keeping local as it's UI state)
  const [buyShares, setBuyShares] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [buyDate, setBuyDate] = useState("");
  const [sellShares, setSellShares] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [sellDate, setSellDate] = useState("");
  const [setShares, setSetShares] = useState("");
  const [setAvgCost, setSetAvgCost] = useState("");
  const [setAcquisitionDate, setSetAcquisitionDate] = useState("");

  const [notificationsSaving, setNotificationsSaving] = useState(false);
  const [founderVisibilitySaving, setFounderVisibilitySaving] = useState(false);

  const {
    supportIndicator,
    privateMessages,
    privateMessagesLoading,
    privateMessagesError,
    privateMessagesUnread,
    loadSupportIndicator,
    markPrivateMessagesRead,
    dismissPrivateMessages,
  } = useMinaSidorInbox({
    token,
    identity: inboxIdentity,
    isAuthenticated,
    effectiveIsAdmin,
    translate,
  });

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

  const handleOpenPrivateMessages = useCallback(async () => {
    setPrivateMessagesOpen(true);
    await markPrivateMessagesRead();
  }, [markPrivateMessagesRead]);

  const handleDeletePrivateMessages = useCallback(async () => {
    await dismissPrivateMessages();
    setPrivateMessagesOpen(false);
  }, [dismissPrivateMessages]);

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
    setSellDate(new Date().toISOString().slice(0, 10));
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

  const savePlayerAlertPreference = async (key, setValue, nextValue, previousValue) => {
    if (!token) return;
    try {
      setNotificationsSaving(true);
      const payload = await fetchAuthJson(token, "/api/user/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: Boolean(nextValue) }),
      });
      setValue(Boolean(payload?.notifications?.[key]));
    } catch (err) {
      setValue(Boolean(previousValue));
      setError(err?.message || translate("Kunde inte spara inställningen.", "Could not save setting."));
    } finally {
      setNotificationsSaving(false);
    }
  };

  const saveFounderVisibility = async (nextValue) => {
    if (!token || !isFounder) return;
    const previousValue = founderPublic;
    setFounderPublic(Boolean(nextValue));
    try {
      setFounderVisibilitySaving(true);
      const payload = await fetchAuthJson(token, "/api/user/founder-visibility", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: Boolean(nextValue) }),
      });
      setFounderPublic(Boolean(payload?.founderPublic));
    } catch (err) {
      setFounderPublic(previousValue);
      setError(err?.message || translate("Kunde inte spara Founder-inställningen.", "Could not save Founder setting."));
    } finally {
      setFounderVisibilitySaving(false);
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

  const activeView = normalizeMinaSidorView(searchParams.get("vy"), { isAdmin: effectiveIsAdmin });
  const handleViewChange = useCallback((view) => {
    const href = buildMinaSidorViewHref({
      pathname,
      search: searchParams.toString(),
      view,
    });
    router.push(href, { scroll: false });
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        document.getElementById("mina-sidor-view-content")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [pathname, router, searchParams]);

  const dashboardTodayYmd = getStockholmTodayYmd();

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
              lobbyAthEmailEnabled={lobbyAthEmailEnabled}
              gameAthEmailEnabled={gameAthEmailEnabled}
              dailyAvgEmailEnabled={dailyAvgEmailEnabled}
              notificationsSaving={notificationsSaving}
              onToggleLobbyAthEmail={(nextValue) => {
                setLobbyAthEmailEnabled(Boolean(nextValue));
                savePlayerAlertPreference(
                  "lobbyAthEmail",
                  setLobbyAthEmailEnabled,
                  nextValue,
                  lobbyAthEmailEnabled
                );
              }}
              onToggleGameAthEmail={(nextValue) => {
                setGameAthEmailEnabled(Boolean(nextValue));
                savePlayerAlertPreference(
                  "gameAthEmail",
                  setGameAthEmailEnabled,
                  nextValue,
                  gameAthEmailEnabled
                );
              }}
              onToggleDailyAvgEmail={(nextValue) => {
                setDailyAvgEmailEnabled(Boolean(nextValue));
                savePlayerAlertPreference(
                  "dailyAvgEmail",
                  setDailyAvgEmailEnabled,
                  nextValue,
                  dailyAvgEmailEnabled
                );
              }}
              isAdminView={effectiveIsAdmin}
              onPreviewUserSupportNotice={() => triggerSupportPreview("user")}
              onPreviewAdminSupportNotice={() => triggerSupportPreview("admin")}
              greetingName={greetingName}
              isFounder={isFounder}
              founderSince={founderSince}
              founderPublic={founderPublic}
              founderVisibilitySaving={founderVisibilitySaving}
              onToggleFounderVisibility={saveFounderVisibility}
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
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "stretch", sm: "center" }}
                  sx={{ mb: privateMessagesOpen ? 0.9 : 0, gap: 1 }}
                >
                  <Typography sx={{ color: "#bfdbfe", fontWeight: 800 }}>
                    {translate("Personliga meddelanden från admin", "Personal messages from admin")}
                    {privateMessagesUnread > 0
                      ? ` (${translate(`${privateMessagesUnread} nya`, `${privateMessagesUnread} new`)})`
                      : ""}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={privateMessagesOpen
                        ? () => setPrivateMessagesOpen(false)
                        : handleOpenPrivateMessages}
                      sx={{
                        textTransform: "none",
                        borderColor: "rgba(96,165,250,0.55)",
                        color: "#dbeafe",
                        minWidth: "auto",
                        px: 1.2,
                        py: 0.35,
                      }}
                    >
                      {privateMessagesOpen
                        ? translate("Dölj", "Hide")
                        : translate("Visa meddelanden", "View messages")}
                    </Button>
                    {privateMessagesOpen ? (
                      <Button
                        size="small"
                        variant="text"
                        onClick={handleDeletePrivateMessages}
                        sx={{ textTransform: "none", color: "rgba(226,232,240,0.78)", minWidth: "auto" }}
                      >
                        {translate("Ta bort", "Delete")}
                      </Button>
                    ) : null}
                  </Stack>
                </Stack>
                {privateMessagesOpen ? <Stack spacing={0.9}>
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
                </Stack> : null}
              </Box>
            ) : null}
            {privateMessagesError ? (
              <Typography sx={{ color: statusColors.warning, mt: 1 }}>
                {privateMessagesError}
              </Typography>
            ) : null}

          </Box>

          <Box sx={contentWrapSx}>
            <UpcomingCalendarHighlights
              events={financialCalendarEvents}
              todayYmd={dashboardTodayYmd}
              locale={locale}
              translate={translate}
            />
          </Box>

          <Box sx={contentWrapSx}>
            <MinaSidorSectionNav
              activeView={activeView}
              isAdmin={effectiveIsAdmin}
              onChange={handleViewChange}
              translate={translate}
            />
          </Box>

          {error ? <Typography sx={{ color: statusColors.warning, fontWeight: 600 }}>{error}</Typography> : null}

          <Box id="mina-sidor-view-content" sx={{ ...contentWrapSx, scrollMarginTop: "92px" }}>
            {activeView === "oversikt" ? (
              <Stack spacing={{ xs: 2, md: 4 }}>
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
                <SectionHeading>{translate("Din avkastning", "Your return")}</SectionHeading>
                <ReturnBreakdownCard
                  translate={translate}
                  totalCost={totalCost}
                  totalValue={totalValue}
                  dividendsReceived={dividendsReceivedSafe}
                />
                {isTraderMode ? <TraderPnlRow translate={translate} pnl={traderPnl} /> : null}
              </Stack>
            ) : null}

            {activeView === "transaktioner" ? (
              <Stack spacing={{ xs: 2, md: 4 }}>
                <SectionHeading>{translate("Transaktioner & historik", "Transactions & history")}</SectionHeading>
                <DeferredSection minHeight={280}>
                  <PortfolioTimelineCard
                    translate={translate}
                    locale={locale}
                    profile={profile}
                    historicalDividends={
                      Array.isArray(dividendData?.historicalDividends) ? dividendData.historicalDividends : []
                    }
                    todayYmd={dashboardTodayYmd}
                    onManage={handleOpenManage}
                    onManageTransactions={() => setTransactionsOpen(true)}
                  />
                </DeferredSection>
                <DeferredSection minHeight={360}>
                  <HoldingsHistoryChart
                    translate={translate}
                    profile={profile}
                    historicalDividends={
                      Array.isArray(dividendData?.historicalDividends) ? dividendData.historicalDividends : []
                    }
                  />
                </DeferredSection>
              </Stack>
            ) : null}

            {activeView === "utdelning" ? (
              <Stack spacing={{ xs: 2, md: 4 }}>
                <SectionHeading>{translate("Utdelning", "Dividends")}</SectionHeading>
                <DeferredSection minHeight={320}>
                  <DividendCenterCard
                    translate={translate}
                    shares={profile.shares}
                    avgCost={profile.avgCost}
                    currentPrice={currentPrice}
                    fxRate={fxRate}
                    dividendsReceived={dividendsReceivedSafe}
                    upcomingDividend={upcomingDividend}
                    lastDividend={lastDividend}
                  />
                </DeferredSection>
              </Stack>
            ) : null}

            {activeView === "agande" ? (
              <Stack spacing={{ xs: 2, md: 4 }}>
                <SectionHeading>{translate("Återköp & ditt ägande", "Buybacks & your ownership")}</SectionHeading>
                <OwnershipCards
                  translate={translate}
                  buybackSummary={buybackSummary}
                  buybackMandateSummary={buybackMandateSummary}
                  profileShares={profile.shares}
                  ownershipView={ownershipView}
                  onChangeView={setOwnershipView}
                />
              </Stack>
            ) : null}

            {activeView === "verktyg" ? (
              <Stack spacing={{ xs: 2, md: 4 }}>
                <SectionHeading>{translate("Köpsimulator", "Purchase simulator")}</SectionHeading>
                <DeferredSection minHeight={300}>
                  <BuyImpactSimulatorCard
                    translate={translate}
                    profile={profile}
                    currentPrice={currentPrice}
                    upcomingDividend={upcomingDividend}
                    lastDividend={lastDividend}
                  />
                </DeferredSection>
                <SectionHeading>{translate("Värderingssignal", "Valuation signal")}</SectionHeading>
                <DeferredSection minHeight={320}>
                  <ValuationSignalCard
                    translate={translate}
                    currentPrice={currentPrice}
                    isUnlocked={Boolean(effectiveIsAdmin || isSubscriber)}
                  />
                </DeferredSection>
              </Stack>
            ) : null}

            {activeView === "admin" && effectiveIsAdmin ? (
              <Stack spacing={{ xs: 2, md: 4 }}>
                <SectionHeading>{translate("Admin", "Admin")}</SectionHeading>
                <AdminPanel
                  adminPanel={adminPanel}
                  setAdminPanel={setAdminPanel}
                  translate={translate}
                  locale={locale}
                  {...adminTools}
                  profileIdentity={profileIdentity}
                  user={user}
                />
              </Stack>
            ) : null}

            {activeView !== "admin" ? <SupportCallout placement="mina_sidor" /> : null}
          </Box>

          <Divider sx={sectionDivider} />
        </Stack>
      </Box>

      {manageOpen ? <ManageHoldingsModal
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
        sellDate={sellDate}
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
        onSellDateChange={(event) => setSellDate(event.target.value)}
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
        onSell={() => handleSell({ shares: Number(sellShares), price: Number(sellPrice), sellDate }).then(() => { setSellShares(""); setSellPrice(""); setSellDate(""); })}
        onSet={() => handleSet({ shares: Number(setShares), avgCost: Number(setAvgCost), acquisitionDate: setAcquisitionDate }).then((success) => { if (success) setManageOpen(false); })}
        onImportTransactions={onImportTransactions}
        loading={loading}
      /> : null}

      {transactionsOpen ? <TransactionManagerDialog
        open={transactionsOpen}
        onClose={() => setTransactionsOpen(false)}
        translate={translate}
        profile={profile}
        loading={loading}
        onUpdate={handleUpdateTransaction}
        onDelete={handleDeleteTransaction}
      /> : null}

      {supportOpen ? <SupportModal
        open={supportOpen}
        onClose={() => {
          setSupportOpen(false);
          loadSupportIndicator();
        }}
        translate={translate}
        token={token}
        identity={inboxIdentity}
      /> : null}

      {adminSupportInboxOpen ? <AdminSupportInboxDialog
        open={adminSupportInboxOpen}
        onClose={() => setAdminSupportInboxOpen(false)}
        translate={translate}
        locale={locale}
        loading={adminTools.adminSupportLoading}
        error={adminTools.adminSupportError}
        rows={adminTools.adminSupportRows}
        onRefresh={adminTools.loadAdminSupport}
        onOpenTicket={(id) => adminTools.openAdminSupportTicket?.(id)}
      /> : null}

      {effectiveIsAdmin && (adminTools.previewOpen || adminTools.adminSupportDialogOpen) ? <AdminDialogs
        {...adminTools}
        translate={translate}
      /> : null}

      {settingsOpen ? <AccountSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        translate={translate}
        email={profileIdentity?.email || user?.email || ""}
        firstName={profileIdentity?.firstName || user?.firstName || ""}
        lastName={profileIdentity?.lastName || user?.lastName || ""}
        onSaveProfile={handleSaveProfileSettings}
        onChangePassword={handleChangePasswordSettings}
        onDeleteAccount={handleDeleteAccount}
      /> : null}
    </Box>
  );
}
