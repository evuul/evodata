"use client";

// Explains the dashboard's data sources, methodology and important limitations.

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
                "Varför kan live-siffran avvika från Evolutions lobby?",
                "Why can the live figure differ from Evolution's lobby?"
              )}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 2, md: 2.4 }, pt: 0, pb: { xs: 2, md: 2.4 } }}>
            <Typography sx={{ color: "rgba(226,232,240,0.78)", lineHeight: 1.75 }}>
              {translate(
                "Live-siffran summerar endast de gameshows som har aktiv spårning och döljer spel med fastnad data. Den innehåller inget uppskattat påslag och kan därför vara lägre än Evolutions fullständiga lobby.",
                "The live figure only sums gameshows with active tracking and excludes games with stuck data. It contains no estimated uplift and can therefore be lower than Evolution's full lobby."
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
                "Hur fungerar omsättningsprognosen?",
                "How does the revenue forecast work?"
              )}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 2, md: 2.4 }, pt: 0, pb: { xs: 2, md: 2.4 } }}>
            <Typography sx={{ color: "rgba(226,232,240,0.78)", lineHeight: 1.75 }}>
              {translate(
                "Omsättningsprognosen bygger på historisk omsättning per trackad spelare, aktuell lobbytrend och modellens historiska kalibrering. Spelarantalet visas utan uppskattat påslag för spel som inte trackas.",
                "The revenue forecast is based on historical revenue per tracked player, the current lobby trend and the model's historical calibration. Player counts are shown without an estimated uplift for games that are not tracked."
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
                "Hur fungerar Modellvärde?",
                "How does Model value work?"
              )}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 2, md: 2.4 }, pt: 0, pb: { xs: 2, md: 2.4 } }}>
            <Typography sx={{ color: "rgba(226,232,240,0.78)", lineHeight: 1.75 }}>
              {translate(
                "Modellvärde är en uppskattning, inte ett prisfacit eller en rekommendation. Modellen väger in rapportdata som omsättning, marginal och EPS samt tillväxtantaganden och kapitalallokering. Värdet uppdateras när nya kvartalssiffror kommer in och kan därför ändras mellan rapporter.",
                "Model value is an estimate, not a price target or recommendation. It weighs reported data such as revenue, margin and EPS together with growth assumptions and capital allocation. The value updates when new quarterly figures arrive and can therefore change between reports."
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
                "Blankningssiffran hämtas från Finansinspektionens blankningsregister. Registrets summerade nivå omfattar anmälda nettopositioner från 0,1% av aktiekapitalet, medan innehavarens namn och enskilda position blir offentlig från 0,5%. Positioner under 0,1% och intradagshandel ingår inte. Datan är därför fördröjd och visar den lägsta kända blankningen, inte hela bilden.",
                "The short-interest figure comes from Finansinspektionen's short-selling register. Its aggregate includes notified net positions from 0.1% of share capital, while the holder's name and individual position become public from 0.5%. Positions below 0.1% and intraday trading are not included. The data is therefore delayed and represents the minimum known short interest, not the full picture."
              )}
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion
          expanded={expanded === "faq-5"}
          onChange={handleChange("faq-5")}
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
                "Varför får jag importfel: “sälj överskrider innehavet”?",
                "Why do I get import error: “sell exceeds holdings”?"
              )}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 2, md: 2.4 }, pt: 0, pb: { xs: 2, md: 2.4 } }}>
            <Typography sx={{ color: "rgba(226,232,240,0.78)", lineHeight: 1.75 }}>
              {translate(
                "Vanligast är att exporten saknar äldre köp eller kontoflytt. Importen använder bara Evolution-rader (ISIN SE0012673267). Lösning: exportera hela perioden med alla transaktioner, eller sätt en baseline via “Justera GAV” innan import.",
                "Most commonly, the export is missing older buys or account transfers. Import only uses Evolution rows (ISIN SE0012673267). Fix: export the full period with all transactions, or set a baseline via “Adjust cost basis” before import."
              )}
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion
          expanded={expanded === "faq-6"}
          onChange={handleChange("faq-6")}
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
                "Hur räknas utdelning i Mina sidor?",
                "How are dividends calculated in My Page?"
              )}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 2, md: 2.4 }, pt: 0, pb: { xs: 2, md: 2.4 } }}>
            <Typography sx={{ color: "rgba(226,232,240,0.78)", lineHeight: 1.75 }}>
              {translate(
                "Du kan välja manuell total utdelning eller datum-baserad auto-beräkning. I datum-läget används köp/sälj-datum och X-dag: köp på eller efter X-dagen ger normalt inte utdelning för det året.",
                "You can choose manual total dividends or date-based auto calculation. In date mode, buy/sell dates and ex-date (X-day) are used: buys on or after X-day typically do not receive that year’s dividend."
              )}
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion
          expanded={expanded === "faq-7"}
          onChange={handleChange("faq-7")}
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
                "Hur aktiverar jag Daily AVG / ATH-notiser?",
                "How do I enable Daily AVG / ATH notifications?"
              )}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 2, md: 2.4 }, pt: 0, pb: { xs: 2, md: 2.4 } }}>
            <Typography sx={{ color: "rgba(226,232,240,0.78)", lineHeight: 1.75 }}>
              {translate(
                "Gå till Mina sidor och öppna notis-menyn (klockikonen). Där kan du slå på “Nytt ATH” och “Daily AVG”. Daily AVG skickas på en fast daglig tid när gårdagens data är klar.",
                "Go to My Page and open the notifications menu (bell icon). There you can enable “New ATH” and “Daily AVG”. Daily AVG is sent at a fixed daily time when yesterday’s data is ready."
              )}
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion
          expanded={expanded === "faq-8"}
          onChange={handleChange("faq-8")}
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
                "Hur byter jag namn/lösenord eller raderar konto?",
                "How do I change name/password or delete my account?"
              )}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 2, md: 2.4 }, pt: 0, pb: { xs: 2, md: 2.4 } }}>
            <Typography sx={{ color: "rgba(226,232,240,0.78)", lineHeight: 1.75 }}>
              {translate(
                "Öppna kugghjulet i Mina sidor. I Inställningar finns flikarna Profil, Lösenord och Radera konto. Kontoradering är permanent och kräver både lösenord och exakt e-postbekräftelse.",
                "Open the gear icon in My Page. In Settings you have Profile, Password, and Delete account tabs. Account deletion is permanent and requires both password and exact email confirmation."
              )}
            </Typography>
          </AccordionDetails>
        </Accordion>

        {[
          {
            id: "faq-9",
            question: ["Vad finns under Finansiell översikt?", "What is included in Financial overview?"],
            answer: [
              "Finansiell översikt samlar omsättning, marginal, EPS, utdelning, kassa, reglerad intäkt, geografisk översikt och Live vs RNG. Välj en flik och byt mellan kvartals- och årsdata där det är relevant.",
              "Financial overview brings together revenue, margin, EPS, dividends, cash, regulated revenue, geographic overview, and Live vs RNG. Select a tab and switch between quarterly and annual data where relevant.",
            ],
          },
          {
            id: "faq-10",
            question: ["Vad visar Kassa-fliken?", "What does the Cash tab show?"],
            answer: [
              "Kassa visar senaste rapporterade likvida medel, förändringen mot föregående kvartal och kassans utveckling per kvartal. Beloppen är hämtade från bolagets rapporterade cash end/cash and cash equivalents i MEUR.",
              "Cash shows the latest reported cash balance, the change versus the previous quarter, and the quarterly cash trend. Values come from reported cash end/cash and cash equivalents in EUR millions.",
            ],
          },
          {
            id: "faq-11",
            question: ["Vad betyder Reglerad intäkt?", "What does Regulated revenue mean?"],
            answer: [
              "Reglerad intäkt jämför total intäkt med intäkt från reglerade marknader. Grafen använder en separat y-axel för reglerad andel eftersom den visas i procent och total intäkt i MEUR.",
              "Regulated revenue compares total revenue with revenue from regulated markets. The chart uses a separate axis for regulated share because it is shown as a percentage while total revenue is shown in EUR millions.",
            ],
          },
          {
            id: "faq-12",
            question: ["Vad är Live Money och hur ska det tolkas?", "What is Live Money and how should it be interpreted?"],
            answer: [
              "Live Money är en simulerad vinsttakt baserad på senaste rapporterade justerade nettovinst. Den visar genomsnitt per sekund, minut, timme och dag – inte faktiska realtidsbetalningar eller kassaflöden.",
              "Live Money is a simulated profit pace based on the latest reported adjusted net profit. It shows averages per second, minute, hour, and day—not actual real-time payments or cash flows.",
            ],
          },
          {
            id: "faq-13",
            question: ["Varför kan svenska och engelska etiketter skilja sig?", "Why can Swedish and English labels differ?"],
            answer: [
              "Språket styrs av språkvalet i gränssnittet. Alla nya flikar och förklaringar använder separata svenska och engelska texter, medan bolagsnamn, valutor och etablerade förkortningar som EPS behålls oförändrade.",
              "The interface language controls the labels. All new tabs and explanations use separate Swedish and English text, while company names, currencies, and established abbreviations such as EPS remain unchanged.",
            ],
          },
        ].map(({ id, question, answer }) => (
          <Accordion
            key={id}
            expanded={expanded === id}
            onChange={handleChange(id)}
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
            <AccordionSummary expandIcon={<ExpandMoreRounded sx={{ color: "rgba(226,232,240,0.8)" }} />} sx={{ px: { xs: 2, md: 2.4 } }}>
              <Typography sx={{ fontWeight: 700 }}>{translate(question[0], question[1])}</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: { xs: 2, md: 2.4 }, pt: 0, pb: { xs: 2, md: 2.4 } }}>
              <Typography sx={{ color: "rgba(226,232,240,0.78)", lineHeight: 1.75 }}>{translate(answer[0], answer[1])}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>
    </Box>
  );
};

export default FaqPanel;
