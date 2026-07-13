"use client";

// Presents the indicative free-float base used for buyback percentages.
import { Box, Divider, Stack, Typography } from "@mui/material";
import { useTranslate } from "@/context/LocaleContext";
import { calculateBuybackPctOfFreeFloat, FREE_FLOAT_SOURCE_URL } from "@/lib/buybackFreeFloat";

const COLORS = {
  surface: "rgba(15,23,42,0.62)",
  border: "rgba(148,163,184,0.18)",
  primary: "#f8fafc",
  secondary: "rgba(203,213,225,0.78)",
};

const formatShares = (value) => (Number.isFinite(value) ? value.toLocaleString("sv-SE") : "–");
const formatPct = (value) => (Number.isFinite(value) ? `${value.toLocaleString("sv-SE", { maximumFractionDigits: 1 })}%` : "–");

export default function FreeFloatView({ freeFloatSummary, currentMandateShares = 0, totalBuybackShares = 0 }) {
  const translate = useTranslate();
  const summary = freeFloatSummary || {};
  const currentBuybackPct = calculateBuybackPctOfFreeFloat(currentMandateShares, summary.freeFloatShares);
  const totalBuybackPct = calculateBuybackPctOfFreeFloat(totalBuybackShares, summary.freeFloatShares);

  return (
    <Box sx={{ width: "100%", background: COLORS.surface, borderRadius: "20px", border: `1px solid ${COLORS.border}`, boxShadow: "0 18px 40px rgba(8,15,40,0.46)", px: { xs: 1.5, md: 3 }, py: { xs: 2.4, md: 3.2 }, display: "flex", flexDirection: "column", gap: 2.2 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.primary, fontSize: { xs: "1.05rem", sm: "1.35rem", md: "1.5rem" } }}>
        {translate("Indikativ free float", "Indicative free float")}
      </Typography>
      <Typography sx={{ color: COLORS.secondary, lineHeight: 1.6, maxWidth: 900 }}>
        {translate(
          "En kompletterande jämförelsebas för återköpen: Evolutions egna aktier samt Dart och Österbahr räknas bort. Det visar hur stor återköpsandelen blir om man bara ser till aktier som sannolikt är tillgängliga för marknaden.",
          "A complementary comparison base for buybacks: Evolution-held shares, Dart and Österbahr are excluded. This shows buybacks relative to shares that are more likely to be available to the market."
        )}
      </Typography>

      <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 1.2, md: 1.6 }}>
        {[
          [translate("Indikativ free float", "Indicative free float"), formatShares(summary.freeFloatShares), formatPct(summary.freeFloatPct)],
          [translate("Dart + Österbahr", "Dart + Österbahr"), formatShares(summary.excludedOwnerShares), formatPct(summary.excludedOwnerPct)],
          [translate("Återköp i mandatet", "Buybacks in mandate"), formatShares(currentMandateShares), formatPct(currentBuybackPct)],
          [translate("Alla registrerade återköp", "All recorded buybacks"), formatShares(totalBuybackShares), formatPct(totalBuybackPct)],
        ].map(([label, value, caption]) => (
          <Box key={label} sx={{ flex: 1, minWidth: { xs: "100%", md: 180 }, background: "linear-gradient(135deg, rgba(56,189,248,0.16), rgba(15,23,42,0.58))", borderRadius: "14px", border: "1px solid rgba(56,189,248,0.25)", px: 1.8, py: 1.6 }}>
            <Typography variant="subtitle2" sx={{ color: COLORS.secondary }}>{label}</Typography>
            <Typography variant="h6" sx={{ color: COLORS.primary, fontWeight: 800, mt: 0.35 }}>{value}</Typography>
            <Typography variant="caption" sx={{ color: COLORS.secondary }}>{caption}</Typography>
          </Box>
        ))}
      </Stack>

      <Divider sx={{ borderColor: "rgba(148,163,184,0.14)" }} />
      <Stack spacing={0.45}>
        {(summary.excludedOwners || []).map((owner) => (
          <Stack key={owner.name} direction="row" justifyContent="space-between" gap={2}>
            <Typography variant="body2" sx={{ color: COLORS.secondary }}>{owner.name}</Typography>
            <Typography variant="body2" sx={{ color: COLORS.primary, fontWeight: 700 }}>{formatShares(owner.shares)} ({owner.holdingDate})</Typography>
          </Stack>
        ))}
        <Typography variant="caption" sx={{ color: "rgba(203,213,225,0.62)", mt: 0.8 }}>
          {translate("Indikativ beräkning – ägarlistan är daterad och free float är inte samma sak som faktisk daglig likviditet. Källa: ", "Indicative calculation – the ownership list is dated and free float is not the same as actual daily liquidity. Source: ")}
          <a href={FREE_FLOAT_SOURCE_URL} target="_blank" rel="noreferrer" style={{ color: "#7dd3fc" }}>{translate("Evolution", "Evolution")}</a>
        </Typography>
      </Stack>
    </Box>
  );
}
