"use client";

import React from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import { useTranslate } from "@/context/LocaleContext";

const FaqPanel = () => {
  const translate = useTranslate();
  const [expanded, setExpanded] = React.useState("faq-0");

  const handleChange = (panel) => (_, isOpen) => {
    setExpanded(isOpen ? panel : false);
  };

  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #111827, #0f172a)",
        borderRadius: { xs: 0, md: "18px" },
        border: "1px solid rgba(148,163,184,0.18)",
        boxShadow: "0 20px 45px rgba(15, 23, 42, 0.45)",
        color: "#f8fafc",
        mx: { xs: -2, sm: -3, md: -4 },
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 3, md: 4 },
      }}
    >
      <Stack spacing={2.2} sx={{ maxWidth: 980, mx: "auto" }}>
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="overline" sx={{ letterSpacing: 1.1, color: "rgba(148,163,184,0.75)" }}>
            {translate("FAQ", "FAQ")}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.2 }}>
            {translate("Vanliga frågor och förklaringar", "Frequently asked questions and explanations")}
          </Typography>
          <Typography sx={{ color: "rgba(226,232,240,0.72)", mt: 1 }}>
            {translate(
              "Förklaringar av nyckeltal, datakällor och hur beräkningarna på sidan fungerar.",
              "Explanations of key metrics, data sources, and how calculations on the site work."
            )}
          </Typography>
        </Box>

        <Accordion
          expanded={expanded === "faq-0"}
          onChange={handleChange("faq-0")}
          disableGutters
          sx={{
            borderRadius: "14px",
            border: "1px solid rgba(56,189,248,0.28)",
            background: "rgba(2,6,23,0.42)",
            color: "#f8fafc",
            boxShadow: "none",
            "&:before": { display: "none" },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreRounded sx={{ color: "rgba(226,232,240,0.8)" }} />}
            sx={{ px: { xs: 2, md: 2.4 } }}
          >
            <Typography sx={{ fontWeight: 700 }}>
              {translate(
                "Varför visar live-spelare inte hela lobbyn?",
                "Why do live players not represent the full lobby?"
              )}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 2, md: 2.4 }, pt: 0, pb: { xs: 2, md: 2.4 } }}>
            <Typography sx={{ color: "rgba(226,232,240,0.78)", lineHeight: 1.75 }}>
              {translate(
                "Ett urval av gameshows trackas, inte alla produkter i hela lobbyn. Live-siffran visar därför bara de spel som har aktiv spårning.",
                "A selected set of gameshows is tracked, not every product in the full lobby. The live number therefore reflects only games with active tracking."
              )}
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion
          expanded={expanded === "faq-1"}
          onChange={handleChange("faq-1")}
          disableGutters
          sx={{
            borderRadius: "14px",
            border: "1px solid rgba(52,211,153,0.28)",
            background: "rgba(2,6,23,0.42)",
            color: "#f8fafc",
            boxShadow: "none",
            "&:before": { display: "none" },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreRounded sx={{ color: "rgba(226,232,240,0.8)" }} />}
            sx={{ px: { xs: 2, md: 2.4 } }}
          >
            <Typography sx={{ fontWeight: 700 }}>
              {translate(
                "Vad betyder “Simulera lobby (+10%)”?",
                "What does “Simulate lobby (+10%)” mean?"
              )}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 2, md: 2.4 }, pt: 0, pb: { xs: 2, md: 2.4 } }}>
            <Typography sx={{ color: "rgba(226,232,240,0.78)", lineHeight: 1.75 }}>
              {translate(
                "Knappen lägger på cirka 10% ovanpå trackade gameshows för att approximera spelandet i övriga spel som inte trackas. Det är en förenklad uppskattning, inte ett officiellt totalvärde.",
                "The button adds roughly 10% on top of tracked gameshows to approximate play in other games that are not tracked. It is a simplified estimate, not an official total."
              )}
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion
          expanded={expanded === "faq-2"}
          onChange={handleChange("faq-2")}
          disableGutters
          sx={{
            borderRadius: "14px",
            border: "1px solid rgba(250,204,21,0.28)",
            background: "rgba(2,6,23,0.42)",
            color: "#f8fafc",
            boxShadow: "none",
            "&:before": { display: "none" },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreRounded sx={{ color: "rgba(226,232,240,0.8)" }} />}
            sx={{ px: { xs: 2, md: 2.4 } }}
          >
            <Typography sx={{ fontWeight: 700 }}>
              {translate(
                "Hur funkar forecasten och vad betyder “adjusted”?",
                "How does the forecast work and what does “adjusted” mean?"
              )}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 2, md: 2.4 }, pt: 0, pb: { xs: 2, md: 2.4 } }}>
            <Typography sx={{ color: "rgba(226,232,240,0.78)", lineHeight: 1.75 }}>
              {translate(
                "Forecast Earnings bygger på historisk omsättning per spelare och aktuell lobbytrend. “Adjusted players” är ett justerat spelarantal med +10% påslag mot rådata för att bättre matcha Evolutions totala lobby. Exempel: raw 61 100 spelare blir adjusted 67 200 spelare.",
                "Forecast Earnings is based on historical revenue per player and the current lobby trend. “Adjusted players” is a normalized player count with a +10% uplift versus raw data to better match Evolution's total lobby. Example: raw 61,100 players becomes adjusted 67,200 players."
              )}
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion
          expanded={expanded === "faq-3"}
          onChange={handleChange("faq-3")}
          disableGutters
          sx={{
            borderRadius: "14px",
            border: "1px solid rgba(168,85,247,0.28)",
            background: "rgba(2,6,23,0.42)",
            color: "#f8fafc",
            boxShadow: "none",
            "&:before": { display: "none" },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreRounded sx={{ color: "rgba(226,232,240,0.8)" }} />}
            sx={{ px: { xs: 2, md: 2.4 } }}
          >
            <Typography sx={{ fontWeight: 700 }}>
              {translate(
                "Hur fungerar AI Fair Value?",
                "How does AI Fair Value work?"
              )}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 2, md: 2.4 }, pt: 0, pb: { xs: 2, md: 2.4 } }}>
            <Typography sx={{ color: "rgba(226,232,240,0.78)", lineHeight: 1.75 }}>
              {translate(
                "AI Fair Value är en modelluppskattning, inte ett prisfacit. Modellen väger in rapportdata (t.ex. omsättning, marginal, EPS), tillväxtantaganden och kapitalallokering som återköp/utdelning. Fair value uppdateras när nya kvartalssiffror kommer in, så nivåerna kan ändras mellan rapporter beroende på utfallet.",
                "AI Fair Value is a model estimate, not a price truth. The model weighs reported data (for example revenue, margin, EPS), growth assumptions, and capital allocation such as buybacks/dividends. Fair value updates when new quarterly data arrives, so levels can change between reports based on results."
              )}
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion
          expanded={expanded === "faq-4"}
          onChange={handleChange("faq-4")}
          disableGutters
          sx={{
            borderRadius: "14px",
            border: "1px solid rgba(244,114,182,0.28)",
            background: "rgba(2,6,23,0.42)",
            color: "#f8fafc",
            boxShadow: "none",
            "&:before": { display: "none" },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreRounded sx={{ color: "rgba(226,232,240,0.8)" }} />}
            sx={{ px: { xs: 2, md: 2.4 } }}
          >
            <Typography sx={{ fontWeight: 700 }}>
              {translate(
                "Var kommer blankningsdata från och vad betyder blankning?",
                "Where does short-interest data come from and what is shorting?"
              )}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 2, md: 2.4 }, pt: 0, pb: { xs: 2, md: 2.4 } }}>
            <Typography sx={{ color: "rgba(226,232,240,0.78)", lineHeight: 1.75 }}>
              {translate(
                "Blankningssiffran hämtas från Finansinspektionen enligt EU:s blankningsregler. Netto-blankning rapporteras vid 0,2% (till FI) och blir offentlig vid 0,5%. Alla förändringar om plus/minus 0,1 procentenheter ska rapporteras senast 15:30 nästa handelsdag. Siffran visar rapporterade nettopositioner, inte all handel. Positioner under 0,5% och intradagshandel syns inte, så datan är alltid fördröjd och ofullständig: den visar lägsta kända blankning, inte hela bilden.",
                "The short-interest figure is sourced from Finansinspektionen under EU short-selling rules. Net short positions must be reported at 0.2% (to FI) and become public at 0.5%. Any change of plus/minus 0.1 percentage points must be reported by 15:30 on the next trading day. The figure shows reported net positions, not all trading. Positions below 0.5% and intraday trading are not visible, so the data is always delayed and incomplete: it reflects the minimum known short interest, not the full picture."
              )}
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Stack>
    </Box>
  );
};

export default FaqPanel;
