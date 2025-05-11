'use client';
import React, { useState, useMemo } from "react";
import { Box, Tabs, Tab, Typography, useMediaQuery, useTheme } from "@mui/material";
import { LineChart, BarChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label, LabelList } from "recharts";

// Komponent för att spåra genomsnittliga spelare dagligen, veckovis och månadsvis
const AveragePlayersTracker = ({ playersData }) => {
  const [viewMode, setViewMode] = useState("daily"); // Växla mellan daglig, veckovis och månadsvis

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Beräkna genomsnittliga spelare för all tillgänglig data
  const calculateAveragePlayers = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) return { average: 0, daysCount: 0 };

    const validData = data.filter(item => {
      const itemDate = new Date(item.Datum);
      return !isNaN(itemDate);
    });

    const totalPlayers = validData.reduce((sum, item) => sum + (Number(item.Players) || 0), 0);
    const average = validData.length > 0 ? totalPlayers / validData.length : 0;

    return {
      average: Math.round(average),
      daysCount: validData.length,
    };
  };

  // Beräkna veckovis genomsnittliga spelare
  const calculateWeeklyPlayers = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) return [];

    const weeklyData = {};
    data.forEach(item => {
      const date = new Date(item.Datum);
      if (isNaN(date)) return;

      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of the week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { players: [], date: weekKey };
      }
      weeklyData[weekKey].players.push(Number(item.Players) || 0);
    });

    return Object.keys(weeklyData)
      .sort()
      .map(weekKey => {
        const players = weeklyData[weekKey].players;
        const average = players.length > 0 ? players.reduce((sum, val) => sum + val, 0) / players.length : 0;
        return {
          date: weekKey,
          Players: Math.round(average),
        };
      });
  };

  // Beräkna månadsvis genomsnittliga spelare och procentuell utveckling
  const calculateMonthlyPlayers = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) return [];

    const monthlyData = {};
    data.forEach(item => {
      const date = new Date(item.Datum);
      if (isNaN(date)) return;

      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { players: [], date: monthKey };
      }
      monthlyData[monthKey].players.push(Number(item.Players) || 0);
    });

    return Object.keys(monthlyData)
      .sort()
      .map((monthKey, index, array) => {
        const players = monthlyData[monthKey].players;
        const average = players.length > 0 ? players.reduce((sum, val) => sum + val, 0) / players.length : 0;
        if (index === 0) {
          return { date: monthKey, Players: Math.round(average), change: null };
        }
        const prevMonth = array[index - 1];
        const prevValue = monthlyData[prevMonth].players.length > 0 ? monthlyData[prevMonth].players.reduce((sum, val) => sum + val, 0) / monthlyData[prevMonth].players.length : 0;
        const currentValue = average;
        const change = prevValue !== 0 ? ((currentValue - prevValue) / prevValue) * 100 : null;
        return {
          date: monthKey,
          Players: Math.round(average),
          change: change !== null ? Math.round(change * 10) / 10 : null,
        };
      });
  };

  // Formatering för Y-axelns tickar
  const formatPlayersTick = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toLocaleString("sv-SE");
  };

  // Beräkna genomsnitt och veckovis/månadsvis data
  const { average: avgPlayers, daysCount } = useMemo(() => calculateAveragePlayers(playersData), [playersData]);
  const weeklyPlayersData = useMemo(() => calculateWeeklyPlayers(playersData), [playersData]);
  const monthlyPlayersData = useMemo(() => calculateMonthlyPlayers(playersData), [playersData]);

  // Beräkna Y-axelns domän och ticks för varje vy
  const getYDomainAndTicks = (data, key) => {
    if (!data || data.length === 0) return { domain: [0, 1], ticks: [0, 1] };

    const values = data.map(item => Number(item[key]) || 0).filter(val => !isNaN(val));
    if (values.length === 0) return { domain: [0, 1], ticks: [0, 1] };

    const minValue = Math.min(...values, 0);
    const maxValue = Math.max(...values);
    const roundedMin = Math.floor(minValue / 2000) * 2000;
    const roundedMax = Math.ceil(maxValue / 2000) * 2000;

    const range = roundedMax - roundedMin;
    const tickInterval = range <= 10000 ? 2000 : range <= 20020 ? 4000 : 8000;
    const ticks = [];
    for (let i = roundedMin; i <= roundedMax; i += tickInterval) {
      ticks.push(i);
    }

    return {
      domain: [ticks[0], ticks[ticks.length - 1]],
      ticks,
    };
  };

  const dailyYConfig = getYDomainAndTicks(playersData, 'Players');
  const weeklyYConfig = getYDomainAndTicks(weeklyPlayersData, 'Players');
  const monthlyYConfig = getYDomainAndTicks(monthlyPlayersData, 'Players');

  // Beräkna ticks för X-axeln
  const dailyXTicks = useMemo(() => {
    if (playersData.length <= 10) return playersData.map(item => item.Datum);
    const step = Math.floor(playersData.length / 8);
    return playersData
      .filter((_, index) => index % step === 0)
      .map(item => item.Datum);
  }, [playersData]);

  const weeklyXTicks = useMemo(() => {
    if (weeklyPlayersData.length <= 10) return weeklyPlayersData.map(item => item.date);
    const step = Math.floor(weeklyPlayersData.length / 8);
    return weeklyPlayersData
      .filter((_, index) => index % step === 0)
      .map(item => item.date);
  }, [weeklyPlayersData]);

  const monthlyXTicks = useMemo(() => {
    if (monthlyPlayersData.length <= 12) return monthlyPlayersData.map(item => item.date);
    const step = Math.floor(monthlyPlayersData.length / 8);
    return monthlyPlayersData
      .filter((_, index) => index % step === 0)
      .map(item => item.date);
  }, [monthlyPlayersData]);

  // Hantera tab-växling
  const handleViewModeChange = (event, newValue) => {
    setViewMode(newValue);
  };

  // Formatera etikett för procentförändring
  const formatChangeLabel = (value) => {
    if (value === null) return "Ingen data";
    return `${value > 0 ? "+" : ""}${value}%`;
  };

  // Anpassad etikettkomponent för att styra färg och rendering
  const CustomLabel = (props) => {
    const { x, y, width, value } = props;
    const fillColor = value === null ? "#ccc" : value > 0 ? "#00e676" : "#ff1744";
    const labelText = formatChangeLabel(value);

    return (
      <text
        x={x + width / 2}
        y={y - 7}
        fill={fillColor}
        textAnchor="middle"
        fontSize={isMobile ? 12 : 14}
      >
        {labelText}
      </text>
    );
  };

  return (
    <Box display="flex" flexDirection="column" alignItems="center">
      {/* Grå box som omsluter både genomsnitt och grafen */}
      <Box
        sx={{
          backgroundColor: "#252525",
          borderRadius: "12px",
          padding: { xs: "16px", sm: "24px" },
          marginBottom: "24px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
          border: "1px solid #444",
          width: { xs: "95%", sm: "80%", md: "70%" },
          textAlign: "center",
        }}
      >
        <Typography
          variant="h5"
          sx={{
            color: "#ffffff",
            textAlign: "center",
            fontWeight: 700,
            fontSize: { xs: "1.2rem", sm: "1.5rem", md: "1.8rem" },
            marginBottom: "12px",
            letterSpacing: "0.5px",
          }}
        >
          Genomsnittligt antal spelare
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "#fff",
            textAlign: "center",
            fontSize: { xs: "0.85rem", sm: "0.95rem" },
            lineHeight: 1.5,
            marginBottom: "24px",
          }}
        >
          {avgPlayers.toLocaleString("sv-SE")} spelare <br />
          (baserat på {daysCount} dagar)
        </Typography>

        {/* Tabs för att växla mellan daglig, veckovis och månadsvis */}
        <Tabs
          value={viewMode}
          onChange={handleViewModeChange}
          textColor="inherit"
          TabIndicatorProps={{ style: { backgroundColor: "#ff5722" } }}
          sx={{
            marginBottom: "12px",
            "& .MuiTabs-flexContainer": {
              justifyContent: "center",
            },
            "& .MuiTab-root": {
              color: "#b0b0b0",
              fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
              padding: { xs: "8px 16px", sm: "10px 20px" },
              borderRadius: "8px",
              transition: "all 0.3s ease",
              textAlign: "center",
              "&:hover": {
                backgroundColor: "rgba(255, 87, 34, 0.1)",
                color: "#fff",
              },
              "&.Mui-selected": {
                backgroundColor: "rgba(255, 87, 34, 0.2)",
                color: "#ff5722",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
              },
            },
          }}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab label="Daglig" value="daily" />
          <Tab label="Veckovis" value="weekly" />
          <Tab label="Månadsvis" value="monthly" />
        </Tabs>

        {/* Daglig graf */}
        {viewMode === "daily" && (
          <>
            <Typography
              variant="h6"
              sx={{
                color: "#ffffff",
                textAlign: "center",
                marginBottom: "10px",
                fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" },
              }}
            >
              Dagliga spelare
            </Typography>
            <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
              <LineChart
                data={playersData}
                margin={{ top: 20, right: isMobile ? 10 : 40, bottom: isMobile ? 40 : 20, left: isMobile ? 10 : 40 }}
              >
                <CartesianGrid strokeDasharray="5 5" stroke="#444" opacity={0.5} />
                <XAxis
                  dataKey="Datum"
                  stroke="#ccc"
                  angle={isMobile ? -45 : 0}
                  textAnchor={isMobile ? "end" : "middle"}
                  height={isMobile ? 60 : 40}
                  ticks={dailyXTicks}
                  interval={0}
                  tick={{ fontSize: isMobile ? 12 : 14 }}
                >
                  {!isMobile && (
                    <Label value="Datum" offset={-10} position="insideBottom" fill="#ccc" style={{ fontSize: isMobile ? "12px" : "14px" }} />
                  )}
                </XAxis>
                <YAxis
                  stroke="#ccc"
                  domain={dailyYConfig.domain}
                  ticks={dailyYConfig.ticks}
                  tickFormatter={formatPlayersTick}
                  width={isMobile ? 40 : 60}
                  interval={0}
                  tick={{ fontSize: isMobile ? 12 : 14 }}
                >
                  {!isMobile && (
                    <Label
                      value="Antal spelare"
                      angle={-90}
                      offset={-10}
                      position="insideLeft"
                      fill="#ccc"
                      style={{ fontSize: isMobile ? "12px" : "14px" }}
                    />
                  )}
                </YAxis>
                <Tooltip
                  formatter={(value) => `Spelare: ${value.toLocaleString("sv-SE")}`}
                  contentStyle={{
                    backgroundColor: "#2e2e2e",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                    padding: "8px 12px",
                  }}
                  labelStyle={{ color: "#42a5f5" }}
                />
                <Legend verticalAlign="top" height={30} />
                <Line
                  type="monotone"
                  dataKey="Players"
                  stroke="#1976d2"
                  strokeWidth={3}
                  dot={{ r: 2, fill: "#87CEEB", stroke: "#87CEEB", strokeWidth: 1 }}
                  activeDot={{ r: 4, fill: "#87CEEB", stroke: "#87CEEB", strokeWidth: 1 }}
                  isAnimationActive={true}
                  name="Antal spelare"
                  filter="drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.3))"
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}

        {/* Veckovis graf */}
        {viewMode === "weekly" && (
          <>
            <Typography
              variant="h6"
              sx={{
                color: "#ffffff",
                textAlign: "center",
                marginBottom: "10px",
                fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" },
              }}
            >
              Veckovisa genomsnittliga spelare
            </Typography>
            <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
              <BarChart
                data={weeklyPlayersData}
                margin={{ top: 40, right: isMobile ? 10 : 40, bottom: isMobile ? 40 : 20, left: isMobile ? 10 : 40 }}
              >
                <CartesianGrid strokeDasharray="5 5" stroke="#444" opacity={0.5} />
                <XAxis
                  dataKey="date"
                  stroke="#ccc"
                  angle={isMobile ? -45 : 0}
                  textAnchor={isMobile ? "end" : "middle"}
                  height={isMobile ? 60 : 40}
                  ticks={weeklyXTicks}
                  interval={0}
                  tick={{ fontSize: isMobile ? 12 : 14 }}
                >
                  {!isMobile && (
                    <Label value="Datum" offset={-10} position="insideBottom" fill="#ccc" style={{ fontSize: isMobile ? "12px" : "14px" }} />
                  )}
                </XAxis>
                <YAxis
                  stroke="#ccc"
                  domain={weeklyYConfig.domain}
                  ticks={weeklyYConfig.ticks}
                  tickFormatter={formatPlayersTick}
                  width={isMobile ? 40 : 60}
                  interval={0}
                  tick={{ fontSize: isMobile ? 12 : 14 }}
                >
                  {!isMobile && (
                    <Label
                      value="Antal spelare"
                      angle={-90}
                      offset={-10}
                      position="insideLeft"
                      fill="#ccc"
                      style={{ fontSize: isMobile ? "12px" : "14px" }}
                    />
                  )}
                </YAxis>
                <Tooltip
                  formatter={(value) => `Spelare: ${value.toLocaleString("sv-SE")}`}
                  contentStyle={{
                    backgroundColor: "#2e2e2e",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                    padding: "8px 12px",
                  }}
                  labelStyle={{ color: "#42a5f5" }}
                  isAnimationActive={false}
                />
                <Legend verticalAlign="top" height={40} />
                <Bar
                  dataKey="Players"
                  fill="#1976d2"
                  name="Genomsnittliga spelare"
                  barSize={isMobile ? 20 : 30}
                  filter="drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.3))"
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}

        {/* Månadsvis graf */}
        {viewMode === "monthly" && (
          <>
            <Typography
              variant="h6"
              sx={{
                color: "#ffffff",
                textAlign: "center",
                marginBottom: "10px",
                fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" },
              }}
            >
              Månadsvisa genomsnittliga spelare
            </Typography>
            <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
              <BarChart
                data={monthlyPlayersData}
                margin={{ top: 40, right: isMobile ? 10 : 40, bottom: isMobile ? 40 : 20, left: isMobile ? 10 : 40 }}
              >
                <CartesianGrid strokeDasharray="5 5" stroke="#444" opacity={0.5} />
                <XAxis
                  dataKey="date"
                  stroke="#ccc"
                  angle={isMobile ? -45 : 0}
                  textAnchor={isMobile ? "end" : "middle"}
                  height={isMobile ? 60 : 40}
                  ticks={monthlyXTicks}
                  interval={0}
                  tick={{ fontSize: isMobile ? 12 : 14 }}
                >
                  {!isMobile && (
                    <Label value="Datum" offset={-10} position="insideBottom" fill="#ccc" style={{ fontSize: isMobile ? "12px" : "14px" }} />
                  )}
                </XAxis>
                <YAxis
                  stroke="#ccc"
                  domain={monthlyYConfig.domain}
                  ticks={monthlyYConfig.ticks}
                  tickFormatter={formatPlayersTick}
                  width={isMobile ? 40 : 60}
                  interval={0}
                  tick={{ fontSize: isMobile ? 12 : 14 }}
                >
                  {!isMobile && (
                    <Label
                      value="Antal spelare"
                      angle={-90}
                      offset={-10}
                      position="insideLeft"
                      fill="#ccc"
                      style={{ fontSize: isMobile ? "12px" : "14px" }}
                    />
                  )}
                </YAxis>
                <Tooltip
                  formatter={(value) => `Spelare: ${value.toLocaleString("sv-SE")}`}
                  contentStyle={{
                    backgroundColor: "#2e2e2e",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                    padding: "8px 12px",
                  }}
                  labelStyle={{ color: "#42a5f5" }}
                  isAnimationActive={false}
                />
                <Legend verticalAlign="top" height={40} />
                <Bar
                  dataKey="Players"
                  fill="#1976d2"
                  name="Genomsnittliga spelare"
                  barSize={isMobile ? 20 : 30}
                  filter="drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.3))"
                  isAnimationActive={false}
                  onMouseEnter={(data, index, event) => {
                    event.target.style.fill = "#42a5f5";
                  }}
                  onMouseLeave={(data, index, event) => {
                    event.target.style.fill = "#1976d2";
                  }}
                >
                  <LabelList
                    dataKey="change"
                    position="top"
                    content={<CustomLabel />}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </Box>
    </Box>
  );
};

export default AveragePlayersTracker;