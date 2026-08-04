"use client";

// Visualizes verified treasury shares and an explicitly illustrative intraday buyback pace.
import { useEffect, useMemo, useState } from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { useTranslate } from "@/context/LocaleContext";
import {
  buildSharePoolForecastWindow,
  calculateIllustrativeSharePool,
} from "@/lib/buybackSharePool";

const COLORS = {
  surface: "rgba(15,23,42,0.62)",
  border: "rgba(148,163,184,0.18)",
  primary: "#f8fafc",
  secondary: "rgba(203,213,225,0.78)",
  accent: "#38bdf8",
  success: "#6ee7b7",
};

const formatShares = (value, maximumFractionDigits = 0) => Number(value || 0).toLocaleString("sv-SE", { maximumFractionDigits });

const getStockholmTimeParts = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Stockholm",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  return values;
};

const getForecastWindow = ({ latestWeekEnd, reportedEarly, tradingDays }) => {
  const parts = getStockholmTimeParts();
  const secondsToday = (parts.hour || 0) * 3_600 + (parts.minute || 0) * 60 + (parts.second || 0);
  const currentDate = `${parts.year}-${String(parts.month || 1).padStart(2, "0")}-${String(parts.day || 1).padStart(2, "0")}`;
  return buildSharePoolForecastWindow({
    verifiedDate: latestWeekEnd,
    reportedEarly,
    tradingDays,
    currentDate,
    secondsToday,
  });
};

export default function SharePoolView({
  totalShares = 0,
  verifiedTreasuryShares = 0,
  latestWeekShares = 0,
  latestWeekTradingDays = 0,
  latestWeekEnd,
  displayWeekEnd,
  isForecast = false,
  reportedEarly = false,
  verifiedSharesThisWeek = 0,
}) {
  const translate = useTranslate();
  const [forecastWindow, setForecastWindow] = useState({ secondsElapsed: 0, forecastDays: latestWeekTradingDays });

  useEffect(() => {
    const update = () => setForecastWindow(getForecastWindow({
      latestWeekEnd,
      reportedEarly,
      tradingDays: latestWeekTradingDays,
    }));
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [latestWeekEnd, latestWeekTradingDays, reportedEarly]);

  const pool = useMemo(
    () => calculateIllustrativeSharePool({
      totalShares,
      verifiedTreasuryShares,
      latestWeekShares,
      tradingDays: latestWeekTradingDays,
      forecastDays: forecastWindow.forecastDays,
      verifiedSharesThisWeek,
      secondsElapsed: forecastWindow.secondsElapsed,
    }),
    [forecastWindow, latestWeekShares, latestWeekTradingDays, totalShares, verifiedSharesThisWeek, verifiedTreasuryShares]
  );
  const outstandingPct = pool.issuedShares > 0 ? (pool.illustrativeOutstandingShares / pool.issuedShares) * 100 : 0;
  const treasuryPct = pool.issuedShares > 0 ? (pool.illustrativeTreasuryShares / pool.issuedShares) * 100 : 0;
  const weekLabel = (displayWeekEnd || latestWeekEnd) ? new Date(displayWeekEnd || latestWeekEnd).toLocaleDateString("sv-SE") : "–";

  return (
    <Box sx={{ width: "100%", background: COLORS.surface, borderRadius: "20px", border: `1px solid ${COLORS.border}`, boxShadow: "0 18px 40px rgba(8,15,40,0.46)", px: { xs: 1.2, md: 3 }, py: { xs: 2.4, md: 3.2 } }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1.5}>
        <Box>
          <Typography variant="h6" sx={{ color: COLORS.primary, fontWeight: 700, fontSize: { xs: "1.05rem", sm: "1.35rem", md: "1.5rem" } }}>
            {translate("Aktiepoolen i rörelse", "The share pool in motion")}
          </Typography>
          <Typography sx={{ color: COLORS.secondary, lineHeight: 1.6, mt: 0.7, maxWidth: 800 }}>
            {translate("Verifierade återköp uppdateras när veckans data publiceras. Veckoprognosen är utslagen jämnt över måndag–fredag (5 × 24 timmar). Faktiska återköp genomförs under Nasdaq Stockholms öppettider, cirka 09:00–17:30.", "Verified buybacks update when the weekly data is published. The weekly forecast is spread evenly across Monday–Friday (5 × 24 hours). Actual buybacks are executed during Nasdaq Stockholm market hours, approximately 09:00–17:30.")}
          </Typography>
        </Box>
        <Chip label={translate(`${isForecast ? "Prognosvecka" : "Senaste rapportvecka"} slutar ${weekLabel}`, `${isForecast ? "Forecast week" : "Latest report week"} ends ${weekLabel}`)} size="small" sx={{ alignSelf: { xs: "flex-start", md: "flex-start" }, color: "#bae6fd", backgroundColor: "rgba(14,116,144,0.25)", border: "1px solid rgba(56,189,248,0.3)" }} />
      </Stack>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr auto 1fr" }, gap: 1.6, alignItems: "stretch", mt: 2.5 }}>
        <Box sx={{ border: "1px solid rgba(56,189,248,0.32)", borderRadius: "16px", p: 2.1, background: "linear-gradient(135deg, rgba(56,189,248,0.18), rgba(15,23,42,0.6))" }}>
          <Typography variant="subtitle2" sx={{ color: COLORS.secondary }}>{translate("Utestående aktier", "Outstanding shares")}</Typography>
          <Typography variant="h4" sx={{ color: COLORS.primary, fontWeight: 800, mt: 0.55 }}>{formatShares(pool.illustrativeOutstandingShares)}</Typography>
          <Typography variant="body2" sx={{ color: COLORS.secondary, mt: 0.6 }}>{formatShares(outstandingPct, 2)}% {translate("av utgivna aktier", "of issued shares")}</Typography>
        </Box>

        <Stack alignItems="center" justifyContent="center" sx={{ px: { xs: 0, md: 0.6 }, minWidth: 115 }}>
          <Typography sx={{ color: COLORS.accent, fontWeight: 800, fontSize: "1.55rem", lineHeight: 1 }}>→</Typography>
          <Typography variant="caption" sx={{ color: COLORS.secondary, textAlign: "center", mt: 0.35 }}>
            {formatShares(pool.sharesPerSecond, 3)} {translate("aktier/sek", "shares/sec")}
          </Typography>
          <Typography variant="caption" sx={{ color: COLORS.secondary, textAlign: "center" }}>
            {formatShares(pool.dailyShares)} {translate("aktier/dygn", "shares/day")}
          </Typography>
        </Stack>

        <Box sx={{ border: "1px solid rgba(110,231,183,0.32)", borderRadius: "16px", p: 2.1, background: "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(15,23,42,0.6))" }}>
          <Typography variant="subtitle2" sx={{ color: COLORS.secondary }}>{translate("Evolutions egna aktier", "Evolution treasury shares")}</Typography>
          <Typography variant="h4" sx={{ color: COLORS.primary, fontWeight: 800, mt: 0.55 }}>{formatShares(pool.illustrativeTreasuryShares)}</Typography>
          <Typography variant="body2" sx={{ color: COLORS.secondary, mt: 0.6 }}>{formatShares(treasuryPct, 2)}% {translate("av utgivna aktier", "of issued shares")}</Typography>
        </Box>
      </Box>

      <Box sx={{ mt: 2.2, height: 18, borderRadius: "999px", overflow: "hidden", display: "flex", background: "rgba(148,163,184,0.12)", border: "1px solid rgba(148,163,184,0.16)" }} aria-label={translate("Fördelning mellan utestående aktier och Evolutions egna aktier", "Distribution between outstanding and Evolution treasury shares")}>
        <Box sx={{ width: `${outstandingPct}%`, background: "linear-gradient(90deg, rgba(56,189,248,0.76), rgba(56,189,248,0.45))", transition: "width 900ms linear" }} />
        <Box sx={{ width: `${treasuryPct}%`, background: "linear-gradient(90deg, rgba(110,231,183,0.55), rgba(110,231,183,0.9))", transition: "width 900ms linear" }} />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" }, gap: 1.4, mt: 2.1 }}>
        <Box><Typography variant="caption" sx={{ color: COLORS.secondary }}>{translate("Utgivna aktier", "Issued shares")}</Typography><Typography sx={{ color: COLORS.primary, fontWeight: 700 }}>{formatShares(pool.issuedShares)}</Typography></Box>
        <Box><Typography variant="caption" sx={{ color: COLORS.secondary }}>{translate("Verifierat EVO-innehav", "Verified EVO holding")}</Typography><Typography sx={{ color: COLORS.success, fontWeight: 700 }}>{formatShares(pool.verifiedTreasuryShares)}</Typography></Box>
        <Box>
          <Typography variant="caption" sx={{ color: COLORS.secondary }}>
            {translate("Köpt / estimerat denna vecka", "Bought / estimated this week")}
          </Typography>
          <Typography sx={{ color: COLORS.accent, fontWeight: 700 }}>+{formatShares(pool.estimatedWeekToDateShares)}</Typography>
          {reportedEarly ? (
            <Typography variant="caption" sx={{ color: COLORS.secondary, display: "block", mt: 0.25 }}>
              {translate(
                `${formatShares(verifiedSharesThisWeek)} verifierat + ${formatShares(pool.illustrativeBoughtSinceWeekStart)} estimerat`,
                `${formatShares(verifiedSharesThisWeek)} verified + ${formatShares(pool.illustrativeBoughtSinceWeekStart)} estimated`
              )}
            </Typography>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
