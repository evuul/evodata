"use client";

// Renders the public recognition wall and explains how Founders status works.

import NextLink from "next/link";
import {
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import FavoriteBorderRounded from "@mui/icons-material/FavoriteBorderRounded";
import LocalCafeRounded from "@mui/icons-material/LocalCafeRounded";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import QueryStatsRounded from "@mui/icons-material/QueryStatsRounded";
import VerifiedRounded from "@mui/icons-material/VerifiedRounded";
import WorkspacePremiumRounded from "@mui/icons-material/WorkspacePremiumRounded";
import { LOCALE_OPTIONS, useLocale, useTranslate } from "@/context/LocaleContext";
import { buildSupportUrl } from "@/lib/supportLinks";

const SUPPORT_URL = buildSupportUrl("founders_page");
const PAGE_MAX_WIDTH = 1120;

const cardSx = {
  border: "1px solid rgba(148,163,184,0.17)",
  backgroundColor: "rgba(15,23,42,0.72)",
  boxShadow: "0 20px 45px rgba(2,8,23,0.22)",
};

function LocalePicker() {
  const { locale, setLocale } = useLocale();
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={locale}
      onChange={(_, value) => value && setLocale(value)}
      aria-label="Language"
      sx={{
        p: 0.3,
        borderRadius: "999px",
        border: "1px solid rgba(148,163,184,0.2)",
        backgroundColor: "rgba(15,23,42,0.7)",
        "& .MuiToggleButton-root": {
          border: 0,
          borderRadius: "999px!important",
          color: "rgba(226,232,240,0.7)",
          px: 1.2,
          py: 0.45,
          fontSize: 12,
          fontWeight: 750,
        },
        "& .Mui-selected": { color: "#0f172a!important", backgroundColor: "#f8fafc!important" },
      }}
    >
      {LOCALE_OPTIONS.map((option) => (
        <ToggleButton key={option.value} value={option.value}>
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

function FounderCard({ founder, locale, translate }) {
  const initial = founder.displayName.slice(0, 1).toLocaleUpperCase(locale === "en" ? "en-US" : "sv-SE");
  const recognizedAt = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "sv-SE", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${founder.recognizedAt}T00:00:00.000Z`));

  return (
    <Box sx={{ ...cardSx, borderRadius: "18px", p: 2.5, minHeight: 176 }}>
      <Stack direction="row" spacing={1.6} alignItems="center">
        <Box
          aria-hidden="true"
          sx={{
            width: 48,
            height: 48,
            borderRadius: "14px",
            display: "grid",
            placeItems: "center",
            color: "#fde68a",
            backgroundColor: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.24)",
            fontWeight: 850,
            fontSize: 19,
          }}
        >
          {initial}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.7} alignItems="center">
            <Typography sx={{ color: "#f8fafc", fontWeight: 780, fontSize: 17 }} noWrap>
              {founder.displayName}
            </Typography>
            <VerifiedRounded sx={{ color: "#fbbf24", fontSize: 17 }} />
          </Stack>
          <Typography sx={{ color: "rgba(226,232,240,0.55)", fontSize: 12.5, mt: 0.25 }}>
            {translate("Founding supporter", "Founding supporter")}
          </Typography>
        </Box>
      </Stack>
      <Divider sx={{ borderColor: "rgba(148,163,184,0.13)", my: 2 }} />
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
        <Typography sx={{ color: "rgba(226,232,240,0.62)", fontSize: 12.5 }}>
          {translate(`Founder sedan ${recognizedAt}`, `Recognized since ${recognizedAt}`)}
        </Typography>
        {founder.profileUrl ? (
          <Button
            component="a"
            href={founder.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<OpenInNewRounded sx={{ fontSize: "14px!important" }} />}
            size="small"
            sx={{ color: "#bae6fd", textTransform: "none", fontSize: 12 }}
          >
            {translate("Profil", "Profile")}
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
}

export default function FoundersPageClient({ founders, minimumDonationSek }) {
  const { locale } = useLocale();
  const translate = useTranslate();
  const amount = new Intl.NumberFormat(locale === "en" ? "en-US" : "sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(minimumDonationSek);

  const steps = [
    {
      number: "01",
      title: translate("Stötta projektet", "Support the project"),
      text: translate(
        `När dina donationer når totalt ${amount} kvalificerar du dig för Founders-väggen.`,
        `Once your total support reaches ${amount}, you qualify for the Founders wall.`
      ),
    },
    {
      number: "02",
      title: translate("Välj hur du syns", "Choose how you appear"),
      text: translate(
        "Du väljer själv visningsnamn och om en offentlig profil ska länkas. Exakta belopp visas aldrig.",
        "You choose your display name and whether to link a public profile. Exact amounts are never shown."
      ),
    },
    {
      number: "03",
      title: translate("Permanent erkännande", "Permanent recognition"),
      text: translate(
        "Founders-statusen ligger kvar som ett tack till dem som hjälpte EvoTracker tidigt.",
        "Founder status remains as a thank-you to those who helped EvoTracker early."
      ),
    },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        color: "#e2e8f0",
        background:
          "radial-gradient(circle at 50% -10%, rgba(245,158,11,0.08), transparent 34%), #0b1220",
      }}
    >
      <Box
        component="nav"
        aria-label={translate("Huvudnavigation", "Main navigation")}
        sx={{
          maxWidth: PAGE_MAX_WIDTH,
          mx: "auto",
          px: { xs: 2, sm: 3 },
          py: 2.5,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Stack component={NextLink} href="/" direction="row" spacing={1.1} alignItems="center" sx={{ textDecoration: "none" }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: "10px",
              display: "grid",
              placeItems: "center",
              color: "#82c1ff",
              border: "1px solid rgba(130,193,255,0.34)",
              backgroundColor: "rgba(15,23,42,0.8)",
            }}
          >
            <QueryStatsRounded sx={{ fontSize: 21 }} />
          </Box>
          <Typography sx={{ color: "#f8fafc", fontWeight: 820, letterSpacing: "0.08em", fontSize: 14 }}>
            EVOTRACKER
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <LocalePicker />
          <Button
            component={NextLink}
            href="/"
            startIcon={<ArrowBackRounded />}
            sx={{ display: { xs: "none", sm: "inline-flex" }, color: "#cbd5e1", textTransform: "none", fontWeight: 700 }}
          >
            {translate("Tillbaka", "Back")}
          </Button>
        </Stack>
      </Box>

      <Box component="main">
        <Box
          component="section"
          sx={{ maxWidth: 850, mx: "auto", px: { xs: 2, sm: 3 }, pt: { xs: 6, md: 9 }, pb: { xs: 6, md: 8 }, textAlign: "center" }}
        >
          <Chip
            icon={<WorkspacePremiumRounded />}
            label="EVOTRACKER FOUNDERS"
            sx={{
              color: "#fde68a",
              backgroundColor: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.24)",
              fontWeight: 820,
              letterSpacing: "0.08em",
              fontSize: 11,
              "& .MuiChip-icon": { color: "#fbbf24" },
            }}
          />
          <Typography
            component="h1"
            sx={{ mt: 2.5, color: "#f8fafc", fontSize: { xs: 40, sm: 56, md: 64 }, lineHeight: 1.04, letterSpacing: "-0.045em", fontWeight: 820 }}
          >
            {translate("Byggt med stöd från dem som trodde tidigt.", "Built with those who believed early.")}
          </Typography>
          <Typography sx={{ mt: 2.5, mx: "auto", maxWidth: 690, color: "rgba(226,232,240,0.66)", fontSize: { xs: 16, sm: 18 }, lineHeight: 1.75 }}>
            {translate(
              "EvoTracker är ett oberoende projekt. Founders är personerna som hjälper till att hålla livedata, databas och utveckling igång — och som gör att sidan kan fortsätta vara öppen för alla.",
              "EvoTracker is an independent project. Founders help keep live data, databases, and development running — making it possible to keep the site open to everyone."
            )}
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.4} justifyContent="center" sx={{ mt: 3.5 }}>
            <Button
              component="a"
              href={SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              startIcon={<LocalCafeRounded />}
              endIcon={<ArrowForwardRounded />}
              sx={{
                minHeight: 48,
                px: 2.8,
                color: "#111827",
                backgroundColor: "#fbbf24",
                boxShadow: "none",
                textTransform: "none",
                fontWeight: 820,
                borderRadius: "12px",
                "&:hover": { backgroundColor: "#fcd34d", boxShadow: "none" },
              }}
            >
              {translate("Bli en Founder", "Become a Founder")}
            </Button>
            <Button
              component={NextLink}
              href="#founders"
              variant="outlined"
              sx={{ minHeight: 48, px: 2.8, color: "#e2e8f0", borderColor: "rgba(148,163,184,0.28)", textTransform: "none", fontWeight: 740, borderRadius: "12px" }}
            >
              {translate("Se Founders-väggen", "View the Founders wall")}
            </Button>
          </Stack>
        </Box>

        <Box sx={{ maxWidth: PAGE_MAX_WIDTH, mx: "auto", px: { xs: 2, sm: 3 } }}>
          <Box
            sx={{
              ...cardSx,
              borderRadius: "20px",
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
              mb: { xs: 7, md: 10 },
            }}
          >
            {[
              [translate("Grundad på", "Built on"), translate("Oberoende", "Independence")],
              [translate("Founder-gräns", "Founder threshold"), amount],
              [translate("Erkännande", "Recognition"), translate("Permanent", "Permanent")],
            ].map(([label, value], index) => (
              <Box key={label} sx={{ px: 3, py: 2.8, textAlign: "center", borderLeft: { xs: 0, sm: index ? "1px solid rgba(148,163,184,0.14)" : 0 }, borderTop: { xs: index ? "1px solid rgba(148,163,184,0.14)" : 0, sm: 0 } }}>
                <Typography sx={{ color: "rgba(226,232,240,0.5)", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</Typography>
                <Typography sx={{ color: "#f8fafc", fontSize: 20, fontWeight: 790, mt: 0.65 }}>{value}</Typography>
              </Box>
            ))}
          </Box>

          <Box id="founders" component="section" sx={{ scrollMarginTop: 24, pb: { xs: 8, md: 11 } }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} alignItems={{ xs: "flex-start", sm: "flex-end" }} sx={{ mb: 3 }}>
              <Box>
                <Typography sx={{ color: "#fbbf24", fontSize: 11, fontWeight: 840, letterSpacing: "0.12em" }}>
                  {translate("FOUNDERS-VÄGGEN", "THE FOUNDERS WALL")}
                </Typography>
                <Typography component="h2" sx={{ color: "#f8fafc", fontSize: { xs: 29, md: 38 }, fontWeight: 800, letterSpacing: "-0.03em", mt: 0.8 }}>
                  {translate("Tack för att ni gör EvoTracker möjligt.", "Thank you for making EvoTracker possible.")}
                </Typography>
              </Box>
              <Chip
                label={translate(`${founders.length} Founders`, `${founders.length} Founders`)}
                sx={{ color: "#cbd5e1", backgroundColor: "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.17)" }}
              />
            </Stack>

            {founders.length ? (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 2 }}>
                {founders.map((founder) => (
                  <FounderCard key={founder.id} founder={founder} locale={locale} translate={translate} />
                ))}
              </Box>
            ) : (
              <Box sx={{ ...cardSx, borderRadius: "20px", py: { xs: 5, md: 7 }, px: 3, textAlign: "center" }}>
                <Box sx={{ width: 54, height: 54, mx: "auto", display: "grid", placeItems: "center", borderRadius: "16px", color: "#fbbf24", backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <WorkspacePremiumRounded />
                </Box>
                <Typography sx={{ color: "#f8fafc", fontSize: 21, fontWeight: 780, mt: 2 }}>
                  {translate("Den första platsen väntar.", "The first place is waiting.")}
                </Typography>
                <Typography sx={{ color: "rgba(226,232,240,0.58)", lineHeight: 1.7, maxWidth: 520, mx: "auto", mt: 1 }}>
                  {translate(
                    "Founders läggs till personligen efter verifierat stöd och godkännande att synas offentligt.",
                    "Founders are added personally after support is verified and permission for public recognition is confirmed."
                  )}
                </Typography>
              </Box>
            )}
          </Box>

          <Box component="section" sx={{ pb: { xs: 8, md: 11 } }}>
            <Typography component="h2" sx={{ color: "#f8fafc", fontSize: { xs: 28, md: 36 }, fontWeight: 790, letterSpacing: "-0.03em", textAlign: "center" }}>
              {translate("Så fungerar det", "How it works")}
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2, mt: 3 }}>
              {steps.map((step) => (
                <Box key={step.number} sx={{ ...cardSx, borderRadius: "18px", p: 2.6 }}>
                  <Typography sx={{ color: "#fbbf24", fontSize: 12, fontWeight: 850, letterSpacing: "0.08em" }}>{step.number}</Typography>
                  <Typography sx={{ color: "#f8fafc", fontWeight: 780, fontSize: 18, mt: 1.4 }}>{step.title}</Typography>
                  <Typography sx={{ color: "rgba(226,232,240,0.6)", fontSize: 14, lineHeight: 1.7, mt: 1 }}>{step.text}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          <Box component="section" sx={{ ...cardSx, borderRadius: "22px", p: { xs: 3, sm: 4.5 }, mb: 6 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={3} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }}>
              <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ maxWidth: 700 }}>
                <Box sx={{ color: "#fbbf24", mt: 0.3 }}><FavoriteBorderRounded /></Box>
                <Box>
                  <Typography sx={{ color: "#f8fafc", fontSize: 21, fontWeight: 790 }}>
                    {translate("Stöd ska kännas som ett tack — inte ett krav.", "Support should feel like thanks — never a requirement.")}
                  </Typography>
                  <Typography sx={{ color: "rgba(226,232,240,0.6)", lineHeight: 1.75, mt: 0.8 }}>
                    {translate(
                      "EvoTrackers kärninnehåll fortsätter vara tillgängligt oavsett om du donerar. Founders-väggen är ett frivilligt erkännande, inte investeringsrådgivning, ägande eller en betald rekommendation.",
                      "EvoTracker’s core content remains available whether you donate or not. The Founders wall is voluntary recognition—not investment advice, ownership, or a paid endorsement."
                    )}
                  </Typography>
                </Box>
              </Stack>
              <Button component="a" href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" startIcon={<LocalCafeRounded />} sx={{ flexShrink: 0, color: "#111827", backgroundColor: "#fbbf24", textTransform: "none", fontWeight: 820, borderRadius: "12px", px: 2.6, py: 1.2, "&:hover": { backgroundColor: "#fcd34d" } }}>
                {translate("Stötta EvoTracker", "Support EvoTracker")}
              </Button>
            </Stack>
          </Box>
        </Box>
      </Box>

      <Box component="footer" sx={{ borderTop: "1px solid rgba(148,163,184,0.12)" }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" spacing={1.5} sx={{ maxWidth: PAGE_MAX_WIDTH, mx: "auto", px: { xs: 2, sm: 3 }, py: 3.5 }}>
          <Typography sx={{ color: "rgba(148,163,184,0.55)", fontSize: 12 }}>© {new Date().getFullYear()} EvoTracker</Typography>
          <Stack direction="row" spacing={2}>
            <Button component={NextLink} href="/" size="small" sx={{ color: "rgba(203,213,225,0.65)", textTransform: "none" }}>{translate("Startsidan", "Home")}</Button>
            <Button component={NextLink} href="/disclaimer" size="small" sx={{ color: "rgba(203,213,225,0.65)", textTransform: "none" }}>Disclaimer</Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
