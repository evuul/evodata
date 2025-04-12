'use client';
import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Label,
  Legend,
} from "recharts";

const CashFlowBox = ({ financialReports, oldBuyBackData, dividendData }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [exchangeRate, setExchangeRate] = useState(null);

  // Hämta växelkurs för att omvandla utdelningar från SEK till EUR
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const response = await fetch('https://api.exchangeratesapi.io/v1/latest?access_key=YOUR_API_KEY&symbols=SEK');
        const data = await response.json();
        const rate = data.rates.SEK;
        setExchangeRate(rate);
      } catch (error) {
        console.error("Kunde inte hämta växelkurs:", error);
        setExchangeRate(11.20); // Fallback-värde
      }
    };

    fetchExchangeRate();
  }, []);

  // Antal aktier (antagande, uppdatera med korrekt värde om tillgängligt)
  const NUMBER_OF_SHARES = 213000000; // Antagande: 213 miljoner aktier (typiskt för Evolution Gaming)

  // Bearbeta aktieåterköp från oldBuyBackData
  const shareRepurchasingPerQuarter = useMemo(() => {
    if (!oldBuyBackData) return {};

    const repurchasingByQuarter = {};
    oldBuyBackData.forEach(item => {
      const date = new Date(item.date);
      const year = date.getFullYear();
      const quarter = `Q${Math.ceil((date.getMonth() + 1) / 3)}`;
      const key = `${year} ${quarter}`;
      if (!repurchasingByQuarter[key]) {
        repurchasingByQuarter[key] = 0;
      }
      repurchasingByQuarter[key] += item.amount; // Antas vara i MEUR
    });

    return repurchasingByQuarter;
  }, [oldBuyBackData]);

  // Bearbeta utdelningar från dividendData
  const dividendsPerQuarter = useMemo(() => {
    if (!dividendData?.historicalDividends || !exchangeRate) return {};

    const dividendsByQuarter = {};
    dividendData.historicalDividends.forEach(item => {
      const date = new Date(item.date);
      const year = date.getFullYear();
      const quarter = `Q${Math.ceil((date.getMonth() + 1) / 3)}`;
      const key = `${year} ${quarter}`;
      if (!dividendsByQuarter[key]) {
        dividendsByQuarter[key] = 0;
      }
      // Beräkna total utdelning i SEK och omvandla till MEUR
      const totalDividendSEK = item.dividendPerShare * NUMBER_OF_SHARES;
      const totalDividendEUR = totalDividendSEK / exchangeRate;
      dividendsByQuarter[key] += totalDividendEUR;
    });

    return dividendsByQuarter;
  }, [dividendData, exchangeRate]);

  // Bearbeta data från financialReports och filtrera bort kvartal utan giltig data
  const processedCashData = useMemo(() => {
    if (!financialReports?.financialReports || financialReports.financialReports.length === 0) return [];

    return financialReports.financialReports
      .filter(item => {
        // Filtrera från 2015 och framåt
        if (item.year < 2015) return false;
        // Filtrera bort kvartal där cashStart eller cashEnd saknar giltigt värde
        return (
          item.cashStart !== undefined &&
          item.cashStart !== null &&
          item.cashStart > 0 &&
          item.cashEnd !== undefined &&
          item.cashEnd !== null &&
          item.cashEnd > 0
        );
      })
      .map(item => {
        const key = `${item.year} ${item.quarter}`;
        const netChange = item.cashEnd - item.cashStart;
        const percentageChange = item.cashStart !== 0
          ? (netChange / item.cashStart) * 100
          : 0;
        const shareRepurchasing = shareRepurchasingPerQuarter[key] || 0;
        const dividends = dividendsPerQuarter[key] || 0;
        return {
          date: key,
          cashStart: item.cashStart,
          cashEnd: item.cashEnd,
          netChange,
          percentageChange: percentageChange.toFixed(2),
          shareRepurchasing,
          dividends,
        };
      });
  }, [financialReports, shareRepurchasingPerQuarter, dividendsPerQuarter]);

  // Beräkna total förändring över hela perioden
  const totalChange = useMemo(() => {
    if (processedCashData.length < 2) return null;
    const firstCash = processedCashData[0].cashStart;
    const lastCash = processedCashData[processedCashData.length - 1].cashEnd;
    const change = lastCash - firstCash;
    const percentage = firstCash !== 0 ? (change / firstCash) * 100 : 0;
    return {
      change: change.toFixed(2),
      percentage: percentage.toFixed(2),
    };
  }, [processedCashData]);

  // Beräkna Y-axelns domän och tick-intervall för kassan
  const getYDomainAndTicks = (data, key1, key2) => {
    if (!data || data.length === 0) return { domain: [0, 1], ticks: [0, 1] };
    const values1 = data.map(item => item[key1]).filter(val => val !== null && !isNaN(val));
    const values2 = data.map(item => item[key2]).filter(val => val !== null && !isNaN(val));
    const allValues = [...values1, ...values2];
    if (allValues.length === 0) return { domain: [0, 1], ticks: [0, 1] };
    const minVal = Math.min(...allValues, 0);
    const maxVal = Math.max(...allValues);
    const range = maxVal - minVal;
    const tickInterval = range > 0 ? Math.ceil(range / 5) : 1;
    const ticks = [];
    for (let i = Math.floor(minVal); i <= Math.ceil(maxVal); i += tickInterval) {
      ticks.push(i);
    }
    return { domain: [minVal, maxVal * 1.1], ticks };
  };

  // Beräkna Y-axelns domän och tick-intervall för nettoförändring, aktieåterköp och utdelningar
  const getSecondaryYDomainAndTicks = (data) => {
    if (!data || data.length === 0) return { domain: [0, 1], ticks: [0, 1] };
    const netChanges = data.map(item => item.netChange).filter(val => val !== null && !isNaN(val));
    const repurchasing = data.map(item => item.shareRepurchasing).filter(val => val !== null && !isNaN(val));
    const dividends = data.map(item => item.dividends).filter(val => val !== null && !isNaN(val));
    const allValues = [...netChanges, ...repurchasing, ...dividends];
    if (allValues.length === 0) return { domain: [0, 1], ticks: [0, 1] };
    const minVal = Math.min(...allValues, 0);
    const maxVal = Math.max(...allValues, 0);
    const range = Math.max(Math.abs(minVal), Math.abs(maxVal));
    const tickInterval = range > 0 ? Math.ceil(range / 5) : 1;
    const ticks = [];
    for (let i = Math.floor(minVal); i <= Math.ceil(maxVal); i += tickInterval) {
      ticks.push(i);
    }
    return { domain: [minVal * 1.1, maxVal * 1.1], ticks };
  };

  const cashYConfig = getYDomainAndTicks(processedCashData, 'cashStart', 'cashEnd');
  const secondaryYConfig = getSecondaryYDomainAndTicks(processedCashData);

  const formatCashTick = (value) => {
    return `${value} MEUR`;
  };

  // Filtrera X-axeln för att visa var fjärde kvartal (för läsbarhet)
  const quarterlyTicks = processedCashData
    .filter((_, index) => index % 4 === 0)
    .map(item => item.date);

  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "20px",
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
        padding: { xs: "15px", sm: "25px" },
        margin: "20px auto",
        width: { xs: "95%", sm: "80%", md: "70%" },
      }}
    >
      <Typography
        variant="h4"
        sx={{
          fontWeight: "bold",
          color: "#00e676",
          marginBottom: "20px",
          textAlign: "center",
          fontSize: { xs: "1.5rem", sm: "2rem" },
        }}
      >
        Bolagets kassa över tid
      </Typography>

      {exchangeRate && processedCashData.length > 0 ? (
        <Box display="flex" flexDirection="column" alignItems="center">
          {/* Visa total förändring */}
          {totalChange && (
            <Typography
              variant="body1"
              color={totalChange.change >= 0 ? "#00e676" : "#ff1744"}
              sx={{
                marginBottom: "10px",
                textAlign: "center",
                fontSize: { xs: "0.9rem", sm: "1rem" },
              }}
            >
              Total förändring: {totalChange.change >= 0 ? "+" : ""}{totalChange.change} MEUR ({totalChange.percentage >= 0 ? "+" : ""}{totalChange.percentage}%)
            </Typography>
          )}

          <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
            <ComposedChart
              data={processedCashData}
              margin={{ top: 20, right: 20, bottom: 20, left: isMobile ? 20 : 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis
                dataKey="date"
                stroke="#ccc"
                ticks={quarterlyTicks}
                interval={0}
              >
                {!isMobile && (
                  <Label value="Kvartal" offset={-10} position="insideBottom" fill="#ccc" />
                )}
              </XAxis>
              <YAxis
                yAxisId="left"
                stroke="#ccc"
                tickFormatter={formatCashTick}
                width={isMobile ? 40 : 60}
                domain={cashYConfig.domain}
                ticks={cashYConfig.ticks}
              >
                {!isMobile && (
                  <Label
                    value="Kassa (MEUR)"
                    angle={-90}
                    offset={-10}
                    position="insideLeft"
                    fill="#ccc"
                    style={{ fontSize: isMobile ? "12px" : "14px" }}
                  />
                )}
              </YAxis>
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#ccc"
                tickFormatter={formatCashTick}
                width={isMobile ? 40 : 60}
                domain={secondaryYConfig.domain}
                ticks={secondaryYConfig.ticks}
              >
                {!isMobile && (
                  <Label
                    value="Belopp (MEUR)"
                    angle={90}
                    offset={-10}
                    position="insideRight"
                    fill="#ccc"
                    style={{ fontSize: isMobile ? "12px" : "14px" }}
                  />
                )}
              </YAxis>
              <Tooltip
                formatter={(value, name) => [
                  `${value.toLocaleString("sv-SE")} MEUR`,
                  name === "Nettoförändring" ? `Procentuell förändring: ${processedCashData.find(item => item.netChange === value)?.percentageChange}%` : "",
                ]}
                contentStyle={{ backgroundColor: "#2e2e2e", color: "#fff", border: "none", borderRadius: "5px" }}
              />
              <Legend verticalAlign="top" height={36} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="cashStart"
                stroke="#00e676"
                strokeWidth={2}
                dot={{ r: 4, fill: "#00e676" }}
                activeDot={{ r: 6 }}
                name="Kassa vid start"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="cashEnd"
                stroke="#FFCA28"
                strokeWidth={2}
                dot={{ r: 4, fill: "#FFCA28" }}
                activeDot={{ r: 6 }}
                name="Kassa vid slut"
              />
              <Bar
                yAxisId="right"
                dataKey="netChange"
                fill={(value) => (value.netChange >= 0 ? "#00e676" : "#ff1744")}
                name="Nettoförändring"
              />
              <Bar
                yAxisId="right"
                dataKey="shareRepurchasing"
                fill="#FF8042"
                name="Aktieåterköp"
              />
              <Bar
                yAxisId="right"
                dataKey="dividends"
                fill="#8884D8"
                name="Utdelningar"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      ) : (
        <Typography
          variant="body1"
          color="#ccc"
          sx={{ textAlign: "center", marginBottom: "20px", fontSize: { xs: "0.9rem", sm: "1rem" } }}
        >
          {exchangeRate ? "Ingen data tillgänglig för bolagets kassa." : "Laddar växelkurs..."}
        </Typography>
      )}
    </Card>
  );
};

export default CashFlowBox;