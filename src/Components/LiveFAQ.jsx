"use client";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const faqs = [
  {
    question: "Vad är Vision-hubben?",
    answer:
      "Control Center samlar livekurs, lobbyspelare, blankning och återköp i en och samma vy. Alla paneler hämtar data automatiskt och uppdateras under dagen utan att du behöver ladda om sidan.",
  },
  {
    question: "Hur ofta uppdateras live-data?",
    answer:
      "Lobbyspelare syncas var 10:e minut via vårt Cloudflare-workerflöde. Kurs och marknadsvärde hämtas från Yahoo Finance vid sidvisning och cacheas kort för prestanda. Blankningsstatus och återköp uppdateras så fort FI eller bolaget publicerar ny information.",
  },
  {
    question: "Vad är skillnaden mellan Live Money och Finansiell Översikt?",
    answer:
      "Live Money visar realtidsindikatorer (t.ex. per minut/aktie) baserat på senaste kvartalet. Finansiell Översikt fokuserar på rapporthistorik, marginaler och regionmix. Du växlar mellan dem via Control Center-menyn.",
  },
  {
    question: "Hur fungerar återköpspanelen?",
    answer:
      "Vi summerar senaste transaktionerna, visar takt jämfört med föregående vecka och uppskattar hur långt budgeten räcker. Kassaläget uppdateras när nya transaktioner publiceras och vi räknar även fram hur många aktier den kvarvarande kassan kan köpa till dagens kurs.",
  },
  {
    question: "Kan jag exportera eller få notifieringar?",
    answer:
      "Export (CSV/JSON) och e-postnotiser för nya rapporter/blankningsändringar är på backloggen. Hör av dig om du har önskemål så prioriterar jag rätt.",
  },
  {
    question: "Vem har byggt dashboarden?",
    answer:
      "Jag heter Alexander (Darkwing) och bygger detta på fritiden för att samla Evo-data snyggt. Du kan alltid stötta utvecklingen via Buy Me a Coffee-länken i footern eller maila mig på alexander.ek@live.se om du har feedback.",
  },
];

export default function LiveFAQ() {
  return (
    <Box sx={{ py: { xs: 4, md: 6 } }}>
      <Card
        sx={{
          background: "linear-gradient(135deg, rgba(7,11,23,0.92), rgba(21,32,55,0.92))",
          border: "1px solid rgba(148,163,184,0.22)",
          borderRadius: 4,
          boxShadow: "0 24px 65px rgba(2,8,23,0.55)",
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={2.5} alignItems="flex-start">
            <Stack spacing={1} alignItems="flex-start">
              <Chip
                label="FAQ"
                sx={{
                  backgroundColor: "rgba(56,189,248,0.16)",
                  border: "1px solid rgba(56,189,248,0.3)",
                  color: "#bae6fd",
                  letterSpacing: 1,
                  fontWeight: 600,
                }}
              />
              <Typography variant="h4" sx={{ fontWeight: 700, color: "#e2e8f0" }}>
                Vanliga frågor om Control Center
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.75)", lineHeight: 1.7 }}>
                Här hittar du svar på de frågor jag får oftast. Hör gärna av dig om något saknas – jag utvecklar
                dashboarden löpande utifrån feedback.
              </Typography>
            </Stack>

            <AccordionGroup faqs={faqs} />
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

function AccordionGroup({ faqs }) {
  return (
    <Container disableGutters>
      <Stack spacing={1.2}>
        {faqs.map((item, idx) => (
          <Accordion
            key={item.question}
            sx={{
              backgroundColor: "rgba(15,23,42,0.72)",
              border: "1px solid rgba(148,163,184,0.18)",
              borderRadius: 2,
              backdropFilter: "blur(4px)",
              overflow: "hidden",
              boxShadow: "0 12px 32px rgba(2,8,23,0.4)",
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: "#38bdf8" }} />}
              sx={{
                minHeight: 64,
                "& .MuiAccordionSummary-content": {
                  margin: "12px 0",
                },
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#f8fafc" }}>
                {item.question}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ backgroundColor: "rgba(15,23,42,0.55)" }}>
              <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.75)", lineHeight: 1.7 }}>
                {item.answer}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>
    </Container>
  );
}

