"use client";

import NextLink from "next/link";
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import LocalCafeRounded from "@mui/icons-material/LocalCafeRounded";
import TwitterIcon from "@mui/icons-material/Twitter";
import { LOCALE_OPTIONS, useLocale, useTranslate } from "@/context/LocaleContext";

const SUPPORT_URL = "https://www.buymeacoffee.com/alexanderek";
const TWITTER_URL = "https://twitter.com/alexand93085679";

export default function DisclaimerPage() {
  const { locale, setLocale } = useLocale();
  const translate = useTranslate();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "#0b1220",
        color: "#e2e8f0",
        py: { xs: 6, md: 8 },
      }}
    >
      <Box
        sx={{
          maxWidth: "1200px",
          mx: "auto",
          borderRadius: { xs: "24px", md: "32px" },
          border: "1px solid rgba(148,163,184,0.16)",
          background: "linear-gradient(180deg, rgba(15,23,42,0.95), rgba(15,23,42,0.65))",
          boxShadow: "0 28px 70px rgba(2,8,23,0.55)",
          overflow: "hidden",
          px: { xs: 2.5, md: 4 },
          py: { xs: 4, md: 5 },
        }}
      >
        <Container maxWidth={false} disableGutters>
          <Stack spacing={{ xs: 3, md: 4 }}>
            <Stack spacing={1.5} alignItems="flex-start">
              <Chip
                icon={<InfoOutlined />}
                label={translate("Ansvarsfriskrivning", "Disclaimer")}
                sx={{
                  backgroundColor: "rgba(56,189,248,0.16)",
                  border: "1px solid rgba(56,189,248,0.35)",
                  color: "#bae6fd",
                  fontWeight: 600,
                }}
              />
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {translate("Transparens & ansvar", "Transparency & responsibility")}
              </Typography>
              <Typography sx={{ color: "rgba(226,232,240,0.75)", maxWidth: 720, lineHeight: 1.8 }}>
                {translate(
                  "Den här sidan är ett privat kontrollrum för att följa Evolution, dess spelartrender och marknadsdata. Här är vad du behöver veta om innehållet.",
                  "This site is a personal control room for tracking Evolution, player trends, and market data. Here is what you should know about the content."
                )}
              </Typography>
            <ToggleButtonGroup
              exclusive
              value={locale}
              onChange={(_, next) => {
                if (next) setLocale(next);
              }}
              size="small"
              sx={{
                mt: 0.5,
                backgroundColor: "rgba(15,23,42,0.6)",
                border: "1px solid rgba(148,163,184,0.2)",
                borderRadius: "999px",
                "& .MuiToggleButton-root": {
                  px: 1.6,
                  py: 0.6,
                  border: "none",
                  color: "rgba(226,232,240,0.7)",
                  fontWeight: 600,
                },
                "& .Mui-selected": {
                  color: "#0f172a",
                  background: "linear-gradient(120deg, #bae6fd, #7dd3fc)",
                },
                "& .MuiToggleButtonGroup-grouped:not(:first-of-type)": {
                  borderRadius: "999px",
                },
                "& .MuiToggleButtonGroup-grouped:not(:last-of-type)": {
                  borderRadius: "999px",
                },
              }}
            >
              {LOCALE_OPTIONS.map((option) => (
                <ToggleButton key={option.value} value={option.value}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Button
              component={NextLink}
              href="/"
              startIcon={<ArrowBackRounded />}
              sx={{
                alignSelf: "flex-end",
                borderRadius: "12px",
                px: 2.4,
                py: 1,
                fontWeight: 600,
                color: "#e2e8f0",
                border: "1px solid rgba(148,163,184,0.3)",
                backgroundColor: "rgba(15,23,42,0.7)",
                boxShadow: "none",
                "&:hover": {
                  backgroundColor: "rgba(30,41,59,0.9)",
                  borderColor: "rgba(148,163,184,0.5)",
                },
              }}
            >
              {translate("Tillbaka till sidan", "Back to the site")}
            </Button>
            </Stack>

          <Box
            sx={{
              borderRadius: 3,
              border: "1px solid rgba(148,163,184,0.18)",
              background: "linear-gradient(135deg, #0f172a, #1f2937)",
              boxShadow: "0 24px 50px rgba(15,23,42,0.45)",
              p: { xs: 3, md: 4 },
            }}
          >
            <Stack spacing={{ xs: 2.5, md: 3 }}>
              <Stack spacing={1}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {translate("Ingen investeringsrådgivning", "No investment advice")}
                </Typography>
                <Typography sx={{ color: "rgba(226,232,240,0.75)", lineHeight: 1.8 }}>
                  {translate(
                    "Informationen är endast för informationssyfte och utgör inte investeringsråd eller rekommendationer. Du ansvarar själv för dina beslut.",
                    "The information is for informational purposes only and does not constitute investment advice or recommendations. You are responsible for your own decisions."
                  )}
                </Typography>
              </Stack>

              <Divider sx={{ borderColor: "rgba(148,163,184,0.18)" }} />

              <Stack spacing={1}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {translate("Datakvalitet & fördröjning", "Data quality & delays")}
                </Typography>
                <Typography sx={{ color: "rgba(226,232,240,0.75)", lineHeight: 1.8 }}>
                  {translate(
                    "Data hämtas från flera källor och kan vara fördröjd, ofullständig eller felaktig. Jag försöker verifiera och uppdatera, men kan inte garantera korrekthet i realtid.",
                    "Data is collected from multiple sources and may be delayed, incomplete, or inaccurate. I try to verify and update, but cannot guarantee real-time accuracy."
                  )}
                </Typography>
              </Stack>

              <Divider sx={{ borderColor: "rgba(148,163,184,0.18)" }} />

              <Stack spacing={1}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {translate("Intressekonflikt", "Conflict of interest")}
                </Typography>
                <Typography sx={{ color: "rgba(226,232,240,0.75)", lineHeight: 1.8 }}>
                  {translate(
                    "Jag äger aktier i Evolution AB. Sidan är byggd för att följa bolaget och dess trender, inte för att påverka investeringsbeslut.",
                    "I own shares in Evolution AB. This site is built to monitor the company and its trends, not to influence investment decisions."
                  )}
                </Typography>
              </Stack>

              <Divider sx={{ borderColor: "rgba(148,163,184,0.18)" }} />

              <Stack spacing={1}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {translate("Användning", "Usage")}
                </Typography>
                <Typography sx={{ color: "rgba(226,232,240,0.75)", lineHeight: 1.8 }}>
                  {translate(
                    "Genom att använda sidan accepterar du att informationen används på egen risk och att inget ansvar tas för eventuella förluster.",
                    "By using the site you accept that the information is used at your own risk and that no liability is assumed for any losses."
                  )}
                </Typography>
              </Stack>
            </Stack>
          </Box>

          <Box
            sx={{
              borderRadius: 3,
              border: "1px solid rgba(56,189,248,0.25)",
              background: "linear-gradient(135deg, rgba(14,116,144,0.22), rgba(15,23,42,0.85))",
              boxShadow: "0 18px 40px rgba(8,47,73,0.35)",
              p: { xs: 3, md: 4 },
            }}
          >
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {translate("Stötta projektet", "Support the project")}
              </Typography>
              <Typography sx={{ color: "rgba(226,232,240,0.75)", lineHeight: 1.8 }}>
                {translate(
                  "Jag är student och bygger sidan på min fritid. I takt med att intresset har vuxit har också kostnaderna för databas och drift ökat. Varje donation hjälper mig att fortsätta driva och utveckla sidan samt hålla den öppen för alla som är intresserade av Evolution.",
                  "I'm a student building the site in my spare time. As interest has grown, so have the costs for databases and hosting. Every donation helps me keep the site running, improve it, and keep it open to everyone interested in Evolution."
                )}
              </Typography>
              <Button
                component={NextLink}
                href={SUPPORT_URL}
                target="_blank"
                rel="noopener"
                startIcon={<LocalCafeRounded />}
                sx={{
                  alignSelf: "flex-start",
                  borderRadius: "999px",
                  px: 3,
                  py: 1.1,
                  fontWeight: 700,
                  color: "#0f172a",
                  background: "linear-gradient(120deg, #fbcfe8, #c084fc, #38bdf8)",
                  boxShadow: "0 16px 40px rgba(56,189,248,0.35)",
                  "&:hover": {
                    boxShadow: "0 20px 50px rgba(56,189,248,0.45)",
                    background: "linear-gradient(120deg, #f9a8d4, #a855f7, #22d3ee)",
                  },
                }}
              >
                {translate("Stötta via Buy Me a Coffee", "Support via Buy Me a Coffee")}
              </Button>
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                <Typography sx={{ color: "rgba(226,232,240,0.7)" }}>
                  {translate("Kom i kontakt med mig:", "Get in touch:")}
                </Typography>
                <Chip
                  component="a"
                  href={TWITTER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  clickable
                  icon={<TwitterIcon />}
                  label="Darkwing"
                  sx={{
                    backgroundColor: "rgba(56,189,248,0.16)",
                    border: "1px solid rgba(56,189,248,0.3)",
                    color: "#bae6fd",
                    "& .MuiChip-icon": { color: "#7dd3fc" },
                  }}
                />
              </Stack>
            </Stack>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
            <Typography sx={{ color: "rgba(226,232,240,0.6)" }}>
              {translate(
                "Senast uppdaterad: idag",
                "Last updated: today"
              )}
            </Typography>
          </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
