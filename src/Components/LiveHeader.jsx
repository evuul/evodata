"use client";

// Top-level live dashboard header and navigation for the casino score views.

import React from "react";
import dynamic from "next/dynamic";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import FinancialOverviewPanel from "./FinancialOverviewCard";
import LiveHeaderTopBar from "./LiveHeaderTopBar";
import LiveHeaderOverviewSection from "./LiveHeaderOverviewSection";
import LiveHeaderPanelSwitcher from "./LiveHeaderPanelSwitcher";
import LiveHeaderPanelContent from "./LiveHeaderPanelContent";
import { useLiveHeaderModel } from "./useLiveHeaderModel";

const PanelLoader = () => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: 280,
      width: "100%",
    }}
  >
    <CircularProgress size={28} sx={{ color: "#38bdf8" }} />
  </Box>
);

const LiveAiFairValuePanel = dynamic(() => import("./LiveAiFairValue"), { ssr: false, loading: PanelLoader });
const GameshowEarningsPanel = dynamic(() => import("./LiveShowIntelligence"), { ssr: false, loading: PanelLoader });
const ShortIntelligencePanel = dynamic(() => import("./ShortIntellegence"), { ssr: false, loading: PanelLoader });
const LivePlayersControlPanel = dynamic(() => import("./LivePlayersControlPanel"), { ssr: false, loading: PanelLoader });
const LiveMoneyCounterPanel = dynamic(() => import("./LiveMoneyCounter"), { ssr: false, loading: PanelLoader });
const LiveStockBuyBackInfoPanel = dynamic(() => import("./LiveStockBuyBackInfo"), { ssr: false, loading: PanelLoader });
const ReportViewPanel = dynamic(() => import("./ReportView"), { ssr: false, loading: PanelLoader });
const FaqPanel = dynamic(() => import("./FaqPanel"), { ssr: false, loading: PanelLoader });
const CashPositionPanel = dynamic(() => import("./CashPositionCard"), { ssr: false, loading: PanelLoader });
const CapitalAllocationPanel = dynamic(() => import("./CapitalAllocationCard"), { ssr: false, loading: PanelLoader });

export default function LiveHeader({ financialReports, averagePlayersData, dividendData, buybackData, sharesData }) {
  const {
    isMobileMenu,
    loadingPlayers,
    playersValue,
    playersUpdatedLabel,
    hourlyComparisonMeta,
    maintenanceWarningLabel,
    simulateLobby,
    setSimulateLobby,
    simulateButtonLabel,
    liveTrackerOffline,
    liveTrackerOfflineNote,
    priceDisplay,
    loadingPrice,
    changeColor,
    changeDisplay,
    ytdLabel,
    gainsLossLabel,
    stockUpdatedLabel,
    fmtCap,
    marketCap,
    marketStatusChip,
    latestTopWinLabelWithEmoji,
    top3,
    formatTime,
    showDonationNudge,
    donationNudgeText,
    donationNudgeClickLabel,
    handleDismissDonationNudge,
    supportUrl,
    isAuthenticated,
    userNameLabel,
    venueChipLabel,
    venueChipLabelMobile,
    marketDotColor,
    blankningChipLabel,
    blankningChipLabelMobile,
    lobbyAthLabel,
    lobbyAthLabelMobile,
    userMenuAnchor,
    setUserMenuAnchor,
    handleLogout,
    locale,
    setLocale,
    showMyPageNewBadge,
    playerDataAttentionLabel,
    cashView,
    setCashView,
    activePanel,
    panelOptions,
    handlePanelChange,
    isLiveMoneyPanel,
    isLivePanel,
    mobileCardsRef,
    mobileCardIndex,
    scrollToCard,
    translate,
  } = useLiveHeaderModel();

  const panelContent = (
    <LiveHeaderPanelContent
      activePanel={activePanel}
      translate={translate}
      financialReports={financialReports}
      averagePlayersData={averagePlayersData}
      dividendData={dividendData}
      buybackData={buybackData}
      sharesData={sharesData}
      cashView={cashView}
      setCashView={setCashView}
      panels={{
        LivePlayersControlPanel,
        FinancialOverviewPanel,
        CashPositionPanel,
        LiveAiFairValuePanel,
        GameshowEarningsPanel,
        ReportViewPanel,
        FaqPanel,
        LiveMoneyCounterPanel,
        LiveStockBuyBackInfoPanel,
        ShortIntelligencePanel,
        CapitalAllocationPanel,
      }}
    />
  );
  const isUserMenuOpen = Boolean(userMenuAnchor);

  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #0f172a, #111c2f)",
        borderRadius: 0,
        border: "1px solid rgba(148,163,184,0.18)",
        boxShadow: "0 24px 50px rgba(15,23,42,0.45)",
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2.2, sm: 3 },
        width: "100%",
      }}
    >
      <Stack spacing={{ xs: 1.8, sm: 2.5, md: 3 }}>
        <LiveHeaderTopBar
          translate={translate}
          isMobileMenu={isMobileMenu}
          venueChipLabel={venueChipLabel}
          venueChipLabelMobile={venueChipLabelMobile}
          marketDotColor={marketDotColor}
          blankningChipLabel={blankningChipLabel}
          blankningChipLabelMobile={blankningChipLabelMobile}
          lobbyAthLabel={lobbyAthLabel}
          lobbyAthLabelMobile={lobbyAthLabelMobile}
          showDonationNudge={showDonationNudge}
          donationNudgeText={donationNudgeText}
          donationNudgeClickLabel={donationNudgeClickLabel}
          handleDismissDonationNudge={handleDismissDonationNudge}
          supportUrl={supportUrl}
          isAuthenticated={isAuthenticated}
          userNameLabel={userNameLabel}
          isUserMenuOpen={isUserMenuOpen}
          userMenuAnchor={userMenuAnchor}
          setUserMenuAnchor={setUserMenuAnchor}
          handleLogout={handleLogout}
          locale={locale}
          setLocale={setLocale}
          showMyPageNewBadge={showMyPageNewBadge}
        />

        <Stack spacing={{ xs: 1.4, sm: 1.6 }} alignItems="center" textAlign="center">
          <Typography
            variant="overline"
            sx={{
              letterSpacing: { xs: 5, sm: 7.5 },
              color: "rgba(148,163,184,0.78)",
              fontWeight: 700,
              fontSize: { xs: "0.82rem", sm: "1rem", md: "1.12rem" },
              textTransform: "uppercase",
            }}
          >
            {translate("Evolution Control Center", "Evolution Control Center")}
          </Typography>
          {!isMobileMenu && (
            <>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: "1.9rem", sm: "2.4rem", md: "2.9rem" },
                  color: "#f8fafc",
                }}
              >
                {translate(
                  "Spårning i realtid för kurs, lobby och blankning",
                  "Real-time tracking for price, lobby, and short interest"
                )}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  maxWidth: 720,
                  color: "rgba(226,232,240,0.75)",
                  lineHeight: 1.6,
                }}
              >
                {translate(
                  "Växla mellan finansiella dashboards utan att lämna kontrollrummet. Aktiekurs, live-spelare och marknadsvärde visas alltid längst upp.",
                  "Switch between financial dashboards without leaving the control room. Stock price, live players, and market cap stay pinned to the top."
                )}
              </Typography>
            </>
          )}
        </Stack>

        <LiveHeaderOverviewSection
          translate={translate}
          isMobileMenu={isMobileMenu}
          playerDataAttentionLabel={playerDataAttentionLabel}
          mobileCardsRef={mobileCardsRef}
          mobileCardIndex={mobileCardIndex}
          scrollToCard={scrollToCard}
          playersValue={playersValue}
          playersUpdatedLabel={playersUpdatedLabel}
          loadingPlayers={loadingPlayers}
          hourlyComparisonMeta={hourlyComparisonMeta}
          maintenanceWarningLabel={maintenanceWarningLabel}
          simulateLobby={simulateLobby}
          setSimulateLobby={setSimulateLobby}
          simulateButtonLabel={simulateButtonLabel}
          liveTrackerOffline={liveTrackerOffline}
          liveTrackerOfflineNote={liveTrackerOfflineNote}
          priceDisplay={priceDisplay}
          loadingPrice={loadingPrice}
          changeColor={changeColor}
          changeDisplay={changeDisplay}
          ytdLabel={ytdLabel}
          gainsLossLabel={gainsLossLabel}
          stockUpdatedLabel={stockUpdatedLabel}
          fmtCap={fmtCap}
          marketCap={marketCap}
          marketStatusChip={marketStatusChip}
          latestTopWinLabelWithEmoji={latestTopWinLabelWithEmoji}
          top3={top3}
          formatTime={formatTime}
        />

        <Stack spacing={{ xs: 1.6, sm: 1.9 }} alignItems="stretch">
          <LiveHeaderPanelSwitcher
            activePanel={activePanel}
            isMobileMenu={isMobileMenu}
            panelOptions={panelOptions}
            handlePanelChange={handlePanelChange}
            panelContent={panelContent}
            isLiveMoneyPanel={isLiveMoneyPanel}
            isLivePanel={isLivePanel}
          />
        </Stack>
      </Stack>
    </Box>
  );
}
