"use client";

// Shows the signed-in user's Premium payment and remaining access period.

import WorkspacePremiumRounded from "@mui/icons-material/WorkspacePremiumRounded";
import { Box, Stack, Typography } from "@mui/material";
import { buildPremiumStatus, formatPremiumDate } from "@/lib/premiumStatus";
import { cardBase, text } from "./styles";

const Stat = ({ label, value, detail }) => (
  <Box sx={{ p: 1.35, borderRadius: "12px", background: "rgba(15,23,42,0.44)", border: "1px solid rgba(125,211,252,0.13)" }}>
    <Typography sx={{ color: text.muted, fontSize: "0.75rem" }}>{label}</Typography>
    <Typography sx={{ color: "#f8fafc", fontWeight: 850, fontSize: "1.15rem", mt: 0.25 }}>{value}</Typography>
    {detail ? <Typography sx={{ color: text.muted, fontSize: "0.75rem", mt: 0.25 }}>{detail}</Typography> : null}
  </Box>
);

export default function PremiumStatusCard({ user, locale, translate, preview = false }) {
  const previewUser = preview
    ? {
        isSubscriber: true,
        subscriberPaymentSek: 200,
        subscriberStartedAt: new Date().toISOString(),
        subscriberUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      }
    : user;
  const status = buildPremiumStatus(previewUser);
  if (!status.paymentSek && !status.expiresAt) return null;

  const currency = (status.paymentSek ?? 0).toLocaleString(locale === "en" ? "en-US" : "sv-SE");
  const remaining = status.remainingDays == null
    ? translate("Okänt", "Unknown")
    : status.remainingDays === 1
      ? translate("1 dag kvar", "1 day left")
      : translate(`${status.remainingDays} dagar kvar`, `${status.remainingDays} days left`);

  return (
    <Box sx={{ ...cardBase, p: { xs: 1.7, md: 2.2 }, borderColor: "rgba(125,211,252,0.24)", background: "linear-gradient(135deg, rgba(14,116,144,0.16), rgba(15,23,42,0.68))" }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <WorkspacePremiumRounded sx={{ color: "#7dd3fc" }} />
          <Box>
            <Typography sx={{ color: "#f8fafc", fontWeight: 850 }}>{preview ? translate("Premium-status · förhandsvisning", "Premium status · preview") : translate("Din Premium-period", "Your Premium period")}</Typography>
            <Typography sx={{ color: text.muted, fontSize: "0.8rem" }}>{preview ? translate("Exempel på hur kortet ser ut för en betalande användare", "Example of the card shown to a paying user") : translate("Betalning och tillgång", "Payment and access")}</Typography>
          </Box>
        </Stack>
        <Typography sx={{ color: status.active ? "#6ee7b7" : "#fca5a5", fontWeight: 800, alignSelf: { xs: "flex-start", sm: "center" } }}>
          {status.active ? translate("Aktiv", "Active") : translate("Utgången", "Expired")}
        </Typography>
      </Stack>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" }, gap: 1 }}>
        <Stat label={translate("Betalat", "Paid")} value={`${currency} kr`} detail={status.remainingCreditSek ? translate(`${status.remainingCreditSek} kr kvar som saldo`, `${status.remainingCreditSek} SEK credit remaining`) : null} />
        <Stat label={translate("Täcker", "Covers")} value={`${status.coveredMonths ?? "–"} ${translate("månader", "months")}`} detail={status.coveredMonths != null ? `${status.coveredMonths * 30} ${translate("dagar", "days")}` : null} />
        <Stat label={translate("Period", "Period")} value={formatPremiumDate(status.startedAt, locale)} detail={`→ ${formatPremiumDate(status.expiresAt, locale)}`} />
        <Stat label={translate("Återstår", "Remaining")} value={remaining} detail={status.expiresAt ? translate(`Till ${formatPremiumDate(status.expiresAt, locale)}`, `Until ${formatPremiumDate(status.expiresAt, locale)}`) : null} />
      </Box>
    </Box>
  );
}
