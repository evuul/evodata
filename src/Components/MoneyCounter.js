"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, Box, Typography, Chip, Tooltip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useStockPriceContext } from '../context/StockPriceContext';
import financialReports from "../app/data/financialReports.json";

const MoneyCounter = ({ sx = {} }) => {
  const [totalProfitYTD, setTotalProfitYTD] = useState(0); // Total vinst YTD (till nu)
  const [todayProfit, setTodayProfit] = useState(0); // Dagens vinst (till nu)
  const [openInfo, setOpenInfo] = useState(false);
  const { stockPrice, marketCap, error: priceError } = useStockPriceContext();
  const [fxRate, setFxRate] = useState(11.02);

  // Start på innevarande år
  const getStartOfYear = () => {
    const now = new Date();
    return new Date(now.getFullYear(), 0, 1);
  };

  // Beräkna realtidsvärden exakt utifrån klockan (undviker drift och extra timers)

  // Formatera dagens datum till "DD MMM YYYY"
  const formatDate = (date) => {
    return date.toLocaleDateString("sv-SE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Formatera totalProfitYTD till miljarder SEK
  const formatTotalProfit = (value) => {
    if (!value) return "N/A";
    const billions = value / 1_000_000_000;
    return `${billions.toLocaleString("sv-SE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}B SEK`;
  };

  // Formatera dagens vinst
  const formatDailyProfit = (value) => {
    return `${Math.floor(value).toLocaleString("sv-SE")} SEK`;
  };

  const startOfYear = getStartOfYear();
  const formattedStart = formatDate(startOfYear);
  const formattedToday = formatDate(new Date());
  // Compute daily SEK profit from YTD reports
  const computeDailyProfitSEK = () => {
    const year = new Date().getFullYear();
    const qs = (financialReports?.financialReports || []).filter(r => r.year === year);
    if (!qs.length) return 30_000_000;
    const qDays = { Q1: 90, Q2: 91, Q3: 92, Q4: 92 };
    const totalMEUR = qs.reduce((s, r) => s + (Number(r.adjustedProfitForPeriod) || 0), 0);
    const totalDays = qs.reduce((s, r) => s + (qDays[r.quarter] || 90), 0);
    if (!(totalMEUR > 0 && totalDays > 0)) return 30_000_000;
    return (totalMEUR / totalDays) * 1_000_000 * fxRate;
  };

  // Fetch FX (EUR->SEK)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/fx', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          const r = Number(json?.rate);
          if (mounted && isFinite(r) && r > 0) setFxRate(r);
        }
      } catch (_) {}
    })();
    return () => { mounted = false; };
  }, []);

  const dailyProfitPerDay = computeDailyProfitSEK();
  // Tick updater: uses computed dailyProfitPerDay
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const startOfYear = getStartOfYear();
      const msPerDay = 24 * 60 * 60 * 1000;
      const wholeDaysSinceYearStart = Math.floor((now - startOfYear) / msPerDay);
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const secondsSinceMidnight = (now - startOfToday) / 1000;
      const fractionOfDay = secondsSinceMidnight / (24 * 60 * 60);
      const todayProfitValue = dailyProfitPerDay * Math.max(0, Math.min(1, fractionOfDay));
      const totalProfitToNow = dailyProfitPerDay * wholeDaysSinceYearStart + todayProfitValue;
      setTodayProfit(todayProfitValue);
      setTotalProfitYTD(totalProfitToNow);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dailyProfitPerDay]);
  const perSecond = Math.round(dailyProfitPerDay / 86400);
  const currentPrice = priceError ? null : (stockPrice?.price?.regularMarketPrice?.raw || null);
  const totalSharesOutstanding = currentPrice && marketCap ? Math.round(marketCap / currentPrice) : 212_899_919;
  const sharesBuyable = currentPrice ? Math.floor(todayProfit / currentPrice) : null;
  const buyablePercent = sharesBuyable && totalSharesOutstanding ? (sharesBuyable / totalSharesOutstanding) * 100 : null;
  const perShareToday = totalSharesOutstanding ? todayProfit / totalSharesOutstanding : null;
  const money = (v) => `${Math.round(v).toLocaleString('sv-SE')} SEK`;

  return (
    <Card
      sx={{
        width: { xs: "92%", sm: "100%" },
        maxWidth: "1200px",
        margin: "16px auto",
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        padding: { xs: "12px", sm: "16px" },
        textAlign: "center",
        color: "#ffffff",
        minHeight: "200px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        ...sx,
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="center" alignItems="center">
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: "#ffffff",
              fontSize: { xs: "1.2rem", sm: "1.5rem", md: "1.8rem" },
              letterSpacing: "0.5px",
            }}
          >
            Vinstindikator
          </Typography>
          <Tooltip title="Vad räcker dagens vinst till?">
            <IconButton size="small" onClick={() => setOpenInfo(true)} sx={{ ml: 1, color: '#00e676' }} aria-label="Visa exempel">
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Box display="flex" flexDirection="column" alignItems="center" marginTop="12px">
          <Typography
            variant="body1"
            sx={{
              color: "#b0b0b0",
              fontSize: { xs: "0.9rem", sm: "1rem" },
              opacity: 0.9,
              marginBottom: "8px",
            }}
          >
            Dagens vinst (fram till nu):
          </Typography>

          <Typography
            variant="h3"
            fontWeight="700"
            sx={{
              fontSize: { xs: "1.8rem", sm: "2.5rem", md: "3.5rem" },
              color: "#00e676",
              marginBottom: "0px",
              fontFeatureSettings: '"tnum"',
            }}
            aria-live="polite"
          >
            {formatDailyProfit(todayProfit)}
          </Typography>

          <Box display="flex" flexDirection="column" alignItems="center" marginTop="12px">
            <Typography
              variant="body1"
              sx={{
                color: "#b0b0b0",
                fontSize: { xs: "0.9rem", sm: "1rem" },
                opacity: 0.9,
                marginBottom: "4px",
              }}
            >
              Total vinst ({formattedStart} - {formattedToday}):
            </Typography>
            <Typography
              variant="h5"
              fontWeight="600"
              sx={{
                fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" },
                color: "#fff",
                marginBottom: "4px",
                fontFeatureSettings: '"tnum"',
              }}
              aria-live="polite"
            >
              {formatTotalProfit(totalProfitYTD)}
            </Typography>
        </Box>
          {/* SEK per sekund */}
          <Box sx={{ mt: 1 }}>
            <Tooltip title="Beräknad intjäning per sekund (avrundad)">
              <Chip
                label={`≈ ${perSecond.toLocaleString('sv-SE')} SEK/sek`}
                size="small"
                onClick={() => setOpenInfo(true)}
                sx={{ backgroundColor: '#2a2a2a', color: '#b0f5cf', border: '1px solid #355', cursor: 'pointer' }}
              />
            </Tooltip>
          </Box>

          {/* Återköp/Per aktie-boxar */}
          <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
            <Tooltip title={currentPrice ? `Visuell representation • Kurs antagen: ${currentPrice.toLocaleString('sv-SE')} SEK` : 'Visuell representation • Kurs saknas'}>
              <Chip
                label={
                  sharesBuyable != null
                    ? `≈ Skulle räcka till återköp: ${sharesBuyable.toLocaleString('sv-SE')} aktier` + (buyablePercent ? ` (${buyablePercent.toFixed(2)}%)` : '')
                    : 'Skulle räcka till återköp: kurs saknas'
                }
                size="small"
                sx={{ backgroundColor: '#2a2a2a', color: '#fff', border: '1px solid #3a3a3a' }}
              />
            </Tooltip>
            <Tooltip title={`Visuell representation • Antar ${totalSharesOutstanding.toLocaleString('sv-SE')} utestående aktier`}>
              <Chip
                label={perShareToday != null ? `≈ Skulle räcka till: ${(perShareToday).toFixed(2)} SEK per aktie` : 'Skulle räcka till per aktie: uppgift saknas'}
                size="small"
                sx={{ backgroundColor: '#2a2a2a', color: '#fff', border: '1px solid #3a3a3a' }}
              />
            </Tooltip>
          </Box>
        </Box>
      </CardContent>
      {/* Info-dialog (förklaring) */}
      <Dialog
        open={openInfo}
        onClose={() => setOpenInfo(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            backgroundColor: '#1f1f1f',
            color: '#fff',
            border: '1px solid #2b2b2b',
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff' }}>Vad skulle dagens vinst räcka till?</DialogTitle>
        <DialogContent dividers sx={{ borderColor: '#2b2b2b' }}>
          <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 1 }}>
            Dagens vinst hittills: <b>{money(todayProfit)}</b> (EUR→SEK: {fxRate.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
          </Typography>
          <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 0.5 }}>
            • Skulle räcka till återköp av cirka <b>{sharesBuyable != null ? sharesBuyable.toLocaleString('sv-SE') : '–'}</b> aktier
            {buyablePercent != null ? <> ({buyablePercent.toFixed(2)}% av utestående)</> : null}
            {currentPrice ? <> vid antagen kurs {currentPrice.toLocaleString('sv-SE')} SEK</> : null}.
          </Typography>
          <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
            • Alternativt motsvarar det cirka <b>{perShareToday != null ? (perShareToday).toFixed(2) : '–'}</b> SEK per aktie
            (antagna utestående: {totalSharesOutstanding.toLocaleString('sv-SE')}).
          </Typography>
          <Typography variant="caption" sx={{ color: '#808080', display: 'block', mt: 1 }}>
            Detta är en visuell representation. Beräkningarna är förenklade och bortser från avgifter, skatter och timing.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #2b2b2b' }}>
          <Button onClick={() => setOpenInfo(false)} sx={{ color: '#ff6f6f' }}>Stäng</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default MoneyCounter;
