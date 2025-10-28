"use client";
import React, { useId } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
} from "@mui/material";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Label,
  ComposedChart,
  Area,
  Line,
  BarChart,
  Bar,
} from "recharts";

const COLORS = {
  surface: "rgba(15,23,42,0.62)",
  border: "rgba(148,163,184,0.18)",
  textPrimary: "#f8fafc",
  textSecondary: "rgba(203,213,225,0.78)",
  accent: "#38bdf8",
  grid: "rgba(148,163,184,0.14)",
  tooltipBg: "rgba(15,23,42,0.92)",
};

const TotalSharesView = ({
  isMobile,
  totalSharesData,
  latestTotalShares,
  chartTypeTotalShares,
  onChangeChartTypeTotalShares,
  yDomain,
  yTicks,
  formatYAxisTick,
}) => {
  const areaFillId = `totalSharesArea-${useId()}`;
  const data = totalSharesData || [];
  const tickFontSize = isMobile ? 12 : 14;
  const yTickWidth = isMobile ? 40 : 60;
  const xHeight = isMobile ? 30 : 40;

  return (
    <Box
      sx={{
        width: "100%",
        background: COLORS.surface,
        borderRadius: "20px",
        border: `1px solid ${COLORS.border}`,
        boxShadow: "0 18px 40px rgba(8,15,40,0.46)",
        px: { xs: 2.2, md: 3 },
        py: { xs: 2.4, md: 3.2 },
        display: "flex",
        flexDirection: "column",
        gap: 2.4,
      }}
    >
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          color: COLORS.textPrimary,
          fontSize: { xs: "1.05rem", sm: "1.35rem", md: "1.5rem" },
        }}
      >
        Totala aktier
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(15,118,110,0.2))",
          borderRadius: "16px",
          border: `1px solid rgba(56,189,248,0.35)`,
          px: 2.2,
          py: 1.8,
          mb: 1,
          width: { xs: "100%", sm: "fit-content" },
          alignSelf: { xs: "stretch", sm: "flex-start" },
          maxWidth: { sm: 320 },
        }}
      >
        <Typography variant="subtitle2" sx={{ color: COLORS.textSecondary }}>
          Totalt antal aktier
        </Typography>
        <Typography variant="h5" sx={{ color: COLORS.textPrimary, fontWeight: 700 }}>
          {latestTotalShares.toLocaleString("sv-SE")}
        </Typography>
      </Box>

      <Typography variant="h6" sx={{ color: COLORS.accent, fontWeight: 600 }}>
        Totala aktier över tid
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "center", width: "100%", mb: 2 }}>
        <Tabs
          value={chartTypeTotalShares}
          onChange={onChangeChartTypeTotalShares}
          textColor="inherit"
          TabIndicatorProps={{ style: { display: "none" } }}
          sx={{
            backgroundColor: "rgba(15,23,42,0.45)",
            borderRadius: "999px",
            p: 0.5,
            minHeight: "unset",
            "& .MuiTabs-flexContainer": {
              gap: 0.8,
            },
            "& .MuiTab-root": {
              fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
              padding: { xs: "6px 12px", sm: "8px 18px" },
              color: "rgba(203,213,225,0.75)",
              textTransform: "none",
              borderRadius: "999px",
              minHeight: 36,
              fontWeight: 600,
            },
            "& .Mui-selected": {
              color: COLORS.textPrimary,
              backgroundColor: "rgba(56,189,248,0.25)",
            },
          }}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab label="Linje" value="line" />
          <Tab label="Stapel" value="bar" />
        </Tabs>
      </Box>

      <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
        {chartTypeTotalShares === "line" ? (
          <ComposedChart
            data={data}
            margin={{
              top: 20,
              right: isMobile ? 10 : 20,
              bottom: isMobile ? 10 : 20,
              left: isMobile ? -10 : 0,
            }}
          >
            {/* Transparent accent gradient under linjen */}
            <defs>
              <linearGradient id={areaFillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.22} />
                <stop offset="100%" stopColor={COLORS.accent} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
            <XAxis
              dataKey="date"
              stroke={COLORS.textSecondary}
              tick={{ fontSize: tickFontSize, fill: COLORS.textSecondary }}
              height={xHeight}
            >
              {!isMobile && (
                <Label
                  value="År"
                  offset={-10}
                  position="insideBottom"
                  fill={COLORS.textSecondary}
                  style={{ fontSize: isMobile ? "12px" : "14px" }}
                />
              )}
            </XAxis>
            <YAxis
              stroke={COLORS.textSecondary}
              tick={{ fontSize: tickFontSize, fill: COLORS.textSecondary }}
              domain={yDomain}
              tickFormatter={formatYAxisTick}
              width={yTickWidth}
              ticks={yTicks}
            >
              {!isMobile && (
                <Label
                  value="Antal aktier"
                  angle={-90}
                  offset={-10}
                  position="insideLeft"
                  fill={COLORS.textSecondary}
                  style={{ fontSize: isMobile ? "12px" : "14px" }}
                />
              )}
            </YAxis>
            <Tooltip
              formatter={(value) => value.toLocaleString("sv-SE")}
              contentStyle={{
                backgroundColor: COLORS.tooltipBg,
                color: COLORS.textPrimary,
                border: "none",
                borderRadius: "10px",
                boxShadow: "0 12px 30px rgba(8,15,40,0.38)",
              }}
            />
            <Area
              type="monotone"
              dataKey="totalShares"
              fill={`url(#${areaFillId})`}
              stroke="none"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="totalShares"
              stroke={COLORS.accent}
              strokeWidth={2.4}
              dot={{ r: 3.6, fill: COLORS.accent }}
              activeDot={{ r: 6, stroke: COLORS.surface, strokeWidth: 2 }}
            />
          </ComposedChart>
        ) : (
          <BarChart
            data={data}
            margin={{
              top: 20,
              right: isMobile ? 10 : 20,
              bottom: isMobile ? 10 : 20,
              left: isMobile ? -10 : 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
            <XAxis
              dataKey="date"
              stroke={COLORS.textSecondary}
              tick={{ fontSize: tickFontSize, fill: COLORS.textSecondary }}
              height={xHeight}
            >
              {!isMobile && (
                <Label
                  value="År"
                  offset={-10}
                  position="insideBottom"
                  fill={COLORS.textSecondary}
                  style={{ fontSize: isMobile ? "12px" : "14px" }}
                />
              )}
            </XAxis>
            <YAxis
              stroke={COLORS.textSecondary}
              tick={{ fontSize: tickFontSize, fill: COLORS.textSecondary }}
              domain={yDomain}
              tickFormatter={formatYAxisTick}
              width={yTickWidth}
              ticks={yTicks}
            >
              {!isMobile && (
                <Label
                  value="Antal aktier"
                  angle={-90}
                  offset={-10}
                  position="insideLeft"
                  fill={COLORS.textSecondary}
                  style={{ fontSize: isMobile ? "12px" : "14px" }}
                />
              )}
            </YAxis>
            <Tooltip
              formatter={(value) => value.toLocaleString("sv-SE")}
              contentStyle={{
                backgroundColor: COLORS.tooltipBg,
                color: COLORS.textPrimary,
                border: "none",
                borderRadius: "10px",
                boxShadow: "0 12px 30px rgba(8,15,40,0.38)",
              }}
            />
            <Bar
              dataKey="totalShares"
              fill={COLORS.accent}
              name="Antal aktier"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        )}
      </ResponsiveContainer>

      <Typography variant="h6" sx={{ color: COLORS.accent, fontWeight: 600 }}>
        Historisk data
      </Typography>
      <TableContainer
        sx={{
          backgroundColor: "rgba(15,23,42,0.5)",
          borderRadius: "16px",
          border: `1px solid ${COLORS.border}`,
          backdropFilter: "blur(12px)",
          overflow: "hidden",
        }}
      >
        <Table size="small" sx={{ minWidth: isMobile ? 600 : "auto" }}>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  color: COLORS.textSecondary,
                  textAlign: "center",
                  fontWeight: 600,
                  borderBottom: `1px solid ${COLORS.border}`,
                }}
              >
                År
              </TableCell>
              <TableCell
                sx={{
                  color: COLORS.textSecondary,
                  textAlign: "center",
                  fontWeight: 600,
                  borderBottom: `1px solid ${COLORS.border}`,
                }}
              >
                Totala aktier
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((item) => (
              <TableRow
                key={item.date}
                sx={{
                  "&:nth-of-type(odd)": {
                    backgroundColor: "rgba(148,163,184,0.06)",
                  },
                }}
              >
                <TableCell sx={{ color: COLORS.textPrimary, textAlign: "center" }}>
                  {item.date}
                </TableCell>
                <TableCell sx={{ color: COLORS.textPrimary, textAlign: "center" }}>
                  {item.totalShares.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TotalSharesView;
