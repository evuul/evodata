"use client";

// Lets users review, edit and delete portfolio transactions with a recalculation preview.

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  Divider,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import ReceiptLongRounded from "@mui/icons-material/ReceiptLongRounded";
import {
  buildEditableTransactionLedger,
  updatePortfolioTransaction,
} from "@/lib/portfolioTransactions";
import { buttonStyles, inputLabelSx, inputSx, modalPaper, statusColors, text } from "./styles";
import { formatSek } from "./utils";

const transactionValue = (transaction) => {
  const shares = Number(transaction?.shares) || 0;
  const price = Number(transaction?.price) || 0;
  return shares * price;
};

const sortNewestFirst = (transactions) =>
  [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.sourceOrder - a.sourceOrder);

const SummaryMetric = ({ label, value, color = text.heading }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography sx={{ color: text.muted, fontSize: "0.72rem", fontWeight: 700 }}>{label}</Typography>
    <Typography sx={{ color, fontWeight: 850, mt: 0.25 }}>{value}</Typography>
  </Box>
);

export default function TransactionManagerDialog({
  open,
  onClose,
  translate,
  profile,
  loading,
  onUpdate,
  onDelete,
}) {
  const [filter, setFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [form, setForm] = useState({ date: "", shares: "", price: "", fee: "0" });
  const [operationError, setOperationError] = useState("");

  const transactions = useMemo(() => buildEditableTransactionLedger(profile), [profile]);
  const editingTransaction = transactions.find((transaction) => transaction.id === editingId) ?? null;
  const visibleTransactions = useMemo(
    () => sortNewestFirst(transactions.filter((transaction) => filter === "all" || transaction.type === filter)),
    [filter, transactions]
  );

  useEffect(() => {
    if (!editingTransaction) return;
    setForm({
      date: editingTransaction.date,
      shares: String(editingTransaction.shares),
      price: editingTransaction.price == null ? "" : String(editingTransaction.price),
      fee: String(editingTransaction.fee || 0),
    });
    setOperationError("");
  }, [editingTransaction]);

  const changes = {
    date: form.date,
    shares: Number(form.shares),
    price: Number(form.price),
    fee: Number(form.fee),
  };
  const preview = editingTransaction
    ? updatePortfolioTransaction(transactions, editingTransaction.id, changes)
    : null;
  const hasCompleteForm =
    Boolean(form.date) &&
    changes.shares > 0 &&
    changes.price > 0 &&
    changes.fee >= 0;
  const canSave = hasCompleteForm && preview?.ok;

  const handleSave = async () => {
    if (!editingTransaction || !canSave) return;
    setOperationError("");
    const saved = await onUpdate({ transactionId: editingTransaction.id, changes });
    if (saved) {
      setEditingId(null);
      return;
    }
    setOperationError(translate("Ändringen kunde inte sparas.", "The change could not be saved."));
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    setOperationError("");
    const deleted = await onDelete(deleteCandidate.id);
    if (deleted) {
      setDeleteCandidate(null);
      if (editingId === deleteCandidate.id) setEditingId(null);
      return;
    }
    setOperationError(translate("Transaktionen kunde inte raderas.", "The transaction could not be deleted."));
  };

  const closeDialog = () => {
    if (loading) return;
    setEditingId(null);
    setDeleteCandidate(null);
    setOperationError("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={closeDialog} maxWidth="md" fullWidth PaperProps={{ sx: modalPaper }}>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <ReceiptLongRounded sx={{ color: "#7dd3fc" }} />
              <Typography variant="h6" sx={{ color: text.heading, fontWeight: 850 }}>
                {translate("Dina transaktioner", "Your transactions")}
              </Typography>
            </Stack>
            <Typography sx={{ color: text.muted, fontSize: "0.82rem", mt: 0.5 }}>
              {translate(
                "En ändring räknar om antal aktier och GAV från hela historiken.",
                "A change recalculates shares and cost basis from the complete history."
              )}
            </Typography>
          </Box>
          <Button onClick={closeDialog} disabled={loading} sx={{ color: text.subtle, textTransform: "none" }}>
            {translate("Stäng", "Close")}
          </Button>
        </Stack>

        {operationError ? (
          <Typography sx={{ color: statusColors.warning, mt: 1.5, fontWeight: 700 }}>{operationError}</Typography>
        ) : null}

        {editingTransaction ? (
          <Box sx={{ mt: 2.5 }}>
            <Button
              startIcon={<ArrowBackRounded />}
              onClick={() => setEditingId(null)}
              disabled={loading}
              sx={{ color: text.subtle, textTransform: "none", mb: 1.5 }}
            >
              {translate("Tillbaka till listan", "Back to list")}
            </Button>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                gap: 1.5,
              }}
            >
              <TextField
                label={translate("Datum", "Date")}
                type="date"
                value={form.date}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                InputLabelProps={{ sx: inputLabelSx, shrink: true }}
                InputProps={{ sx: { color: text.heading } }}
                sx={inputSx}
              />
              <TextField
                label={translate("Antal aktier", "Shares")}
                type="number"
                value={form.shares}
                onChange={(event) => setForm((current) => ({ ...current, shares: event.target.value }))}
                InputLabelProps={{ sx: inputLabelSx }}
                InputProps={{ sx: { color: text.heading } }}
                sx={inputSx}
              />
              <TextField
                label={translate("Pris per aktie (SEK)", "Price per share (SEK)")}
                type="number"
                value={form.price}
                onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                InputLabelProps={{ sx: inputLabelSx }}
                InputProps={{ sx: { color: text.heading } }}
                sx={inputSx}
              />
              <TextField
                label={translate("Courtage (SEK)", "Brokerage fee (SEK)")}
                type="number"
                value={form.fee}
                onChange={(event) => setForm((current) => ({ ...current, fee: event.target.value }))}
                InputLabelProps={{ sx: inputLabelSx }}
                InputProps={{ sx: { color: text.heading } }}
                sx={inputSx}
              />
            </Box>

            <Box
              sx={{
                mt: 2,
                p: 1.8,
                borderRadius: "14px",
                background: "rgba(56,189,248,0.08)",
                border: "1px solid rgba(125,211,252,0.2)",
              }}
            >
              <Typography sx={{ color: text.subtle, fontSize: "0.75rem", fontWeight: 800, mb: 1.2 }}>
                {translate("FÖRHANDSVISNING EFTER ÄNDRING", "PREVIEW AFTER CHANGE")}
              </Typography>
              {preview?.ok ? (
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 2 }}>
                  <SummaryMetric
                    label={translate("Antal aktier", "Shares")}
                    value={preview.profile.shares.toLocaleString("sv-SE")}
                  />
                  <SummaryMetric label={translate("Nytt GAV", "New cost basis")} value={formatSek(preview.profile.avgCost)} />
                </Box>
              ) : (
                <Typography sx={{ color: statusColors.warning, fontWeight: 700 }}>
                  {preview?.error || translate("Fyll i giltiga värden.", "Enter valid values.")}
                </Typography>
              )}
            </Box>

            <Stack direction={{ xs: "column-reverse", sm: "row" }} justifyContent="space-between" gap={1.2} sx={{ mt: 2.2 }}>
              <Button
                color="error"
                startIcon={<DeleteOutlineRounded />}
                onClick={() => setDeleteCandidate(editingTransaction)}
                disabled={loading}
                sx={{ textTransform: "none" }}
              >
                {translate("Radera transaktion", "Delete transaction")}
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={loading || !canSave}
                sx={{ ...buttonStyles.primary, textTransform: "none", px: 3 }}
              >
                {loading ? translate("Sparar...", "Saving...") : translate("Spara ändring", "Save change")}
              </Button>
            </Stack>
          </Box>
        ) : (
          <Box sx={{ mt: 2.5 }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1.2}>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={filter}
                onChange={(_, value) => value && setFilter(value)}
                sx={{ "& .MuiToggleButton-root": { color: text.subtle, textTransform: "none", px: 1.8 } }}
              >
                <ToggleButton value="all">{translate("Alla", "All")}</ToggleButton>
                <ToggleButton value="buy">{translate("Köp", "Buys")}</ToggleButton>
                <ToggleButton value="sell">{translate("Sälj", "Sales")}</ToggleButton>
              </ToggleButtonGroup>
              <Chip
                size="small"
                label={translate(`${transactions.length} transaktioner`, `${transactions.length} transactions`)}
                sx={{ color: text.subtle, border: "1px solid rgba(148,163,184,0.25)" }}
              />
            </Stack>

            <Stack divider={<Divider sx={{ borderColor: "rgba(148,163,184,0.12)" }} />} sx={{ mt: 1.5, maxHeight: "55vh", overflowY: "auto" }}>
              {visibleTransactions.map((transaction) => (
                <Stack
                  key={transaction.id}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  gap={1.5}
                  sx={{ py: 1.35 }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Chip
                        size="small"
                        label={transaction.type === "buy" ? translate("Köp", "Buy") : translate("Sälj", "Sale")}
                        sx={{
                          color: transaction.type === "buy" ? "#86efac" : "#fda4af",
                          background: transaction.type === "buy" ? "rgba(34,197,94,0.12)" : "rgba(244,63,94,0.12)",
                          fontWeight: 800,
                        }}
                      />
                      <Typography sx={{ color: text.heading, fontWeight: 800 }}>
                        {transaction.shares.toLocaleString("sv-SE")} {translate("aktier", "shares")}
                      </Typography>
                    </Stack>
                    <Typography sx={{ color: text.muted, fontSize: "0.78rem", mt: 0.45 }}>
                      {transaction.date} · {formatSek(transaction.price)} · {translate("värde", "value")} {formatSek(transactionValue(transaction))}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.3}>
                    <Tooltip title={translate("Redigera", "Edit")}>
                      <IconButton onClick={() => setEditingId(transaction.id)} sx={{ color: "#7dd3fc" }}>
                        <EditRounded fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={translate("Radera", "Delete")}>
                      <IconButton onClick={() => setDeleteCandidate(transaction)} sx={{ color: "#fda4af" }}>
                        <DeleteOutlineRounded fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              ))}
              {!visibleTransactions.length ? (
                <Typography sx={{ color: text.muted, py: 4, textAlign: "center" }}>
                  {translate("Inga transaktioner i detta filter.", "No transactions in this filter.")}
                </Typography>
              ) : null}
            </Stack>
          </Box>
        )}

        {deleteCandidate ? (
          <Box
            sx={{
              mt: 2,
              p: 1.8,
              borderRadius: "14px",
              border: "1px solid rgba(248,113,113,0.35)",
              background: "rgba(127,29,29,0.18)",
            }}
          >
            <Typography sx={{ color: "#fecaca", fontWeight: 850 }}>
              {translate("Radera transaktionen permanent?", "Delete this transaction permanently?")}
            </Typography>
            <Typography sx={{ color: text.subtle, fontSize: "0.82rem", mt: 0.4 }}>
              {translate(
                "Innehavet räknas om direkt. Åtgärden kan inte ångras.",
                "The portfolio is recalculated immediately. This action cannot be undone."
              )}
            </Typography>
            <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 1.3 }}>
              <Button onClick={() => setDeleteCandidate(null)} disabled={loading} sx={{ color: text.subtle, textTransform: "none" }}>
                {translate("Avbryt", "Cancel")}
              </Button>
              <Button variant="contained" color="error" onClick={handleDelete} disabled={loading} sx={{ textTransform: "none" }}>
                {loading ? translate("Raderar...", "Deleting...") : translate("Ja, radera", "Yes, delete")}
              </Button>
            </Stack>
          </Box>
        ) : null}
      </Box>
    </Dialog>
  );
}
