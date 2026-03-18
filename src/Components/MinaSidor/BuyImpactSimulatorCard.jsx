"use client";

import { useMemo, useState } from "react";
import { Box, Stack, TextField, Typography } from "@mui/material";
import { compactCard, inputLabelSx, inputSx, text } from "./styles";
import { formatSek } from "./utils";
import { useFxRateContext } from "@/context/FxRateContext";
import { buildDividendEstimateRange } from "./dividendEstimate";

const formatPriceSek = (value) =>
  Number.isFinite(value)
    ? `${value.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK`
    : "–";

export default function BuyImpactSimulatorCard({
  translate,
  profile,
  currentPrice,
  upcomingDividend,
  lastDividend,
}) {
  const [buySharesInput, setBuySharesInput] = useState("");
  const [buyPriceInput, setBuyPriceInput] = useState("");
  const { rate: fxRate } = useFxRateContext();
  const hasNoDividendProposal = upcomingDividend?.status === "no_dividend_proposed";

  const currentShares = Number(profile?.shares) || 0;
  const currentAvgCost = Number(profile?.avgCost) || 0;
  const currentCost = currentShares * currentAvgCost;

  const buyShares = Math.max(0, Number(buySharesInput) || 0);
  const buyPrice =
    (Number(buyPriceInput) || 0) > 0
      ? Number(buyPriceInput)
      : Number.isFinite(currentPrice) && currentPrice > 0
      ? Number(currentPrice)
      : 0;

  const dividendEstimateRange = useMemo(
    () => buildDividendEstimateRange({ profileShares: currentShares, fxRate }),
    [currentShares, fxRate]
  );

  const dividendPerShare = useMemo(() => {
    if (hasNoDividendProposal) return 0;
    const upcoming = Number(upcomingDividend?.dividendPerShare);
    if (Number.isFinite(upcoming) && upcoming > 0) return upcoming;
    const est = Number(dividendEstimateRange?.base?.estimatedDpsSek);
    if (Number.isFinite(est) && est > 0) return est;
    const last = Number(lastDividend?.dividendPerShare);
    if (Number.isFinite(last) && last > 0) return last;
    return null;
  }, [
    hasNoDividendProposal,
    dividendEstimateRange?.base?.estimatedDpsSek,
    lastDividend?.dividendPerShare,
    upcomingDividend?.dividendPerShare,
  ]);

  const dividendSourceLabel = useMemo(() => {
    if (hasNoDividendProposal) {
      return translate("ingen utdelning föreslagen", "no dividend proposed");
    }
    if (Number.isFinite(Number(upcomingDividend?.dividendPerShare))) {
      return translate("deklarerad (aktiv till utbetalningsdag)", "declared (active until payment date)");
    }
    if (Number.isFinite(Number(dividendEstimateRange?.base?.estimatedDpsSek))) {
      return `${dividendEstimateRange?.yearLabel || "EST"} (${translate("basscenario", "base scenario")})`;
    }
    if (Number.isFinite(Number(lastDividend?.dividendPerShare))) {
      return translate("senast utbetald", "last paid");
    }
    return "";
  }, [
    hasNoDividendProposal,
    dividendEstimateRange?.base?.estimatedDpsSek,
    dividendEstimateRange?.yearLabel,
    lastDividend?.dividendPerShare,
    translate,
    upcomingDividend?.dividendPerShare,
  ]);

  const rangeLabel = useMemo(() => {
    if (hasNoDividendProposal) return null;
    const bear = Number(dividendEstimateRange?.bear?.estimatedDpsSek);
    const base = Number(dividendEstimateRange?.base?.estimatedDpsSek);
    const bull = Number(dividendEstimateRange?.bull?.estimatedDpsSek);
    if (!(Number.isFinite(bear) && Number.isFinite(base) && Number.isFinite(bull))) return null;
    return {
      bear,
      base,
      bull,
      yearLabel: dividendEstimateRange?.yearLabel || "EST",
    };
  }, [dividendEstimateRange, hasNoDividendProposal]);

  const simulation = useMemo(() => {
    if (!(buyShares > 0) || !(buyPrice > 0)) {
      return null;
    }

    const buyCost = buyShares * buyPrice;
    const newShares = currentShares + buyShares;
    const newTotalCost = currentCost + buyCost;
    const newAvgCost = newShares > 0 ? newTotalCost / newShares : 0;
    const avgCostChange = newAvgCost - currentAvgCost;

    const currentDividendCash =
      Number.isFinite(dividendPerShare) && currentShares > 0
        ? currentShares * dividendPerShare
        : null;
    const addedDividendCash =
      Number.isFinite(dividendPerShare) ? buyShares * dividendPerShare : null;
    const newDividendCash =
      Number.isFinite(dividendPerShare) ? newShares * dividendPerShare : null;

    return {
      buyCost,
      newShares,
      newAvgCost,
      avgCostChange,
      currentDividendCash,
      addedDividendCash,
      newDividendCash,
    };
  }, [buyPrice, buyShares, currentAvgCost, currentCost, currentShares, dividendPerShare]);

  return (
    <Box
      sx={{
        ...compactCard,
        p: { xs: 1.6, md: 2.1 },
        display: "flex",
        flexDirection: "column",
        gap: 1.4,
      }}
    >
      <Stack spacing={0.4}>
        <Typography sx={{ color: text.heading, fontWeight: 900, fontSize: { xs: "1.05rem", md: "1.15rem" } }}>
          {translate("Köpsimulator", "Buy impact simulator")}
        </Typography>
        <Typography sx={{ color: text.muted, fontSize: "0.9rem" }}>
          {translate(
            "Se nytt GAV och hur mycket utdelningen ökar vid ett nytt köp.",
            "See your new cost basis and how much dividend increases after a new buy."
          )}
        </Typography>
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
        <TextField
          label={translate("Antal aktier att köpa", "Shares to buy")}
          type="number"
          value={buySharesInput}
          onChange={(e) => setBuySharesInput(e.target.value)}
          fullWidth
          InputLabelProps={{ sx: inputLabelSx }}
          InputProps={{ sx: { color: text.heading } }}
          sx={inputSx}
        />
        <TextField
          label={translate("Köpkurs (SEK)", "Buy price (SEK)")}
          type="number"
          value={buyPriceInput}
          onChange={(e) => setBuyPriceInput(e.target.value)}
          fullWidth
          placeholder={Number.isFinite(currentPrice) ? String(currentPrice) : undefined}
          InputLabelProps={{ sx: inputLabelSx }}
          InputProps={{ sx: { color: text.heading } }}
          sx={inputSx}
        />
      </Stack>

      <Stack spacing={0.4}>
        <Typography sx={{ color: text.subtle }}>
          {translate("Utdelningsantagande", "Dividend assumption")}:{" "}
          <strong style={{ color: "#e2e8f0" }}>
            {Number.isFinite(dividendPerShare) ? `${dividendPerShare.toLocaleString("sv-SE", { maximumFractionDigits: 4 })} SEK/aktie` : "–"}
          </strong>
          {Number.isFinite(dividendPerShare) && dividendSourceLabel ? ` (${dividendSourceLabel})` : ""}
        </Typography>
        {rangeLabel ? (
          <Typography sx={{ color: text.muted, fontSize: "0.86rem" }}>
            {translate("Intervall", "Range")} {rangeLabel.yearLabel}:{" "}
            {`${rangeLabel.bear.toLocaleString("sv-SE", { maximumFractionDigits: 4 })} / ${rangeLabel.base.toLocaleString("sv-SE", { maximumFractionDigits: 4 })} / ${rangeLabel.bull.toLocaleString("sv-SE", { maximumFractionDigits: 4 })} SEK/aktie`}
            {` (${translate("bear / base / bull", "bear / base / bull")})`}
          </Typography>
        ) : null}
      </Stack>

      {simulation ? (
        <Stack spacing={0.7}>
          <Typography sx={{ color: text.soft, fontWeight: 700 }}>
            {translate("Investerat belopp", "Invested amount")}: {formatSek(simulation.buyCost)}
          </Typography>
          <Typography sx={{ color: text.soft, fontWeight: 700 }}>
            {translate("Nytt innehav", "New holdings")}: {Math.round(simulation.newShares).toLocaleString("sv-SE")} st
          </Typography>
          <Typography sx={{ color: text.soft, fontWeight: 700 }}>
            {translate("Nytt GAV", "New avg cost")}: {formatPriceSek(simulation.newAvgCost)}
            {" • "}
            {translate("Förändring", "Change")}: {formatPriceSek(simulation.avgCostChange)}
          </Typography>
          <Typography sx={{ color: "#86efac", fontWeight: 800 }}>
            {translate("Ökad utdelning (nästa)", "Dividend increase (next)")}:{" "}
            {Number.isFinite(simulation.addedDividendCash) ? formatSek(simulation.addedDividendCash) : "–"}
          </Typography>
          <Typography sx={{ color: text.subtle }}>
            {translate("Total utdelning efter köp", "Total dividend after buy")}:{" "}
            {Number.isFinite(simulation.newDividendCash) ? formatSek(simulation.newDividendCash) : "–"}
          </Typography>
        </Stack>
      ) : (
        <Typography sx={{ color: text.muted }}>
          {translate(
            "Fyll i antal och köpkurs för att se simuleringen.",
            "Enter shares and buy price to see the simulation."
          )}
        </Typography>
      )}
    </Box>
  );
}
