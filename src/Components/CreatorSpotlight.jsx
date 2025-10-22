"use client";

import Image from "next/image";
import { Box, Button, Card, CardContent, IconButton, Typography } from "@mui/material";
import TwitterIcon from "@mui/icons-material/Twitter";

const BUY_ME_A_COFFEE_URL = "https://www.buymeacoffee.com/evuul";
const QR_IMAGE_SRC = "/images/buy-me-a-coffee-evuul.png";
const TWITTER_URL = "https://twitter.com/Alexand93085679";

export default function CreatorSpotlight() {
  return (
    <Box
      component="section"
      sx={{
        width: "100%",
        maxWidth: "1100px",
        margin: { xs: "32px auto", sm: "48px auto" },
        px: { xs: 2, sm: 0 },
      }}
    >
      <Card
        elevation={8}
        sx={{
          background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 16,
          boxShadow: "0 16px 32px rgba(0,0,0,0.35)",
          overflow: "hidden",
        }}
      >
        <CardContent
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: { xs: 2.5, sm: 3 },
            px: { xs: 3, sm: 4 },
            py: { xs: 3, sm: 4 },
            textAlign: "center",
          }}
        >
          <Typography
            variant="overline"
            sx={{
              color: "#82c1ff",
              letterSpacing: 4,
              display: "block",
              fontSize: { xs: "1rem", sm: "1.1rem" },
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            Om skaparen
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: "rgba(240,231,255,0.85)",
              lineHeight: 1.7,
              maxWidth: 720,
            }}
          >
            Jag började bygga Evolution Tracker som ett hobbyprojekt för att själv förstå Evolution bättre. Det
            som startade som ett enkelt script har växt till en daglig dashboard som nu besöks av hundratals
            Evolution-intresserade investerare varje dag. Här kan de snabbt få koll på återköp, lobbytrender,
            insiderköp och mycket mer – allt uppdaterat automatiskt.
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: "rgba(240,231,255,0.78)",
              lineHeight: 1.6,
              maxWidth: 720,
            }}
          >
            Idag studerar jag .NET-utveckling med examen 2026 och bygger vidare på projektet varje vecka. Jag
            uppskattar verkligen all feedback, buggrapporter och bidrag som hjälper mig fortsätta utveckla
            plattformen. Vill du stötta vidare utveckling eller bara säga hej? Då får du gärna bjuda mig på en
            kaffe eller höra av dig på Twitter.
          </Typography>

          <Button
            variant="contained"
            size="large"
            href={BUY_ME_A_COFFEE_URL}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              textTransform: "none",
              fontWeight: 700,
              fontSize: "1rem",
              letterSpacing: 0.5,
              background: "linear-gradient(135deg, #ffb347, #ff6f61)",
              boxShadow: "0 10px 30px rgba(255, 111, 97, 0.35)",
              "&:hover": {
                background: "linear-gradient(135deg, #ff9a2f, #ff4d4d)",
              },
            }}
          >
            Stötta via Buy Me a Coffee
          </Button>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              mt: 2,
            }}
          >
            <Box
              sx={{
                width: 220,
                height: 220,
                position: "relative",
                borderRadius: 4,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 20px 45px rgba(0,0,0,0.35)",
              }}
            >
              <Image
                src={QR_IMAGE_SRC}
                alt="Buy Me a Coffee QR-kod"
                fill
                sizes="220px"
                style={{ objectFit: "cover" }}
              />
            </Box>
            <Typography
              variant="body2"
              sx={{ color: "rgba(240,231,255,0.65)", textAlign: "center", lineHeight: 1.5, maxWidth: 360 }}
            >
              Skanna QR-koden för att stötta utvecklingen – varje kaffe går direkt till driften och nya features.
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: "rgba(240,231,255,0.7)",
              fontSize: "0.95rem",
              mt: 1,
            }}
          >
            <Typography variant="body2" sx={{ color: "inherit" }}>
              Vill du diskutera Evolution eller ge feedback?
            </Typography>
            <IconButton
              href={TWITTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Kontakta mig på Twitter"
              sx={{
                color: "#1DA1F2",
                backgroundColor: "rgba(29,161,242,0.12)",
                "&:hover": {
                  backgroundColor: "rgba(29,161,242,0.25)",
                },
              }}
            >
              <TwitterIcon />
            </IconButton>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
