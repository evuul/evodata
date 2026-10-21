"use client";

// Describes implemented storage, email delivery and the limits of account deletion.

import { Box, Link, Stack, Typography } from "@mui/material";
import NextLink from "next/link";
import PublicInformationLayout from "@/Components/PublicInformationLayout";
import { useTranslate } from "@/context/LocaleContext";
import { CONTACT_EMAIL } from "@/config/site";

const sections = [
  {
    title: ["Vem driver sidan?", "Who runs the site?"],
    text: ["EvoTracker är ett oberoende projekt som drivs av Alexander Ek. Kontakta mig om du har frågor om dina uppgifter eller vill begära en kopia, rättelse eller radering.", "EvoTracker is an independent project run by Alexander Ek. Contact me with questions about your information or to request a copy, correction or deletion."],
  },
  {
    title: ["Konto och portfölj", "Account and portfolio"],
    text: ["När du registrerar dig sparas namn, e-postadress och en lösenordshash för att hantera ditt konto. Om du använder portföljfunktionerna sparas de innehav och transaktioner du själv anger. Dina val för e-postnotiser och eventuell Premium- eller Founder-status kopplas också till kontot.", "Registration stores your name, email address and a password hash to manage your account. Portfolio features store the holdings and transactions you enter. Email notification preferences and any Premium or Founder status are also linked to your account."],
  },
  {
    title: ["Sessioner och lokal lagring", "Sessions and local storage"],
    text: ["En skyddad sessionscookie håller dig inloggad och har en giltighetstid på upp till 30 dagar. Språkval, visad introduktion och favoritvyer sparas lokalt i webbläsaren. Favoritvyerna synkroniseras inte mellan enheter. Du kan ta bort lokal lagring i webbläsarens inställningar.", "A protected session cookie keeps you signed in for up to 30 days. Language, introduction preferences and favourite views are stored locally in your browser. Favourite views do not sync between devices. You can clear local storage in your browser settings."],
  },
  {
    title: ["Support och e-post", "Support and email"],
    text: ["Supportärenden sparar ditt meddelande, din e-postadress och eventuella svar så att jag kan hjälpa dig. Resend används för att skicka konto- och notifieringsmeddelanden. Du styr spelarrelaterade e-postnotiser på Mina sidor.", "Support tickets store your message, email address and replies so I can help you. Resend delivers account and notification emails. You control player-related email notifications on My page."],
  },
  {
    title: ["Drift och besöksstatistik", "Hosting and usage statistics"],
    text: ["Tjänsten använder Vercel för webbdrift samt Vercel Analytics och Speed Insights för besöks- och prestandastatistik. Kontodata lagras via Upstash/Redis. Driftleverantörerna kan behandla tekniska uppgifter som behövs för att leverera och skydda tjänsten. Donationer hanteras separat av Buy Me a Coffee; ange aldrig kortuppgifter i EvoTracker.", "The service uses Vercel for hosting and Vercel Analytics and Speed Insights for usage and performance statistics. Account data is stored through Upstash/Redis. Service providers may process technical information needed to deliver and protect the service. Donations are handled separately by Buy Me a Coffee; never enter card details in EvoTracker."],
  },
  {
    title: ["Lagring och kontoradering", "Storage and account deletion"],
    text: ["Kontouppgifter och portföljdata finns kvar tills kontot raderas. Du kan radera kontot i kontoinställningarna på Mina sidor genom att bekräfta med lösenord och e-postadress. Det tar bort användarposten med portföljen och den aktuella sessionen. Supportärenden och separata Founder-underlag tas inte automatiskt bort i samma steg; kontakta mig om du vill få dessa granskade för radering. Lokala webbläsarinställningar och eventuella säkerhetskopior omfattas inte av den omedelbara kontoraderingen.", "Account and portfolio data remain until the account is deleted. You can delete your account in My page account settings by confirming your password and email address. This removes the user record, including the portfolio, and the current session. Support tickets and separate Founder records are not automatically removed in that step; contact me to have them reviewed for deletion. Local browser settings and any backups are not covered by immediate account deletion."],
  },
];

export default function PrivacyPageClient() {
  const translate = useTranslate();
  return (
    <PublicInformationLayout titleSv="Integritet och dina uppgifter" titleEn="Privacy and your information">
      <Typography sx={{ color: "#cbd5e1", mb: 3 }}>{translate("Här beskriver vi hur uppgifter används i EvoTracker.", "Here is how information is used in EvoTracker.")}</Typography>
      <Stack spacing={2}>
        {sections.map(({ title, text }) => (
          <Box component="section" key={title[0]} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, border: "1px solid rgba(148,163,184,0.2)", backgroundColor: "#111c2e" }}>
            <Typography component="h2" sx={{ fontSize: 20, fontWeight: 750, mb: 1 }}>{translate(...title)}</Typography>
            <Typography sx={{ color: "#cbd5e1", lineHeight: 1.8 }}>{translate(...text)}</Typography>
          </Box>
        ))}
        <Link href={`mailto:${CONTACT_EMAIL}`} sx={{ color: "#82c1ff" }}>{CONTACT_EMAIL}</Link>
        <Link component={NextLink} href="/mina-sidor" sx={{ color: "#82c1ff" }}>{translate("Till Mina sidor", "Open My page")}</Link>
      </Stack>
    </PublicInformationLayout>
  );
}
