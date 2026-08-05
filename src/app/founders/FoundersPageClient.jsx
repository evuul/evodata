"use client";

// Renders the public Founders wall as a compact EvoTracker dashboard view.

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
import LocalCafeRounded from "@mui/icons-material/LocalCafeRounded";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import QueryStatsRounded from "@mui/icons-material/QueryStatsRounded";
import VerifiedRounded from "@mui/icons-material/VerifiedRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import WorkspacePremiumRounded from "@mui/icons-material/WorkspacePremiumRounded";
import CasinoRounded from "@mui/icons-material/CasinoRounded";
import { LOCALE_OPTIONS, useLocale, useTranslate } from "@/context/LocaleContext";
import { buildSupportUrl } from "@/lib/supportLinks";
import { FOUNDER_BENEFITS } from "@/config/founderProgram";
import { PREMIUM_PROGRAM } from "@/config/premiumProgram";

const SUPPORT_URL = buildSupportUrl("founders_page");
const PAGE_MAX_WIDTH = 1180;

const panelSx = {
  border: "1px solid rgba(100,116,139,0.28)",
  backgroundColor: "rgba(15,23,42,0.78)",
  boxShadow: "0 18px 48px rgba(2,8,23,0.18)",
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
        "& .Mui-selected": {
          color: "#0f172a!important",
          backgroundColor: "#f8fafc!important",
        },
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
    <Box
      sx={{
        px: { xs: 0.25, sm: 0.5 },
        py: 1.35,
        borderBottom: "1px solid rgba(148,163,184,0.14)",
      }}
    >
      <Stack direction="row" spacing={1.6} alignItems="center">
        <Box
          aria-hidden="true"
          sx={{
            width: 38,
            height: 38,
            flexShrink: 0,
            borderRadius: "11px",
            display: "grid",
            placeItems: "center",
            color: "#fde68a",
            backgroundColor: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.25)",
            fontWeight: 850,
            fontSize: 15,
          }}
        >
          {initial}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={0.7} alignItems="center">
            <Typography sx={{ color: "#f8fafc", fontWeight: 770, fontSize: 15.5 }} noWrap>
              {founder.displayName}
            </Typography>
            <VerifiedRounded sx={{ color: "#fbbf24", fontSize: 18 }} />
          </Stack>
          <Typography sx={{ color: "rgba(196,181,253,0.82)", fontSize: 11.5, mt: 0.1 }}>
            {translate("Founding supporter", "Founding supporter")}
          </Typography>
        </Box>
        <Typography
          sx={{
            display: { xs: "none", sm: "block" },
            color: "rgba(148,163,184,0.64)",
            fontSize: 11.5,
            whiteSpace: "nowrap",
          }}
        >
          {translate(`Sedan ${recognizedAt}`, `Since ${recognizedAt}`)}
        </Typography>
        {founder.profileUrl ? (
          <Button
            component="a"
            href={founder.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={translate(`Öppna profil för ${founder.displayName}`, `Open profile for ${founder.displayName}`)}
            sx={{ minWidth: 36, width: 36, height: 36, p: 0, color: "#7dd3fc" }}
          >
            <OpenInNewRounded sx={{ fontSize: 18 }} />
          </Button>
        ) : null}
      </Stack>
      <Typography sx={{ display: { xs: "block", sm: "none" }, color: "rgba(148,163,184,0.64)", fontSize: 11.5, ml: 6.7, mt: 0.4 }}>
        {translate(`Sedan ${recognizedAt}`, `Since ${recognizedAt}`)}
      </Typography>
    </Box>
  );
}

const benefitIcons = [CasinoRounded, HistoryRounded, DownloadRounded, WorkspacePremiumRounded];

export default function FoundersPageClient({
  founders,
  minimumDonationSek,
  maximumFounders,
  qualifiedFounderCount,
}) {
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
        `När dina sammanlagda donationer når ${amount} kvalificerar du dig. Flera donationer räknas ihop.`,
        `You qualify once your combined donations reach ${amount}. Multiple donations are added together.`
      ),
    },
    {
      number: "02",
      title: translate("Välj hur du syns", "Choose how you appear"),
      text: translate(
        "Du väljer visningsnamn och eventuell profillänk. Belopp visas aldrig.",
        "You choose your display name and optional profile link. Amounts are never shown."
      ),
    },
    {
      number: "03",
      title: translate("Permanent erkännande", "Permanent recognition"),
      text: translate(
        "Statusen ligger kvar som tack för att du stöttade EvoTracker tidigt.",
        "Your status remains as thanks for supporting EvoTracker early."
      ),
    },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        color: "#e2e8f0",
        background:
          "radial-gradient(circle at 15% 0%, rgba(14,165,233,0.07), transparent 30%), radial-gradient(circle at 85% 10%, rgba(168,85,247,0.06), transparent 28%), #0b1220",
      }}
    >
      <Box
        component="nav"
        aria-label={translate("Huvudnavigation", "Main navigation")}
        sx={{
          maxWidth: PAGE_MAX_WIDTH,
          mx: "auto",
          px: { xs: 2, sm: 3 },
          py: 2,
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
              color: "#38bdf8",
              border: "1px solid rgba(56,189,248,0.3)",
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

      <Box component="main" sx={{ maxWidth: PAGE_MAX_WIDTH, mx: "auto", px: { xs: 2, sm: 3 }, pb: 3 }}>
        <Box sx={{ ...panelSx, borderRadius: { xs: "18px", md: "22px" }, overflow: "hidden" }}>
          <Box
            component="section"
            sx={{
              px: { xs: 2.5, sm: 4 },
              py: { xs: 3, md: 3.5 },
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) auto" },
              gap: { xs: 2.5, md: 4 },
              alignItems: "center",
              borderBottom: "1px solid rgba(100,116,139,0.24)",
              background: "linear-gradient(100deg, rgba(14,165,233,0.055), rgba(168,85,247,0.04))",
            }}
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip
                  icon={<WorkspacePremiumRounded />}
                  label="EVOTRACKER FOUNDERS"
                  size="small"
                  sx={{
                    height: 27,
                    color: "#fde68a",
                    backgroundColor: "rgba(245,158,11,0.08)",
                    border: "1px solid rgba(245,158,11,0.24)",
                    fontWeight: 820,
                    letterSpacing: "0.07em",
                    fontSize: 10.5,
                    "& .MuiChip-icon": { color: "#fbbf24" },
                  }}
                />
                <Chip
                  label={translate(`Gräns ${amount}`, `Threshold ${amount}`)}
                  size="small"
                  sx={{ color: "#bae6fd", backgroundColor: "rgba(14,165,233,0.08)", fontSize: 11.5 }}
                />
                <Chip
                  label={translate("Permanent", "Permanent")}
                  size="small"
                  sx={{ color: "#ddd6fe", backgroundColor: "rgba(168,85,247,0.08)", fontSize: 11.5 }}
                />
                <Chip
                  label={translate(
                    `${qualifiedFounderCount}/${maximumFounders} platser tagna`,
                    `${qualifiedFounderCount}/${maximumFounders} places taken`
                  )}
                  size="small"
                  sx={{ color: "#fde68a", backgroundColor: "rgba(245,158,11,0.08)", fontSize: 11.5 }}
                />
              </Stack>
              <Typography
                component="h1"
                sx={{ mt: 1.8, color: "#f8fafc", fontSize: { xs: 32, sm: 39, md: 43 }, lineHeight: 1.08, letterSpacing: "-0.035em", fontWeight: 820 }}
              >
                {translate("Tack till dem som trodde tidigt.", "Thank you to those who believed early.")}
              </Typography>
              <Typography sx={{ mt: 1.2, maxWidth: 690, color: "rgba(203,213,225,0.68)", fontSize: { xs: 14, sm: 15 }, lineHeight: 1.65 }}>
                {translate(
                  "Founders hjälper EvoTracker att hålla livedata, databaser och utveckling igång — samtidigt som kärninnehållet förblir öppet för alla.",
                  "Founders help EvoTracker keep live data, databases, and development running—while core content remains open to everyone."
                )}
              </Typography>
            </Box>
            <Button
              component="a"
              href={SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              startIcon={<LocalCafeRounded />}
              sx={{
                minHeight: 44,
                px: 2.4,
                justifySelf: { md: "end" },
                width: { xs: "100%", sm: "auto" },
                color: "#082f49",
                backgroundColor: "#7dd3fc",
                boxShadow: "none",
                textTransform: "none",
                fontWeight: 820,
                borderRadius: "11px",
                "&:hover": { backgroundColor: "#bae6fd", boxShadow: "none" },
              }}
            >
              {translate("Bli en Founder", "Become a Founder")}
            </Button>
          </Box>

          <Box sx={{ px: { xs: 2.5, sm: 3.5 }, py: 2.5, borderBottom: "1px solid rgba(100,116,139,0.2)" }}>
            <Typography sx={{ color: "#38bdf8", fontSize: 10.5, fontWeight: 840, letterSpacing: "0.12em" }}>
              {translate("DET HÄR INGÅR", "WHAT FOUNDERS GET")}
            </Typography>
            <Box sx={{ mt: 1.3, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 1.5 }}>
              {FOUNDER_BENEFITS.map((benefit, index) => {
                const Icon = benefitIcons[index];
                return (
                  <Stack key={benefit.id} direction="row" spacing={1.2} alignItems="flex-start">
                    <Box sx={{ width: 32, height: 32, flexShrink: 0, borderRadius: "9px", display: "grid", placeItems: "center", color: "#fde68a", backgroundColor: "rgba(245,158,11,0.08)" }}>
                      <Icon sx={{ fontSize: 17 }} />
                    </Box>
                    <Box>
                      <Typography sx={{ color: "#f8fafc", fontSize: 13.5, fontWeight: 760 }}>
                        {translate(benefit.title.sv, benefit.title.en)}
                      </Typography>
                      <Typography sx={{ color: "rgba(203,213,225,0.62)", fontSize: 11.5, lineHeight: 1.55, mt: 0.25 }}>
                        {translate(benefit.description.sv, benefit.description.en)}
                      </Typography>
                    </Box>
                  </Stack>
                );
              })}
            </Box>
            <Box sx={{ mt: 2, px: 1.5, py: 1.2, display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between", gap: 1, borderRadius: "11px", border: "1px solid rgba(56,189,248,0.22)", backgroundColor: "rgba(14,165,233,0.06)" }}>
              <Typography sx={{ color: "rgba(203,213,225,0.74)", fontSize: 12, lineHeight: 1.55 }}>
                {translate(`Vill du stötta löpande? ${PREMIUM_PROGRAM.monthlyDonationSek} kr motsvarar en månad Premium med Extended lobby, längre historik och export.`, `Want to support continuously? ${PREMIUM_PROGRAM.monthlyDonationSek} SEK equals one month of Premium with Extended lobby, extended history, and exports.`)}
              </Typography>
              <Button component={NextLink} href="/premium" size="small" sx={{ flexShrink: 0, p: 0, minWidth: 0, textTransform: "none", color: "#7dd3fc", fontWeight: 780 }}>
                {translate("Läs om Premium", "Learn about Premium")}
              </Button>
            </Box>
          </Box>

          <Box
            sx={{
              p: { xs: 2.5, sm: 3.5 },
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.08fr) minmax(340px, 0.92fr)" },
              gap: { xs: 3, md: 4 },
              alignItems: "start",
            }}
          >
            <Box id="founders" component="section" sx={{ scrollMarginTop: 24 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 1.6 }}>
                <Box>
                  <Typography sx={{ color: "#a78bfa", fontSize: 10.5, fontWeight: 840, letterSpacing: "0.12em" }}>
                    {translate("FOUNDERS-VÄGGEN", "THE FOUNDERS WALL")}
                  </Typography>
                  <Typography component="h2" sx={{ color: "#f8fafc", fontSize: { xs: 21, sm: 24 }, fontWeight: 790, letterSpacing: "-0.02em", mt: 0.35 }}>
                    {translate("De som gör EvoTracker möjligt", "Those making EvoTracker possible")}
                  </Typography>
                </Box>
                <Typography sx={{ flexShrink: 0, color: "rgba(148,163,184,0.68)", fontSize: 11.5, fontWeight: 700 }}>
                  {founders.length === 1 ? "1 Founder" : `${founders.length} Founders`}
                </Typography>
              </Stack>

              {founders.length ? (
                <Stack>
                  {founders.map((founder) => (
                    <FounderCard key={founder.id} founder={founder} locale={locale} translate={translate} />
                  ))}
                </Stack>
              ) : (
                <Box sx={{ border: "1px dashed rgba(148,163,184,0.24)", borderRadius: "16px", py: 4, px: 2, textAlign: "center" }}>
                  <WorkspacePremiumRounded sx={{ color: "#a78bfa" }} />
                  <Typography sx={{ color: "#f8fafc", fontWeight: 760, mt: 1 }}>
                    {translate("Den första platsen väntar.", "The first place is waiting.")}
                  </Typography>
                </Box>
              )}
            </Box>

            <Box
              component="section"
              sx={{
                pl: { xs: 0, md: 3.5 },
                pt: { xs: 2.5, md: 0 },
                borderLeft: { xs: 0, md: "1px solid rgba(148,163,184,0.14)" },
                borderTop: { xs: "1px solid rgba(148,163,184,0.14)", md: 0 },
              }}
            >
              <Typography sx={{ color: "#38bdf8", fontSize: 10.5, fontWeight: 840, letterSpacing: "0.12em" }}>
                {translate("SÅ FUNGERAR DET", "HOW IT WORKS")}
              </Typography>
              <Stack divider={<Divider flexItem sx={{ borderColor: "rgba(148,163,184,0.12)" }} />} sx={{ mt: 0.7 }}>
                {steps.map((step) => (
                  <Stack key={step.number} direction="row" spacing={1.5} sx={{ py: 1.35 }}>
                    <Typography sx={{ color: "#a78bfa", fontSize: 11, fontWeight: 850, pt: 0.25 }}>{step.number}</Typography>
                    <Box>
                      <Typography sx={{ color: "#f8fafc", fontWeight: 760, fontSize: 14 }}>{step.title}</Typography>
                      <Typography sx={{ color: "rgba(203,213,225,0.59)", fontSize: 12.5, lineHeight: 1.55, mt: 0.35 }}>{step.text}</Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Box>

          <Box sx={{ px: { xs: 2.5, sm: 3.5 }, py: 1.7, borderTop: "1px solid rgba(100,116,139,0.2)", backgroundColor: "rgba(2,6,23,0.2)" }}>
            <Typography sx={{ color: "rgba(148,163,184,0.66)", fontSize: 11.5, lineHeight: 1.55, textAlign: "center" }}>
              {translate(
                "Stöd är helt frivilligt. Founders-väggen innebär inte ägande, investeringsrådgivning eller en betald rekommendation.",
                "Support is entirely voluntary. The Founders wall does not imply ownership, investment advice, or a paid endorsement."
              )}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box component="footer">
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ maxWidth: PAGE_MAX_WIDTH, mx: "auto", px: { xs: 2, sm: 3 }, py: 2 }}>
          <Typography sx={{ color: "rgba(148,163,184,0.48)", fontSize: 11.5 }}>© {new Date().getFullYear()} EvoTracker</Typography>
          <Button component={NextLink} href="/disclaimer" size="small" sx={{ color: "rgba(203,213,225,0.58)", textTransform: "none", fontSize: 11.5 }}>
            Disclaimer
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
