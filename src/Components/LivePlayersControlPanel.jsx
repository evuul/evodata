'use client';

// Live players control panel view, fed by a separate model hook.

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Box, FormControl, MenuItem, Select, Typography, Stack, ToggleButton, ToggleButtonGroup } from "@mui/material";
import OverviewSection from "./LivePlayersControlPanelOverviewSection";
import LiveGamesSection from "./LivePlayersControlPanelLiveGamesSection";
import useLivePlayersControlPanelModel from "./useLivePlayersControlPanelModel";

const SectionLoader = () => <Box sx={{ minHeight: 260 }} aria-hidden="true" />;
const TrendSection = dynamic(() => import("./LivePlayersControlPanelTrendSection"), { loading: SectionLoader });
const MonthlyActivitySection = dynamic(() => import("./LivePlayersControlPanelMonthlyActivitySection"), { loading: SectionLoader });
const GameTrendSection = dynamic(() => import("./LivePlayersControlPanelGameTrendView"), { loading: SectionLoader });
const AsiaTrackerSection = dynamic(() => import("./LivePlayersControlPanelAsiaTrackerSection"), { loading: SectionLoader });
const AthSection = dynamic(() => import("./LivePlayersControlPanelAthSection"), { loading: SectionLoader });
const RankingSection = dynamic(() => import("./LivePlayersControlPanelRankingSection"), { loading: SectionLoader });
const HourlyBaselineSection = dynamic(() => import("./LivePlayersControlPanelHourlyBaselineSection"), { loading: SectionLoader });

const LivePlayersControlPanel = () => {
  const [mobileSection, setMobileSection] = useState("overview");
  const {
    translate,
    hasExtendedAccess,
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
    trendChartData,
    monthlyComparisonData,
    monthlyComparisonYears,
    monthlyLoading,
    monthlyError,
    monthlyUpdatedLabel,
    athRows,
    rankingRows,
    topGrowthUseMa,
    topGrowthDisplay,
    topGrowthDays: TOP_GROWTH_DAYS,
    hourlyByHourRows,
    hourlyCoverage,
    hourlyUpdatedLabel,
    hourlyLoading,
    hourlyError,
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

  const handleMobileSectionChange = (event) => {
    const nextSection = event.target.value;
    setMobileSection(nextSection);
    if (["trend", "monthly", "hourly", "gameTrend", "asia", "ranking", "ath"].includes(nextSection)) {
      setDetailView(nextSection);
    }
  };

  const mobileSectionDisplay = (section) => ({ xs: mobileSection === section ? "block" : "none", sm: "block" });
  const mobileSectionOptions = [
    { value: "overview", label: translate("Översikt", "Overview") },
    { value: "liveGames", label: translate("Livespel just nu", "Live games now") },
    { value: "gameTrend", label: translate("Speltrend", "Game trend") },
    { value: "trend", label: translate("Lobbytrend", "Lobby trend") },
    { value: "monthly", label: translate("Månadsvis", "Monthly") },
    ...(hasExtendedAccess
      ? [{ value: "hourly", label: translate("Timsnitt", "Hourly baseline") }]
      : []),
    { value: "ath", label: translate("ATH", "All-time highs") },
    { value: "ranking", label: translate("Ranking", "Ranking") },
    { value: "asia", label: translate("Asia Tracker", "Asia Tracker") },
  ];

  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #0f172a, #111c2f)",
        borderRadius: { xs: 0, md: "18px" },
        border: "1px solid rgba(148,163,184,0.18)",
        boxShadow: "0 24px 50px rgba(15,23,42,0.45)",
        color: "#f8fafc",
        mx: { xs: -2, sm: -3, md: -4 },
        px: { xs: 1.5, sm: 3, md: 4 },
        py: { xs: 2.25, md: 4 },
        minWidth: 0,
        overflow: "visible",
      }}
    >
      <Stack spacing={{ xs: 1.75, md: 3.2 }} sx={{ minWidth: 0 }}>
        <Stack
          spacing={{ xs: 0.7, md: 1.25 }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          textAlign={{ xs: "left", sm: "center" }}
        >
          <Typography
            variant="h4"
            sx={{ fontWeight: 700, fontSize: { xs: "1.55rem", sm: "2.3rem" }, lineHeight: { xs: 1.2, sm: 1.25 } }}
          >
            {translate("Gameshow live-data & historik", "Gameshow live data & history")}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: "rgba(226,232,240,0.75)",
              maxWidth: 760,
              lineHeight: { xs: 1.5, sm: 1.6 },
              fontSize: { xs: "0.9rem", sm: "1rem" },
            }}
          >
            {translate(
              "En förädlad vy över live-spelare, trendutveckling, ranking och toppnoteringar. Uppdateras automatiskt med lobbydata.",
              "A refined view of live players, trend development, rankings and peak records. Updates automatically with lobby data."
            )}
          </Typography>
        </Stack>

        <Box
          component="nav"
          aria-label={translate("Mobilnavigering för gameshow-data", "Mobile navigation for gameshow data")}
          sx={{
            display: { xs: "block", sm: "none" },
            position: "sticky",
            top: 8,
            zIndex: 10,
            mx: -0.5,
            p: 0.5,
            borderRadius: "14px",
            backgroundColor: "rgba(15,23,42,0.94)",
            boxShadow: "0 8px 24px rgba(2,6,23,0.38)",
          }}
        >
          <FormControl size="small" sx={{ width: "100%" }}>
            <Select
              value={mobileSection}
              onChange={handleMobileSectionChange}
              inputProps={{ "aria-label": translate("Välj gameshow-vy", "Choose gameshow view") }}
              renderValue={(value) => {
                const selectedOption = mobileSectionOptions.find((option) => option.value === value);
                return (
                  <Stack direction="row" spacing={0.75} alignItems="baseline">
                    <Typography component="span" variant="caption" sx={{ color: "rgba(125,211,252,0.8)" }}>
                      {translate("Vy", "View")}
                    </Typography>
                    <Typography component="span" variant="body2" sx={{ color: "#f8fafc", fontWeight: 800 }}>
                      {selectedOption?.label ?? value}
                    </Typography>
                  </Stack>
                );
              }}
              sx={{
                width: "100%",
                minHeight: 46,
                color: "#f8fafc",
                borderRadius: "11px",
                backgroundColor: "rgba(30,41,59,0.86)",
                "& .MuiSelect-icon": { color: "rgba(226,232,240,0.75)" },
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(56,189,248,0.45)" },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(56,189,248,0.7)" },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#38bdf8" },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    maxHeight: "min(60vh, 420px)",
                    color: "#f8fafc",
                    backgroundColor: "#111c2f",
                  },
                },
              }}
            >
              {mobileSectionOptions.map((option) => (
                <MenuItem key={option.value} value={option.value} sx={{ minHeight: 46 }}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Stack spacing={{ xs: 1.5, md: 3 }} sx={{ width: "100%", minWidth: 0 }}>
          <Box sx={{ display: mobileSectionDisplay("overview") }}>
            <OverviewSection
              translate={translate}
              numberFormatter={numberFormatter}
              loadingLive={loadingLive}
              totalLiveDisplayValue={totalLiveDisplayValue}
              playersUpdatedText={playersUpdatedText}
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
              stuckLiveGamesCount={stuckLiveGamesCount}
            />
          </Box>
          <Box sx={{ display: mobileSectionDisplay("liveGames") }}>
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
          </Box>
        </Stack>

        <ToggleButtonGroup
          value={detailView}
          exclusive
          onChange={(_, value) => value && setDetailView(value)}
          sx={{
            display: { xs: "none", sm: "flex" },
            backgroundColor: "rgba(148,163,184,0.12)",
            borderRadius: "999px",
            p: 0.5,
            alignSelf: "center",
            flexWrap: "wrap",
            justifyContent: "center",
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
            value="monthly"
            sx={{
              textTransform: "none",
              color: "rgba(226,232,240,0.75)",
              border: 0,
              borderRadius: "999px!important",
              px: { xs: 1.75, md: 3 },
              py: 0.75,
              "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(167,139,250,0.28)" },
            }}
          >
            {translate("Månadsvis", "Monthly")}
          </ToggleButton>
          {hasExtendedAccess ? (
            <ToggleButton
              value="hourly"
              sx={{
                textTransform: "none",
                color: "rgba(226,232,240,0.75)",
                border: 0,
                borderRadius: "999px!important",
                px: { xs: 1.75, md: 3 },
                py: 0.75,
                "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(14,165,233,0.3)" },
              }}
            >
              {translate("Timsnitt", "Hourly")}
            </ToggleButton>
          ) : null}
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
          <Box sx={{ display: mobileSectionDisplay("trend") }}>
            <TrendSection
            overviewLoading={overviewLoading}
            overviewError={overviewError}
            trendChartData={trendChartData}
            trendSummary={trendSummaryForView}
            trendDays={trendDays}
            trendUpdatedLabel={trendUpdatedLabel}
            onChangeDays={setTrendDays}
            movingAverageOn={trendMaOn}
            onToggleMovingAverage={() => setTrendMaOn((v) => !v)}
            movingAverageDays={trendMaWindowDays}
            movingAverageOptions={MA_WINDOW_OPTIONS}
            onChangeMovingAverageDays={setTrendMaWindowDays}
            numberFormatter={numberFormatter}
            translate={translate}
            percentFormatter={percentFormatter}
            dayOptions={TREND_DAY_OPTIONS}
            hasExtendedAccess={hasExtendedAccess}
              exportHref={`/api/data/export?scope=lobby&days=${trendDays}`}
            />
          </Box>
        )}

        {detailView === "monthly" && (
          <Box sx={{ display: mobileSectionDisplay("monthly") }}>
            <MonthlyActivitySection
              monthlyLoading={monthlyLoading}
              monthlyError={monthlyError}
              chartData={monthlyComparisonData}
              years={monthlyComparisonYears}
              monthlyUpdatedLabel={monthlyUpdatedLabel}
              hasExtendedAccess={hasExtendedAccess}
              numberFormatter={numberFormatter}
              translate={translate}
            />
          </Box>
        )}

        {detailView === "hourly" && hasExtendedAccess && (
          <Box sx={{ display: mobileSectionDisplay("hourly") }}>
            <HourlyBaselineSection
              rows={hourlyByHourRows}
              coverage={hourlyCoverage}
              updatedLabel={hourlyUpdatedLabel}
              loading={hourlyLoading}
              error={hourlyError}
              numberFormatter={numberFormatter}
              percentFormatter={percentFormatter}
              translate={translate}
            />
          </Box>
        )}

        {detailView === "gameTrend" && (
          <Box sx={{ display: mobileSectionDisplay("gameTrend") }}>
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
            hasExtendedAccess={hasExtendedAccess}
              exportHref={gameTrendSlug ? `/api/data/export?scope=game&game=${encodeURIComponent(gameTrendSlug)}&days=${gameTrendDays}` : null}
            />
          </Box>
        )}

        {detailView === "asia" && (
          <Box sx={{ display: mobileSectionDisplay("asia") }}>
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
              hasExtendedAccess={hasExtendedAccess}
            />
          </Box>
        )}

        {detailView === "ranking" && (
          <Box sx={{ display: mobileSectionDisplay("ranking") }}>
            <RankingSection
              rankingRows={rankingRows}
              overviewLoading={overviewLoading}
              numberFormatter={numberFormatter}
              translate={translate}
            />
          </Box>
        )}

        {detailView === "ath" && (
          <Box sx={{ display: mobileSectionDisplay("ath") }}>
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
              hasExtendedAccess={hasExtendedAccess}
            />
          </Box>
        )}
      </Stack>
    </Box>
  );
};

export default LivePlayersControlPanel;
