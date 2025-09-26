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
    <Box display="flex" flexDirection="column" alignItems="center">
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          color: "#fff",
          mb: 2,
          fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" },
        }}
      >
        Totala aktier
      </Typography>

      <Typography
        variant="body2"
        color="#fff"
        sx={{ mb: 2, fontSize: { xs: "0.85rem", sm: "0.95rem" } }}
      >
        Totalt antal aktier: {latestTotalShares.toLocaleString()}
      </Typography>

      <Typography
        variant="h6"
        color="#00e676"
        sx={{ mb: 1, fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" } }}
      >
        Totala aktier över tid
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "center", width: "100%", mb: 2 }}>
        <Tabs
          value={chartTypeTotalShares}
          onChange={onChangeChartTypeTotalShares}
          textColor="inherit"
          TabIndicatorProps={{ style: { backgroundColor: "#ff5722" } }}
          sx={{
            color: "#ccc",
            "& .MuiTab-root": {
              fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
              padding: { xs: "6px 8px", sm: "12px 16px" },
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
            {/* Transparent grön gradient under linjen */}
            <defs>
              <linearGradient id={areaFillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00e676" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#00e676" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="date" stroke="#ccc" tick={{ fontSize: tickFontSize }} height={xHeight}>
              {!isMobile && (
                <Label
                  value="År"
                  offset={-10}
                  position="insideBottom"
                  fill="#ccc"
                  style={{ fontSize: isMobile ? "12px" : "14px" }}
                />
              )}
            </XAxis>
            <YAxis
              stroke="#ccc"
              tick={{ fontSize: tickFontSize }}
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
                  fill="#ccc"
                  style={{ fontSize: isMobile ? "12px" : "14px" }}
                />
              )}
            </YAxis>
            <Tooltip
              formatter={(value) => value.toLocaleString("sv-SE")}
              contentStyle={{
                backgroundColor: "#2e2e2e",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
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
              stroke="#00e676"
              strokeWidth={2}
              dot={{ r: 4, fill: "#00e676" }}
              activeDot={{ r: 6 }}
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
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="date" stroke="#ccc" tick={{ fontSize: tickFontSize }} height={xHeight}>
              {!isMobile && (
                <Label
                  value="År"
                  offset={-10}
                  position="insideBottom"
                  fill="#ccc"
                  style={{ fontSize: isMobile ? "12px" : "14px" }}
                />
              )}
            </XAxis>
            <YAxis
              stroke="#ccc"
              tick={{ fontSize: tickFontSize }}
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
                  fill="#ccc"
                  style={{ fontSize: isMobile ? "12px" : "14px" }}
                />
              )}
            </YAxis>
            <Tooltip
              formatter={(value) => value.toLocaleString("sv-SE")}
              contentStyle={{
                backgroundColor: "#2e2e2e",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
              }}
            />
            <Bar dataKey="totalShares" fill="#00e676" name="Antal aktier" />
          </BarChart>
        )}
      </ResponsiveContainer>

      <Typography
        variant="h6"
        color="#00e676"
        sx={{ mt: 2, mb: 1, fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" } }}
      >
        Historisk data
      </Typography>
      <Box sx={{ overflowX: "auto", width: "100%" }}>
        <Table
          sx={{
            backgroundColor: "#2e2e2e",
            borderRadius: "10px",
            minWidth: isMobile ? "600px" : "auto",
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: "#fff", textAlign: "center" }}>År</TableCell>
              <TableCell sx={{ color: "#fff", textAlign: "center" }}>
                Totala aktier
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.date}>
                <TableCell sx={{ color: "#fff", textAlign: "center" }}>
                  {item.date}
                </TableCell>
                <TableCell sx={{ color: "#fff", textAlign: "center" }}>
                  {item.totalShares.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
};

export default TotalSharesView;