'use client';
import React, { useState } from "react";
import { Box, Card, TextField, Typography, Button, Table, TableBody, TableCell, TableHead, TableRow, Fade, FormGroup, FormControlLabel, Switch } from "@mui/material";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { useStockPriceContext } from '../context/StockPriceContext';

const InvestmentCalculator = ({ dividendData }) => {
  const [shares, setShares] = useState("");
  const [gav, setGav] = useState("");
  const [results, setResults] = useState(null);
  const [growthRate, setGrowthRate] = useState(13.5);
  const [buybackRate, setBuybackRate] = useState(3);
  const [dividendGrowth, setDividendGrowth] = useState(10);
  const [durationYears, setDurationYears] = useState(6);
  const [monthlyContribution, setMonthlyContribution] = useState(0);
  const [reinvestDividends, setReinvestDividends] = useState(false);
  const [visibleLines, setVisibleLines] = useState({
    investmentValue: true,
    investmentValueNoBuyback: true,
    totalDividend: true,
    sharePrice: true,
  });
  const [showBuybacks, setShowBuybacks] = useState(true);

  const { stockPrice, marketCap, loading: loadingPrice, error: priceError } = useStockPriceContext();

  const currentSharePrice = priceError ? (dividendData?.currentSharePrice || 809) : (stockPrice?.price?.regularMarketPrice?.raw || 809);

  const totalSharesOutstanding = priceError || !stockPrice?.price?.regularMarketPrice?.raw || !marketCap
    ? 212_899_919
    : Math.round(marketCap / stockPrice.price.regularMarketPrice.raw);

  const plannedDividendEntry = dividendData?.plannedDividends?.find((d) => {
    const year = new Date(d.exDate).getFullYear();
    return year === 2025;
  });
  const plannedDividend = plannedDividendEntry?.dividendPerShare || 32;
  const initialDividendPerShare = plannedDividend;

  const calculateInvestment = () => {
    if (!shares || !gav || shares <= 0 || gav <= 0) {
      alert("Vänligen ange giltiga värden för antal aktier och GAV.");
      return;
    }

    const numShares = parseFloat(shares);
    const gavValue = parseFloat(gav);

    const annualGrowthRate = growthRate / 100;
    const annualBuybackRate = buybackRate / 100;
    const dividendGrowthRate = dividendGrowth / 100;

    const currentValue = numShares * currentSharePrice;
    const initialInvestment = numShares * gavValue;
    const currentDividend = numShares * initialDividendPerShare;

    const projectionData = [];
    let sharesOutstanding = totalSharesOutstanding;
    let sharePrice = currentSharePrice;
    let sharePriceNoBuyback = currentSharePrice;
    let dividendPerShare = initialDividendPerShare;
    let currentShares = numShares;
    let contributedCapital = initialInvestment;
    let totalSharesBoughtBack = 0;
    let totalDividendWithBuybacks = 0;
    let totalDividendWithoutBuybacks = 0;
    let totalDividendPureBuybackEffect = 0;
    let staticDividendPerShare = initialDividendPerShare;
    let pureBuybackDividendPerShare = initialDividendPerShare;
    let millionMilestoneYear = null;

    const initialOwnershipPercent = (numShares / totalSharesOutstanding) * 100;
    let prevSharePrice = sharePrice;

    for (let year = 1; year <= Number(durationYears || 0); year++) {
      const sharesBoughtBack = sharesOutstanding * annualBuybackRate;
      sharesOutstanding -= sharesBoughtBack;
      totalSharesBoughtBack += sharesBoughtBack;

      // Adjust share price based on buyback effect
      const buybackAdjustment = 1 - (sharesBoughtBack / totalSharesOutstanding);
      const newSharePriceAfterBuyback = sharePrice / buybackAdjustment;
      sharePrice = newSharePriceAfterBuyback * (1 + annualGrowthRate);
      sharePriceNoBuyback *= (1 + annualGrowthRate);

      // Adjust dividend per share based on remaining shares
      dividendPerShare *= (1 + dividendGrowthRate) * (totalSharesOutstanding / sharesOutstanding);

      // DCA till genomsnittligt pris under året
      const avgPriceForYear = (prevSharePrice + sharePrice) / 2;
      if (monthlyContribution > 0 && avgPriceForYear > 0) {
        const addedShares = (12 * Number(monthlyContribution)) / avgPriceForYear;
        currentShares += addedShares;
        contributedCapital += 12 * Number(monthlyContribution);
      }

      const totalDividend = currentShares * dividendPerShare;
      if (reinvestDividends && sharePrice > 0) {
        const extraShares = totalDividend / sharePrice;
        currentShares += extraShares;
      }

      const investmentValue = currentShares * sharePrice;
      const investmentValueNoBuyback = currentShares * sharePriceNoBuyback;

      totalDividendWithBuybacks += totalDividend;

      staticDividendPerShare *= (1 + dividendGrowthRate);
      const totalDividendThisYear = numShares * staticDividendPerShare;
      totalDividendWithoutBuybacks += totalDividendThisYear;

      pureBuybackDividendPerShare *= (totalSharesOutstanding / sharesOutstanding);
      const totalDividendPureBuyback = numShares * pureBuybackDividendPerShare;
      totalDividendPureBuybackEffect += totalDividendPureBuyback;

      if (investmentValue >= 1_000_000 && !millionMilestoneYear) {
        millionMilestoneYear = 2025 + year;
      }

      projectionData.push({
        year: 2025 + year,
        sharePrice: Math.round(sharePrice),
        sharePriceNoBuyback: Math.round(sharePriceNoBuyback),
        investmentValue: Math.round(investmentValue),
        investmentValueNoBuyback: Math.round(investmentValueNoBuyback),
        totalDividend: Math.round(totalDividend),
        totalDividendWithoutBuyback: Math.round(totalDividendThisYear),
        totalDividendPureBuyback: Math.round(totalDividendPureBuyback),
      });
      prevSharePrice = sharePrice;
    }

    const dividendBoostPercent = totalDividendWithoutBuybacks > 0
      ? ((totalDividendWithBuybacks - totalDividendWithoutBuybacks) / totalDividendWithoutBuybacks) * 100
      : 0;
    const baselinePure = numShares * initialDividendPerShare * Number(durationYears || 0);
    const pureBuybackBoostPercent = baselinePure > 0
      ? ((totalDividendPureBuybackEffect - baselinePure) / baselinePure) * 100
      : 0;

    const finalOwnershipPercent = (numShares / sharesOutstanding) * 100;
    const ownershipIncreasePercent = ((finalOwnershipPercent - initialOwnershipPercent) / initialOwnershipPercent) * 100;

    setResults({
      currentValue,
      initialInvestment,
      currentDividend,
      projectionData,
      totalSharesBoughtBack: Math.round(totalSharesBoughtBack),
      remainingShares: Math.round(sharesOutstanding),
      dividendBoostPercent,
      pureBuybackBoostPercent,
      initialOwnershipPercent: initialOwnershipPercent.toFixed(4),
      finalOwnershipPercent: finalOwnershipPercent.toFixed(4),
      ownershipIncreasePercent: ownershipIncreasePercent.toFixed(2),
      millionMilestoneYear,
      finalShares: Math.round(currentShares),
      contributedCapital: Math.round(contributedCapital),
    });
  };

  const getYDomainAndTicks = (data) => {
    if (!data || data.length === 0) return { domain: [0, 100000], ticks: [0, 50000, 100000] };

    const allValues = [];
    data.forEach((entry) => {
      if (visibleLines.investmentValue && entry.investmentValue) allValues.push(entry.investmentValue);
      if (visibleLines.investmentValueNoBuyback && entry.investmentValueNoBuyback) allValues.push(entry.investmentValueNoBuyback);
      if (visibleLines.totalDividend && entry.totalDividend) allValues.push(entry.totalDividend);
      if (visibleLines.sharePrice && entry.sharePrice) allValues.push(entry.sharePrice);
    });

    if (allValues.length === 0) return { domain: [0, 100000], ticks: [0, 50000, 100000] };

    const minVal = Math.min(...allValues, 0);
    const maxVal = Math.max(...allValues);

    const roundedMin = Math.floor(minVal / 50000) * 50000;
    const maxWithMargin = maxVal * 1.05;
    const roundedMax = Math.ceil(maxWithMargin / 50000) * 50000;

    const range = roundedMax - roundedMin;
    const tickInterval = range <= 200000 ? 50000 : range <= 1000000 ? 100000 : 500000;

    const ticks = [];
    for (let i = roundedMin; i <= roundedMax; i += tickInterval) {
      ticks.push(i);
    }

    return {
      domain: [ticks[0], ticks[ticks.length - 1]],
      ticks,
    };
  };

  const formatYTick = (value, isMargin = false) => {
    if (isMargin) {
      return `${value}%`;
    }
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value.toLocaleString("sv-SE");
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box
          sx={{
            backgroundColor: "#2e2e2e",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            padding: "8px",
            fontSize: { xs: "0.85rem", sm: "0.95rem" },
          }}
        >
          <Typography variant="body2">År: {label}</Typography>
          {payload.map((entry, index) => {
            const isTotalDividend = entry.name === "Total utdelning";
            const isSharePrice = entry.name === "Aktiepris";
            return (
              <Box key={index}>
                <Typography variant="body2" sx={{ color: entry.color }}>
                  {entry.name}: {entry.value.toLocaleString("sv-SE")} SEK
                </Typography>
                {isTotalDividend && (
                  <Typography variant="body2" sx={{ color: "#ccc", marginLeft: "10px" }}>
                    Utan återköp: {data.totalDividendWithoutBuyback.toLocaleString("sv-SE")} SEK
                  </Typography>
                )}
                {isSharePrice && (
                  <Typography variant="body2" sx={{ color: "#ccc", marginLeft: "10px" }}>
                    Utan återköp: {data.sharePriceNoBuyback.toLocaleString("sv-SE")} SEK
                  </Typography>
                )}
              </Box>
            );
          })}
          <Typography variant="body2" color="#ccc">
            Utdelningsboost för detta år (med återköp): {((data.totalDividend - data.totalDividendWithoutBuyback) / data.totalDividendWithoutBuyback * 100).toFixed(2)}%
          </Typography>
          <Typography variant="body2" color="#ccc">
            Utdelningsboost (utan återköp): 0.00%
          </Typography>
        </Box>
      );
    }
    return null;
  };

  const yConfig = results ? getYDomainAndTicks(results.projectionData) : { domain: [0, 100000], ticks: [0, 50000, 100000] };

  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        padding: { xs: "12px", sm: "16px" },
        margin: "16px auto",
        width: { xs: "92%", sm: "85%", md: "75%" },
        textAlign: "center",
        boxSizing: "border-box",
        minHeight: "200px",
      }}
    >
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          color: "#fff",
          marginBottom: "12px",
          fontSize: { xs: "1.2rem", sm: "1.5rem", md: "1.8rem" },
          letterSpacing: "0.5px",
        }}
      >
        Investeringskalkylator
      </Typography>

      {loadingPrice && (
        <Typography variant="body2" color="#ccc" mb={2} fontSize={{ xs: "0.85rem", sm: "0.95rem" }}>
          Laddar aktiepris...
        </Typography>
      )}

      {priceError && (
        <Typography variant="body2" color="#ff1744" mb={2} fontSize={{ xs: "0.85rem", sm: "0.95rem" }}>
          Kunde inte hämta aktiepris: {priceError}. Använder fallback-värden (aktiepris: {currentSharePrice} SEK).
        </Typography>
      )}

      <Box
        display="flex"
        justifyContent="center"
        gap={1.5}
        flexWrap="wrap"
        mb={3}
        sx={{
          flexDirection: { xs: "column", sm: "row" },
          alignItems: "center",
        }}
      >
        <TextField
          label="Antal aktier"
          type="number"
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          variant="outlined"
          sx={{
            width: { xs: "90%", sm: "auto" },
            "& .MuiInputBase-input": { color: "#fff", fontSize: { xs: "0.9rem", sm: "1rem" } },
            "& .MuiInputLabel-root": { color: "#ccc", fontSize: { xs: "0.9rem", sm: "1rem" } },
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#ccc" },
              "&:hover fieldset": { borderColor: "#00e676" },
              "&.Mui-focused fieldset": { borderColor: "#00e676" },
            },
          }}
        />
        <TextField
          label="GAV (SEK)"
          type="number"
          value={gav}
          onChange={(e) => setGav(e.target.value)}
          variant="outlined"
          sx={{
            width: { xs: "90%", sm: "auto" },
            "& .MuiInputBase-input": { color: "#fff", fontSize: { xs: "0.9rem", sm: "1rem" } },
            "& .MuiInputLabel-root": { color: "#ccc", fontSize: { xs: "0.9rem", sm: "1rem" } },
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#ccc" },
              "&:hover fieldset": { borderColor: "#00e676" },
              "&.Mui-focused fieldset": { borderColor: "#00e676" },
            },
          }}
        />
        <Button
          variant="contained"
          onClick={calculateInvestment}
          sx={{
            backgroundColor: "#00e676",
            "&:hover": { backgroundColor: "#00c853" },
            color: "#fff",
            fontWeight: "bold",
            fontSize: { xs: "0.9rem", sm: "1rem" },
            padding: { xs: "6px 12px", sm: "8px 16px" },
          }}
          disabled={loadingPrice}
        >
          Beräkna
        </Button>
      </Box>

      <Box
        display="flex"
        justifyContent="center"
        gap={1.5}
        flexWrap="wrap"
        mb={3}
        sx={{
          flexDirection: { xs: "column", sm: "row" },
          alignItems: "center",
        }}
      >
        <TextField
          label="Årlig tillväxt (%)"
          type="number"
          value={growthRate}
          onChange={(e) => setGrowthRate(parseFloat(e.target.value) || 0)}
          variant="outlined"
          sx={{
            width: { xs: "90%", sm: "auto" },
            "& .MuiInputBase-input": { color: "#fff", fontSize: { xs: "0.9rem", sm: "1rem" } },
            "& .MuiInputLabel-root": { color: "#ccc", fontSize: { xs: "0.9rem", sm: "1rem" } },
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#ccc" },
              "&:hover fieldset": { borderColor: "#00e676" },
              "&.Mui-focused fieldset": { borderColor: "#00e676" },
            },
          }}
        />
        <TextField
          label="Årlig återköpsrate (%)"
          type="number"
          value={buybackRate}
          onChange={(e) => setBuybackRate(parseFloat(e.target.value) || 0)}
          variant="outlined"
          sx={{
            width: { xs: "90%", sm: "auto" },
            "& .MuiInputBase-input": { color: "#fff", fontSize: { xs: "0.9rem", sm: "1rem" } },
            "& .MuiInputLabel-root": { color: "#ccc", fontSize: { xs: "0.9rem", sm: "1rem" } },
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#ccc" },
              "&:hover fieldset": { borderColor: "#00e676" },
              "&.Mui-focused fieldset": { borderColor: "#00e676" },
            },
          }}
        />
        <TextField
          label="Utdelningstillväxt (%)"
          type="number"
          value={dividendGrowth}
          onChange={(e) => setDividendGrowth(parseFloat(e.target.value) || 0)}
          variant="outlined"
          sx={{
            width: { xs: "90%", sm: "auto" },
            "& .MuiInputBase-input": { color: "#fff", fontSize: { xs: "0.9rem", sm: "1rem" } },
            "& .MuiInputLabel-root": { color: "#ccc", fontSize: { xs: "0.9rem", sm: "1rem" } },
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#ccc" },
              "&:hover fieldset": { borderColor: "#00e676" },
              "&.Mui-focused fieldset": { borderColor: "#00e676" },
            },
          }}
        />
        <TextField
          label="Antal år"
          type="number"
          value={durationYears}
          onChange={(e) => setDurationYears(parseInt(e.target.value || '0', 10))}
          variant="outlined"
          sx={{
            width: { xs: "90%", sm: "auto" },
            "& .MuiInputBase-input": { color: "#fff", fontSize: { xs: "0.9rem", sm: "1rem" } },
            "& .MuiInputLabel-root": { color: "#ccc", fontSize: { xs: "0.9rem", sm: "1rem" } },
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#ccc" },
              "&:hover fieldset": { borderColor: "#00e676" },
              "&.Mui-focused fieldset": { borderColor: "#00e676" },
            },
          }}
        />
        <TextField
          label="Månadsspar (SEK)"
          type="number"
          value={monthlyContribution}
          onChange={(e) => setMonthlyContribution(parseFloat(e.target.value) || 0)}
          variant="outlined"
          sx={{
            width: { xs: "90%", sm: "auto" },
            "& .MuiInputBase-input": { color: "#fff", fontSize: { xs: "0.9rem", sm: "1rem" } },
            "& .MuiInputLabel-root": { color: "#ccc", fontSize: { xs: "0.9rem", sm: "1rem" } },
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#ccc" },
              "&:hover fieldset": { borderColor: "#00e676" },
              "&.Mui-focused fieldset": { borderColor: "#00e676" },
            },
          }}
        />
        <FormGroup sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={reinvestDividends}
                onChange={() => setReinvestDividends(!reinvestDividends)}
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": { color: "#00e676" },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#00e676" },
                }}
              />
            }
            label="Återinvestera utdelningar"
            sx={{ color: "#ccc" }}
          />
        </FormGroup>
      </Box>

      {results && (
        <Fade in={true} timeout={1000}>
          <Box>
            {/* Sammanfattning */}
            {(() => {
              const last = results.projectionData[results.projectionData.length - 1];
              const endValue = showBuybacks ? last.investmentValue : last.investmentValueNoBuyback;
              const totalDividends = results.projectionData.reduce(
                (sum, row) => sum + (showBuybacks ? row.totalDividend : row.totalDividendWithoutBuyback),
                0
              );
              return (
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1.5,
                    justifyContent: 'center',
                    mb: 2,
                  }}
                >
                  <Box sx={{ backgroundColor: '#1f1f1f', border: '1px solid #2b2b2b', borderRadius: 2, px: 2, py: 1.5, minWidth: 220 }}>
                    <Typography variant="body2" sx={{ color: '#b0b0b0' }}>Slutvärde</Typography>
                    <Typography variant="h6" sx={{ color: '#00e676', fontWeight: 700 }}>
                      {endValue.toLocaleString('sv-SE')} SEK
                    </Typography>
                  </Box>
                  <Box sx={{ backgroundColor: '#1f1f1f', border: '1px solid #2b2b2b', borderRadius: 2, px: 2, py: 1.5, minWidth: 220 }}>
                    <Typography variant="body2" sx={{ color: '#b0b0b0' }}>Antal aktier (slut)</Typography>
                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
                      {results.finalShares.toLocaleString('sv-SE')}
                    </Typography>
                  </Box>
                  <Box sx={{ backgroundColor: '#1f1f1f', border: '1px solid #2b2b2b', borderRadius: 2, px: 2, py: 1.5, minWidth: 220 }}>
                    <Typography variant="body2" sx={{ color: '#b0b0b0' }}>Totalt insatt kapital</Typography>
                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
                      {results.contributedCapital.toLocaleString('sv-SE')} SEK
                    </Typography>
                  </Box>
                  <Box sx={{ backgroundColor: '#1f1f1f', border: '1px solid #2b2b2b', borderRadius: 2, px: 2, py: 1.5, minWidth: 220 }}>
                    <Typography variant="body2" sx={{ color: '#b0b0b0' }}>Utdelningar (summa)</Typography>
                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
                      {Math.round(totalDividends).toLocaleString('sv-SE')} SEK
                    </Typography>
                  </Box>
                </Box>
              );
            })()}
            {results.millionMilestoneYear && (
              <Box mb={2}>
                <Typography variant="body2" color="#00e676" fontWeight="bold" fontSize={{ xs: "0.85rem", sm: "0.95rem" }}>
                  🎉 Grattis! Din investering når 1 miljon SEK år {results.millionMilestoneYear}!
                </Typography>
              </Box>
            )}

            <Box mb={3}>
              <Typography variant="h6" color="#00e676" fontSize={{ xs: "1.1rem", sm: "1.4rem", md: "1.8rem" }}>
                Nuvarande läge (2025)
              </Typography>
              <Typography
                variant="h5"
                color="#fff"
                fontSize={{ xs: "1.2rem", sm: "1.5rem", md: "1.8rem" }}
              >
                {results.currentValue.toLocaleString("sv-SE")} SEK
              </Typography>
              <Typography variant="body2" color="#ccc" mt={1} fontSize={{ xs: "0.85rem", sm: "0.95rem" }}>
                Insatt kapital: {results.initialInvestment.toLocaleString("sv-SE")} SEK
              </Typography>
              <Typography variant="body2" color="#ccc" mt={1} fontSize={{ xs: "0.85rem", sm: "0.95rem" }}>
                Utdelning (2025): {results.currentDividend.toLocaleString("sv-SE")} SEK
              </Typography>
              <Typography variant="body2" color={results.currentValue >= results.initialInvestment ? "#00e676" : "#ff1744"} mt={1} fontSize={{ xs: "0.85rem", sm: "0.95rem" }}>
                Total avkastning: {(((results.currentValue - results.initialInvestment) / results.initialInvestment) * 100).toFixed(2)}%
              </Typography>
            </Box>

            <Box mb={2}>
              <Typography variant="body2" color="#ccc" fontSize={{ xs: "0.85rem", sm: "0.95rem" }}>
                📊 Effekt av återköp ({durationYears} år): +{results.dividendBoostPercent.toFixed(2)}% utdelning jämfört med utan återköp.
              </Typography>
              <Typography variant="body2" color="#ccc" fontSize={{ xs: "0.85rem", sm: "0.95rem" }}>
                📈 Ren återköpseffekt: +{results.pureBuybackBoostPercent.toFixed(2)}% (exkl. utdelningstillväxt).
              </Typography>
            </Box>

            <Box mb={3}>
              <Typography variant="h6" color="#00e676" mb={1} fontSize={{ xs: "1.1rem", sm: "1.4rem", md: "1.8rem" }}>
                {(() => {
                  const start = 2025 + 1;
                  const end = start + Number(durationYears || 0) - 1;
                  return `Prognos ${start}–${end}`;
                })()}
              </Typography>
              <Typography variant="body2" color="#ccc" mb={1} fontSize={{ xs: "0.85rem", sm: "0.95rem" }}>
                Återköp: {results.totalSharesBoughtBack.toLocaleString("sv-SE")} aktier (kvar: {results.remainingShares.toLocaleString("sv-SE")}).
              </Typography>
              <Typography variant="body2" color="#ccc" mb={1} fontSize={{ xs: "0.85rem", sm: "0.95rem" }}>
                Ägarandel: {results.initialOwnershipPercent}% → {results.finalOwnershipPercent}% (+{results.ownershipIncreasePercent}%).
              </Typography>

              <Box mb={2}>
                <Button
                  variant="outlined"
                  onClick={() => setShowBuybacks((prev) => !prev)}
                  sx={{
                    borderColor: "#ccc",
                    color: "#ccc",
                    "&:hover": { borderColor: "#00e676", color: "#00e676" },
                    fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
                  }}
                >
                  {showBuybacks ? "Visa utan återköp" : "Visa med återköp"}
                </Button>
              </Box>

              <Box mb={2} display="flex" justifyContent="center" flexWrap="wrap" gap={1}>
                <FormGroup row>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={visibleLines.investmentValue}
                        onChange={() =>
                          setVisibleLines((prev) => ({ ...prev, investmentValue: !prev.investmentValue }))
                        }
                        sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": { color: "#00e676" },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                            backgroundColor: "#00e676",
                          },
                        }}
                      />
                    }
                    label="Investeringsvärde"
                    sx={{ color: "#ccc", "& .MuiTypography-root": { fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" } } }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={visibleLines.investmentValueNoBuyback}
                        onChange={() =>
                          setVisibleLines((prev) => ({
                            ...prev,
                            investmentValueNoBuyback: !prev.investmentValueNoBuyback,
                          }))
                        }
                        sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": { color: "#ff1744" },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                            backgroundColor: "#ff1744",
                          },
                        }}
                      />
                    }
                    label="Investeringsvärde (utan återköp)"
                    sx={{ color: "#ccc", "& .MuiTypography-root": { fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" } } }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={visibleLines.totalDividend}
                        onChange={() =>
                          setVisibleLines((prev) => ({ ...prev, totalDividend: !prev.totalDividend }))
                        }
                        sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": { color: "#ffeb3b" },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                            backgroundColor: "#ffeb3b",
                          },
                        }}
                      />
                    }
                    label="Total utdelning"
                    sx={{ color: "#ccc", "& .MuiTypography-root": { fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" } } }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={visibleLines.sharePrice}
                        onChange={() =>
                          setVisibleLines((prev) => ({ ...prev, sharePrice: !prev.sharePrice }))
                        }
                        sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": { color: "#0288d1" },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                            backgroundColor: "#0288d1",
                          },
                        }}
                      />
                    }
                    label="Aktiepris"
                    sx={{ color: "#ccc", "& .MuiTypography-root": { fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" } } }}
                  />
                </FormGroup>
              </Box>

              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={results.projectionData}
                  margin={{
                    top: 12,
                    right: 12,
                    bottom: 12,
                    left: 16,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis
                    dataKey="year"
                    stroke="#ccc"
                    tick={{ fontSize: { xs: 12, sm: 14 } }}
                    interval="preserveStartEnd"
                    tickFormatter={(value) => value.toString()}
                  />
                  <YAxis
                    stroke="#ccc"
                    width={56}
                    tick={{ fontSize: { xs: 12, sm: 14 } }}
                    tickFormatter={(value) => formatYTick(value)}
                    domain={yConfig.domain}
                    ticks={yConfig.ticks}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(value) => {
                      switch (value) {
                        case "investmentValue":
                          return "Investeringsvärde";
                        case "investmentValueNoBuyback":
                          return "Investeringsvärde (utan återköp)";
                        case "totalDividend":
                          return "Total utdelning";
                        case "sharePrice":
                          return "Aktiepris";
                        default:
                          return value;
                      }
                    }}
                    wrapperStyle={{
                      fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
                      paddingTop: 5,
                    }}
                  />
                  {visibleLines.investmentValue && (
                    <Line
                      type="monotone"
                      dataKey={showBuybacks ? "investmentValue" : "investmentValueNoBuyback"}
                      stroke="#00e676"
                      dot={false}
                      strokeWidth={2}
                      animationDuration={1500}
                      name="Investeringsvärde"
                    />
                  )}
                  {visibleLines.investmentValueNoBuyback && showBuybacks && (
                    <Line
                      type="monotone"
                      dataKey="investmentValueNoBuyback"
                      stroke="#ff1744"
                      dot={false}
                      strokeWidth={2}
                      animationDuration={1500}
                      name="Investeringsvärde (utan återköp)"
                    />
                  )}
                  {visibleLines.totalDividend && (
                    <Line
                      type="monotone"
                      dataKey={showBuybacks ? "totalDividend" : "totalDividendWithoutBuyback"}
                      stroke="#ffeb3b"
                      dot={false}
                      strokeWidth={2}
                      animationDuration={1500}
                      name="Total utdelning"
                    />
                  )}
                  {visibleLines.sharePrice && (
                    <Line
                      type="monotone"
                      dataKey={showBuybacks ? "sharePrice" : "sharePriceNoBuyback"}
                      stroke="#0288d1"
                      dot={false}
                      strokeWidth={2}
                      animationDuration={1500}
                      name="Aktiepris"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>

              {/* Förklarande text under grafen */}
              <Box mt={1} mb={2}>
                <Typography
                  variant="body2"
                  color="#ccc"
                  fontSize={{ xs: "0.85rem", sm: "0.95rem" }}
                  fontStyle="italic"
                >
                  Utdelningsboost i grafen visar ökningen för ett specifikt år, medan den totala boosten ({results.dividendBoostPercent.toFixed(2)}%) är genomsnittet över {durationYears} år.
                </Typography>
              </Box>
            </Box>

            <Box mb={3}>
              <Typography
                variant="h6"
                color="#00e676"
                mb={1}
                fontSize={{ xs: "1.1rem", sm: "1.4rem", md: "1.8rem" }}
              >
                {(() => {
                  const start = new Date().getFullYear() + 1;
                  const end = start + Number(durationYears || 0) - 1;
                  return `Projekterad utdelning och aktiepris (${start}-${end})`;
                })()}
              </Typography>
              <Box
                sx={{
                  overflowX: "auto",
                  "&::-webkit-scrollbar": {
                    height: "6px",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: "#00e676",
                    borderRadius: "10px",
                  },
                }}
              >
                <Table
                  sx={{
                    width: "100%",
                    backgroundColor: "#2e2e2e",
                    borderRadius: "10px",
                    overflow: "hidden",
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell
                        align="center"
                        sx={{
                          color: "#fff",
                          fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
                          padding: { xs: "4px", sm: "8px" },
                        }}
                      >
                        År
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          color: "#fff",
                          fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
                          padding: { xs: "4px", sm: "8px" },
                        }}
                      >
                        Aktiepris (SEK)
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          color: "#fff",
                          fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
                          padding: { xs: "4px", sm: "8px" },
                        }}
                      >
                        Total Utdelning (SEK)
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          color: "#fff",
                          fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
                          padding: { xs: "4px", sm: "8px" },
                        }}
                      >
                        Investeringsvärde (SEK)
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {results.projectionData.map((row) => (
                      <TableRow key={row.year}>
                        <TableCell
                          align="center"
                          sx={{
                            color: "#fff",
                            fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
                            padding: { xs: "4px", sm: "8px" },
                          }}
                        >
                          {row.year}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            color: "#fff",
                            fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
                            padding: { xs: "4px", sm: "8px" },
                          }}
                        >
                          {(showBuybacks ? row.sharePrice : row.sharePriceNoBuyback).toLocaleString("sv-SE")}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            color: "#fff",
                            fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
                            padding: { xs: "4px", sm: "8px" },
                          }}
                        >
                          {(showBuybacks ? row.totalDividend : row.totalDividendWithoutBuyback).toLocaleString("sv-SE")}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            color: "#fff",
                            fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
                            padding: { xs: "4px", sm: "8px" },
                          }}
                        >
                          {(showBuybacks ? row.investmentValue : row.investmentValueNoBuyback).toLocaleString("sv-SE")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Box>
            <Box mb={3}>
              <Typography
                variant="body2"
                color="#ccc"
                mt={2}
                fontSize={{ xs: "0.85rem", sm: "0.95rem" }}
              >
                <em>
                  *Antaganden: {buybackRate}% årlig återköpsrate, {growthRate}% årlig tillväxt, {dividendGrowth}% årlig utdelningstillväxt. Framtida aktiepris och utdelningar är baserade på dessa antaganden och bör inte ses som en garanti.
                </em>
              </Typography>
            </Box>
          </Box>
        </Fade>
      )}
    </Card>
  );
};

export default InvestmentCalculator;
