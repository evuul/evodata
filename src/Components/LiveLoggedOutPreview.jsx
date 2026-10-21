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
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import { LOCALE_OPTIONS, useLocale, useTranslate } from "@/context/LocaleContext";
import { buildLandingPreviewModel } from "@/lib/landingPreview";
import { FOUNDER_BENEFITS, FOUNDER_PROGRAM } from "@/config/founderProgram";
import { PREMIUM_BENEFITS, PREMIUM_PROGRAM } from "@/config/premiumProgram";
import ProductPreview from "./LandingProductPreview";
import AccessComparison from "./AccessComparison";
import { colors, panelSx, primaryButtonSx } from "./landingStyles";

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
      aria-label={locale === "en" ? "Language" : "Språk"}
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

const featureIcons = [GroupsRoundedIcon, QueryStatsRoundedIcon, InsightsRoundedIcon];

function FeatureCard({ feature, index }) {
  const Icon = featureIcons[index];
  const accent = colors.cyan;
  return (
    <Box sx={{ ...panelSx, borderRadius: 3, p: { xs: 2.25, md: 3 }, minHeight: { xs: 220, md: 238 }, transition: "transform 180ms ease, border-color 180ms ease", "&:hover": { transform: "translateY(-4px)", borderColor: `${accent}55` } }}>
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
  const { locale } = useLocale();
  const rows = [44, 32, 16, 8];
  return (
    <Box sx={{ ...panelSx, borderRadius: { xs: 3, md: 4 }, p: { xs: 2.25, sm: 3.5, md: 4.5 }, display: "grid", gridTemplateColumns: { xs: "1fr", md: "0.85fr 1.15fr" }, gap: { xs: 2.5, md: 5 }, alignItems: "center" }}>
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
            <Typography sx={{ color: colors.muted, fontSize: 11 }}>{translate("Exempeldata · illustrativ fördelning", "Example data · illustrative mix")}</Typography>
          </Box>
          <BarChartRoundedIcon sx={{ color: colors.cyan }} />
        </Stack>
        <Stack spacing={1.6} sx={{ mt: 3 }}>
          {[translate("Europa", "Europe"), translate("Asien", "Asia"), translate("Nordamerika", "North America"), translate("Latinamerika", "Latin America")].map((label, index) => (
            <Box key={label}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.65 }}>
                <Typography sx={{ color: "#cbd5e1", fontSize: 12 }}>{label}</Typography>
                <Typography sx={{ color: colors.muted, fontSize: 11, fontVariantNumeric: "tabular-nums" }}>{[176, 128, 64, 32][index].toLocaleString(locale === "en" ? "en-GB" : "sv-SE")} MEUR</Typography>
              </Stack>
              <Box sx={{ height: 7, borderRadius: 999, bgcolor: "rgba(148,163,184,0.1)", overflow: "hidden" }}>
                <Box sx={{ height: "100%", width: `${rows[index]}%`, borderRadius: 999, background: `linear-gradient(90deg, ${index % 2 ? "#4a90e2" : "#60a5fa"}, ${index % 2 ? "#82c1ff" : "#4a90e2"})` }} />
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

export default function LiveLoggedOutPreview() {
  const translate = useTranslate();
  const { locale } = useLocale();
  const model = buildLandingPreviewModel(locale);

  return (
    <Box sx={{ minHeight: "100vh", background: `radial-gradient(circle at 78% 8%, rgba(74,144,226,0.09), transparent 28%), linear-gradient(180deg, #0b1424, #0f1b2c 70%, #0b1424)`, color: colors.text, overflow: "hidden" }}>
      <Box component="nav" aria-label={translate("Huvudnavigation", "Main navigation")} sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 1.8 }, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <BrandMark />
        <Stack direction="row" spacing={{ xs: 1, sm: 2 }} alignItems="center">
          <Button component={NextLink} href="/founders" variant="text" sx={{ display: { xs: "none", md: "inline-flex" }, color: "#fde68a", textTransform: "none", fontWeight: 700 }}>{translate("Founders", "Founders")}</Button>
          <Button component={NextLink} href="/premium" variant="text" sx={{ display: { xs: "none", lg: "inline-flex" }, color: "#7dd3fc", textTransform: "none", fontWeight: 700 }}>{translate("Premium", "Premium")}</Button>
          <LocalePicker />
          <Button component={NextLink} href="/login" variant="text" sx={{ display: { xs: "none", sm: "inline-flex" }, color: "#dbe7f2", textTransform: "none", fontWeight: 700 }}>{translate("Logga in", "Log in")}</Button>
          <Button
            component={NextLink}
            href="/register"
            variant="contained"
            size="small"
            endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: "16px !important" }} />}
            sx={{
              ...primaryButtonSx,
              minHeight: { xs: 36, sm: 40 },
              px: { xs: 1.35, sm: 2.1 },
              borderRadius: "10px",
              fontSize: { xs: 12, sm: 14 },
              whiteSpace: "nowrap",
              "&:hover": {
                ...primaryButtonSx["&:hover"],
                transform: "translateY(-1px)",
              },
            }}
          >
            {translate("Skapa konto", "Create account")}
          </Button>
        </Stack>
      </Box>

      <Box component="section" sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, pt: { xs: 4.5, md: 7 }, pb: { xs: 5.5, md: 8 }, display: "grid", gridTemplateColumns: { xs: "1fr", lg: "0.88fr 1.12fr" }, gap: { xs: 4.5, lg: 6 }, alignItems: "center" }}>
        <Box>
          <Chip icon={<PublicRoundedIcon sx={{ fontSize: "15px !important" }} />} label={translate("EVOLUTION DATA · SAMLAD PÅ ETT STÄLLE", "EVOLUTION DATA · ALL IN ONE PLACE")} size="small" sx={{ color: "#dbe7f2", bgcolor: "rgba(148,163,184,0.08)", border: `1px solid ${colors.border}`, fontWeight: 800, letterSpacing: "0.06em", fontSize: 10 }} />
          <Typography component="h1" sx={{ mt: 2.25, fontSize: { xs: 38, sm: 56, lg: 62 }, lineHeight: 1.04, letterSpacing: "-0.045em", fontWeight: 800, maxWidth: 610 }}>
            {translate("Från live-lobby till", "From live lobby to")} <Box component="span">{translate("kvartalsforecast.", "quarterly forecast.")}</Box>
          </Typography>
          <Typography sx={{ mt: 2.5, color: "#a6b5c6", fontSize: { xs: 17, sm: 19 }, lineHeight: 1.65, maxWidth: 580 }}>
            {translate("EvoTracker samlar lobbyaktivitet, spelartrender och finansiella rapporter i en tydlig vy — så att du snabbare ser vad som förändras och varför det spelar roll.", "EvoTracker brings lobby activity, player trends and financial reports into one clear view — helping you see what is changing and why it matters.")}
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2.8, alignItems: { xs: "stretch", sm: "center" } }}>
            <Button component={NextLink} href="/register" size="large" variant="contained" endIcon={<ArrowForwardRoundedIcon />} sx={{ ...primaryButtonSx, minHeight: 50, px: 3, borderRadius: "12px" }}>{translate("Skapa kostnadsfritt konto", "Create free account")}</Button>
            <Button
              component={NextLink}
              href="/login"
              size="large"
              variant="outlined"
              sx={{
                minHeight: 50,
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

      <Box component="section" sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, pb: { xs: 5.5, md: 8 } }}>
        <Box sx={{ textAlign: "center", maxWidth: 710, mx: "auto", mb: { xs: 3.5, md: 4 } }}>
          <Typography sx={{ color: "#cbd5e1", fontSize: 11, fontWeight: 850, letterSpacing: "0.14em" }}>{translate("BYGGT FÖR ATT HITTA SAMBAND", "BUILT TO CONNECT THE DOTS")}</Typography>
          <Typography component="h2" sx={{ color: colors.text, fontSize: { xs: 28, md: 42 }, fontWeight: 780, letterSpacing: "-0.03em", mt: 1.3 }}>{translate("Mer signal. Mindre brus.", "More signal. Less noise.")}</Typography>
          <Typography sx={{ color: colors.muted, mt: 1.4, lineHeight: 1.7 }}>{translate("Från vad som händer i lobbyn just nu till hur utvecklingen kan slå igenom i nästa kvartal.", "From what is happening in the lobby right now to how the trend may flow through to the next quarter.")}</Typography>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2.2 }}>
          {model.features.map((feature, index) => <FeatureCard key={feature.id} feature={feature} index={index} />)}
        </Box>
      </Box>

      <Box component="section" sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, pb: { xs: 5.5, md: 8 } }}>
        <ReportPreview translate={translate} />
      </Box>

      <AccessComparison />

      <Box component="section" sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, pb: { xs: 5.5, md: 8 } }}>
        <Box sx={{ ...panelSx, borderRadius: { xs: 3, md: 4 }, px: { xs: 2.5, md: 4 }, py: { xs: 2.5, md: 3 }, display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(220px, 0.7fr) minmax(0, 1.3fr) auto" }, gap: { xs: 1.8, md: 2.5 }, alignItems: "center", borderColor: "rgba(125,211,252,0.28)" }}>
          <Box>
            <Chip icon={<WorkspacePremiumRoundedIcon sx={{ fontSize: "15px!important" }} />} label="PREMIUM" size="small" sx={{ color: "#7dd3fc", backgroundColor: "rgba(14,165,233,0.1)", fontWeight: 800, fontSize: 10 }} />
            <Typography component="h2" sx={{ color: colors.text, fontSize: { xs: 24, md: 29 }, fontWeight: 780, mt: 1.2 }}>
              {translate("Stötta utvecklingen – få mer data", "Support development – get more data")}
            </Typography>
            <Typography sx={{ color: colors.muted, fontSize: 12.5, lineHeight: 1.55, mt: 0.7 }}>
              {translate(`${PREMIUM_PROGRAM.monthlyDonationSek} kr motsvarar en månad Premium. Donationer är frivilliga och hjälper EvoTracker att fortsätta utvecklas.`, `SEK ${PREMIUM_PROGRAM.monthlyDonationSek} equals one month of Premium. Donations are voluntary and help EvoTracker keep improving.`)}
            </Typography>
          </Box>
          <Stack spacing={0.8}>
            {PREMIUM_BENEFITS.map((benefit) => (
              <Stack key={benefit.id} direction="row" spacing={0.8} alignItems="center">
                <CheckRoundedIcon sx={{ color: "#7dd3fc", fontSize: 17 }} />
                <Typography sx={{ color: colors.muted, fontSize: 13 }}>
                  {translate(benefit.title.sv, benefit.title.en)}
                </Typography>
              </Stack>
            ))}
          </Stack>
          <Button component={NextLink} href="/premium" variant="outlined" endIcon={<ArrowForwardRoundedIcon />} sx={{ color: "#7dd3fc", borderColor: "rgba(125,211,252,0.38)", textTransform: "none", fontWeight: 750, whiteSpace: "nowrap", "&:hover": { borderColor: "#7dd3fc", backgroundColor: "rgba(14,165,233,0.08)" } }}>
            {translate("Se Premium", "View Premium")}
          </Button>
        </Box>
      </Box>

      <Box component="section" sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, pb: { xs: 5.5, md: 8 } }}>
        <Box sx={{ ...panelSx, borderRadius: { xs: 3, md: 4 }, px: { xs: 2.5, md: 4 }, py: { xs: 2.5, md: 3 }, display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(230px, 0.7fr) minmax(0, 1.3fr) auto" }, gap: { xs: 1.8, md: 2.5 }, alignItems: "center" }}>
          <Box>
            <Chip icon={<WorkspacePremiumRoundedIcon sx={{ fontSize: "15px!important" }} />} label={translate(`${FOUNDER_PROGRAM.claimedFounders}/${FOUNDER_PROGRAM.maximumFounders} PLATSER TAGNA`, `${FOUNDER_PROGRAM.claimedFounders}/${FOUNDER_PROGRAM.maximumFounders} PLACES TAKEN`)} size="small" sx={{ color: "#fde68a", backgroundColor: "rgba(245,158,11,0.08)", fontWeight: 800, fontSize: 10 }} />
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

      <Box component="section" sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, pb: 4 }}>
        <Box sx={{ borderRadius: { xs: 3, md: 4 }, px: { xs: 2.25, md: 7 }, py: { xs: 3.25, md: 5 }, textAlign: "center", border: `1px solid ${colors.border}`, backgroundColor: colors.surface, boxShadow: "0 18px 40px rgba(0,0,0,0.2)" }}>
          <AutoGraphRoundedIcon sx={{ color: colors.cyan, fontSize: 34 }} />
          <Typography component="h2" sx={{ color: colors.text, fontSize: { xs: 29, md: 40 }, fontWeight: 780, letterSpacing: "-0.03em", mt: 1.5 }}>{translate("Se hela bilden bakom Evolution.", "See the full picture behind Evolution.")}</Typography>
          <Typography sx={{ color: colors.muted, mt: 1.3, maxWidth: 590, mx: "auto", lineHeight: 1.7 }}>{translate("Skapa ett kostnadsfritt konto för gameshows, standardhistorik, rapporter och kvartalsprognoser. Premium ger fler spel, längre historik och export.", "Create a free account for gameshows, standard history, reports and quarterly forecasts. Premium adds more games, extended history and exports.")}</Typography>
          <Button component={NextLink} href="/register" size="large" variant="contained" endIcon={<ArrowForwardRoundedIcon />} sx={{ ...primaryButtonSx, mt: 3, minHeight: 52, px: 3.5, borderRadius: "12px" }}>{translate("Kom igång kostnadsfritt", "Get started for free")}</Button>
          <Typography sx={{ color: "#718399", fontSize: 11.5, mt: 1.5 }}>{model.disclosure}</Typography>
        </Box>

      </Box>
    </Box>
  );
}
