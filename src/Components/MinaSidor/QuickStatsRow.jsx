"use client";

import { Box, Grid, Paper, Typography } from "@mui/material";
import { formatPercent, formatSek } from "./utils";
import { compactCard, statusColors, text } from "./styles";

export default function QuickStatsRow({
  translate,
  todaysChangePercent,
  gainPercent,
  totalReturnWithDividends,
  totalReturnPctWithDividends,
  dividendsReceivedSafe,
}) {
  const metricLabelSx = {
    color: text.subtle,
    fontSize: "0.9rem",
    fontWeight: 700,
    letterSpacing: 0.2,
    mb: 0.7,
  };

  const cardSx = {
    p: { xs: 2, md: 2.4 },
    ...compactCard,
    minHeight: { xs: 140, md: 156 },
    height: "100%",
    borderColor: "rgba(148,163,184,0.22)",
    boxShadow: "0 12px 28px rgba(2,6,23,0.35)",
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.78), rgba(15,23,42,0.62))",
  };

  const splitColSx = {
    flex: 1,
    minWidth: 0,
  };

  return (
    <Grid container spacing={2.5}>
      <Grid item xs={12} md={6} sx={{ display: "flex" }}>
        <Paper
          sx={{
            ...cardSx,
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 2.4,
            justifyContent: "space-between",
          }}
        >
          <Box sx={splitColSx}>
            <Typography sx={metricLabelSx}>{translate("Dagens rörelse", "Today")}</Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: Number.isFinite(todaysChangePercent)
                  ? todaysChangePercent >= 0
                    ? statusColors.positive
                    : statusColors.negative
                  : text.heading,
              }}
            >
              {Number.isFinite(todaysChangePercent) ? formatPercent(todaysChangePercent) : "–"}
            </Typography>
          </Box>

          <Box
            sx={{
              width: "1px",
              alignSelf: "stretch",
              background: "linear-gradient(to bottom, transparent, rgba(148,163,184,0.36), transparent)",
            }}
          />

          <Box sx={splitColSx}>
            <Typography sx={metricLabelSx}>{translate("Total avkastning", "Total return")}</Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: gainPercent != null ? (gainPercent >= 0 ? statusColors.positive : statusColors.negative) : text.heading,
              }}
            >
              {gainPercent != null ? formatPercent(gainPercent) : "–"}
            </Typography>
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12} md={6} sx={{ display: "flex" }}>
        <Paper
          sx={{
            ...cardSx,
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 2.4,
            justifyContent: "space-between",
          }}
        >
          <Box sx={splitColSx}>
            <Typography sx={metricLabelSx}>
              {translate("Avkastning inkl utdelning", "Return incl dividends")}
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color:
                  Number.isFinite(totalReturnWithDividends)
                    ? totalReturnWithDividends >= 0
                      ? statusColors.positive
                      : statusColors.negative
                    : text.heading,
              }}
            >
              {Number.isFinite(totalReturnWithDividends) ? formatSek(totalReturnWithDividends) : "–"}
            </Typography>
            <Typography sx={{ color: text.muted, fontSize: "0.85rem" }}>
              {totalReturnPctWithDividends != null ? formatPercent(totalReturnPctWithDividends) : "–"}
            </Typography>
          </Box>

          <Box
            sx={{
              width: "1px",
              alignSelf: "stretch",
              background: "linear-gradient(to bottom, transparent, rgba(148,163,184,0.36), transparent)",
            }}
          />

          <Box sx={{ ...splitColSx, textAlign: "right" }}>
            <Typography sx={metricLabelSx}>{translate("Utdelning hittills", "Dividends so far")}</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: text.heading }}>
              {Number.isFinite(dividendsReceivedSafe) ? formatSek(dividendsReceivedSafe) : "–"}
            </Typography>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
}
