'use client';
import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  Tabs,
  Tab,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import useClientMediaQuery from "../app/hooks/useClientMediaQuery";
import { useTheme } from '@mui/material/styles';

// Dividenddata
const dividendData = [
  { date: "2020", dividend: 4.42 },
  { date: "2021", dividend: 6.87 },
  { date: "2022", dividend: 14.60 },
  { date: "2023", dividend: 22.63 },
  { date: "2024", dividend: 31.01 },
  { date: "2025", dividend: 32.07 },
];

const graphOptions = [
  { label: "Omsättning", key: "revenue" },
  { label: "Marginal", key: "margin" },
  { label: "Utdelning", key: "dividend" },
  { label: "Tillväxt", key: "growth" },
];

const GraphBox = ({ revenueData, marginData, annualRevenueData, annualMarginData }) => {
  const [activeTab, setActiveTab] = useState("revenue");
  const [viewMode, setViewMode] = useState("quarter");
  const theme = useTheme();
  const isMobile = useClientMediaQuery(theme.breakpoints.down('sm'));

  const handleTabChange = (event, newValue) => setActiveTab(newValue);
  const handleViewModeChange = (event, newView) => newView && setViewMode(newView);

  const calculateDividendGrowth = (data) => {
    return data.slice(1).map((d, i) => {
      const prev = data[i].dividend;
      const growth = ((d.dividend - prev) / prev) * 100;
      return { date: d.date, growth };
    });
  };

  const dividendGrowthData = calculateDividendGrowth(dividendData);

  // Format för att visa rätt text i Tooltip
  const formatTooltipValue = (value, type) => {
    if (type === "revenue") {
      return [`Omsättning: ${new Intl.NumberFormat("sv-SE", {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)} M EUR`];
    } else if (type === "margin") {
      return [`Marginal: ${value.toFixed(2)}%`];
    } else if (type === "dividend") {
      return [`Utdelning: ${value} SEK`];
    }
    return [value];
  };

  const filteredRevenueData = viewMode === "year" ? annualRevenueData : revenueData;
  const filteredMarginData = viewMode === "year" ? annualMarginData : marginData;
  const currentBarSize = isMobile ? 20 : 40;

  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "20px",
        padding: "25px",
        margin: "20px auto",
        // Responsiv bredd
        width: {
          xs: "90%",  // För mobil: 90% av skärmens bredd
          sm: "80%",  // För tablet: 80% av skärmens bredd
          md: "90%",  // För desktop: 70% av skärmens bredd
        },
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
      }}
    >
      <Typography
        variant="h5"
        sx={{
          fontWeight: "bold",
          color: "#00e676",
          marginBottom: "10px",
          textAlign: "center",
        }}
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

      {activeTab !== "dividend" && activeTab !== "growth" && (
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

      {/* Main chart area */}
      <Box sx={{ height: activeTab === "growth" ? "auto" : 400 }}>
        {activeTab === "growth" ? (
          <Box sx={{ textAlign: "center", padding: isMobile ? "10px" : "20px" }}>
            <Typography
              variant={isMobile ? "h6" : "h5"}
              sx={{ color: "#00e676", marginBottom: "10px" }}
            >
              Utdelningstillväxt per år:
            </Typography>
            {dividendGrowthData.map((item, index) => (
              <Typography
                key={index}
                variant={isMobile ? "h6" : "h4"}
                sx={{
                  color: item.growth < 0 ? "#f44336" : "#4caf50",
                  fontWeight: "bold",
                  marginBottom: "5px",
                }}
              >
                {item.date}: {item.growth.toFixed(2)}%
              </Typography>
            ))}
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {activeTab === "revenue" && (
              <BarChart data={filteredRevenueData}>
                <XAxis dataKey="date" stroke="#ccc" />
                <YAxis stroke="#ccc" />
                <Tooltip formatter={(value) => formatTooltipValue(value, "revenue")} />
                <Bar dataKey="value" fill="#00e676" barSize={currentBarSize} />
              </BarChart>
            )}
            {activeTab === "margin" && (
              <BarChart data={filteredMarginData}>
                <XAxis dataKey="date" stroke="#ccc" />
                <YAxis stroke="#ccc" />
                <Tooltip formatter={(value) => formatTooltipValue(value, "margin")} />
                <Bar dataKey="value" fill="#00e676" barSize={currentBarSize} />
              </BarChart>
            )}
            {activeTab === "dividend" && (
              <BarChart data={dividendData}>
                <XAxis dataKey="date" stroke="#ccc" />
                <YAxis stroke="#ccc" />
                <Tooltip formatter={(value) => formatTooltipValue(value, "dividend")} />
                <Bar dataKey="dividend" fill="#00e676" barSize={currentBarSize} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </Box>
    </Card>
  );
};

export default GraphBox;