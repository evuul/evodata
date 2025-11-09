"use client";
import React from "react";
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, TableContainer } from "@mui/material";
import { useTranslate } from "@/context/LocaleContext";

const WeeklyBuybacksTable = ({ lastWeek, prevWeek, deltaShares, isMobile, totalSharesOutstanding }) => {
  const translate = useTranslate();
  if (!lastWeek || !lastWeek.entries) {
    return (
      <Typography variant="body2" color="#b0b0b0">
        {translate("Inga transaktioner för senaste veckan.", "No transactions for the latest week.")}
      </Typography>
    );
  }

  return (
    <>
      {lastWeek.entries.length > 0 ? (
        <>
          <Typography variant="body2" color="#ccc" sx={{ marginBottom: "8px" }}>
            {translate("Period", "Period")}: {lastWeek.periodStart.toLocaleDateString("sv-SE")} – {lastWeek.periodEnd.toLocaleDateString("sv-SE")}
          </Typography>

          <Typography variant="body2" sx={{ mb: 1 }} color="#fff">
            {translate("Förändring mot föregående vecka:", "Change vs previous week:")}{" "}
            <Box component="span" sx={{ fontWeight: 700, color: deltaShares > 0 ? '#00e676' : deltaShares < 0 ? '#ff1744' : '#ccc' }}>
              {(deltaShares > 0 ? '+' : '') + deltaShares.toLocaleString('sv-SE')} {translate("aktier", "shares")}
            </Box>
          </Typography>

          <TableContainer
            sx={{
              maxHeight: { xs: "none", sm: "none" },
              backgroundColor: "#1f1f1f",
              borderRadius: "12px",
              border: "1px solid #2b2b2b",
              boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
              overflowX: { xs: "auto", sm: "visible" },
              overflowY: "visible",
            }}
            >
              <Table
                size="small"
                stickyHeader
                aria-label={translate("Senaste veckans återköp", "Latest week's buybacks")}
              sx={{
                minWidth: { xs: 360, sm: 520 },
                tableLayout: { xs: 'fixed', sm: 'auto' },
                "& .MuiTableCell-root": {
                  borderBottom: "1px solid #2b2b2b",
                  padding: { xs: "8px 10px", sm: "10px 14px" },
                },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: "#fff", backgroundColor: "#242424", textTransform: "uppercase", fontWeight: 700, letterSpacing: ".4px", whiteSpace: { xs: "nowrap", sm: "nowrap" }, width: { xs: '34%', sm: 'auto' }, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {translate("Datum", "Date")}
                  </TableCell>
                  <TableCell align="right" sx={{ color: "#fff", backgroundColor: "#242424", textTransform: "uppercase", fontWeight: 700, letterSpacing: ".4px", whiteSpace: { xs: "nowrap", sm: "nowrap" }, width: { xs: '33%', sm: 'auto' }, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {isMobile ? translate("Antal", "Qty") : translate("Antal aktier", "Number of shares")}
                  </TableCell>
                  <TableCell align="right" sx={{ color: "#fff", backgroundColor: "#242424", textTransform: "uppercase", fontWeight: 700, letterSpacing: ".4px", whiteSpace: { xs: "nowrap", sm: "nowrap" }, width: { xs: '33%', sm: 'auto' }, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {isMobile ? translate("Värde", "Value") : translate("Transaktionsvärde", "Transaction value")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lastWeek.entries.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ color: "#fff" }}>{new Date(row.Datum).toLocaleDateString("sv-SE")}</TableCell>
                    <TableCell align="right" sx={{ color: "#fff" }}>
                      {(row.Antal_aktier || 0).toLocaleString("sv-SE")} {translate("st", "pcs")}
                    </TableCell>
                    <TableCell align="right" sx={{ color: "#fff" }}>
                      {(row.Transaktionsvärde || 0).toLocaleString("sv-SE")} SEK
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell sx={{ color: "#fff", fontWeight: 700 }}>
                    {translate("Summa", "Total")}
                  </TableCell>
                  <TableCell align="right" sx={{ color: "#fff", fontWeight: 700 }}>
                    {(lastWeek.totalShares || 0).toLocaleString("sv-SE")} {translate("st", "pcs")}
                  </TableCell>
                  <TableCell align="right" sx={{ color: "#fff", fontWeight: 700 }}>
                    {(lastWeek.totalValue || 0).toLocaleString("sv-SE")} SEK
                  </TableCell>
                </TableRow>
              </TableBody>
              </Table>
          </TableContainer>

          {/* Andel av bolaget för veckans summa */}
          {totalSharesOutstanding ? (
            <Typography variant="body2" sx={{ mt: 1 }} color="#b0b0b0">
              {translate("Andel av bolaget återköpt denna veckan:", "Share of company repurchased this week:")}{" "}
              <Box component="span" sx={{ fontWeight: 700, color: '#FFCA28' }}>
                {(((lastWeek.totalShares || 0) / totalSharesOutstanding) * 100).toFixed(4)}%
              </Box>
            </Typography>
          ) : null}
        </>
      ) : (
        <Typography variant="body2" color="#b0b0b0">
          {translate("Inga transaktioner denna vecka.", "No transactions this week.")}
        </Typography>
      )}
    </>
  );
};

export default WeeklyBuybacksTable;
