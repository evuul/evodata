"use client";

import NextLink from "next/link";
import LocalCafeIcon from "@mui/icons-material/LocalCafe";
import TwitterIcon from "@mui/icons-material/Twitter";
import GitHubIcon from "@mui/icons-material/GitHub";
import { Box, Button, Chip, Container, Divider, IconButton, Stack, Typography } from "@mui/material";

const SUPPORT_URL = "https://www.buymeacoffee.com/alexanderek";
const SUPPORT_QR_SRC = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=https%3A%2F%2Fwww.buymeacoffee.com%2Falexanderek";
const TWITTER_URL = "https://twitter.com/alexand93085679";
const GITHUB_URL = "https://github.com/alexanderek";

export default function LiveFooter() {
  return (
    <Box
      component="footer"
      sx={{
        mt: { xs: 6, md: 8 },
        position: "relative",
        overflow: "hidden",
        borderRadius: { xs: 3, md: 4 },
        border: "1px solid rgba(148,163,184,0.18)",
        background: "linear-gradient(135deg, rgba(7,11,23,0.95), rgba(21,32,55,0.95))",
        boxShadow: "0 28px 80px rgba(2,8,23,0.65)",
      }}
    >
      <Box
        sx={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(circle at 12% 20%, rgba(56,189,248,0.18), transparent 55%),
            radial-gradient(circle at 88% 15%, rgba(147,197,253,0.15), transparent 60%),
            radial-gradient(circle at 50% 80%, rgba(14,116,144,0.2), transparent 65%)
          `,
        }}
      />

      <Container
        maxWidth="lg"
        sx={{
          position: "relative",
          zIndex: 1,
          py: { xs: 4, md: 5 },
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 3, md: 4 }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
        >
          <Stack spacing={1.2} maxWidth={520}>
            <Chip
              label="Creator Spotlight"
              sx={{
                alignSelf: "flex-start",
                backgroundColor: "rgba(56,189,248,0.18)",
                border: "1px solid rgba(56,189,248,0.3)",
                color: "#bae6fd",
                letterSpacing: 1,
                fontWeight: 600,
              }}
            />
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: "#e2e8f0",
              }}
            >
              Byggt av Alexander Ek – på fritiden, för communityt
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.75)", lineHeight: 1.8 }}>
              Jag samlar all live-intelligens om Evolution på ett ställe: kurs, lobby, blankning, återköp och insiderdata.
              Om du har glädje av kontrollrummet får du gärna stötta utvecklingen – så kan jag fortsätta lägga till nya
              insikter, API:er och dashboards.
            </Typography>
            <Stack direction="row" spacing={1.5} flexWrap="wrap">
              <Chip
                component="a"
                href={TWITTER_URL}
                target="_blank"
                rel="noopener"
                clickable
                label="@alexand93085679"
                sx={{
                  backgroundColor: "rgba(56,189,248,0.16)",
                  border: "1px solid rgba(56,189,248,0.3)",
                  color: "#bae6fd",
                }}
              />
            </Stack>
          </Stack>

          <Stack spacing={2} alignItems={{ xs: "stretch", md: "flex-end" }} minWidth={{ md: 280 }}>
            <Button
              component={NextLink}
              href={SUPPORT_URL}
              target="_blank"
              rel="noopener"
              size="large"
              endIcon={<LocalCafeIcon />}
              sx={{
                px: 4,
                py: 1.4,
                fontWeight: 600,
                color: "#0f172a",
                background: "linear-gradient(120deg, #fbcfe8, #c084fc, #38bdf8)",
                backgroundSize: "200% 200%",
                boxShadow: "0 16px 45px rgba(56,189,248,0.35)",
                borderRadius: "999px",
                "@keyframes pulseGradient": {
                  "0%": { backgroundPosition: "0% 50%" },
                  "50%": { backgroundPosition: "100% 50%" },
                  "100%": { backgroundPosition: "0% 50%" },
                },
                animation: "pulseGradient 8s ease infinite",
                transition: "transform 0.25s ease, box-shadow 0.25s ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  animationPlayState: "paused",
                  boxShadow: "0 20px 55px rgba(56,189,248,0.45)",
                },
              }}
            >
              Stötta på Buy Me a Coffee
            </Button>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1.25,
              }}
            >
              <Box
                component="img"
                src={SUPPORT_QR_SRC}
                alt="QR-kod till Buy Me a Coffee"
                sx={{
                  width: 132,
                  height: 132,
                  borderRadius: 2,
                  backgroundColor: "#fff",
                  boxShadow: "0 12px 30px rgba(8,47,73,0.35)",
                  border: "1px solid rgba(148,163,184,0.25)",
                }}
              />
              <Typography variant="caption" sx={{ color: "rgba(226,232,240,0.7)" }}>
                Skanna och stötta direkt via mobilen
              </Typography>
            </Box>

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ color: "rgba(226,232,240,0.75)" }}
            >
              <Typography variant="body2">Följ uppdateringar</Typography>
              <IconButton
                component="a"
                href={TWITTER_URL}
                target="_blank"
                rel="noopener"
                sx={{
                  color: "#60a5fa",
                  "&:hover": { color: "#93c5fd", transform: "translateY(-1px)" },
                  transition: "all 0.2s ease",
                }}
              >
                <TwitterIcon fontSize="small" />
              </IconButton>
              <IconButton
                component="a"
                href={GITHUB_URL}
                target="_blank"
                rel="noopener"
                sx={{
                  color: "#5eead4",
                  "&:hover": { color: "#a7f3d0", transform: "translateY(-1px)" },
                  transition: "all 0.2s ease",
                }}
              >
                <GitHubIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
        </Stack>

        <Divider sx={{ borderColor: "rgba(148,163,184,0.18)", my: { xs: 3, md: 4 } }} />

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 1.5, md: 2.5 }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          sx={{ color: "rgba(148,163,184,0.75)" }}
        >
          <Typography variant="caption">
            © {new Date().getFullYear()} Alexander Ek. Byggt med ❤️ för Evolution-communityt.
          </Typography>
          <Stack direction="row" spacing={1.5} flexWrap="wrap">
              <Chip
                component={NextLink}
                href="mailto:alexander.ek@live.se"
                clickable
                label="Maila mig"
                sx={{ backgroundColor: "rgba(148,163,184,0.16)", color: "#cbd5f5" }}
              />
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
