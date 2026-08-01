"use client";

// Public product teaser that explains EvoTracker without exposing subscriber data.

import NextLink from "next/link";
import {
  Box,
  Button,
  Chip,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import { LOCALE_OPTIONS, useLocale, useTranslate } from "@/context/LocaleContext";
import { buildLandingPreviewModel } from "@/lib/landingPreview";
import { FOUNDER_BENEFITS, FOUNDER_PROGRAM } from "@/config/founderProgram";

const colors = {
  border: "rgba(148, 163, 184, 0.18)",
  text: "#f8fafc",
  muted: "rgba(226, 232, 240, 0.68)",
  cyan: "#82c1ff",
  amber: "#fbbf24",
};

const panelSx = {
  border: `1px solid ${colors.border}`,
  background: "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(17,28,47,0.96))",
  boxShadow: "0 24px 50px rgba(0,0,0,0.28)",
};

const primaryButtonSx = {
  color: "#fff",
  textTransform: "none",
  borderRadius: "10px",
  fontWeight: 750,
  background: "linear-gradient(135deg, #4a90e2, #0077ff)",
  boxShadow: "none",
  "&:hover": {
    background: "linear-gradient(135deg, #5b9bea, #1684ff)",
    boxShadow: "none",
  },
};

function BrandMark() {
  return (
    <Stack direction="row" spacing={1.2} alignItems="center">
      <Box
        aria-hidden="true"
        sx={{
          width: 34,
          height: 34,
          borderRadius: "10px",
          display: "grid",
          placeItems: "center",
          color: colors.cyan,
          background: "linear-gradient(135deg, rgba(30,41,59,0.98), rgba(15,23,42,0.98))",
          border: "1px solid rgba(130,193,255,0.42)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
        }}
      >
        <QueryStatsRoundedIcon sx={{ fontSize: 21 }} />
      </Box>
      <Typography sx={{ display: { xs: "none", sm: "block" }, color: colors.text, fontWeight: 800, letterSpacing: "0.08em", fontSize: 15 }}>
        EVOTRACKER
      </Typography>
    </Stack>
  );
}

function LocalePicker() {
  const { locale, setLocale } = useLocale();
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={locale}
      onChange={(_, value) => value && setLocale(value)}
      aria-label="Language"
      sx={{ p: 0.35, borderRadius: "999px", backgroundColor: "rgba(148,163,184,0.08)" }}
    >
      {LOCALE_OPTIONS.map((option) => (
        <ToggleButton
          key={option.value}
          value={option.value}
          sx={{
            px: 1.15,
            py: 0.55,
            border: 0,
            borderRadius: "999px !important",
            color: colors.muted,
            fontSize: 12,
            fontWeight: 700,
            "&.Mui-selected": { color: "#0f172a", backgroundColor: "#f8fafc" },
          }}
        >
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

function PreviewChart() {
  return (
    <Box component="svg" viewBox="0 0 620 176" role="img" aria-label="Illustrative player trend" sx={{ width: "100%", display: "block" }}>
      <defs>
        <linearGradient id="preview-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a90e2" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#4a90e2" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="preview-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#82c1ff" />
          <stop offset="100%" stopColor="#4a90e2" />
        </linearGradient>
      </defs>
      {[30, 76, 122, 168].map((y) => (
        <line key={y} x1="0" x2="620" y1={y} y2={y} stroke="rgba(148,163,184,0.12)" strokeDasharray="4 7" />
      ))}
      <path d="M0 146 C38 138 52 111 89 119 S143 152 181 129 S225 89 264 99 S316 131 351 105 S402 54 448 73 S507 96 542 58 S584 35 620 21 L620 176 L0 176 Z" fill="url(#preview-area)" />
      <path d="M0 146 C38 138 52 111 89 119 S143 152 181 129 S225 89 264 99 S316 131 351 105 S402 54 448 73 S507 96 542 58 S584 35 620 21" fill="none" stroke="url(#preview-line)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="620" cy="21" r="6" fill="#82c1ff" />
      <circle cx="620" cy="21" r="13" fill="none" stroke="#82c1ff" strokeOpacity="0.28" />
    </Box>
  );
}

function MetricCard({ icon, label, value, unit, accent, status }) {
  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2.5, border: `1px solid ${colors.border}`, background: "rgba(15,23,42,0.58)" }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 30, height: 30, borderRadius: 1.5, display: "grid", placeItems: "center", color: accent, backgroundColor: `${accent}18` }}>
            {icon}
          </Box>
          <Typography sx={{ color: colors.muted, fontSize: 12, fontWeight: 650 }}>{label}</Typography>
        </Stack>
        <Box sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: status === "live" ? "#4ade80" : colors.amber }} />
      </Stack>
      <Stack direction="row" spacing={0.7} alignItems="baseline" sx={{ mt: 1.7 }}>
        <Typography aria-hidden="true" sx={{ color: colors.text, fontSize: { xs: 23, sm: 28 }, fontWeight: 780, letterSpacing: "0.03em", filter: "blur(4px)", userSelect: "none" }}>
          {value}
        </Typography>
        <Typography sx={{ color: colors.muted, fontSize: 12, fontWeight: 650 }}>{unit}</Typography>
      </Stack>
    </Box>
  );
}

function ProductPreview({ model, translate }) {
  return (
    <Box sx={{ ...panelSx, position: "relative", borderRadius: { xs: 3, md: 4 }, p: { xs: 1.5, sm: 2.2 }, overflow: "hidden" }}>
      <Box aria-hidden="true" sx={{ position: "absolute", width: 300, height: 300, right: -110, top: -150, borderRadius: "50%", background: "rgba(74,144,226,0.08)", filter: "blur(60px)" }} />
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ position: "relative", px: 0.5, pb: 1.8 }}>
        <Box>
          <Typography sx={{ color: colors.text, fontWeight: 750, fontSize: 14 }}>{translate("Live intelligence", "Live intelligence")}</Typography>
          <Typography sx={{ color: colors.muted, fontSize: 11, mt: 0.2 }}>{translate("Lobbyöversikt · idag", "Lobby overview · today")}</Typography>
        </Box>
        <Chip icon={<LockRoundedIcon sx={{ fontSize: "14px !important" }} />} label={translate("Förhandsvisning", "Preview")} size="small" sx={{ color: "#cbd5e1", backgroundColor: "rgba(148,163,184,0.10)", border: `1px solid ${colors.border}`, fontWeight: 700, fontSize: 10 }} />
      </Stack>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" }, gap: 1.2, position: "relative" }}>
        {model.metrics.map((metric, index) => (
          <Box key={metric.id} sx={{ gridColumn: { xs: index === 2 ? "1 / -1" : "auto", sm: "auto" } }}>
            <MetricCard
              {...metric}
              accent={colors.cyan}
              icon={[<GroupsRoundedIcon key="players" fontSize="small" />, <ShowChartRoundedIcon key="trend" fontSize="small" />, <AutoGraphRoundedIcon key="forecast" fontSize="small" />][index]}
            />
          </Box>
        ))}
      </Box>

      <Box sx={{ mt: 1.2, p: { xs: 1.5, sm: 2 }, borderRadius: 2.5, border: `1px solid ${colors.border}`, background: "rgba(15,23,42,0.58)", position: "relative" }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
          <Box>
            <Typography sx={{ color: colors.text, fontSize: 13, fontWeight: 700 }}>{translate("Spelartrend över tid", "Player trend over time")}</Typography>
            <Typography sx={{ color: colors.muted, fontSize: 11 }}>{translate("7 d · 30 d · 90 d · glidande medelvärde", "7d · 30d · 90d · moving average")}</Typography>
          </Box>
          <Stack direction="row" spacing={0.7} alignItems="center">
            <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#4ade80" }} />
            <Typography sx={{ color: colors.muted, fontSize: 11 }}>{translate("Uppdateras automatiskt", "Updates automatically")}</Typography>
          </Stack>
        </Stack>
        <PreviewChart />
      </Box>

      <Box sx={{ position: "absolute", inset: "40% 0 0", background: "linear-gradient(180deg, transparent, rgba(15,23,42,0.90) 42%, rgba(15,23,42,0.99))", display: "flex", alignItems: "flex-end", justifyContent: "center", pb: 2.4, px: 2 }}>
        <Stack alignItems="center" spacing={1.1}>
          <Stack direction="row" spacing={0.8} alignItems="center">
            <LockRoundedIcon sx={{ color: colors.cyan, fontSize: 17 }} />
            <Typography sx={{ color: colors.text, fontSize: 13, fontWeight: 750 }}>{translate("Lås upp korrekta livevärden", "Unlock accurate live values")}</Typography>
          </Stack>
          <Button component={NextLink} href="/register" size="small" variant="contained" endIcon={<ArrowForwardRoundedIcon />} sx={{ ...primaryButtonSx, px: 2 }}>
            {translate("Skapa kostnadsfritt konto", "Create free account")}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

const featureIcons = [GroupsRoundedIcon, QueryStatsRoundedIcon, InsightsRoundedIcon];

function FeatureCard({ feature, index }) {
  const Icon = featureIcons[index];
  const accent = colors.cyan;
  return (
    <Box sx={{ ...panelSx, borderRadius: 3, p: { xs: 2.5, md: 3 }, minHeight: 238, transition: "transform 180ms ease, border-color 180ms ease", "&:hover": { transform: "translateY(-4px)", borderColor: `${accent}55` } }}>
      <Box sx={{ width: 44, height: 44, borderRadius: 2, display: "grid", placeItems: "center", color: accent, backgroundColor: `${accent}16`, border: `1px solid ${accent}25` }}>
        <Icon />
      </Box>
      <Typography component="h3" sx={{ color: colors.text, fontSize: 19, fontWeight: 750, mt: 2.3 }}>{feature.title}</Typography>
      <Typography sx={{ color: colors.muted, fontSize: 14, lineHeight: 1.7, mt: 1 }}>{feature.description}</Typography>
      <Stack direction="row" spacing={0.7} alignItems="center" sx={{ mt: 2 }}>
        <CheckRoundedIcon sx={{ color: accent, fontSize: 17 }} />
        <Typography sx={{ color: "#cbd5e1", fontSize: 12.5, fontWeight: 650 }}>{feature.detail}</Typography>
      </Stack>
    </Box>
  );
}

function ReportPreview({ translate }) {
  const rows = [78, 64, 88, 53];
  return (
    <Box sx={{ ...panelSx, borderRadius: { xs: 3, md: 4 }, p: { xs: 2.5, sm: 3.5, md: 4.5 }, display: "grid", gridTemplateColumns: { xs: "1fr", md: "0.85fr 1.15fr" }, gap: { xs: 3, md: 6 }, alignItems: "center" }}>
      <Box>
        <Chip label={translate("RAPPORTINTELLIGENS", "REPORT INTELLIGENCE")} size="small" sx={{ color: "#cbd5e1", backgroundColor: "rgba(148,163,184,0.10)", border: `1px solid ${colors.border}`, fontWeight: 800, letterSpacing: "0.08em", fontSize: 10 }} />
        <Typography component="h2" sx={{ color: colors.text, fontSize: { xs: 28, md: 36 }, lineHeight: 1.15, fontWeight: 780, mt: 2 }}>
          {translate("Förstå rapporten — inte bara rubriken.", "Understand the report — not just the headline.")}
        </Typography>
        <Typography sx={{ color: colors.muted, lineHeight: 1.75, mt: 1.7, maxWidth: 470 }}>
          {translate("Följ omsättning, marginaler och geografisk mix kvartal för kvartal. EvoTracker sätter rapporterade siffror i kontext med lobbyaktivitet och historisk utveckling.", "Follow revenue, margins and geographic mix quarter by quarter. EvoTracker puts reported figures in context with lobby activity and historical development.")}
        </Typography>
        <Stack spacing={1.2} sx={{ mt: 2.5 }}>
          {[translate("Regional och produktbaserad intäktsmix", "Revenue mix by region and product"), translate("Historiska jämförelser och toppnoteringar", "Historical comparisons and all-time highs"), translate("Utdelning, återköp och ägaravkastning", "Dividends, buybacks and shareholder returns")].map((item) => (
            <Stack key={item} direction="row" spacing={1} alignItems="center">
              <CheckRoundedIcon sx={{ color: colors.cyan, fontSize: 18 }} />
              <Typography sx={{ color: "#d7e0ea", fontSize: 13.5 }}>{item}</Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      <Box sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: `1px solid ${colors.border}`, background: "rgba(7,16,25,0.68)", position: "relative", overflow: "hidden" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography sx={{ color: colors.text, fontWeight: 720, fontSize: 14 }}>{translate("Intäkter per region", "Revenue by region")}</Typography>
            <Typography sx={{ color: colors.muted, fontSize: 11 }}>{translate("Kvartalsvis utveckling", "Quarterly development")}</Typography>
          </Box>
          <BarChartRoundedIcon sx={{ color: colors.cyan }} />
        </Stack>
        <Stack spacing={1.6} sx={{ mt: 3 }}>
          {[translate("Europa", "Europe"), translate("Asien", "Asia"), translate("Nordamerika", "North America"), translate("Latinamerika", "Latin America")].map((label, index) => (
            <Box key={label}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.65 }}>
                <Typography sx={{ color: "#cbd5e1", fontSize: 12 }}>{label}</Typography>
                <Typography sx={{ color: colors.muted, fontSize: 11, filter: "blur(3px)" }}>00,0 MEUR</Typography>
              </Stack>
              <Box sx={{ height: 7, borderRadius: 999, bgcolor: "rgba(148,163,184,0.1)", overflow: "hidden" }}>
                <Box sx={{ height: "100%", width: `${rows[index]}%`, borderRadius: 999, background: `linear-gradient(90deg, ${index % 2 ? "#4a90e2" : "#60a5fa"}, ${index % 2 ? "#82c1ff" : "#4a90e2"})` }} />
              </Box>
            </Box>
          ))}
        </Stack>
        <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(110deg, transparent 35%, rgba(7,16,25,0.52) 60%, rgba(7,16,25,0.88))" }} />
        <Chip icon={<LockRoundedIcon sx={{ fontSize: "14px !important" }} />} label={translate("Full data efter inloggning", "Full data after sign in")} size="small" sx={{ position: "absolute", right: 18, bottom: 18, color: colors.text, bgcolor: "rgba(15,23,42,0.92)", border: `1px solid ${colors.border}`, fontWeight: 700, fontSize: 10 }} />
      </Box>
    </Box>
  );
}

export default function LiveLoggedOutPreview() {
  const translate = useTranslate();
  const { locale } = useLocale();
  const model = buildLandingPreviewModel(locale);

  return (
    <Box sx={{ minHeight: "100vh", background: `radial-gradient(circle at 78% 8%, rgba(74,144,226,0.07), transparent 28%), linear-gradient(180deg, #151719, #111315 70%, #151719)`, color: colors.text, overflow: "hidden" }}>
      <Box component="nav" aria-label={translate("Huvudnavigation", "Main navigation")} sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, py: 2.2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <BrandMark />
        <Stack direction="row" spacing={{ xs: 1, sm: 2 }} alignItems="center">
          <Button component={NextLink} href="/founders" variant="text" sx={{ display: { xs: "none", md: "inline-flex" }, color: "#fde68a", textTransform: "none", fontWeight: 700 }}>{translate("Founders", "Founders")}</Button>
          <LocalePicker />
          <Button component={NextLink} href="/login" variant="text" sx={{ display: { xs: "none", sm: "inline-flex" }, color: "#dbe7f2", textTransform: "none", fontWeight: 700 }}>{translate("Logga in", "Log in")}</Button>
          <Button component={NextLink} href="/register" variant="outlined" sx={{ px: { xs: 1.25, sm: 2 }, color: colors.text, borderColor: "rgba(148,163,184,0.36)", borderRadius: "10px", textTransform: "none", whiteSpace: "nowrap", fontSize: { xs: 12, sm: 14 }, fontWeight: 750, "&:hover": { borderColor: "rgba(130,193,255,0.72)", backgroundColor: "rgba(74,144,226,0.08)" } }}>{translate("Skapa konto", "Create account")}</Button>
        </Stack>
      </Box>

      <Box component="section" sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, pt: { xs: 6, md: 10 }, pb: { xs: 8, md: 12 }, display: "grid", gridTemplateColumns: { xs: "1fr", lg: "0.88fr 1.12fr" }, gap: { xs: 6, lg: 7 }, alignItems: "center" }}>
        <Box>
          <Chip icon={<PublicRoundedIcon sx={{ fontSize: "15px !important" }} />} label={translate("EVOLUTION DATA · SAMLAD PÅ ETT STÄLLE", "EVOLUTION DATA · ALL IN ONE PLACE")} size="small" sx={{ color: "#dbe7f2", bgcolor: "rgba(148,163,184,0.08)", border: `1px solid ${colors.border}`, fontWeight: 800, letterSpacing: "0.06em", fontSize: 10 }} />
          <Typography component="h1" sx={{ mt: 2.5, fontSize: { xs: 42, sm: 58, lg: 64 }, lineHeight: 1.02, letterSpacing: "-0.045em", fontWeight: 800, maxWidth: 610 }}>
            {translate("Från live-lobby till", "From live lobby to")} <Box component="span">{translate("kvartalsforecast.", "quarterly forecast.")}</Box>
          </Typography>
          <Typography sx={{ mt: 2.5, color: "#a6b5c6", fontSize: { xs: 17, sm: 19 }, lineHeight: 1.65, maxWidth: 580 }}>
            {translate("EvoTracker samlar lobbyaktivitet, spelartrender och finansiella rapporter i en tydlig vy — så att du snabbare ser vad som förändras och varför det spelar roll.", "EvoTracker brings lobby activity, player trends and financial reports into one clear view — helping you see what is changing and why it matters.")}
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 3.5, alignItems: { xs: "stretch", sm: "center" } }}>
            <Button component={NextLink} href="/register" size="large" variant="contained" endIcon={<ArrowForwardRoundedIcon />} sx={{ ...primaryButtonSx, minHeight: 52, px: 3, borderRadius: "12px" }}>{translate("Skapa kostnadsfritt konto", "Create free account")}</Button>
            <Button
              component={NextLink}
              href="/login"
              size="large"
              variant="outlined"
              sx={{
                minHeight: 52,
                px: 2.5,
                color: "#dbe7f2",
                borderColor: "rgba(148,163,184,0.42)",
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 750,
                whiteSpace: "nowrap",
                "&:hover": {
                  borderColor: "rgba(130,193,255,0.78)",
                  backgroundColor: "rgba(74,144,226,0.1)",
                },
              }}
            >
              {translate("Jag har redan ett konto", "I already have an account")}
            </Button>
          </Stack>
          <Stack direction="row" flexWrap="wrap" gap={1.8} sx={{ mt: 3 }}>
            {[translate("Live-lobby", "Live lobby"), translate("Trendgrafer", "Trend charts"), translate("Rapporter & forecast", "Reports & forecast")].map((item) => (
              <Stack key={item} direction="row" spacing={0.6} alignItems="center">
                <CheckRoundedIcon sx={{ color: colors.cyan, fontSize: 16 }} />
                <Typography sx={{ color: colors.muted, fontSize: 12.5 }}>{item}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
        <ProductPreview model={model} translate={translate} />
      </Box>

      <Box component="section" sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, pb: { xs: 9, md: 13 } }}>
        <Box sx={{ textAlign: "center", maxWidth: 710, mx: "auto", mb: 5 }}>
          <Typography sx={{ color: "#cbd5e1", fontSize: 11, fontWeight: 850, letterSpacing: "0.14em" }}>{translate("BYGGT FÖR ATT HITTA SAMBAND", "BUILT TO CONNECT THE DOTS")}</Typography>
          <Typography component="h2" sx={{ color: colors.text, fontSize: { xs: 30, md: 42 }, fontWeight: 780, letterSpacing: "-0.03em", mt: 1.5 }}>{translate("Mer signal. Mindre brus.", "More signal. Less noise.")}</Typography>
          <Typography sx={{ color: colors.muted, mt: 1.4, lineHeight: 1.7 }}>{translate("Från vad som händer i lobbyn just nu till hur utvecklingen kan slå igenom i nästa kvartal.", "From what is happening in the lobby right now to how the trend may flow through to the next quarter.")}</Typography>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2.2 }}>
          {model.features.map((feature, index) => <FeatureCard key={feature.id} feature={feature} index={index} />)}
        </Box>
      </Box>

      <Box component="section" sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, pb: { xs: 9, md: 13 } }}>
        <ReportPreview translate={translate} />
      </Box>

      <Box component="section" sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, pb: { xs: 9, md: 13 } }}>
        <Box sx={{ ...panelSx, borderRadius: { xs: 3, md: 4 }, px: { xs: 2.5, md: 4 }, py: { xs: 3, md: 3.5 }, display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(230px, 0.7fr) minmax(0, 1.3fr) auto" }, gap: 2.5, alignItems: "center" }}>
          <Box>
            <Chip icon={<WorkspacePremiumRoundedIcon sx={{ fontSize: "15px!important" }} />} label={translate(`ENDAST ${FOUNDER_PROGRAM.maximumFounders} PLATSER`, `ONLY ${FOUNDER_PROGRAM.maximumFounders} PLACES`)} size="small" sx={{ color: "#fde68a", backgroundColor: "rgba(245,158,11,0.08)", fontWeight: 800, fontSize: 10 }} />
            <Typography component="h2" sx={{ color: colors.text, fontSize: { xs: 24, md: 29 }, fontWeight: 780, mt: 1.2 }}>
              {translate("Bli en av EvoTrackers Founders", "Become an EvoTracker Founder")}
            </Typography>
            <Typography sx={{ color: colors.muted, fontSize: 12.5, lineHeight: 1.55, mt: 0.7 }}>
              {translate(
                `När dina donationer tillsammans når ${FOUNDER_PROGRAM.minimumDonationSek} kr. Flera donationer räknas ihop.`,
                `When your combined donations reach SEK ${FOUNDER_PROGRAM.minimumDonationSek}. Multiple donations are added together.`
              )}
            </Typography>
          </Box>
          <Stack spacing={0.8}>
            {FOUNDER_BENEFITS.map((benefit) => (
              <Stack key={benefit.id} direction="row" spacing={0.8} alignItems="center">
                <CheckRoundedIcon sx={{ color: "#fde68a", fontSize: 17 }} />
                <Typography sx={{ color: colors.muted, fontSize: 13 }}>
                  {translate(benefit.title.sv, benefit.title.en)}
                </Typography>
              </Stack>
            ))}
          </Stack>
          <Button component={NextLink} href="/founders" variant="outlined" endIcon={<ArrowForwardRoundedIcon />} sx={{ color: "#fde68a", borderColor: "rgba(245,158,11,0.36)", textTransform: "none", fontWeight: 750, whiteSpace: "nowrap" }}>
            {translate("Se Founder-programmet", "View Founder program")}
          </Button>
        </Box>
      </Box>

      <Box component="section" sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, pb: 6 }}>
        <Box sx={{ borderRadius: { xs: 3, md: 4 }, px: { xs: 2.5, md: 7 }, py: { xs: 5, md: 6.5 }, textAlign: "center", border: `1px solid ${colors.border}`, background: "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(17,28,47,0.96))", boxShadow: "0 24px 50px rgba(0,0,0,0.24)" }}>
          <AutoGraphRoundedIcon sx={{ color: colors.cyan, fontSize: 34 }} />
          <Typography component="h2" sx={{ color: colors.text, fontSize: { xs: 29, md: 40 }, fontWeight: 780, letterSpacing: "-0.03em", mt: 1.5 }}>{translate("Se hela bilden bakom Evolution.", "See the full picture behind Evolution.")}</Typography>
          <Typography sx={{ color: colors.muted, mt: 1.3, maxWidth: 590, mx: "auto", lineHeight: 1.7 }}>{translate("Skapa ett konto för korrekta livevärden, kompletta grafer, historiska rapporter och EvoTrackers kvartalsforecast.", "Create an account for accurate live values, complete charts, historical reports and EvoTracker's quarterly forecast.")}</Typography>
          <Button component={NextLink} href="/register" size="large" variant="contained" endIcon={<ArrowForwardRoundedIcon />} sx={{ ...primaryButtonSx, mt: 3, minHeight: 52, px: 3.5, borderRadius: "12px" }}>{translate("Kom igång kostnadsfritt", "Get started for free")}</Button>
          <Typography sx={{ color: "#718399", fontSize: 11.5, mt: 1.5 }}>{model.disclosure}</Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" spacing={2} sx={{ pt: 4, color: "#64748b" }}>
          <BrandMark />
          <Typography sx={{ fontSize: 11.5, textAlign: "center" }}>{translate("Oberoende analystjänst · Inte finansiell rådgivning", "Independent analytics service · Not financial advice")}</Typography>
          <Button component={NextLink} href="/founders" size="small" sx={{ color: "#94a3b8", textTransform: "none", fontSize: 11.5 }}>{translate("Founders", "Founders")}</Button>
        </Stack>
      </Box>
    </Box>
  );
}
