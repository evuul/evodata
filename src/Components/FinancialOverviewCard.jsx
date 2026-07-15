"use client";

// Orchestrates the financial overview sections and shared state.

import { useTheme } from "@mui/material";
import useMediaQuery from "@/lib/useMuiMediaQuery";
import { useTranslate } from "@/context/LocaleContext";
import { formatMillion, formatMetricValue, formatChangeValue } from "@/lib/financialOverviewCard";
import FinancialOverviewCardWideSection from "./FinancialOverviewCardWideSection";
import { useFinancialOverviewCardModel } from "./useFinancialOverviewCardModel";

const FinancialOverviewCard = ({ financialReports, dividendData }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const translate = useTranslate();

  const {
    metricConfigs,
    metricToggleOptions,
    viewToggleOptions,
    chartRangeOptions,
    currentYearProfit,
    latestReport,
    wideMetric,
    setWideMetric,
    wideViewMode,
    setWideViewMode,
    wideRange,
    setWideRange,
    isWideStandardMetric,
    wideSelectedSeries,
    wideChartDomain,
    wideChartTicks,
    wideXAxisTicks,
    formatWideXAxisTick,
    wideGeoSeries,
    wideGeoSnapshot,
    wideProductMixSeries,
    wideProductMixSnapshot,
    wideSummary,
    widePeak,
    wideTrendText,
    regulatedSeries,
    regulatedView,
    setRegulatedView,
    regulatedChartType,
    setRegulatedChartType,
    regulatedXAxisKey,
    regulatedXAxisTicks,
  } = useFinancialOverviewCardModel({ financialReports, dividendData, isMobile });

  const formatChangeColor = (value) => {
    if (!Number.isFinite(value)) return "rgba(226,232,240,0.75)";
    return value >= 0 ? "#34d399" : "#f87171";
  };

  const formatShare = (value) => (Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "–");

  return (
    <>
      <FinancialOverviewCardWideSection
        isMobile={isMobile}
        translate={translate}
        formatMillion={formatMillion}
        formatMetricValue={formatMetricValue}
        formatChangeValue={formatChangeValue}
        formatChangeColor={formatChangeColor}
        formatShare={formatShare}
        metricConfigs={metricConfigs}
        metricToggleOptions={metricToggleOptions}
        viewToggleOptions={viewToggleOptions}
        chartRangeOptions={chartRangeOptions}
        wideMetric={wideMetric}
        setWideMetric={setWideMetric}
        wideViewMode={wideViewMode}
        setWideViewMode={setWideViewMode}
        wideRange={wideRange}
        setWideRange={setWideRange}
        currentYearProfit={currentYearProfit}
        latestReport={latestReport}
        isWideStandardMetric={isWideStandardMetric}
        wideSelectedSeries={wideSelectedSeries}
        wideChartDomain={wideChartDomain}
        wideChartTicks={wideChartTicks}
        wideXAxisTicks={wideXAxisTicks}
        formatWideXAxisTick={formatWideXAxisTick}
        wideGeoSeries={wideGeoSeries}
        wideGeoSnapshot={wideGeoSnapshot}
        wideProductMixSeries={wideProductMixSeries}
        wideProductMixSnapshot={wideProductMixSnapshot}
        wideSummary={wideSummary}
        widePeak={widePeak}
        wideTrendText={wideTrendText}
        financialReports={financialReports}
        regulatedSeries={regulatedSeries}
        regulatedView={regulatedView}
        onChangeRegulatedView={setRegulatedView}
        regulatedChartType={regulatedChartType}
        onChangeRegulatedChartType={setRegulatedChartType}
        regulatedXAxisKey={regulatedXAxisKey}
        regulatedXAxisTicks={regulatedXAxisTicks}
      />

    </>
  );
};

export default FinancialOverviewCard;
