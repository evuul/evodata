'use client';
import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Card,
  Tabs,
  Tab,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Label,
} from "recharts";
import useClientMediaQuery from "../app/hooks/useClientMediaQuery";
import { useTheme } from '@mui/material/styles';

const graphOptions = [
  { label: "Omsättning", key: "revenue", color: "#2196f3" },
  { label: "Marginal", key: "margin", color: "#ff9800" },
  { label: "Utdelning", key: "dividend", color: "#00e676" },
  { label: "AVG Spelare", key: "players", color: "#9c27b0" },
];

// Färger för olika typer av utdelningar
const COLORS = {
  line: "#00e676", // Stark grön för hela linjen
  historical: "#00e676", // Stark grön för historiska utdelningar
  planned: "#66BB6A",    // Mjukare grön för planerade utdelningar (används för punkten)
  upcoming: "#FFD700",   // Guld för den kommande utdelningen
};

const GraphBox = ({ revenueData, marginData, annualRevenueData, annualMarginData, playersData, dividendData }) => {
  const [activeTab, setActiveTab] = useState("revenue");
  const [viewMode, setViewMode] = useState("quarter");
  const theme = useTheme();
  const isMobile = useClientMediaQuery(theme.breakpoints.down('sm'));

  const handleTabChange = (event, newValue) => setActiveTab(newValue);
  const handleViewModeChange = (event, newView) => newView && setViewMode(newView);

  // Beräkna genomsnittligt antal spelare för de senaste X dagarna
  const calculateAveragePlayers = (data, days) => {
    if (!data || !Array.isArray(data) || data.length === 0) return { average: 0, daysCount: 0 };

    const today = new Date();
    const cutoffDate = new Date(today);
    cutoffDate.setDate(today.getDate() - days);

    const recentData = data.filter(item => {
      const itemDate = new Date(item.Datum);
      return itemDate >= cutoffDate && itemDate <= today && !isNaN(itemDate);
    });

    const totalPlayers = recentData.reduce((sum, item) => sum + (Number(item.Players) || 0), 0);
    const average = recentData.length > 0 ? totalPlayers / recentData.length : 0;

    return {
      average: Math.round(average),
      daysCount: recentData.length,
    };
  };

  // Hämta sista mätpunkten för varje graf
  const getLastDataPoint = (data, key) => {
    if (!data || !Array.isArray(data) || data.length === 0) return 0;
    const lastItem = data[data.length - 1];
    return Number(lastItem[key] || lastItem.value || lastItem.dividendPerShare || lastItem.Players || 0);
  };

  // Kombinera historiska och planerade utdelningar för grafen
  const combinedDividendData = useMemo(() => {
    if (!dividendData) {
      console.warn("dividendData är undefined i GraphBox");
      return [];
    }

    const today = new Date();

    const historical = (dividendData.historicalDividends || []).map(item => ({
      date: item.date,
      dividendPerShare: item.dividendPerShare,
      type: "historical",
      dividendYield: (item.dividendPerShare / item.sharePriceAtDividend) * 100,
      isFuture: new Date(item.date) > today,
    }));

    const planned = (dividendData.plannedDividends || []).map((item, index) => ({
      date: item.paymentDate,
      dividendPerShare: item.dividendPerShare,
      type: "planned",
      dividendYield: dividendData.currentSharePrice
        ? (item.dividendPerShare / dividendData.currentSharePrice) * 100
        : 0,
      isFuture: new Date(item.paymentDate) > today,
      exDate: item.exDate,
      isUpcoming: index === 0, // Markera den första planerade utdelningen som "kommande"
    }));

    return [...historical, ...planned].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [dividendData]);

  // Beräkna genomsnittet för "AVG Spelare" och sista värden för alla grafer
  const { average: avgPlayers, daysCount } = useMemo(() => calculateAveragePlayers(playersData, 30), [playersData]);
  const lastRevenue = useMemo(() => getLastDataPoint(viewMode === "year" ? annualRevenueData : revenueData, "value"), [revenueData, annualRevenueData, viewMode]);
  const lastMargin = useMemo(() => getLastDataPoint(viewMode === "year" ? annualMarginData : marginData, "value"), [marginData, annualMarginData, viewMode]);
  const lastDividend = useMemo(() => getLastDataPoint(dividendData?.historicalDividends || [], "dividendPerShare"), [dividendData]);
  const lastPlayers = useMemo(() => getLastDataPoint(playersData || [], "Players"), [playersData]);

  // Beräkna direktavkastning för den senaste historiska utdelningen
  const lastDividendEntry = dividendData?.historicalDividends?.[dividendData.historicalDividends.length - 1];
  const dividendYield = lastDividendEntry
    ? (lastDividendEntry.dividendPerShare / lastDividendEntry.sharePriceAtDividend) * 100
    : 0;

  const formatTooltipValue = (value, type) => {
    if (type === "revenue") return [`Omsättning: ${value.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M EUR`];
    if (type === "margin") return [`Marginal: ${value.toFixed(2)}%`];
    if (type === "dividend") return [`Utdelning: ${value} SEK`];
    if (type === "players") return [`Spelare: ${value.toLocaleString("sv-SE")}`];
    return [value];
  };

  const formatYAxisTick = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toLocaleString("sv-SE");
  };

  const getYDomain = (data, key, tab, viewMode) => {
    if (!data || !Array.isArray(data) || data.length === 0) return [0, 1];

    const values = data.map(item => {
      const val = item[key] || item.value || item.dividendPerShare || item.Players;
      return isNaN(val) ? 0 : Number(val);
    }).filter(val => !isNaN(val));

    if (values.length === 0) return [0, 1];

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    if (tab === "players") {
      const lowerBound = Math.floor(minValue / 2000) * 2000;
      const upperBound = Math.ceil(maxValue / 2000) * 2000;
      return [lowerBound, upperBound];
    } else if (tab === "revenue") {
      const interval = viewMode === "year" ? 300 : 100;
      const lowerBound = 0;
      const upperBound = Math.ceil(maxValue / interval) * interval;
      return [lowerBound, upperBound];
    } else if (tab === "margin") {
      const interval = 5;
      const lowerBound = Math.floor(minValue / interval) * interval;
      const upperBound = Math.ceil(maxValue / interval) * interval;
      return [lowerBound, upperBound];
    } else if (tab === "dividend") {
      const interval = 6; // Fast intervall på 6 SEK
      const lowerBound = 0;
      const upperBound = Math.ceil(maxValue / interval) * interval;
      return [lowerBound, upperBound];
    }

    return [0, maxValue * 1.1];
  };

  const filteredRevenueData = viewMode === "year" ? annualRevenueData : revenueData;
  const filteredMarginData = viewMode === "year" ? annualMarginData : marginData;

  const graphConfig = {
    revenue: { data: filteredRevenueData || [], key: "value", labelX: "Datum", labelY: "Omsättning (M EUR)" },
    margin: { data: filteredMarginData || [], key: "value", labelX: "Datum", labelY: "Marginal (%)" },
    dividend: { data: combinedDividendData || [], key: "dividendPerShare", labelX: "År", labelY: "Utdelning (SEK)" },
    players: { data: playersData || [], key: "Players", labelX: "Datum", labelY: "Antal spelare" },
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const type = data.type;
      const typeLabel = type === "historical" ? "Historisk" : "Planerad";
      return (
        <Box sx={{ background: "#333", padding: "10px", borderRadius: "5px", color: "#fff" }}>
          <Typography>{`Datum: ${label}`}</Typography>
          <Typography>{payload[0].value ? formatTooltipValue(payload[0].value, activeTab)[0] : ""}</Typography>
          {activeTab === "dividend" && (
            <Typography>{`Direktavkastning: ${data.dividendYield.toFixed(2)}%`}</Typography>
          )}
          {activeTab === "dividend" && type === "planned" && (
            <Typography>{`Kommande på ${data.exDate}`}</Typography>
          )}
          {activeTab === "dividend" && <Typography>{`Typ: ${typeLabel}`}</Typography>}
        </Box>
      );
    }
    return null;
  };

  const renderChart = () => {
    const { data, key, labelX, labelY } = graphConfig[activeTab];
    const color = graphOptions.find(opt => opt.key === activeTab)?.color || "#fff";

    // Om datan är tom, visa ett meddelande
    if (!data || data.length === 0) {
      return (
        <Box sx={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography variant="body1" sx={{ color: "#ccc" }}>
            Ingen data tillgänglig för {graphOptions.find(opt => opt.key === activeTab)?.label || "denna graf"}.
          </Typography>
        </Box>
      );
    }

    if (activeTab === "dividend") {
      return (
        <>
          {/* Legend för utdelningsgrafen */}
          <Box sx={{ display: "flex", justifyContent: "center", marginBottom: "10px" }}>
            <Box sx={{ display: "flex", alignItems: "center", marginRight: "20px" }}>
              <Box sx={{ width: "20px", height: "2px", backgroundColor: COLORS.historical, marginRight: "5px" }} />
              <Typography variant="body2" sx={{ color: "#ccc" }}>Historiska</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", marginRight: "20px" }}>
              <Box sx={{ width: "20px", height: "2px", backgroundColor: COLORS.planned, marginRight: "5px" }} />
              <Typography variant="body2" sx={{ color: "#ccc" }}>Planerade</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Box sx={{ width: "20px", height: "2px", backgroundColor: COLORS.upcoming, marginRight: "5px" }} />
              <Typography variant="body2" sx={{ color: "#ccc" }}>Kommande</Typography>
            </Box>
          </Box>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="date" stroke="#ccc">
                <Label value={labelX} offset={-10} position="insideBottom" fill="#ccc" />
              </XAxis>
              <YAxis
                stroke="#ccc"
                domain={getYDomain(data, key, activeTab, viewMode)}
                tickFormatter={formatYAxisTick}
                width={60}
                tickCount={7}
                interval={0}
              >
                <Label
                  value={labelY}
                  angle={-90}
                  offset={-30}
                  position="insideLeft"
                  fill="#ccc"
                />
              </YAxis>
              <Tooltip content={<CustomTooltip />} />
              {/* En sammanhängande linje för alla utdelningar */}
              <Line
                type="monotone"
                dataKey="dividendPerShare"
                stroke={COLORS.line} // Samma gröna färg för hela linjen
                strokeWidth={2}
                dot={(props) => {
                  const { payload } = props;
                  return (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={payload.isUpcoming ? 6 : 4} // Större cirkel för den kommande
                      fill={
                        payload.isUpcoming
                          ? COLORS.upcoming
                          : payload.type === "historical"
                          ? COLORS.historical
                          : COLORS.planned
                      }
                      stroke={payload.isUpcoming ? "#fff" : "none"} // Vit kant runt den kommande
                      strokeWidth={payload.isUpcoming ? 2 : 0}
                    />
                  );
                }}
                activeDot={{ r: 6 }}
                isAnimationActive={true}
                name="Utdelningar"
                connectNulls={true}
                strokeDasharray={(props) => {
                  const { payload } = props;
                  return payload.isFuture ? "5 5" : undefined; // Streckad linje för framtida utdelningar
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </>
      );
    }

    // För andra grafer (revenue, margin, players)
    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey={activeTab === "players" ? "Datum" : "date"} stroke="#ccc">
            <Label value={labelX} offset={-10} position="insideBottom" fill="#ccc" />
          </XAxis>
          <YAxis
            stroke="#ccc"
            domain={getYDomain(data, key, activeTab, viewMode)}
            tickFormatter={formatYAxisTick}
            width={60}
            tickCount={
              activeTab === "revenue" ? (viewMode === "year" ? 8 : 6) :
              activeTab === "margin" ? 6 :
              activeTab === "dividend" ? 7 :
              9
            }
            interval={0}
          >
            <Label
              value={labelY}
              angle={-90}
              offset={-30}
              position="insideLeft"
              fill="#ccc"
            />
          </YAxis>
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey={key}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 4, fill: color }}
            activeDot={{ r: 6 }}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "20px",
        padding: "25px",
        margin: "20px auto",
        width: { xs: "90%", sm: "80%", md: "70%" },
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
      }}
    >
      <Typography
        variant="h5"
        sx={{ fontWeight: "bold", color: "#00e676", marginBottom: "10px", textAlign: "center" }}
      >
        Finansiell översikt
      </Typography>

      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        centered
        textColor="inherit"
        TabIndicatorProps={{ style: { backgroundColor: "#00e676" } }}
        sx={{ color: "#ccc", marginBottom: "20px" }}
      >
        {graphOptions.map((tab) => (
          <Tab key={tab.key} label={tab.label} value={tab.key} />
        ))}
      </Tabs>

      {activeTab !== "dividend" && activeTab !== "players" && (
        <Tabs
          value={viewMode}
          onChange={handleViewModeChange}
          centered
          textColor="inherit"
          TabIndicatorProps={{ style: { backgroundColor: "#ff5722" } }}
          sx={{ color: "#ccc", marginBottom: "20px" }}
        >
          <Tab label="Kvartal" value="quarter" />
          <Tab label="Helår" value="year" />
        </Tabs>
      )}

      {activeTab === "revenue" && (
        <Typography
          variant="body1"
          sx={{
            color: "#ccc",
            textAlign: "center",
            marginBottom: "20px",
            fontSize: "1rem",
          }}
        >
          Senaste omsättning: {lastRevenue.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M EUR
        </Typography>
      )}
      {activeTab === "margin" && (
        <Typography
          variant="body1"
          sx={{
            color: "#ccc",
            textAlign: "center",
            marginBottom: "20px",
            fontSize: "1rem",
          }}
        >
          Senaste marginal: {lastMargin.toFixed(2)}%
        </Typography>
      )}
      {activeTab === "dividend" && (
        <Box sx={{ textAlign: "center", marginBottom: "20px" }}>
          <Typography
            variant="body1"
            sx={{
              color: "#ccc",
              textAlign: "center",
              fontSize: "1rem",
            }}
          >
            Senaste utdelning: {lastDividend.toLocaleString("sv-SE")} SEK
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: "#ccc",
              textAlign: "center",
              fontSize: "1rem",
            }}
          >
            Direktavkastning: {dividendYield.toFixed(2)}% (baserat på aktiekurs {lastDividendEntry?.sharePriceAtDividend?.toLocaleString("sv-SE") || "N/A"} SEK)
          </Typography>
          {(dividendData?.plannedDividends?.length > 0) && (
            <>
              <Typography
                variant="body1"
                sx={{
                  color: COLORS.planned,
                  textAlign: "center",
                  fontSize: "1rem",
                  marginTop: "10px",
                }}
              >
                Kommande utdelning:
              </Typography>
              {dividendData.plannedDividends.map((planned, index) => {
                const plannedYield = dividendData.currentSharePrice
                  ? (planned.dividendPerShare / dividendData.currentSharePrice) * 100
                  : 0;
                return (
                  <Typography
                    key={index}
                    variant="body1"
                    sx={{
                      color: "#ccc",
                      textAlign: "center",
                      fontSize: "1rem",
                    }}
                  >
                    X-dag: {planned.exDate} | Utdelningsdag: {planned.paymentDate}
                    {planned.dividendPerShare && ` | Planerad utdelning: ${planned.dividendPerShare.toLocaleString("sv-SE")} SEK`}
                    {dividendData.currentSharePrice && ` | Direktavkastning: ${plannedYield.toFixed(2)}% (baserat på nuvarande kurs ${dividendData.currentSharePrice} SEK)`}
                  </Typography>
                );
              })}
            </>
          )}
        </Box>
      )}
      {activeTab === "players" && (
        <Typography
          variant="body1"
          sx={{
            color: "#ccc",
            textAlign: "center",
            marginBottom: "20px",
            fontSize: "1rem",
          }}
        >
          Genomsnitt antal: {avgPlayers.toLocaleString("sv-SE")} <br />
          Senaste {daysCount} dagar
        </Typography>
      )}

      <Box sx={{ height: 400 }}>
        {renderChart()}
      </Box>
    </Card>
  );
};

export default GraphBox;