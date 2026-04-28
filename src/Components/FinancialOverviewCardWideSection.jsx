'use client';

// Full-width deep-dive view for the financial overview card.

import { Box, Stack, Typography, ToggleButton, ToggleButtonGroup } from "@mui/material";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import FinancialOverviewCardWideSummaryColumn from "./FinancialOverviewCardWideSummaryColumn";

const formatCompactAxisLabel = (value) => value;

export default function FinancialOverviewCardWideSection({
  isMobile,
  translate,
  formatMillion,
  formatMetricValue,
  formatChangeValue,
  formatChangeColor,
  formatShare,
  metricConfigs,
  metricToggleOptions,
  viewToggleOptions,
  wideMetric,
  setWideMetric,
  wideViewMode,
  setWideViewMode,
  currentYearProfit,
  isWideStandardMetric,
  wideSelectedSeries,
  wideChartDomain,
  wideGeoSeries,
  wideGeoSnapshot,
  wideProductMixSeries,
  wideProductMixSnapshot,
  wideSummary,
  wideRangeValue,
  wideTrendText,
  wideSummaryCards,
}) {
  const wideGradientId = "wideGradient";

  const renderMetricChart = () => {
    if (isWideStandardMetric && wideSelectedSeries.length) {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={wideSelectedSeries} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={wideGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={metricConfigs[wideMetric]?.accent || "#60a5fa"}
                  stopOpacity={0.6}
                />
                <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="4 4" />
            <XAxis
              dataKey="xLabel"
              tick={{ fontSize: isMobile ? 11 : 12, fill: "rgba(148,163,184,0.75)" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
              interval={wideViewMode === "quarterly" ? (isMobile ? 4 : 2) : 0}
            />
            <YAxis
              tick={{ fontSize: isMobile ? 11 : 12, fill: "rgba(148,163,184,0.75)" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
              domain={wideChartDomain}
              tickFormatter={(value) => {
                const numeric = Number(value);
                if (!Number.isFinite(numeric)) return "";
                if (wideMetric === "margin") return `${numeric.toFixed(0)}%`;
                if (wideMetric === "revenue") return formatMillion(numeric, numeric >= 100 ? 0 : 1);
                return numeric.toFixed(metricConfigs[wideMetric]?.decimals || 1);
              }}
            />
            <RechartsTooltip
              contentStyle={{
                background: "rgba(15,23,42,0.92)",
                border: "1px solid rgba(96,165,250,0.25)",
                borderRadius: 12,
                color: "#f8fafc",
              }}
              formatter={(value) => [
                formatMetricValue(metricConfigs, wideMetric, Number(value)),
                metricConfigs[wideMetric]?.label,
              ]}
            />
            <Area
              type="monotone"
              dataKey={metricConfigs[wideMetric]?.valueKey}
              stroke={metricConfigs[wideMetric]?.accent || "#60a5fa"}
              strokeWidth={2.5}
              fill={`url(#${wideGradientId})`}
              fillOpacity={1}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (wideMetric === "geo" && wideGeoSeries.length) {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={wideGeoSeries} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="4 4" />
            <XAxis
              dataKey="xLabel"
              tick={{ fontSize: isMobile ? 11 : 12, fill: "rgba(148,163,184,0.75)" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
              minTickGap={isMobile ? 8 : 16}
            />
            <YAxis
              tick={{ fontSize: isMobile ? 11 : 12, fill: "rgba(148,163,184,0.75)" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
              tickFormatter={(value) => formatMillion(value, value >= 100 ? 0 : 1)}
            />
            <RechartsTooltip
              contentStyle={{
                background: "rgba(15,23,42,0.92)",
                border: "1px solid rgba(168,85,247,0.25)",
                borderRadius: 12,
                color: "#f8fafc",
              }}
              labelFormatter={(_label, payload) =>
                payload && payload[0] && payload[0].payload?.period ? payload[0].payload.period : "–"
              }
              formatter={(value, name) => [`${formatMillion(Number(value), Number(value) >= 100 ? 0 : 1)} €M`, name]}
            />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ color: "rgba(226,232,240,0.78)" }} />
            <Area
              type="monotone"
              dataKey="europe"
              name={translate("Europa", "Europe")}
              stroke="#60a5fa"
              fill="#60a5fa44"
              strokeWidth={2}
              stackId="regions-wide"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="asia"
              name={translate("Asien", "Asia")}
              stroke="#fbbf24"
              fill="#fbbf2444"
              strokeWidth={2}
              stackId="regions-wide"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="northAmerica"
              name={translate("Nordamerika", "North America")}
              stroke="#34d399"
              fill="#34d39944"
              strokeWidth={2}
              stackId="regions-wide"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="latAm"
              name={translate("Latinamerika", "Latin America")}
              stroke="#f97316"
              fill="#f9731644"
              strokeWidth={2}
              stackId="regions-wide"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="other"
              name={translate("Övrigt", "Other")}
              stroke="#a855f7"
              fill="#a855f744"
              strokeWidth={2}
              stackId="regions-wide"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (wideMetric === "productMix" && wideProductMixSeries.length) {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={wideProductMixSeries} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="4 4" />
            <XAxis
              dataKey="xLabel"
              tick={{ fontSize: isMobile ? 11 : 12, fill: "rgba(148,163,184,0.75)" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
              minTickGap={isMobile ? 8 : 16}
            />
            <YAxis
              tick={{ fontSize: isMobile ? 11 : 12, fill: "rgba(148,163,184,0.75)" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
              tickFormatter={(value) => formatMillion(value, value >= 100 ? 0 : 1)}
            />
            <RechartsTooltip
              contentStyle={{
                background: "rgba(15,23,42,0.92)",
                border: "1px solid rgba(56,189,248,0.25)",
                borderRadius: 12,
                color: "#f8fafc",
              }}
              labelFormatter={(_label, payload) =>
                payload && payload[0] && payload[0].payload?.period ? payload[0].payload.period : "–"
              }
              formatter={(value, name) => [`${formatMillion(Number(value), Number(value) >= 100 ? 0 : 1)} €M`, name]}
            />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ color: "rgba(226,232,240,0.78)" }} />
            <Area
              type="monotone"
              dataKey="liveCasino"
              name={translate("Live Casino", "Live Casino")}
              stroke="#38bdf8"
              fill="#38bdf844"
              strokeWidth={2.2}
              stackId="products-wide"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="rng"
              name={translate("RNG", "RNG")}
              stroke="#f87171"
              fill="#f8717144"
              strokeWidth={2.2}
              stackId="products-wide"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(148,163,184,0.65)",
        }}
      >
        <Typography>{translate("Ingen data att visualisera för valt läge.", "No data for selected view.")}</Typography>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        mt: { xs: 3, md: 4 },
        width: "100vw",
        mx: "calc(50% - 50vw)",
        background: "linear-gradient(135deg, #0b1220, #101a2e)",
        borderTop: "1px solid rgba(148,163,184,0.18)",
        borderBottom: "1px solid rgba(148,163,184,0.18)",
        px: { xs: 2, sm: 3, md: 4, lg: 6 },
        py: { xs: 3, md: 4 },
      }}
    >
      <Stack spacing={{ xs: 2, md: 3 }} sx={{ width: "100%" }}>
        <Box>
          <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.7)", letterSpacing: 1.2 }}>
            {translate("Finansiell översikt", "Financial overview")}
          </Typography>
          <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 800, color: "#f8fafc" }}>
            {translate("Omsättning, marginal & lönsamhet", "Revenue, margin & profitability")}
          </Typography>
          <Typography sx={{ color: "rgba(226,232,240,0.7)" }}>
            {translate(
              "Ny vy med full bredd för att snabbt jämföra nyckeltal.",
              "A full-width view to compare key metrics quickly."
            )}
          </Typography>
        </Box>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 1.2, md: 2 }}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
        >
          <ToggleButtonGroup
            value={wideMetric}
            exclusive
            onChange={(_e, v) => v && setWideMetric(v)}
            size="small"
            sx={{
              backgroundColor: "rgba(148,163,184,0.12)",
              borderRadius: "999px",
              p: 0.5,
              flexWrap: "wrap",
            }}
          >
            {metricToggleOptions.map((option) => (
              <ToggleButton
                key={`wide-${option.value}`}
                value={option.value}
                sx={{
                  textTransform: "none",
                  color: "rgba(226,232,240,0.75)",
                  border: 0,
                  borderRadius: "999px!important",
                  px: { xs: 1.5, md: 2.2 },
                  "&.Mui-selected": {
                    color: "#f8fafc",
                    backgroundColor: `${metricConfigs[option.value]?.accent || "#60a5fa"}33`,
                  },
                }}
              >
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Stack direction="row" spacing={1} alignItems="center">
            {Number.isFinite(currentYearProfit) && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.1,
                  minWidth: { xs: 190, md: 230 },
                  background: "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.08))",
                  borderRadius: "12px",
                  border: "1px solid rgba(34,197,94,0.35)",
                  px: { xs: 1.4, md: 2 },
                  py: { xs: 0.7, md: 0.85 },
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 30,
                    borderRadius: "999px",
                    background: "linear-gradient(180deg, #22c55e, #16a34a)",
                    boxShadow: "0 0 10px rgba(34,197,94,0.45)",
                  }}
                />
                <Box>
                  <Typography
                    sx={{
                      color: "rgba(148,163,184,0.75)",
                      fontSize: "0.7rem",
                      letterSpacing: 0.5,
                      textTransform: "uppercase",
                    }}
                  >
                    {translate("Årets vinst", "Year profit")}
                  </Typography>
                  <Typography sx={{ fontWeight: 700, color: "#f8fafc", fontSize: "1rem" }}>
                    {`${formatMillion(currentYearProfit, 1)} €M`}
                  </Typography>
                </Box>
              </Box>
            )}

            <ToggleButtonGroup
              value={wideViewMode}
              exclusive
              onChange={(_e, v) => v && setWideViewMode(v)}
              size="small"
              sx={{ backgroundColor: "rgba(148,163,184,0.12)", borderRadius: "999px", p: 0.5 }}
            >
              {viewToggleOptions.map((option) => (
                <ToggleButton
                  key={`wide-${option.value}`}
                  value={option.value}
                  disabled={wideMetric === "dividend" && option.value === "quarterly"}
                  sx={{
                    textTransform: "none",
                    color: "rgba(226,232,240,0.75)",
                    border: 0,
                    borderRadius: "999px!important",
                    px: { xs: 1.5, md: 2 },
                    "&.Mui-selected": {
                      color: "#f8fafc",
                      backgroundColor: "rgba(96,165,250,0.25)",
                    },
                  }}
                >
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Stack>
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "2.2fr 1fr" },
            gap: { xs: 1.5, md: 2.5 },
            alignItems: "stretch",
            width: "100%",
            minHeight: { xs: "auto", lg: 560 },
          }}
        >
          <Box
            sx={{
              background: "rgba(15,23,42,0.55)",
              borderRadius: "16px",
              border: "1px solid rgba(148,163,184,0.18)",
              p: { xs: 2, md: 2.5 },
              height: { xs: "auto", lg: "100%" },
              width: "100%",
              minHeight: { xs: 320, lg: 560 },
              position: "relative",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box sx={{ flex: 1, minHeight: 0 }}>{renderMetricChart()}</Box>

            {wideMetric === "geo" && wideGeoSnapshot?.regions?.length ? (
              <Box sx={{ mt: { xs: 1.5, md: 2 } }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, minmax(0, 1fr))" },
                    gap: { xs: 1, md: 1.5 },
                  }}
                >
                  {wideGeoSnapshot.regions.slice(0, 4).map((region) => (
                    <Box
                      key={`wide-geo-inline-${region.key}`}
                      sx={{
                        background: "rgba(59,130,246,0.08)",
                        borderRadius: "14px",
                        border: "1px solid rgba(96,165,250,0.25)",
                        p: 1.6,
                      }}
                    >
                      <Typography
                        sx={{
                          color: "rgba(226,232,240,0.7)",
                          fontSize: "0.75rem",
                          letterSpacing: 0.6,
                          textTransform: "uppercase",
                        }}
                      >
                        {region.label}
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {`${formatMillion(region.value, region.value >= 100 ? 0 : 1)} €M`}
                      </Typography>
                      <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.8rem" }}>
                        {formatShare(region.share)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : wideMetric === "productMix" && wideProductMixSnapshot ? (
              <Box sx={{ mt: { xs: 1.5, md: 2 } }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: { xs: 1, md: 1.5 },
                  }}
                >
                  <Box
                    sx={{
                      background: "rgba(56,189,248,0.12)",
                      borderRadius: "14px",
                      border: "1px solid rgba(56,189,248,0.25)",
                      p: 1.6,
                    }}
                  >
                    <Typography
                      sx={{
                        color: "rgba(226,232,240,0.7)",
                        fontSize: "0.75rem",
                        letterSpacing: 0.6,
                        textTransform: "uppercase",
                      }}
                    >
                      {translate("Live Casino", "Live Casino")}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {`${formatMillion(wideProductMixSnapshot.live, wideProductMixSnapshot.live >= 100 ? 0 : 1)} €M`}
                    </Typography>
                    <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.8rem" }}>
                      {formatShare(wideProductMixSnapshot.liveShare)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      background: "rgba(248,113,113,0.12)",
                      borderRadius: "14px",
                      border: "1px solid rgba(248,113,113,0.25)",
                      p: 1.6,
                    }}
                  >
                    <Typography
                      sx={{
                        color: "rgba(226,232,240,0.7)",
                        fontSize: "0.75rem",
                        letterSpacing: 0.6,
                        textTransform: "uppercase",
                      }}
                    >
                      {translate("RNG", "RNG")}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {`${formatMillion(wideProductMixSnapshot.rng, wideProductMixSnapshot.rng >= 100 ? 0 : 1)} €M`}
                    </Typography>
                    <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.8rem" }}>
                      {formatShare(wideProductMixSnapshot.rngShare)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ) : isWideStandardMetric ? (
              <Box sx={{ mt: { xs: 1.5, md: 2 } }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(4, minmax(0, 1fr))" },
                    gap: { xs: 1, md: 1.5 },
                  }}
                >
                  <Box
                    sx={{
                      background: "rgba(59,130,246,0.1)",
                      borderRadius: "14px",
                      border: "1px solid rgba(96,165,250,0.25)",
                      p: 1.6,
                    }}
                  >
                    <Typography sx={{ color: "rgba(226,232,240,0.7)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.6 }}>
                      {translate("Senaste", "Latest")}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {wideSummary.latest != null
                        ? formatMetricValue(metricConfigs, wideMetric, wideSummary.latest)
                        : "—"}
                    </Typography>
                    {wideSummary.latestLabel && (
                      <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.8rem" }}>
                        QoQ • {translate("Senast", "Latest")}: {wideSummary.latestLabel}
                      </Typography>
                    )}
                  </Box>
                  <Box
                    sx={{
                      background: "rgba(16,185,129,0.1)",
                      borderRadius: "14px",
                      border: "1px solid rgba(16,185,129,0.25)",
                      p: 1.6,
                    }}
                  >
                    <Typography sx={{ color: "rgba(226,232,240,0.7)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.6 }}>
                      QoQ
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 700, color: formatChangeColor(wideSummary.qoq) }}
                    >
                      {wideSummary.qoq != null
                        ? formatChangeValue(metricConfigs, wideMetric, wideSummary.qoq, "", translate).replace(/\s$/, "")
                        : "—"}
                    </Typography>
                    {wideSummary.latestLabel && (
                      <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.8rem" }}>
                        {translate("Senast", "Latest")}: {wideSummary.latestLabel}
                      </Typography>
                    )}
                  </Box>
                  <Box
                    sx={{
                      background: "rgba(244,63,94,0.1)",
                      borderRadius: "14px",
                      border: "1px solid rgba(244,63,94,0.25)",
                      p: 1.6,
                    }}
                  >
                    <Typography sx={{ color: "rgba(226,232,240,0.7)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.6 }}>
                      YoY
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 700, color: formatChangeColor(wideSummary.yoy) }}
                    >
                      {wideSummary.yoy != null
                        ? formatChangeValue(metricConfigs, wideMetric, wideSummary.yoy, "", translate).replace(/\s$/, "")
                        : "—"}
                    </Typography>
                    {wideSummary.yoyLabel && (
                      <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.8rem" }}>
                        YoY • {translate("Jämfört", "Compared")}: {wideSummary.yoyLabel}
                      </Typography>
                    )}
                  </Box>
                  <Box
                    sx={{
                      background: "rgba(59,130,246,0.08)",
                      borderRadius: "14px",
                      border: "1px solid rgba(96,165,250,0.25)",
                      p: 1.6,
                    }}
                  >
                    <Typography sx={{ color: "rgba(226,232,240,0.7)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.6 }}>
                      {translate("Spann", "Range")}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {wideRangeValue?.firstValue != null && wideRangeValue?.lastValue != null
                        ? `${formatMetricValue(metricConfigs, wideMetric, wideRangeValue.firstValue)} → ${formatMetricValue(
                            metricConfigs,
                            wideMetric,
                            wideRangeValue.lastValue
                          )}`
                        : "—"}
                    </Typography>
                    <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.8rem" }}>
                      {wideRangeValue?.firstLabel && wideRangeValue?.lastLabel
                        ? `${wideRangeValue.firstLabel} • ${wideRangeValue.lastLabel}`
                        : translate("Första → senaste", "First → latest")}
                    </Typography>
                  </Box>
                </Box>
                <Typography sx={{ color: "rgba(226,232,240,0.75)", fontSize: "0.9rem", mt: { xs: 1, md: 1.5 } }}>
                  {wideTrendText}
                </Typography>
              </Box>
            ) : null}
          </Box>

          <FinancialOverviewCardWideSummaryColumn
            translate={translate}
            wideMetric={wideMetric}
            wideSummaryCards={wideSummaryCards}
          />
        </Box>
      </Stack>
    </Box>
  );
}
