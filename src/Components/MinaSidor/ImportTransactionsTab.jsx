"use client";

import { useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { actionCard, buttonStyles, statusColors, text } from "./styles";

const EVOLUTION_ISIN = "SE0012673267";

const normalizeTransactionType = (rawType) => {
  const t = String(rawType || "").trim().toLowerCase();
  if (t === "köp" || t === "buy") return "buy";
  if (t === "sälj" || t === "sell") return "sell";
  // Treat transfer-in as buy so account moves don't break FIFO import.
  if (t === "värdepappersinsättning" || t === "insättning") return "buy";
  return null;
};

const parseSvNumber = (value) => {
  if (value == null) return null;
  const cleaned = String(value)
    .replace(/\uFEFF/g, "")
    .replace(/\s/g, "")
    .replace(/\u00A0/g, "")
    .replace(",", ".");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
};

export default function ImportTransactionsTab({ translate, loading, onImportTransactions }) {
  const [importFileName, setImportFileName] = useState("");
  const [importTrades, setImportTrades] = useState([]);
  const [importSummary, setImportSummary] = useState(null);
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);

  const resetImport = () => {
    setImportFileName("");
    setImportTrades([]);
    setImportSummary(null);
    setImportError("");
    setImporting(false);
  };

  const handleFilePicked = async (file) => {
    resetImport();
    if (!file) return;
    setImportFileName(file.name || "import.csv");

    const textContent = await file.text();
    const text = String(textContent || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setImportError(translate("Filen verkar vara tom.", "The file looks empty."));
      return;
    }

    const headerLine = lines[0].replace(/\uFEFF/g, "");
    const headers = headerLine.split(";").map((h) => h.trim());
    const idx = (name) => headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());

    const iDate = idx("Datum");
    const iType = idx("Typ av transaktion");
    const iDesc = idx("Värdepapper/beskrivning");
    const iQty = idx("Antal");
    const iPrice = idx("Kurs");
    const iFee = idx("Courtage");
    const iIsin = idx("ISIN");

    if ([iDate, iType, iDesc, iQty, iPrice].some((i) => i === -1)) {
      setImportError(
        translate(
          "CSV-formatet känns inte igen (saknar kolumner).",
          "CSV format not recognized (missing columns)."
        )
      );
      return;
    }

    const trades = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(";");
      const rawType = String(cols[iType] || "").trim();
      const rawDesc = String(cols[iDesc] || "").trim();
      const rawIsin = iIsin >= 0 ? String(cols[iIsin] || "").trim() : "";
      const rawDate = String(cols[iDate] || "").trim().slice(0, 10);
      const rawQty = String(cols[iQty] || "").trim();
      const rawPrice = String(cols[iPrice] || "").trim();
      const rawFee = iFee >= 0 ? String(cols[iFee] || "").trim() : "";

      const isEvolution =
        rawIsin === EVOLUTION_ISIN ||
        rawDesc.toLowerCase() === "evolution" ||
        rawDesc.toLowerCase().startsWith("evolution ");
      if (!isEvolution) continue;

      const type = normalizeTransactionType(rawType);
      if (!type) continue;

      const shares = Math.abs(Math.round(parseSvNumber(rawQty) ?? 0));
      const price = parseSvNumber(rawPrice);
      const fee = parseSvNumber(rawFee) ?? 0;
      if (!(shares > 0)) continue;
      if (type === "buy" && !(price > 0)) continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) continue;

      trades.push({
        type,
        date: rawDate,
        shares,
        price: type === "buy" ? price : price ?? null,
        fee: Number.isFinite(fee) && fee > 0 ? fee : 0,
        sourceOrder: i,
      });
    }

    if (!trades.length) {
      setImportError(
        translate(
          "Hittade inga köp/sälj för Evolution i filen.",
          "No Evolution buy/sell rows found in the file."
        )
      );
      return;
    }

    trades.sort((a, b) => {
      const c = a.date.localeCompare(b.date);
      if (c !== 0) return c;
      if (a.type !== b.type) return a.type === "buy" ? -1 : 1;
      return (a.sourceOrder ?? 0) - (b.sourceOrder ?? 0);
    });
    const buyCount = trades.filter((t) => t.type === "buy").length;
    const sellCount = trades.filter((t) => t.type === "sell").length;
    const buySharesTotal = trades.filter((t) => t.type === "buy").reduce((s, t) => s + t.shares, 0);
    const sellSharesTotal = trades.filter((t) => t.type === "sell").reduce((s, t) => s + t.shares, 0);
    const totalFees = trades.reduce((s, t) => s + (Number(t?.fee) || 0), 0);
    const first = trades[0]?.date;
    const last = trades[trades.length - 1]?.date;

    setImportTrades(trades);
    setImportSummary({
      rows: trades.length,
      buyCount,
      sellCount,
      buySharesTotal,
      sellSharesTotal,
      totalFees,
      first,
      last,
    });
  };

  const handleImport = async () => {
    if (!onImportTransactions) return;
    if (!importTrades.length) return;
    try {
      setImporting(true);
      setImportError("");
      await onImportTransactions(importTrades);
      resetImport();
    } catch (err) {
      setImportError(err?.message || translate("Importen misslyckades.", "Import failed."));
    } finally {
      setImporting(false);
    }
  };

  return (
    <Box sx={{ mt: 3, ...actionCard, p: 2 }}>
      <Stack spacing={2}>
        <Typography sx={{ color: text.subtle }}>
          {translate(
            "Importera köp/sälj från Avanza-transaktionsfil. Endast Evolution (ISIN SE0012673267) används. Övriga rader ignoreras.",
            "Import buy/sell from an Avanza transactions CSV. Only Evolution (ISIN SE0012673267) is used. Other rows are ignored."
          )}
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Button
            variant="outlined"
            component="label"
            sx={{
              textTransform: "none",
              borderColor: "rgba(148,163,184,0.35)",
              color: "#e2e8f0",
              "&:hover": {
                borderColor: "rgba(148,163,184,0.55)",
                backgroundColor: "rgba(148,163,184,0.08)",
              },
            }}
          >
            {translate("Välj CSV", "Choose CSV")}
            <input
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                handleFilePicked(file);
                e.target.value = "";
              }}
            />
          </Button>
          {importFileName ? (
            <Typography sx={{ color: "rgba(226,232,240,0.8)", fontWeight: 700 }}>{importFileName}</Typography>
          ) : null}
        </Stack>

        {importSummary ? (
          <Box
            sx={{
              px: 1.2,
              py: 1,
              borderRadius: "12px",
              border: "1px solid rgba(148,163,184,0.18)",
              background: "rgba(15,23,42,0.35)",
            }}
          >
            <Typography sx={{ color: "rgba(226,232,240,0.85)", fontWeight: 800, mb: 0.5 }}>
              {translate("Sammanfattning", "Summary")}
            </Typography>
            <Typography sx={{ color: text.body }}>
              {translate(
                `Rader: ${importSummary.rows} (Köp ${importSummary.buyCount}, Sälj ${importSummary.sellCount})`,
                `Rows: ${importSummary.rows} (Buys ${importSummary.buyCount}, Sells ${importSummary.sellCount})`
              )}
            </Typography>
            <Typography sx={{ color: text.body }}>
              {translate(
                `Aktier: +${importSummary.buySharesTotal.toLocaleString("sv-SE")} / -${importSummary.sellSharesTotal.toLocaleString("sv-SE")}`,
                `Shares: +${importSummary.buySharesTotal.toLocaleString("sv-SE")} / -${importSummary.sellSharesTotal.toLocaleString("sv-SE")}`
              )}
            </Typography>
            <Typography sx={{ color: text.body }}>
              {translate(
                `Courtage: ${Number(importSummary.totalFees || 0).toLocaleString("sv-SE", { maximumFractionDigits: 2 })} SEK`,
                `Fees: ${Number(importSummary.totalFees || 0).toLocaleString("sv-SE", { maximumFractionDigits: 2 })} SEK`
              )}
            </Typography>
            <Typography sx={{ color: text.body }}>
              {translate(
                `Period: ${importSummary.first} → ${importSummary.last}`,
                `Period: ${importSummary.first} → ${importSummary.last}`
              )}
            </Typography>
          </Box>
        ) : null}

        {importError ? <Typography sx={{ color: statusColors.warning, fontWeight: 700 }}>{importError}</Typography> : null}

        <Button
          variant="contained"
          disabled={loading || importing || !importTrades.length}
          onClick={handleImport}
          sx={{
            ...buttonStyles.primary,
            width: "100%",
            "&.Mui-disabled": {
              color: "rgba(255,255,255,0.92)",
              background: "linear-gradient(135deg, rgba(56,189,248,0.35), rgba(59,130,246,0.35))",
            },
          }}
        >
          {importing
            ? translate("Importerar...", "Importing...")
            : translate("Importera & uppdatera", "Import & update")}
        </Button>
      </Stack>
    </Box>
  );
}
