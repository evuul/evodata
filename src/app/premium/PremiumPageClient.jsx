"use client";

// Renders the public Premium information page and voluntary support options.

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
import AutoGraphRounded from "@mui/icons-material/AutoGraphRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import EmailRounded from "@mui/icons-material/EmailRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import LocalCafeRounded from "@mui/icons-material/LocalCafeRounded";
import LockOpenRounded from "@mui/icons-material/LockOpenRounded";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import TwitterIcon from "@mui/icons-material/Twitter";
import WorkspacePremiumRounded from "@mui/icons-material/WorkspacePremiumRounded";
import { LOCALE_OPTIONS, useLocale, useTranslate } from "@/context/LocaleContext";
import { PREMIUM_BENEFITS, PREMIUM_PROGRAM } from "@/config/premiumProgram";
import { buildSupportUrl } from "@/lib/supportLinks";

const SUPPORT_URL = buildSupportUrl("premium_page");
const CONTACT_EMAIL = "alexander.ek@live.se";
const TWITTER_URL = "https://twitter.com/alexand93085679";
const PAGE_MAX_WIDTH = 980;

const benefitIcons = [AutoGraphRounded, HistoryRounded, DownloadRounded];

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

export default function PremiumPageClient() {
  const translate = useTranslate();
  const monthAmount = `${PREMIUM_PROGRAM.monthlyDonationSek} kr`;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#070d18", color: "#f8fafc", pb: { xs: 6, sm: 9 } }}>
      <Box sx={{ maxWidth: PAGE_MAX_WIDTH, mx: "auto", px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
          <Button component={NextLink} href="/" startIcon={<ArrowBackRounded />} sx={{ color: "rgba(226,232,240,0.78)", textTransform: "none", borderRadius: "999px" }}>
            {translate("Till EvoTracker", "Back to EvoTracker")}
          </Button>
          <LocalePicker />
        </Stack>

        <Box sx={{ mt: { xs: 5, sm: 7 }, textAlign: "center", maxWidth: 760, mx: "auto" }}>
          <Chip icon={<WorkspacePremiumRounded />} label="PREMIUM" sx={{ color: "#fde68a", backgroundColor: "rgba(245,158,11,0.1)", border: "1px solid rgba(250,204,21,0.28)", fontWeight: 800, letterSpacing: "0.08em", "& .MuiChip-icon": { color: "#fde68a" } }} />
          <Typography component="h1" sx={{ mt: 2.1, fontSize: { xs: "2.35rem", sm: "3.55rem" }, lineHeight: 1.02, fontWeight: 850, letterSpacing: "-0.055em" }}>
            {translate("Mer data för dig som vill stötta EvoTracker", "More data for those who want to support EvoTracker")}
          </Typography>
          <Typography sx={{ mt: 2, color: "rgba(203,213,225,0.76)", fontSize: { xs: 15.5, sm: 17 }, lineHeight: 1.7 }}>
            {translate(
              "EvoTracker ska fortsätta vara användbart även utan medlemskap. Premium är ett frivilligt sätt att bidra till datainsamling, drift och vidareutveckling – och ger samtidigt tillgång till mer fördjupade verktyg.",
              "EvoTracker should remain useful without membership. Premium is a voluntary way to support data collection, operations, and continued development, while receiving access to more in-depth tools."
            )}
          </Typography>
        </Box>

        <Box sx={{ mt: { xs: 4, sm: 5 }, border: "1px solid rgba(100,116,139,0.3)", borderRadius: "20px", overflow: "hidden", backgroundColor: "rgba(15,23,42,0.82)", boxShadow: "0 18px 48px rgba(2,8,23,0.18)" }}>
          <Box sx={{ p: { xs: 2.5, sm: 3.5 }, display: "grid", gridTemplateColumns: { xs: "1fr", md: "0.82fr 1.18fr" }, gap: { xs: 3, md: 4 }, alignItems: "center" }}>
            <Box sx={{ textAlign: { xs: "left", md: "center" }, py: { md: 1 } }}>
              <Typography sx={{ color: "#7dd3fc", fontSize: 11, fontWeight: 850, letterSpacing: "0.12em" }}>
                {translate("FRIVILLIGT STÖD", "VOLUNTARY SUPPORT")}
              </Typography>
              <Typography sx={{ mt: 0.7, color: "#f8fafc", fontSize: { xs: "2.75rem", sm: "3.35rem" }, fontWeight: 900, letterSpacing: "-0.06em", lineHeight: 1 }}>
                {monthAmount}
              </Typography>
              <Typography sx={{ mt: 0.75, color: "rgba(203,213,225,0.68)", fontSize: 14, lineHeight: 1.55 }}>
                {translate("motsvarar 1 månad Premium", "equals 1 month of Premium")}
              </Typography>
            </Box>
            <Box>
              <Typography component="h2" sx={{ color: "#f8fafc", fontSize: { xs: 20, sm: 23 }, fontWeight: 790, letterSpacing: "-0.025em" }}>
                {translate("Ett enkelt sätt att hålla datan levande", "A simple way to keep the data alive")}
              </Typography>
              <Typography sx={{ mt: 0.9, color: "rgba(203,213,225,0.7)", fontSize: 14, lineHeight: 1.7 }}>
                {translate(
                  "Varje bidrag hjälper till med kostnaderna för servrar, datainsamling och förbättringar av sidan. Donerar du flera gånger räknas beloppen tillsammans. Kontakta mig efter din donation så aktiverar jag tiden på ditt konto.",
                  "Every contribution helps cover servers, data collection, and improvements to the site. Multiple donations are counted together. Contact me after donating and I will activate the time on your account."
                )}
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.1} sx={{ mt: 2 }}>
                <Button component="a" href={SUPPORT_URL} target="_blank" rel="noreferrer" variant="contained" startIcon={<LocalCafeRounded />} endIcon={<OpenInNewRounded />} sx={{ borderRadius: "999px", textTransform: "none", fontWeight: 800, color: "#1c1302", backgroundColor: "#facc15", "&:hover": { backgroundColor: "#fde047" } }}>
                  {translate("Donera via Buy Me a Coffee", "Donate via Buy Me a Coffee")}
                </Button>
                <Button component="a" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Premium till EvoTracker")}`} variant="outlined" startIcon={<EmailRounded />} sx={{ borderRadius: "999px", textTransform: "none", fontWeight: 750, color: "#cbd5e1", borderColor: "rgba(148,163,184,0.36)", "&:hover": { borderColor: "rgba(125,211,252,0.72)", backgroundColor: "rgba(14,165,233,0.08)" } }}>
                  {translate("Kontakta via e-post", "Contact by email")}
                </Button>
              </Stack>
            </Box>
          </Box>

          <Divider sx={{ borderColor: "rgba(100,116,139,0.2)" }} />

          <Box sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            <Typography sx={{ color: "#38bdf8", fontSize: 10.5, fontWeight: 840, letterSpacing: "0.12em" }}>
              {translate("DET HÄR INGÅR", "WHAT YOU GET")}
            </Typography>
            <Box sx={{ mt: 1.5, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 1.5 }}>
              {PREMIUM_BENEFITS.map((benefit, index) => {
                const Icon = benefitIcons[index];
                return (
                  <Box key={benefit.id} sx={{ p: 2, border: "1px solid rgba(100,116,139,0.22)", borderRadius: "14px", backgroundColor: "rgba(2,6,23,0.18)" }}>
                    <Box sx={{ width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: "10px", color: "#7dd3fc", backgroundColor: "rgba(14,165,233,0.1)" }}>
                      <Icon sx={{ fontSize: 18 }} />
                    </Box>
                    <Typography sx={{ mt: 1.2, color: "#f8fafc", fontSize: 14.5, fontWeight: 780 }}>
                      {translate(benefit.title.sv, benefit.title.en)}
                    </Typography>
                    <Typography sx={{ mt: 0.4, color: "rgba(203,213,225,0.64)", fontSize: 12.5, lineHeight: 1.6 }}>
                      {translate(benefit.description.sv, benefit.description.en)}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>

        <Box sx={{ mt: 2, p: { xs: 2, sm: 2.4 }, display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, gap: 1.6, border: "1px solid rgba(100,116,139,0.2)", borderRadius: "14px", backgroundColor: "rgba(15,23,42,0.48)" }}>
          <Stack direction="row" spacing={1.1} alignItems="flex-start">
            <LockOpenRounded sx={{ mt: 0.1, color: "#94a3b8", fontSize: 19 }} />
            <Typography sx={{ color: "rgba(203,213,225,0.68)", fontSize: 12.5, lineHeight: 1.6 }}>
              {translate("Donationer är alltid frivilliga. Basfunktionerna på EvoTracker förblir öppna för alla användare.", "Donations are always voluntary. EvoTracker's core features remain open to every user.")}
            </Typography>
          </Stack>
          <Button component="a" href={TWITTER_URL} target="_blank" rel="noreferrer" size="small" startIcon={<TwitterIcon />} sx={{ flexShrink: 0, borderRadius: "999px", textTransform: "none", color: "#7dd3fc", fontWeight: 750 }}>
            {translate("Skriv på Twitter", "Message on Twitter")}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
