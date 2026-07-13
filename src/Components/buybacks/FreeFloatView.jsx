"use client";

// Presents the dated ownership snapshot used for buyback comparisons.
import { Box, Chip, Divider, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
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
const formatChange = (value, suffix = "") => {
  if (!Number.isFinite(value)) return "–";
  return `${value > 0 ? "+" : ""}${value.toLocaleString("sv-SE", { maximumFractionDigits: 1 })}${suffix}`;
};

const changeColor = (value) => (value > 0 ? "#86efac" : value < 0 ? "#fca5a5" : COLORS.secondary);
const trendSymbol = (direction) => (direction === "up" ? "↑" : direction === "down" ? "↓" : direction === "flat" ? "→" : "–");

export default function FreeFloatView({
  shareholderOverview,
  snapshotDate,
  currentMandateShares = 0,
  totalBuybackShares = 0,
}) {
  const translate = useTranslate();
  const overview = shareholderOverview || { rows: [], freeFloat: {} };
  const summary = overview.freeFloat || {};
  const currentBuybackPct = calculateBuybackPctOfFreeFloat(currentMandateShares, summary.freeFloatShares);
  const totalBuybackPct = calculateBuybackPctOfFreeFloat(totalBuybackShares, summary.freeFloatShares);
  const hasComparison = overview.rows.some((row) => Number.isFinite(row.changeShares));

  const cards = [
    [translate("Strategiskt justerat aktieunderlag", "Strategically adjusted share base"), formatShares(summary.freeFloatShares), formatPct(summary.freeFloatPct)],
    [translate("Dart + Österbahr", "Dart + Österbahr"), formatShares(summary.excludedOwnerShares), formatPct(summary.excludedOwnerPct)],
    [translate("Återköp i mandatet", "Buybacks in mandate"), formatShares(currentMandateShares), formatPct(currentBuybackPct)],
    [translate("Alla registrerade återköp", "All recorded buybacks"), formatShares(totalBuybackShares), formatPct(totalBuybackPct)],
  ];

  return (
    <Box sx={{ width: "100%", background: COLORS.surface, borderRadius: "20px", border: `1px solid ${COLORS.border}`, boxShadow: "0 18px 40px rgba(8,15,40,0.46)", px: { xs: 1.2, md: 3 }, py: { xs: 2.4, md: 3.2 }, display: "flex", flexDirection: "column", gap: 2.2 }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.primary, fontSize: { xs: "1.05rem", sm: "1.35rem", md: "1.5rem" } }}>
            {translate("Ägarbild och strategiskt aktieunderlag", "Ownership picture and strategic share base")}
          </Typography>
          <Typography sx={{ color: COLORS.secondary, lineHeight: 1.6, maxWidth: 900, mt: 0.8 }}>
            {translate(
              "Här följer vi de största registrerade ägarna. Fonder och pensionsägare ligger kvar i aktieunderlaget eftersom de kan handla löpande. Bara Dart och Österbahr behandlas som strategiska ägare i jämförelsen.",
              "This tracks the largest registered owners. Funds and pension owners remain in the share base because they can trade over time. Only Dart and Österbahr are treated as strategic owners in the comparison."
            )}
          </Typography>
        </Box>
        <Chip label={translate(`Snapshot ${snapshotDate}`, `Snapshot ${snapshotDate}`)} size="small" sx={{ alignSelf: { xs: "flex-start", sm: "flex-start" }, color: "#bae6fd", backgroundColor: "rgba(14,116,144,0.25)", border: "1px solid rgba(56,189,248,0.3)" }} />
      </Stack>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" }, gap: 1.4 }}>
        {cards.map(([label, value, caption]) => (
          <Box key={label} sx={{ background: "linear-gradient(135deg, rgba(56,189,248,0.16), rgba(15,23,42,0.58))", borderRadius: "14px", border: "1px solid rgba(56,189,248,0.25)", px: 1.8, py: 1.6 }}>
            <Typography variant="subtitle2" sx={{ color: COLORS.secondary }}>{label}</Typography>
            <Typography variant="h6" sx={{ color: COLORS.primary, fontWeight: 800, mt: 0.35 }}>{value}</Typography>
            <Typography variant="caption" sx={{ color: COLORS.secondary }}>{caption}</Typography>
          </Box>
        ))}
      </Box>

      <Divider sx={{ borderColor: "rgba(148,163,184,0.14)" }} />
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
        <Typography variant="h6" sx={{ color: "#7dd3fc", fontWeight: 700 }}>{translate("Största registrerade ägare", "Largest registered owners")}</Typography>
        <Typography variant="body2" sx={{ color: COLORS.secondary }}>
          {hasComparison ? translate("Förändring mot föregående snapshot", "Change versus previous snapshot") : translate("Första snapshot – förändring visas vid nästa uppdatering", "First snapshot – changes appear after the next update")}
        </Typography>
      </Stack>

      <TableContainer sx={{ border: "1px solid rgba(148,163,184,0.14)", borderRadius: "14px" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {[translate("Ägare", "Owner"), translate("Kategori", "Category"), translate("Aktier", "Shares"), translate("Andel", "Share"), translate("Förändring", "Change"), translate("Trend", "Trend")].map((heading) => (
                <TableCell key={heading} sx={{ color: COLORS.secondary, borderColor: "rgba(148,163,184,0.14)", fontWeight: 700 }}>{heading}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {overview.rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell sx={{ color: COLORS.primary, borderColor: "rgba(148,163,184,0.1)", fontWeight: 600 }}>{row.name}</TableCell>
                <TableCell sx={{ color: COLORS.secondary, borderColor: "rgba(148,163,184,0.1)" }}>{row.category || "–"}</TableCell>
                <TableCell sx={{ color: COLORS.primary, borderColor: "rgba(148,163,184,0.1)", whiteSpace: "nowrap" }}>{formatShares(row.shares)}</TableCell>
                <TableCell sx={{ color: COLORS.primary, borderColor: "rgba(148,163,184,0.1)", whiteSpace: "nowrap" }}>{formatPct(row.ownershipPct)}</TableCell>
                <TableCell sx={{ color: changeColor(row.changeShares), borderColor: "rgba(148,163,184,0.1)", whiteSpace: "nowrap" }}>
                  {Number.isFinite(row.changeShares) ? `${formatChange(row.changeShares)} (${formatChange(row.changePctPoints, " pp")})` : "–"}
                </TableCell>
                <TableCell sx={{ color: changeColor(row.trendShares ?? row.changeShares), borderColor: "rgba(148,163,184,0.1)", whiteSpace: "nowrap", fontWeight: 700 }}>
                  {trendSymbol(row.trendDirection || (row.changeShares > 0 ? "up" : row.changeShares < 0 ? "down" : Number.isFinite(row.changeShares) ? "flat" : null))}
                  {Number.isFinite(row.trendShares) ? ` ${formatChange(row.trendShares)} aktier` : ""}
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell sx={{ color: COLORS.secondary, borderColor: "rgba(148,163,184,0.1)", fontWeight: 600 }}>{translate("Övriga registrerade ägare", "Other registered owners")}</TableCell>
              <TableCell sx={{ color: COLORS.secondary, borderColor: "rgba(148,163,184,0.1)" }}>–</TableCell>
              <TableCell sx={{ color: COLORS.primary, borderColor: "rgba(148,163,184,0.1)" }}>{formatShares(overview.otherShares)}</TableCell>
              <TableCell sx={{ color: COLORS.primary, borderColor: "rgba(148,163,184,0.1)" }}>{formatPct(overview.otherOwnershipPct)}</TableCell>
              <TableCell sx={{ color: COLORS.secondary, borderColor: "rgba(148,163,184,0.1)" }}>–</TableCell>
              <TableCell sx={{ color: COLORS.secondary, borderColor: "rgba(148,163,184,0.1)" }}>–</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="caption" sx={{ color: "rgba(203,213,225,0.62)" }}>
        {translate("Ägarlistan är daterad och kan innehålla olika innehavsdatum per ägare. Källa: ", "The ownership list is dated and may contain different holding dates per owner. Source: ")}
        <a href={FREE_FLOAT_SOURCE_URL} target="_blank" rel="noreferrer" style={{ color: "#7dd3fc" }}>{translate("Evolution", "Evolution")}</a>
      </Typography>
    </Box>
  );
}
