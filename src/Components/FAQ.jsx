"use client";

import React from "react";
import {
  Card,
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";

const faqs = [
  {
    q: "Hur ofta uppdateras data (pris, nyheter, grafer)?",
    a: "Aktiepris uppdateras periodiskt via vårt API. Nyheter hämtas vid sidladdning och kan uppdateras manuellt. Historiska grafer uppdateras när nya rapporter läggs in.",
  },
  {
    q: "Var kommer datan ifrån?",
    a: "Pris kommer via Yahoo Finance API. Finansiella rapporter och återköpsdata är sammanställda i projektets JSON‑filer. Om externa nyheter saknas visas exempelposter så du ser formatet.",
  },
  {
    q: "Vad visar MoneyCounter?",
    a: "En uppskattning av dagens vinst (till nu). Den lilla chippen visar vad vinsten skulle kunna räcka till idag: \"Skulle räcka till återköp: N aktier (X%)\" samt \"Skulle räcka till: Y SEK per aktie\". Det är en visuell representation – inga beslut underlag.",
  },
  {
    q: "Hur räknar ni återköpta aktier och per‑aktie idag?",
    a: "Återköpta aktier ≈ dagens vinst ÷ senast kända kurs. Per aktie idag ≈ dagens vinst ÷ utestående aktier (beräknat som Market Cap ÷ kurs). Beräkningarna är förenklade och bortser från avgifter/timing.",
  },
  {
    q: "Hur beräknas återköpsstatistiken?",
    a: "Vi summerar dagliga transaktioner, visar senaste arbetsveckan (mån–fre) och jämför mot föregående vecka. Vi visar även köptakt, uppskattat slutförande och historik över tid.",
  },
  {
    q: "Blankning: varifrån kommer uppgifterna?",
    a: "Headern visar total blankning. Vid klick ser du publika positioner (FI om CSV är konfigurerad) och resten som opublikt. Totalen kan även sättas via .env (NEXT_PUBLIC_SHORT_INTEREST).",
  },
  {
    q: "Varför står det MEURO på Y‑axeln?",
    a: "För att spara utrymme visar vi MEURO i omsättningsgrafer och förkortar etiketter på mobil. På årsvisning visas endast årtal (2015, 2016, …).",
  },
  {
    q: "Kan jag exportera data?",
    a: "Export (CSV) och delningslänkar med aktiva filter planeras. Hör gärna av dig om behov!",
  },
  {
    q: "Ansvarsfriskrivning",
    a: "Allt innehåll är för informations‑ och visualiseringsändamål. Inget ska tolkas som finansiell rådgivning.",
  },
  {
    q: "Vem står bakom sidan?",
    a: "Detta är ett hobbyprojekt som byggs av en student för att öva kod. Feedback och idéer välkomnas!",
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

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mb: 1 }}>
        <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
          Det här är ett hobbyprojekt som jag bygger för att öva kod som student.
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<EmailOutlinedIcon />}
          href="mailto:Alexander.ek@live.se"
          sx={{ borderColor: '#00e676', color: '#00e676', '&:hover': { borderColor: '#00c853', color: '#00c853' } }}
        >
          Maila mig
        </Button>
      </Box>

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
