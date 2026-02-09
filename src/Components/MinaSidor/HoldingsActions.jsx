"use client";

import { Button, Grid, Paper, Stack, TextField, Typography } from "@mui/material";
import { actionCard, buttonStyles, inputLabelSx, inputSx, text } from "./styles";

export default function HoldingsActions({
  translate,
  buyShares,
  buyPrice,
  sellShares,
  onBuySharesChange,
  onBuyPriceChange,
  onSellSharesChange,
  onBuy,
  onSell,
  onReset,
  loading,
}) {
  return (
    <Grid container spacing={2.5}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, ...actionCard }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#f8fafc !important" }}>
            {translate("Lägg till aktier", "Add shares")}
          </Typography>
          <Typography sx={{ color: `${text.soft} !important`, mt: 0.5 }}>
            {translate("Uppdaterar GAV automatiskt.", "Updates cost basis automatically.")}
          </Typography>
          <Stack spacing={2.5} sx={{ mt: 2.5 }}>
            <TextField
              label={translate("Antal aktier", "Shares")}
              type="number"
              value={buyShares}
              onChange={onBuySharesChange}
              fullWidth
              InputLabelProps={{ sx: inputLabelSx }}
              InputProps={{ sx: { color: "#f8fafc" } }}
              sx={inputSx}
            />
            <TextField
              label={translate("Pris per aktie (SEK)", "Price per share (SEK)")}
              type="number"
              value={buyPrice}
              onChange={onBuyPriceChange}
              fullWidth
              InputLabelProps={{ sx: inputLabelSx }}
              InputProps={{ sx: { color: "#f8fafc" } }}
              sx={inputSx}
            />
            <Stack direction="row" spacing={1.5} flexWrap="wrap">
              <Button
                variant="contained"
                onClick={onBuy}
                disabled={loading}
                sx={buttonStyles.primary}
              >
                {translate("Uppdatera GAV", "Update cost basis")}
              </Button>
              <Button
                variant="text"
                onClick={onReset}
                disabled={loading}
                sx={buttonStyles.reset}
              >
                {translate("Nollställ", "Reset")}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, ...actionCard }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#f8fafc !important" }}>
            {translate("Minska innehav", "Reduce holdings")}
          </Typography>
          <Typography sx={{ color: `${text.soft} !important`, mt: 0.5 }}>
            {translate("Tar bort aktier utan att ändra GAV.", "Removes shares without changing cost basis.")}
          </Typography>
          <Stack spacing={2.5} sx={{ mt: 2.5 }}>
            <TextField
              label={translate("Antal aktier att sälja", "Shares to sell")}
              type="number"
              value={sellShares}
              onChange={onSellSharesChange}
              fullWidth
              InputLabelProps={{ sx: inputLabelSx }}
              InputProps={{ sx: { color: "#f8fafc" } }}
              sx={inputSx}
            />
            <Button
              variant="outlined"
              onClick={onSell}
              disabled={loading}
              sx={buttonStyles.outlineDanger}
            >
              {translate("Minska antal", "Reduce shares")}
            </Button>
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );
}
