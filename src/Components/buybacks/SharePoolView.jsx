"use client";

// Visualizes verified treasury shares and an explicitly illustrative intraday buyback pace.
import { useEffect, useMemo, useState } from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { useTranslate } from "@/context/LocaleContext";
import { calculateIllustrativeSharePool, SECONDS_PER_DAY } from "@/lib/buybackSharePool";

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

const getEstimateSecondsSinceVerifiedWeek = (latestWeekEnd) => {
  if (!latestWeekEnd) return 0;
  const latest = new Date(latestWeekEnd);
  if (Number.isNaN(latest.getTime())) return 0;

  const parts = getStockholmTimeParts();
  const currentDate = Date.UTC(parts.year, (parts.month || 1) - 1, parts.day || 1);
  const verifiedDate = Date.UTC(latest.getFullYear(), latest.getMonth(), latest.getDate());
  const nextMondayOffset = ((8 - latest.getDay()) % 7) || 7;
  const estimateStart = verifiedDate + nextMondayOffset * SECONDS_PER_DAY * 1_000;
  const elapsedDays = Math.floor((currentDate - estimateStart) / (SECONDS_PER_DAY * 1_000));
  const secondsToday = (parts.hour || 0) * 3_600 + (parts.minute || 0) * 60 + (parts.second || 0);
  return Math.max(elapsedDays * SECONDS_PER_DAY + secondsToday, 0);
};

export default function SharePoolView({
  totalShares = 0,
  verifiedTreasuryShares = 0,
  latestWeekShares = 0,
  latestWeekTradingDays = 0,
  latestWeekEnd,
}) {
  const translate = useTranslate();
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    const update = () => setSecondsElapsed(getEstimateSecondsSinceVerifiedWeek(latestWeekEnd));
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [latestWeekEnd]);

  const pool = useMemo(
    () => calculateIllustrativeSharePool({ totalShares, verifiedTreasuryShares, latestWeekShares, tradingDays: latestWeekTradingDays, secondsElapsed }),
    [latestWeekShares, latestWeekTradingDays, secondsElapsed, totalShares, verifiedTreasuryShares]
  );
  const outstandingPct = pool.issuedShares > 0 ? (pool.illustrativeOutstandingShares / pool.issuedShares) * 100 : 0;
  const treasuryPct = pool.issuedShares > 0 ? (pool.illustrativeTreasuryShares / pool.issuedShares) * 100 : 0;
  const weekLabel = latestWeekEnd ? new Date(latestWeekEnd).toLocaleDateString("sv-SE") : "–";

  return (
    <Box sx={{ width: "100%", background: COLORS.surface, borderRadius: "20px", border: `1px solid ${COLORS.border}`, boxShadow: "0 18px 40px rgba(8,15,40,0.46)", px: { xs: 1.2, md: 3 }, py: { xs: 2.4, md: 3.2 } }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1.5}>
        <Box>
          <Typography variant="h6" sx={{ color: COLORS.primary, fontWeight: 700, fontSize: { xs: "1.05rem", sm: "1.35rem", md: "1.5rem" } }}>
            {translate("Aktiepoolen i rörelse", "The share pool in motion")}
          </Typography>
          <Typography sx={{ color: COLORS.secondary, lineHeight: 1.6, mt: 0.7, maxWidth: 800 }}>
            {translate("Verifierade återköp uppdateras när veckans data publiceras. Från måndag räknar vi en tydligt markerad uppskattning baserad på den senaste veckans takt, tills nästa rapport ersätter den med faktiska köp.", "Verified buybacks update when the weekly data is published. From Monday, we show a clearly marked estimate based on the latest weekly pace until the next report replaces it with actual purchases.")}
          </Typography>
        </Box>
        <Chip label={translate(`Senaste rapportvecka slutar ${weekLabel}`, `Latest report week ends ${weekLabel}`)} size="small" sx={{ alignSelf: { xs: "flex-start", md: "flex-start" }, color: "#bae6fd", backgroundColor: "rgba(14,116,144,0.25)", border: "1px solid rgba(56,189,248,0.3)" }} />
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
        <Box><Typography variant="caption" sx={{ color: COLORS.secondary }}>{translate("Estimerat köpt denna vecka", "Estimated bought this week")}</Typography><Typography sx={{ color: COLORS.accent, fontWeight: 700 }}>+{formatShares(pool.illustrativeBoughtSinceWeekStart)}</Typography></Box>
      </Box>
    </Box>
  );
}
