"use client";

// Presents the premium hourly lobby baseline as a dedicated dashboard view.

import React from "react";
import { Box, Button, Chip, CircularProgress, Collapse, Grid, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import WorkspacePremiumRounded from "@mui/icons-material/WorkspacePremiumRounded";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import useMediaQuery from "@/lib/useMuiMediaQuery";

function deltaPresentation(delta, percentFormatter) {
  if (!Number.isFinite(delta)) {
    return { text: "—", color: "rgba(226,232,240,0.8)" };
  }
  return {
    text: `${delta > 0 ? "+" : ""}${percentFormatter.format(delta)}%`,
    color: delta > 0 ? "#86efac" : delta < 0 ? "#fca5a5" : "rgba(226,232,240,0.8)",
  };
}

function HourlyBaselineTooltip({ active, payload, numberFormatter, percentFormatter, translate }) {
  const row = active && Array.isArray(payload) ? payload[0]?.payload : null;
  if (!row) return null;
  const delta = deltaPresentation(row.delta, percentFormatter);

  return (
    <Box
      sx={{
        width: { xs: 168, sm: "auto" },
        maxWidth: 220,
        borderRadius: "10px",
        border: "1px solid rgba(96,165,250,0.3)",
        background: "rgba(15,23,42,0.96)",
        boxShadow: "0 10px 30px rgba(2,6,23,0.35)",
        px: 1.4,
        py: 1.1,
      }}
    >
      <Typography variant="caption" sx={{ color: "#bae6fd", fontWeight: 800 }}>
        {row.hour}:00
      </Typography>
      <Typography variant="body2" sx={{ color: "#f8fafc" }}>
        {translate("Historiskt snitt", "Historical average")}: {numberFormatter.format(row.baseline)}
      </Typography>
      {row.isCurrentHour && row.currentTotal != null ? (
        <>
          <Typography variant="body2" sx={{ color: "#fde68a", fontWeight: 700 }}>
            {translate("Live nu", "Live now")}: {numberFormatter.format(row.currentTotal)}
          </Typography>
          <Typography variant="body2" sx={{ color: delta.color, fontWeight: 700 }}>
            {translate("Mot timsnitt", "Vs hourly average")}: {delta.text}
          </Typography>
        </>
      ) : null}
      <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.8)", display: "block", mt: 0.35 }}>
        {translate("Dagar", "Days")}: {numberFormatter.format(row.distinctDays)} · {translate("Mätpunkter", "Samples")}: {numberFormatter.format(row.samples)}
      </Typography>
    </Box>
  );
}

export default function LivePlayersControlPanelHourlyBaselineSection({
  rows,
  coverage,
  updatedLabel,
  loading,
  error,
  numberFormatter,
  percentFormatter,
  translate,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [showCollectionDetails, setShowCollectionDetails] = React.useState(false);
  const [showHourlyDetails, setShowHourlyDetails] = React.useState(false);
  const hasHistoryCoverage = Number.isFinite(coverage?.distinctDays) && Number.isFinite(coverage?.requestedDays);
  const historyCoverageText = hasHistoryCoverage
    ? translate(
        `Historik: ${coverage.distinctDays} av ${coverage.requestedDays} dagar · ${coverage.samples ?? 0} mätpunkter`,
        `History: ${coverage.distinctDays} of ${coverage.requestedDays} days · ${coverage.samples ?? 0} samples`
      )
    : translate("Historisk datatäckning beräknas", "Historical coverage is being calculated");
  const gameCoverageText = coverage?.comparableGames != null && coverage?.healthyGames != null
    ? translate(
        `Jämförbara live-spel: ${coverage.comparableGames} av ${coverage.healthyGames}`,
        `Comparable live games: ${coverage.comparableGames} of ${coverage.healthyGames}`
      )
    : null;
  const showIncompleteWarning = coverage?.isComplete === false;
  const daysRemaining = coverage?.remainingDays;
  const collecting = !rows.length && !loading && !error;
  const liveUniverseMismatch = Boolean(rows.length && coverage?.universeMatches === false);
  const currentHourRow = rows.find((row) => row.isCurrentHour) ?? null;
  const currentDelta = deltaPresentation(currentHourRow?.delta, percentFormatter);
  const chartRows = React.useMemo(() => {
    const rowsByHour = new Map(rows.map((row) => [row.hour, row]));
    return Array.from({ length: 24 }, (_, index) => {
      const hour = String(index).padStart(2, "0");
      return rowsByHour.get(hour) ?? { hour, baseline: null };
    });
  }, [rows]);
  const xAxisTicks = React.useMemo(() => {
    if (!chartRows.length) return undefined;
    const maxTicks = isMobile ? 5 : 9;
    if (chartRows.length <= maxTicks) return chartRows.map((row) => row.hour);
    const step = Math.ceil((chartRows.length - 1) / (maxTicks - 1));
    const ticks = chartRows.filter((_, index) => index % step === 0).map((row) => row.hour);
    const lastHour = chartRows[chartRows.length - 1]?.hour;
    if (lastHour && ticks[ticks.length - 1] !== lastHour) ticks.push(lastHour);
    return ticks;
  }, [chartRows, isMobile]);
  const formatPlayersAxis = React.useCallback(
    (value) => {
      if (!Number.isFinite(value)) return "";
      if (isMobile && Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}k`;
      return numberFormatter.format(value);
    },
    [isMobile, numberFormatter]
  );

  return (
    <Box
      sx={{
        width: "100%",
        background: "rgba(15,23,42,0.45)",
        borderRadius: "16px",
        border: "1px solid transparent",
        boxShadow: "inset 0 0 0 1px rgba(56,189,248,0.44)",
        boxSizing: "border-box",
        p: { xs: 1.5, sm: 2, md: 2.5 },
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 1.75,
      }}
    >
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} justifyContent="space-between">
        <Stack spacing={0.4}>
          <Stack direction="row" spacing={0.9} alignItems="center" sx={{ flexWrap: "wrap" }}>
            <Typography variant="overline" sx={{ color: "#7dd3fc", letterSpacing: 1.2, fontWeight: 700 }}>
              {translate("Timsnitt vs live nu", "Hourly baseline vs live now")}
            </Typography>
            <Chip
              icon={<WorkspacePremiumRounded sx={{ "&.MuiChip-icon": { color: "#fde68a" } }} />}
              label={translate("Founder / Premium", "Founder / Premium")}
              size="small"
              sx={{
                color: "#fde68a",
                backgroundColor: "rgba(245,158,11,0.12)",
                border: "1px solid rgba(245,158,11,0.28)",
                fontWeight: 700,
              }}
            />
          </Stack>
          <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.72)" }}>
            {translate(
              "Visar dygnets historiska timsnitt och jämför live-totalen endast med aktuellt klockslag.",
              "Shows the historical hourly pattern and compares the live total only with the current hour."
            )}
          </Typography>
        </Stack>
        <Stack spacing={0.3} sx={{ textAlign: { xs: "left", md: "right" } }}>
          <Typography variant="caption" sx={{ color: "rgba(191,219,254,0.82)" }}>
            {historyCoverageText}
          </Typography>
          {gameCoverageText ? (
            <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.62)" }}>
              {gameCoverageText}
            </Typography>
          ) : null}
          {updatedLabel ? (
            <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.62)" }}>
              {translate(`Live uppdaterad ${updatedLabel}`, `Live updated ${updatedLabel}`)}
            </Typography>
          ) : null}
        </Stack>
      </Stack>

      {showIncompleteWarning && !collecting ? (
        <Box
          role="status"
          sx={{
            borderRadius: "10px",
            border: "1px solid rgba(245,158,11,0.38)",
            backgroundColor: "rgba(245,158,11,0.09)",
            px: 1.5,
            py: 1.15,
          }}
        >
          <Typography variant="body2" sx={{ color: "#fde68a", fontWeight: 700 }}>
            {translate(
              `Timhistoriken byggs med samma spelunderlag${daysRemaining ? `. Cirka ${daysRemaining} dagar återstår till 60 dagars historik` : ""}. Snitten baseras tills dess på färre dagar.`,
              `Hourly history is built from the same game universe${daysRemaining ? `. Approximately ${daysRemaining} days remain until 60 days of history` : ""}. Until then, averages use fewer days.`
            )}
          </Typography>
        </Box>
      ) : null}

      {loading && !rows.length ? (
        <Box sx={{ minHeight: 260, display: "flex", alignItems: "center", justifyContent: "center", gap: 1.2 }}>
          <CircularProgress size={20} sx={{ color: "#38bdf8" }} />
          <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.78)" }}>
            {translate("Laddar timjämförelsen…", "Loading hourly comparison…")}
          </Typography>
        </Box>
      ) : error && !rows.length ? (
        <Box sx={{ minHeight: 220, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: "#fca5a5" }}>
            {translate("Timjämförelsen kunde inte laddas just nu.", "The hourly comparison could not be loaded right now.")}
          </Typography>
        </Box>
      ) : rows.length ? (
        <>
          {liveUniverseMismatch ? (
            <Box
              role="status"
              sx={{
                borderRadius: "10px",
                border: "1px solid rgba(245,158,11,0.38)",
                backgroundColor: "rgba(245,158,11,0.09)",
                px: 1.5,
                py: 1.15,
                mb: 1.2,
              }}
            >
              <Typography variant="body2" sx={{ color: "#fde68a", fontWeight: 700 }}>
                {translate(
                  "Live-underlaget är tillfälligt ofullständigt. Historiska snitt visas, men livevärde och differens döljs tills samma spel ingår igen.",
                  "The live game universe is temporarily incomplete. Historical averages remain visible, but live values and deltas are hidden until the same games are included again."
                )}
              </Typography>
            </Box>
          ) : null}
          <Box
            sx={{
              borderRadius: "14px",
              border: "1px solid rgba(148,163,184,0.2)",
              background: "rgba(2,6,23,0.3)",
              px: { xs: 1, md: 1.5 },
              pt: 1.4,
              pb: 0.7,
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              sx={{ px: 0.5, mb: 0.5 }}
            >
              <Stack spacing={0.15}>
                <Typography variant="subtitle2" sx={{ color: "#e2e8f0", fontWeight: 800 }}>
                  {translate("Historiskt dygnsmönster", "Historical daily pattern")}
                </Typography>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: "wrap", rowGap: 0.4 }}>
                  <Stack direction="row" spacing={0.6} alignItems="center">
                    <Box sx={{ width: 18, height: 2, borderRadius: 1, backgroundColor: "#38bdf8" }} />
                    <Typography variant="caption" sx={{ color: "rgba(191,219,254,0.82)" }}>
                      {translate("Timsnitt", "Hourly average")}
                    </Typography>
                  </Stack>
                  {currentHourRow?.currentTotal != null ? (
                    <Stack direction="row" spacing={0.6} alignItems="center">
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#fde68a" }} />
                      <Typography variant="caption" sx={{ color: "rgba(253,230,138,0.88)" }}>
                        {translate("Live nu", "Live now")}
                      </Typography>
                    </Stack>
                  ) : null}
                </Stack>
              </Stack>
              {currentHourRow?.currentTotal != null ? (
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={{ xs: 0.25, sm: 1.6 }}
                  alignItems={{ xs: "flex-start", sm: "baseline" }}
                >
                  <Typography variant="body2" sx={{ color: "#fde68a", fontWeight: 800 }}>
                    {translate("Live nu", "Live now")}: {numberFormatter.format(currentHourRow.currentTotal)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: currentDelta.color, fontWeight: 800 }}>
                    {currentDelta.text} {translate("mot timsnitt", "vs hourly average")}
                  </Typography>
                </Stack>
              ) : null}
            </Stack>

            <Box
              role="img"
              aria-label={translate(
                "Linjegraf över historiskt spelarsnitt per timme. Livevärdet markeras endast vid aktuell timme.",
                "Line chart of historical average players by hour. The live value is marked only at the current hour."
              )}
              sx={{ height: { xs: 230, sm: 270, md: 320 }, mx: { xs: -0.5, md: 0 }, minWidth: 0 }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartRows}
                  margin={isMobile ? { top: 16, right: 10, left: -18, bottom: 0 } : { top: 18, right: 20, left: -6, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="hourlyBaselineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.48} />
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(148,163,184,0.14)" strokeDasharray="4 4" vertical={false} />
                  <XAxis
                    dataKey="hour"
                    ticks={xAxisTicks}
                    interval={0}
                    tickFormatter={(hour) => isMobile ? hour : `${hour}:00`}
                    tickMargin={8}
                    tick={{ fontSize: isMobile ? 10 : 11, fill: "rgba(148,163,184,0.78)" }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                  />
                  <YAxis
                    tick={{ fontSize: isMobile ? 10 : 11, fill: "rgba(148,163,184,0.78)" }}
                    tickLine={false}
                    axisLine={false}
                    width={isMobile ? 42 : 64}
                    tickFormatter={formatPlayersAxis}
                  />
                  <RechartsTooltip
                    cursor={{ stroke: "rgba(125,211,252,0.28)", strokeDasharray: "4 4" }}
                    content={(
                      <HourlyBaselineTooltip
                        numberFormatter={numberFormatter}
                        percentFormatter={percentFormatter}
                        translate={translate}
                      />
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="baseline"
                    stroke="#38bdf8"
                    strokeWidth={isMobile ? 2.2 : 2.6}
                    fill="url(#hourlyBaselineGradient)"
                    fillOpacity={1}
                    connectNulls={false}
                    dot={false}
                    activeDot={{ r: 4, fill: "#7dd3fc", stroke: "#0f172a", strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                  {currentHourRow?.currentTotal != null ? (
                    <ReferenceDot
                      x={currentHourRow.hour}
                      y={currentHourRow.currentTotal}
                      r={6}
                      fill="#fde68a"
                      stroke="#0f172a"
                      strokeWidth={3}
                      ifOverflow="extendDomain"
                      isFront
                    />
                  ) : null}
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Box>

          <Box>
            <Button
              type="button"
              size="small"
              onClick={() => setShowHourlyDetails((previous) => !previous)}
              aria-expanded={showHourlyDetails}
              aria-controls="hourly-detail-grid"
              sx={{
                color: "rgba(191,219,254,0.88)",
                px: 0.75,
                minHeight: 44,
                textTransform: "none",
                fontWeight: 700,
              }}
            >
              {translate(
                showHourlyDetails ? "Dölj timdetaljer" : "Visa timdetaljer",
                showHourlyDetails ? "Hide hourly details" : "Show hourly details"
              )}
            </Button>
            <Collapse in={showHourlyDetails}>
              <Grid id="hourly-detail-grid" container spacing={1.2} sx={{ pt: 0.5 }}>
                {rows.map((row) => {
                  const delta = deltaPresentation(row.delta, percentFormatter);
                  const coverageLabel = row.coverageStage === "complete"
                    ? translate("Full täckning", "Full coverage")
                    : row.coverageStage === "building"
                      ? translate("Bygger historik", "Building history")
                      : translate("Preliminärt", "Preliminary");
                  const coverageColor = row.coverageStage === "complete"
                    ? "#86efac"
                    : row.coverageStage === "building"
                      ? "#7dd3fc"
                      : "#fde68a";

                  return (
                    <Grid key={`hourly-${row.hour}`} item xs={12} sm={6} md={4} lg={3}>
                      <Box
                        sx={{
                          height: "100%",
                          borderRadius: "12px",
                          border: row.isCurrentHour
                            ? "1px solid rgba(56,189,248,0.62)"
                            : "1px solid rgba(148,163,184,0.25)",
                          background: row.isCurrentHour ? "rgba(56,189,248,0.1)" : "rgba(2,6,23,0.34)",
                          boxShadow: row.isCurrentHour ? "0 0 0 1px rgba(56,189,248,0.08)" : "none",
                          p: 1.25,
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.45,
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Typography variant="caption" sx={{ color: "rgba(191,219,254,0.95)", fontWeight: 800 }}>
                            {row.hour}:00
                          </Typography>
                          <Stack spacing={0.05} alignItems="flex-end">
                            {row.isCurrentHour ? (
                              <Typography variant="caption" sx={{ color: "#38bdf8", fontWeight: 800 }}>
                                {translate("NU", "NOW")}
                              </Typography>
                            ) : null}
                            <Typography variant="caption" sx={{ color: coverageColor, fontWeight: 700 }}>
                              {coverageLabel}
                            </Typography>
                          </Stack>
                        </Stack>
                        <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.82)" }}>
                          {translate("Snitt", "Avg")}: {numberFormatter.format(row.baseline)}
                        </Typography>
                        {row.isCurrentHour ? (
                          <>
                            <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.82)" }}>
                              {translate("Live", "Live")}: {row.currentTotal != null ? numberFormatter.format(row.currentTotal) : "—"}
                            </Typography>
                            <Typography variant="body2" sx={{ color: delta.color, fontWeight: 700 }}>
                              {translate("Diff", "Delta")}: {delta.text}
                            </Typography>
                          </>
                        ) : null}
                        <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.72)" }}>
                          {translate("Spel", "Games")}: {numberFormatter.format(row.comparableGames)} ·{" "}
                          {translate("Dagar", "Days")}: {numberFormatter.format(row.distinctDays)} ·{" "}
                          {translate("Mätpunkter", "Samples")}: {numberFormatter.format(row.samples)}
                        </Typography>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Collapse>
          </Box>
        </>
      ) : (
        <Box sx={{ minHeight: 220, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <Stack spacing={0.65} alignItems="center" sx={{ maxWidth: 620 }}>
            <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.88)", fontWeight: 700 }}>
              {translate("Tillförlitlig timhistorik samlas in", "Reliable hourly history is being collected")}
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.78)" }}>
              {translate(
                `${coverage?.samples ?? 0} mätpunkter är sparade. Ett klockslag visas först när samma spelunderlag finns under minst ${coverage?.minimumDistinctDays ?? 3} olika dagar.`,
                `${coverage?.samples ?? 0} samples are stored. An hour appears only after the same game universe has been observed on at least ${coverage?.minimumDistinctDays ?? 3} separate days.`
              )}
            </Typography>
          </Stack>
        </Box>
      )}

      <Box sx={{ borderTop: "1px solid rgba(148,163,184,0.16)", pt: 0.35 }}>
        <Button
          type="button"
          size="small"
          onClick={() => setShowCollectionDetails((previous) => !previous)}
          aria-expanded={showCollectionDetails}
          aria-controls="hourly-collection-details"
          sx={{
            color: "rgba(191,219,254,0.88)",
            px: 0.75,
            minHeight: 44,
            textTransform: "none",
            fontWeight: 700,
          }}
        >
          {translate(
            showCollectionDetails ? "Dölj hur data samlas in" : "Visa hur data samlas in",
            showCollectionDetails ? "Hide how data is collected" : "Show how data is collected"
          )}
        </Button>
        <Collapse in={showCollectionDetails}>
          <Box id="hourly-collection-details" sx={{ px: 0.6, pt: 0.45, pb: 0.2 }}>
            <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.82)", lineHeight: 1.6 }}>
              {translate(
                "Vi sparar den friska lobbyn var tionde minut tillsammans med en signatur för exakt vilka spel som ingår. Först räknas ett snitt per dag och klockslag, sedan väger varje dag lika i timsnittet. Historik och live jämförs bara när spelunderlaget är identiskt.",
                "Every ten minutes, we save the healthy lobby together with a signature of the exact games included. We first calculate one average per day and hour, then give each day equal weight in the hourly baseline. Historical and live totals are compared only when their game universes match."
              )}
            </Typography>
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
}
