"use client";

import React from "react";
import {
  Card,
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const faqs = [
  {
    q: "Hur ofta uppdateras data (pris, nyheter, grafer)?",
    a: "Aktiepris uppdateras periodiskt via vårt API. Nyheter hämtas vid sidladdning och kan uppdateras manuellt. Historiska grafer uppdateras när nya rapporter läggs in.",
  },
  {
    q: "Var kommer datan ifrån?",
    a: "Pris kommer via Yahoo Finance API, nyheter via Finnhub/NewsAPI/Google News RSS. Finansiella rapporter och återköpsdata baseras på sammanställda källor i projektet.",
  },
  {
    q: "Hur beräknas återköpsstatistiken?",
    a: "Vi summerar dagliga transaktioner, visar senaste arbetsveckan (mån–fre) och jämför mot föregående vecka. Vi estimerar även genomsnittlig köptakt och återstående dagar med enkel modell.",
  },
  {
    q: "Varför visas ibland fejkade nyheter?",
    a: "Om externa nyhetskällor inte svarar visar vi exempelposter så du ser formatet. Med API‑nycklar i .env (FINNHUB_API_KEY / NEWSAPI_API_KEY) visas skarpa nyheter.",
  },
  {
    q: "Vad innebär blankningsprocenten?",
    a: "Den visar andel av utestående aktier som är blankade. Vi kan även visa historik om källa tillåts. Värdet är en uppskattning som kan variera över tid.",
  },
  {
    q: "Kan jag exportera data?",
    a: "Vi planerar export av tabeller (CSV) och delningslänkar med aktiva filter. Hör av dig om du har specifika behov!",
  },
];

const FAQ = () => {
  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        padding: { xs: "12px", sm: "16px" },
        width: { xs: "92%", sm: "85%", md: "75%" },
        margin: "16px auto",
        color: "#fff",
      }}
    >
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        Vanliga frågor (FAQ)
      </Typography>

      <Box>
        {faqs.map((item, idx) => (
          <Accordion key={idx} sx={{ backgroundColor: "#1f1f1f", color: "#fff", mb: 1, border: "1px solid #2b2b2b" }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "#00e676" }} />}>
              <Typography sx={{ fontWeight: 600 }}>{item.q}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography sx={{ color: "#b0b0b0" }}>{item.a}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Card>
  );
};

export default FAQ;

