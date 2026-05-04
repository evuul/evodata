'use client';

// Live players control panel view, fed by a separate model hook.

import React from "react";
import { Box, Typography, Stack, ToggleButton, ToggleButtonGroup } from "@mui/material";
import TrendSection from "./LivePlayersControlPanelTrendSection";
import GameTrendSection from "./LivePlayersControlPanelGameTrendView";
import AsiaTrackerSection from "./LivePlayersControlPanelAsiaTrackerSection";
import AthSection from "./LivePlayersControlPanelAthSection";
import RankingSection from "./LivePlayersControlPanelRankingSection";
import OverviewSection from "./LivePlayersControlPanelOverviewSection";
import LiveGamesSection from "./LivePlayersControlPanelLiveGamesSection";
import useLivePlayersControlPanelModel from "./useLivePlayersControlPanelModel";

const LivePlayersControlPanel = () => {
  const {
    translate,
    numberFormatter,
    percentFormatter,
    timeFormatter,
    detailView,
    setDetailView,
    trendDays,
    setTrendDays,
    athDays,
    setAthDays,
    overviewLoading,
    overviewError,
    loadingLive,
    liveGamesList,
    visibleLiveGames,
    showAllLive,
    setShowAllLive,
    showAllAth,
    setShowAllAth,
    trendBoostOn,
    setTrendBoostOn,
    lobbyBoostOn,
    toggleLobbyBoost,
    trendMaOn,
    setTrendMaOn,
    gameTrendMaOn,
    setGameTrendMaOn,
    trendMaWindowDays,
    setTrendMaWindowDays,
    gameTrendMaWindowDays,
    setGameTrendMaWindowDays,
    asiaTrendMaWindowDays,
    setAsiaTrendMaWindowDays,
    trendSummary: trendSummaryForView,
    trendUpdatedLabel,
    trendChartData: boostedTrendChartData,
    athRows,
    rankingRows,
    topGrowthUseMa,
    topGrowthDisplay,
    topGrowthDays: TOP_GROWTH_DAYS,
    hourlyByHourRows,
    hourlyComparisonMeta,
    playersUpdatedText,
    totalLiveDisplayValue,
    todayPeakDisplayValue,
    todayPeakMetaText,
    yesterdayPeakDisplayValue,
    yesterdayPeakMetaText,
    lobbyAthDisplay,
    showYesterdayPeakCard,
    TREND_DAY_OPTIONS,
    MA_WINDOW_OPTIONS,
    ATH_DAY_OPTIONS,
    INITIAL_VISIBLE_ATH,
    gameTrendOptions,
    gameTrendSlug,
    setGameTrendSlug,
    gameTrendDays,
    setGameTrendDays,
    selectedGameOption,
    gameTrendChartData,
    gameTrendSummary,
    asiaTrackerSlug,
    setAsiaTrackerSlug,
    asiaTrackerDays,
    setAsiaTrackerDays,
    asiaViewMode,
    setAsiaViewMode,
    asiaTrendMaOn,
    setAsiaTrendMaOn,
    selectedAsiaOption,
    asiaTrendOptions,
    asiaTrendChartDataForView,
    asiaTrendSummary,
    asiaTrackerChartData,
    asiaTrackerSummary,
    asiaLiveTotal,
    asiaLiveShare,
    asiaTableRows,
    stuckLiveGamesCount,
    formatDateTime,
  } = useLivePlayersControlPanelModel();

  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #0f172a, #111c2f)",
        borderRadius: { xs: 0, md: "18px" },
        border: "1px solid rgba(148,163,184,0.18)",
        boxShadow: "0 24px 50px rgba(15,23,42,0.45)",
        color: "#f8fafc",
        mx: { xs: -2, sm: -3, md: -4 },
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 3, md: 4 },
        overflow: "visible",
      }}
    >
      <Stack spacing={{ xs: 2.2, md: 3.2 }}>
        <Stack spacing={{ xs: 1, md: 1.25 }} alignItems="center" textAlign="center">
          <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: "1.8rem", sm: "2.3rem" } }}>
            {translate("Gameshow live-data & historik", "Gameshow live data & history")}
          </Typography>
          <Typography variant="body1" sx={{ color: "rgba(226,232,240,0.75)", maxWidth: 760, lineHeight: 1.6 }}>
            {translate(
              "En förädlad vy över live-spelare, trendutveckling, ranking och toppnoteringar. Uppdateras automatiskt med lobbydata.",
              "A refined view of live players, trend development, rankings and peak records. Updates automatically with lobby data."
            )}
          </Typography>
        </Stack>

        <Stack spacing={{ xs: 2, md: 3 }} sx={{ width: "100%" }}>
          <OverviewSection
            translate={translate}
            numberFormatter={numberFormatter}
            percentFormatter={percentFormatter}
            loadingLive={loadingLive}
            totalLiveDisplayValue={totalLiveDisplayValue}
            playersUpdatedText={playersUpdatedText}
            hourlyComparisonMeta={hourlyComparisonMeta}
            lobbyBoostOn={lobbyBoostOn}
            onToggleLobbyBoost={toggleLobbyBoost}
            overviewLoading={overviewLoading}
            todayPeakDisplayValue={todayPeakDisplayValue}
            todayPeakMetaText={todayPeakMetaText}
            yesterdayPeakDisplayValue={yesterdayPeakDisplayValue}
            yesterdayPeakMetaText={yesterdayPeakMetaText}
            showYesterdayPeakCard={showYesterdayPeakCard}
            lobbyAthDisplay={lobbyAthDisplay}
            topGrowthDisplay={topGrowthDisplay}
            topGrowthUseMa={topGrowthUseMa}
            topGrowthDays={TOP_GROWTH_DAYS}
            hourlyByHourRows={hourlyByHourRows}
            stuckLiveGamesCount={stuckLiveGamesCount}
          />
          <LiveGamesSection
            translate={translate}
            numberFormatter={numberFormatter}
            timeFormatter={timeFormatter}
            loadingLive={loadingLive}
            liveGamesList={liveGamesList}
            visibleLiveGames={visibleLiveGames}
            showAllLive={showAllLive}
            onToggleShowAllLive={() => setShowAllLive((prev) => !prev)}
          />
        </Stack>

        <ToggleButtonGroup
          value={detailView}
          exclusive
          onChange={(_, value) => value && setDetailView(value)}
          sx={{
            backgroundColor: "rgba(148,163,184,0.12)",
            borderRadius: "999px",
            p: 0.5,
            alignSelf: "center",
          }}
        >
          <ToggleButton
            value="trend"
            sx={{
              textTransform: "none",
              color: "rgba(226,232,240,0.75)",
              border: 0,
              borderRadius: "999px!important",
              px: { xs: 1.75, md: 3 },
              py: 0.75,
              "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(56,189,248,0.28)" },
            }}
          >
            {translate("Trend", "Trend")}
          </ToggleButton>
          <ToggleButton
            value="gameTrend"
            sx={{
              textTransform: "none",
              color: "rgba(226,232,240,0.75)",
              border: 0,
              borderRadius: "999px!important",
              px: { xs: 1.75, md: 3 },
              py: 0.75,
              "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(74,222,128,0.28)" },
            }}
          >
            {translate("Speltrend", "Game trend")}
          </ToggleButton>
          <ToggleButton
            value="asia"
            sx={{
              textTransform: "none",
              color: "rgba(226,232,240,0.75)",
              border: 0,
              borderRadius: "999px!important",
              px: { xs: 1.75, md: 3 },
              py: 0.75,
              "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(248,250,133,0.28)" },
            }}
          >
            {translate("Asia Tracker", "Asia Tracker")}
          </ToggleButton>
          <ToggleButton
            value="ranking"
            sx={{
              textTransform: "none",
              color: "rgba(226,232,240,0.75)",
              border: 0,
              borderRadius: "999px!important",
              px: { xs: 1.75, md: 3 },
              py: 0.75,
              "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(56,189,248,0.28)" },
            }}
          >
            {translate("Ranking", "Ranking")}
          </ToggleButton>
          <ToggleButton
            value="ath"
            sx={{
              textTransform: "none",
              color: "rgba(226,232,240,0.75)",
              border: 0,
              borderRadius: "999px!important",
              px: { xs: 1.75, md: 3 },
              py: 0.75,
              "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(192,132,252,0.28)" },
            }}
          >
            {translate("ATH", "ATH")}
          </ToggleButton>
        </ToggleButtonGroup>

        {detailView === "trend" && (
          <TrendSection
            overviewLoading={overviewLoading}
            overviewError={overviewError}
            trendChartData={boostedTrendChartData}
            trendSummary={trendSummaryForView}
            trendDays={trendDays}
            trendUpdatedLabel={trendUpdatedLabel}
            onChangeDays={setTrendDays}
            boostOn={trendBoostOn}
            onToggleBoost={() => setTrendBoostOn((v) => !v)}
            movingAverageOn={trendMaOn}
            onToggleMovingAverage={() => setTrendMaOn((v) => !v)}
            movingAverageDays={trendMaWindowDays}
            movingAverageOptions={MA_WINDOW_OPTIONS}
            onChangeMovingAverageDays={setTrendMaWindowDays}
            numberFormatter={numberFormatter}
            translate={translate}
            percentFormatter={percentFormatter}
            dayOptions={TREND_DAY_OPTIONS}
          />
        )}

        {detailView === "gameTrend" && (
          <GameTrendSection
            overviewLoading={overviewLoading}
            overviewError={overviewError}
            options={gameTrendOptions}
            selectedSlug={gameTrendSlug}
            onSelectSlug={setGameTrendSlug}
            trendUpdatedLabel={trendUpdatedLabel}
            chartData={gameTrendChartData}
            summary={gameTrendSummary}
            selectedOption={selectedGameOption}
            dayOptions={TREND_DAY_OPTIONS}
            days={gameTrendDays}
            onChangeDays={setGameTrendDays}
            movingAverageOn={gameTrendMaOn}
            onToggleMovingAverage={() => setGameTrendMaOn((v) => !v)}
            movingAverageDays={gameTrendMaWindowDays}
            movingAverageOptions={MA_WINDOW_OPTIONS}
            onChangeMovingAverageDays={setGameTrendMaWindowDays}
            numberFormatter={numberFormatter}
            translate={translate}
            percentFormatter={percentFormatter}
          />
        )}

        {detailView === "asia" && (
          <AsiaTrackerSection
            overviewLoading={overviewLoading}
            overviewError={overviewError}
            lastUpdatedLabel={trendUpdatedLabel}
            totalLive={asiaLiveTotal}
            liveShare={asiaLiveShare}
            tableRows={asiaTableRows}
            options={asiaTrendOptions}
            selectedSlug={asiaTrackerSlug}
            onSelectSlug={setAsiaTrackerSlug}
            viewMode={asiaViewMode}
            onChangeViewMode={setAsiaViewMode}
            trendChartData={asiaTrendChartDataForView}
            trendSummary={asiaTrendSummary}
            gameChartData={asiaTrackerChartData}
            gameSummary={asiaTrackerSummary}
            selectedOption={selectedAsiaOption}
            dayOptions={TREND_DAY_OPTIONS}
            days={asiaTrackerDays}
            onChangeDays={setAsiaTrackerDays}
            movingAverageOn={asiaTrendMaOn}
            onToggleMovingAverage={() => setAsiaTrendMaOn((v) => !v)}
            movingAverageDays={asiaTrendMaWindowDays}
            movingAverageOptions={MA_WINDOW_OPTIONS}
            onChangeMovingAverageDays={setAsiaTrendMaWindowDays}
            numberFormatter={numberFormatter}
            translate={translate}
            percentFormatter={percentFormatter}
          />
        )}

        {detailView === "ranking" && (
          <RankingSection
            rankingRows={rankingRows}
            overviewLoading={overviewLoading}
            numberFormatter={numberFormatter}
            translate={translate}
          />
        )}

        {detailView === "ath" && (
          <AthSection
            athRows={athRows}
            athDays={athDays}
            dayOptions={ATH_DAY_OPTIONS}
            initialVisibleCount={INITIAL_VISIBLE_ATH}
            onChangeDays={setAthDays}
            overviewLoading={overviewLoading}
            overviewError={overviewError}
            showAllAth={showAllAth}
            toggleShowAll={() => setShowAllAth((prev) => !prev)}
            numberFormatter={numberFormatter}
            translate={translate}
            formatDateTime={formatDateTime}
          />
        )}
      </Stack>
    </Box>
  );
};

export default LivePlayersControlPanel;
