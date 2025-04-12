'use client';
import React, { useState } from "react";
import { Box, Card, TextField, Typography, Button, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { useStockPriceContext } from '../context/StockPriceContext';

const InvestmentCalculator = ({ dividendData }) => {
  const [shares, setShares] = useState("");
  const [gav, setGav] = useState("");
  const [results, setResults] = useState(null);

  const { stockPrice, marketCap, loading: loadingPrice, error: priceError } = useStockPriceContext();

  const currentSharePrice = priceError ? (dividendData?.currentSharePrice || 809) : (stockPrice?.price?.regularMarketPrice?.raw || 809);

  const totalSharesOutstanding = priceError || !stockPrice?.price?.regularMarketPrice?.raw || !marketCap
    ? 212_899_919
    : Math.round(marketCap / stockPrice.price.regularMarketPrice.raw);

  const annualBuybackRate = 0.03; // 3% återköp per år
  const yearsToProject = 6; // Prognos för 6 år (2026 till 2031)
  const annualGrowthRate = 0.135; // 13.5% årlig tillväxt
  const dividendGrowthRate = 0.1; // 10% årlig utdelningstillväxt från 2026 och framåt

  const plannedDividendEntry = dividendData?.plannedDividends?.find((d) => {
    const year = new Date(d.exDate).getFullYear();
    return year === 2025;
  });
  const plannedDividend = plannedDividendEntry?.dividendPerShare || 32; // 32.07 SEK för 2025
  const initialDividendPerShare = plannedDividend; // Startvärde för 2025

  const calculateInvestment = () => {
    if (!shares || !gav || shares <= 0 || gav <= 0) {
      alert("Vänligen ange giltiga värden för antal aktier och GAV.");
      return;
    }

    const numShares = parseFloat(shares);
    const gavValue = parseFloat(gav);

    const currentValue = numShares * currentSharePrice;
    const initialInvestment = numShares * gavValue;
    const currentDividend = numShares * initialDividendPerShare; 

    const projectionData = [];
    let sharesOutstanding = totalSharesOutstanding;
    let sharePrice = currentSharePrice;
    let dividendPerShare = initialDividendPerShare; 
    let totalSharesBoughtBack = 0;

    let totalDividendWithBuybacks = 0;
    let totalDividendWithoutBuybacks = 0;

    let staticDividendPerShare = initialDividendPerShare;
    let staticSharesOutstanding = totalSharesOutstanding;

    for (let year = 1; year <= yearsToProject; year++) {
      // Återköp
      const sharesBoughtBack = sharesOutstanding * annualBuybackRate;
      sharesOutstanding -= sharesBoughtBack;
      totalSharesBoughtBack += sharesBoughtBack;

      const newSharePriceAfterBuyback = sharePrice * (totalSharesOutstanding / sharesOutstanding);
      sharePrice = newSharePriceAfterBuyback * (1 + annualGrowthRate);

      dividendPerShare *= (1 + dividendGrowthRate) * (totalSharesOutstanding / sharesOutstanding);

      const investmentValue = numShares * sharePrice;
      const totalDividend = numShares * dividendPerShare;

      totalDividendWithBuybacks += totalDividend;

      staticDividendPerShare *= (1 + dividendGrowthRate);
      const totalDividendThisYear = numShares * staticDividendPerShare;
      totalDividendWithoutBuybacks += totalDividendThisYear;

      projectionData.push({
        year: 2025 + year,
        sharePrice: Math.round(sharePrice),
        investmentValue: Math.round(investmentValue),
        totalDividend: Math.round(totalDividend),
      });
    }

    const dividendBoostPercent = ((totalDividendWithBuybacks - totalDividendWithoutBuybacks) / totalDividendWithoutBuybacks) * 100;

    setResults({
      currentValue,
      initialInvestment,
      currentDividend,
      projectionData,
      totalSharesBoughtBack: Math.round(totalSharesBoughtBack),
      remainingShares: Math.round(sharesOutstanding),
      dividendBoostPercent, // Lägg till effekten av återköp
    });
  };

  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "20px",
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
        padding: { xs: "15px", sm: "25px" },
        margin: "20px auto",
        width: { xs: "95%", sm: "80%", md: "70%" },
        textAlign: "center",
      }}
    >
      <Typography
        variant="h4"
        sx={{
          fontWeight: "bold",
          color: "#00e676",
          marginBottom: "20px",
          fontSize: { xs: "1.5rem", sm: "2rem" },
        }}
      >
        Investeringskalkylator
      </Typography>

      {loadingPrice && (
        <Typography variant="body1" color="#ccc" mb={2}>
          Laddar aktiepris...
        </Typography>
      )}

      {priceError && (
        <Typography variant="body1" color="#ff1744" mb={2}>
          Kunde inte hämta aktiepris: {priceError}. Använder fallback-värden (aktiepris: {currentSharePrice} SEK).
        </Typography>
      )}

      <Box display="flex" justifyContent="center" gap={2} flexWrap="wrap" mb={3}>
        <TextField
          label="Antal aktier"
          type="number"
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          variant="outlined"
          sx={{
            "& .MuiInputBase-input": { color: "#fff" },
            "& .MuiInputLabel-root": { color: "#ccc" },
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
            "& .MuiInputBase-input": { color: "#fff" },
            "& .MuiInputLabel-root": { color: "#ccc" },
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
          }}
          disabled={loadingPrice}
        >
          Beräkna
        </Button>
      </Box>

      {results && (
        <Box>
          <Box mb={3}>
            <Typography variant="h6" color="#00e676">
              Nuvarande värde av din investering (2025)
            </Typography>
            <Typography variant="h5" color="#fff">
              {results.currentValue.toLocaleString("sv-SE")} SEK
            </Typography>
            <Typography variant="body1" color="#ccc" mt={1}>
              Initial investering: {results.initialInvestment.toLocaleString("sv-SE")} SEK
            </Typography>
            <Typography variant="body1" color="#ccc" mt={1}>
              Din nuvarande utdelning (2025): {results.currentDividend.toLocaleString("sv-SE")} SEK
            </Typography>
            <Typography variant="body1" color={results.currentValue >= results.initialInvestment ? "#00e676" : "#ff1744"} mt={1}>
              Avkastning: {(((results.currentValue - results.initialInvestment) / results.initialInvestment) * 100).toFixed(2)}%
            </Typography>
          </Box>

          <Box mb={3}>
            <Typography variant="body1" color="#ccc" mt={2}>
              📊 <strong>Effekt av återköp:</strong> Du får {results.dividendBoostPercent.toFixed(2)}% mer utdelning över 6 år tack vare bolagets återköp.
            </Typography>
          </Box>

          <Box mb={3}>
            <Typography variant="h6" color="#00e676" mb={1}>
              Framtida värde och utdelningar (2026-2031)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={results.projectionData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="year" stroke="#ccc" />
                <YAxis stroke="#ccc" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#2e2e2e", color: "#fff", border: "none", borderRadius: "5px" }}
                  formatter={(value, name) => [
                    `${value.toLocaleString("sv-SE")} SEK`,
                    name === "investmentValue" ? "Investeringsvärde" : name === "totalDividend" ? "Total utdelning" : "Aktiepris",
                  ]}
                />
                <Legend
                  formatter={(value) => {
                    switch(value) {
                      case "investmentValue": return "Investeringsvärde";
                      case "totalDividend": return "Total utdelning";
                      case "sharePrice": return "Aktiepris";
                      default: return value;
                    }
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="investmentValue"
                  stroke="#00e676"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="totalDividend"
                  stroke="#ffeb3b"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="sharePrice"
                  stroke="#00c853"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>

          <Box mb={3}>
            <Typography variant="h6" color="#00e676" mb={1}>
              Projekterad utdelning och aktiepris (2026-2031)
            </Typography>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{ color: "#fff" }}>År</TableCell>
                  <TableCell align="center" sx={{ color: "#fff" }}>Aktiepris (SEK)</TableCell>
                  <TableCell align="center" sx={{ color: "#fff" }}>Total Utdelning (SEK)</TableCell>
                  <TableCell align="center" sx={{ color: "#fff" }}>Investeringsvärde (SEK)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.projectionData.map((row) => (
                  <TableRow key={row.year}>
                    <TableCell align="center" sx={{ color: "#fff" }}>{row.year}</TableCell>
                    <TableCell align="center" sx={{ color: "#fff" }}>{row.sharePrice.toLocaleString("sv-SE")}</TableCell>
                    <TableCell align="center" sx={{ color: "#fff" }}>{row.totalDividend.toLocaleString("sv-SE")}</TableCell>
                    <TableCell align="center" sx={{ color: "#fff" }}>{row.investmentValue.toLocaleString("sv-SE")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
          <Box mb={3}>
            <Typography variant="body2" color="#ccc" mt={2} fontSize="0.875rem">
              <em>
                *Antaganden: 3% årlig återköpsrate, 13.5% årlig tillväxt, 10% årlig utdelningstillväxt. Framtida aktiepris och utdelningar är baserade på dessa antaganden och bör inte ses som en garanti.
              </em>
            </Typography>
          </Box>
        </Box>
      )}
    </Card>
  );
};

export default InvestmentCalculator;