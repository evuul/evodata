"use client";

import { useState } from "react";
import { Box, Button, Dialog, Stack, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { actionCard, buttonStyles, inputLabelSx, inputSx, modalPaper, statusColors, text } from "./styles";
import ImportTransactionsTab from "./ImportTransactionsTab";

export default function ManageHoldingsModal({
  open,
  onClose,
  translate,
  currentShares,
  currentAvgCost,
  buyShares,
  buyPrice,
  buyDate,
  sellShares,
  sellPrice,
  setShares,
  setAvgCost,
  acquisitionDate,
  dividendsReceived,
  onDividendsChange,
  estimatedDividendsFromDate,
  dividendInputMode,
  onDividendInputModeChange,
  breakEvenDisplay,
  breakEvenPaidBack,
  onBuySharesChange,
  onBuyPriceChange,
  onBuyDateChange,
  onSellSharesChange,
  onSellPriceChange,
  onSetSharesChange,
  onSetAvgCostChange,
  onAcquisitionDateChange,
  onBuy,
  onSell,
  onSet,
  onImportTransactions,
  loading,
}) {
  const [tab, setTab] = useState(0);
  const canBuy = Number(buyShares) > 0 && Number(buyPrice) > 0 && Boolean(buyDate);
  const canSell = Number(sellShares) > 0 && Number(sellPrice) > 0;
  const canSet = Number(setShares) >= 0 && Number(setAvgCost) >= 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: modalPaper }}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: text.heading }}>
          {translate("Hantera innehav", "Manage holdings")}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1.2, mb: 0.5 }} flexWrap="wrap">
          <Box
            sx={{
              px: 1.2,
              py: 0.45,
              borderRadius: "999px",
              border: "1px solid rgba(99,102,241,0.35)",
              background: "rgba(99,102,241,0.18)",
              color: "#e2e8f0",
              fontSize: "0.8rem",
              fontWeight: 700,
            }}
          >
            {translate(
              `Nuvarande aktier: ${Number(currentShares || 0).toLocaleString("sv-SE")}`,
              `Current shares: ${Number(currentShares || 0).toLocaleString("sv-SE")}`
            )}
          </Box>
          <Box
            sx={{
              px: 1.2,
              py: 0.45,
              borderRadius: "999px",
              border: "1px solid rgba(148,163,184,0.35)",
              background: "rgba(148,163,184,0.16)",
              color: "#e2e8f0",
              fontSize: "0.8rem",
              fontWeight: 700,
            }}
          >
            {translate(
              `Nuvarande GAV: ${Number(currentAvgCost || 0).toLocaleString("sv-SE", { maximumFractionDigits: 2 })} SEK`,
              `Current cost basis: ${Number(currentAvgCost || 0).toLocaleString("sv-SE", { maximumFractionDigits: 2 })} SEK`
            )}
          </Box>
        </Stack>
        <Tabs
          value={tab}
          onChange={(_, next) => setTab(next)}
          variant="fullWidth"
          sx={{
            mt: 1.2,
            "& .MuiTab-root": { color: text.subtle, minHeight: 42, textTransform: "none", fontWeight: 600 },
            "& .Mui-selected": { color: text.heading },
          }}
        >
          <Tab label={translate("Köp/Öka", "Buy/Increase")} />
          <Tab label={translate("Sälj/Minska", "Sell/Reduce")} />
          <Tab label={translate("Justera GAV", "Adjust cost basis")} />
          <Tab label={translate("Utdelning", "Dividends")} />
          <Tab label={translate("Import", "Import")} />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ mt: 3, ...actionCard, p: 2 }}>
            <Stack spacing={2.5}>
              <TextField
                label={translate("Antal aktier", "Shares")}
                type="number"
                value={buyShares}
                onChange={onBuySharesChange}
                fullWidth
                InputLabelProps={{ sx: inputLabelSx }}
                InputProps={{ sx: { color: text.heading } }}
                sx={inputSx}
              />
              <TextField
                label={translate("Pris per aktie (SEK)", "Price per share (SEK)")}
                type="number"
                value={buyPrice}
                onChange={onBuyPriceChange}
                fullWidth
                InputLabelProps={{ sx: inputLabelSx }}
                InputProps={{ sx: { color: text.heading } }}
                sx={inputSx}
              />
              <TextField
                label={translate("Köpdatum", "Purchase date")}
                type="date"
                value={buyDate}
                onChange={onBuyDateChange}
                fullWidth
                InputLabelProps={{ sx: inputLabelSx, shrink: true }}
                InputProps={{ sx: { color: text.heading } }}
                sx={inputSx}
              />
              <Button
                variant="contained"
                onClick={onBuy}
                disabled={loading || !canBuy}
                sx={{
                  ...buttonStyles.primary,
                  width: "100%",
                  "&.Mui-disabled": {
                    color: "rgba(255,255,255,0.92)",
                    background: "linear-gradient(135deg, rgba(56,189,248,0.35), rgba(59,130,246,0.35))",
                  },
                }}
              >
                {translate("Uppdatera GAV", "Update cost basis")}
              </Button>
            </Stack>
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ mt: 3, ...actionCard, p: 2 }}>
            <Stack spacing={2.5}>
              <TextField
                label={translate("Antal aktier att sälja", "Shares to sell")}
                type="number"
                value={sellShares}
                onChange={onSellSharesChange}
                fullWidth
                InputLabelProps={{ sx: inputLabelSx }}
                InputProps={{ sx: { color: text.heading } }}
                sx={inputSx}
              />
              <TextField
                label={translate("Säljkurs per aktie (SEK)", "Sell price per share (SEK)")}
                type="number"
                value={sellPrice}
                onChange={onSellPriceChange}
                fullWidth
                InputLabelProps={{ sx: inputLabelSx }}
                InputProps={{ sx: { color: text.heading } }}
                sx={inputSx}
              />
              <Button
                variant="outlined"
                onClick={onSell}
                disabled={loading || !canSell}
                sx={{
                  ...buttonStyles.outlineDanger,
                  width: "100%",
                  "&.Mui-disabled": {
                    color: "rgba(254,202,202,0.75)",
                    borderColor: "rgba(248,113,113,0.4)",
                    backgroundColor: "rgba(248,113,113,0.06)",
                  },
                }}
              >
                {translate("Minska antal", "Reduce shares")}
              </Button>
            </Stack>
          </Box>
        )}

        {tab === 2 && (
          <Box sx={{ mt: 3, ...actionCard, p: 2 }}>
            <Stack spacing={2.5}>
              <TextField
                label={translate("Totalt antal aktier", "Total shares")}
                type="number"
                value={setShares}
                onChange={onSetSharesChange}
                fullWidth
                InputLabelProps={{ sx: inputLabelSx }}
                InputProps={{ sx: { color: text.heading } }}
                sx={inputSx}
              />
              <TextField
                label={translate("GAV (SEK)", "Cost basis (SEK)")}
                type="number"
                value={setAvgCost}
                onChange={onSetAvgCostChange}
                fullWidth
                InputLabelProps={{ sx: inputLabelSx }}
                InputProps={{ sx: { color: text.heading } }}
                sx={inputSx}
              />
              <TextField
                label={translate("Inköpsdatum (valfritt)", "Acquisition date (optional)")}
                type="date"
                value={acquisitionDate ?? ""}
                onChange={onAcquisitionDateChange}
                fullWidth
                InputLabelProps={{ sx: inputLabelSx, shrink: true }}
                InputProps={{ sx: { color: text.heading } }}
                sx={inputSx}
              />
              <Button
                variant="contained"
                onClick={onSet}
                disabled={loading || !canSet}
                sx={{ ...buttonStyles.primary, width: "100%" }}
              >
                {translate("Spara", "Save")}
              </Button>
            </Stack>
          </Box>
        )}

        {tab === 3 && (
          <Box sx={{ mt: 3, ...actionCard, p: 2 }}>
            <Stack spacing={2.5}>
              <Box>
                <Typography sx={{ color: text.subtle, mb: 1 }}>
                  {translate("Utdelningsmetod", "Dividend method")}
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  value={dividendInputMode}
                  onChange={(_, value) => value && onDividendInputModeChange(value)}
                  size="small"
                  sx={{
                    backgroundColor: "rgba(148,163,184,0.12)",
                    borderRadius: "999px",
                    p: 0.5,
                    "& .MuiToggleButton-root": {
                      textTransform: "none",
                      border: 0,
                      color: text.soft,
                      borderRadius: "999px!important",
                      px: 1.4,
                    },
                    "& .Mui-selected": {
                      color: text.heading,
                      backgroundColor: "rgba(56,189,248,0.24)!important",
                      fontWeight: 700,
                    },
                  }}
                >
                  <ToggleButton value="manual">
                    {translate("Enkelt (manuell)", "Simple (manual)")}
                  </ToggleButton>
                  <ToggleButton value="acquisition">
                    {translate("Datum-baserat (auto)", "Date-based (auto)")}
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {dividendInputMode === "manual" ? (
                <>
                  <TextField
                    label={translate("Totalt mottagen utdelning (SEK)", "Total dividends received (SEK)")}
                    type="number"
                    value={dividendsReceived}
                    onChange={onDividendsChange}
                    fullWidth
                    InputLabelProps={{ sx: inputLabelSx }}
                    InputProps={{ sx: { color: text.heading } }}
                    sx={inputSx}
                  />
                  <Typography sx={{ color: text.muted, fontSize: "0.82rem", mt: -0.4 }}>
                    {translate(
                      "Lägg in totalen från t.ex. Avanza/Nordnet.",
                      "Enter your total from e.g. Avanza/Nordnet."
                    )}
                  </Typography>
                </>
              ) : (
                <>
                  <Typography sx={{ color: text.muted, fontSize: "0.9rem" }}>
                    {translate(
                      "Date-based: registrera varje köp med datum i Köp/Öka så räknas historisk utdelning automatiskt.",
                      "Date-based: register each buy with a date in Buy/Increase and historical dividends are calculated automatically."
                    )}
                  </Typography>
                  <Typography sx={{ color: text.soft, fontWeight: 700 }}>
                    {translate(
                      `Beräknad utdelning hittills: ${
                        Number.isFinite(estimatedDividendsFromDate)
                          ? `${estimatedDividendsFromDate.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} SEK`
                          : "–"
                      }`,
                      `Estimated dividends so far: ${
                        Number.isFinite(estimatedDividendsFromDate)
                          ? `${estimatedDividendsFromDate.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} SEK`
                          : "–"
                      }`
                    )}
                  </Typography>
                  <Typography sx={{ color: text.muted, fontSize: "0.8rem", mt: -0.6 }}>
                    {translate(
                      "Sätt inköpsdatum under fliken Justera GAV.",
                      "Set acquisition date under the Adjust cost basis tab."
                    )}
                  </Typography>
                </>
              )}
              <Box>
                <Typography sx={{ color: text.subtle }}>
                  {translate("Break-even inkl utdelning", "Break-even incl dividends")}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: text.heading }}>
                  {breakEvenDisplay != null ? breakEvenDisplay.toLocaleString("sv-SE") + " SEK" : "–"}
                </Typography>
                {breakEvenPaidBack ? (
                  <Typography sx={{ color: statusColors.positive }}>
                    {translate("Utdelningen har täckt GAV.", "Dividends have covered your cost basis.")}
                  </Typography>
                ) : null}
              </Box>
            </Stack>
          </Box>
        )}

        {tab === 4 && (
          <ImportTransactionsTab
            translate={translate}
            loading={loading}
            onImportTransactions={async (trades) => {
              await onImportTransactions?.(trades);
              setTab(0);
            }}
          />
        )}

        <Button variant="text" onClick={onClose} sx={{ mt: 2, color: text.muted }}>
          {translate("Stäng", "Close")}
        </Button>
      </Box>
    </Dialog>
  );
}
