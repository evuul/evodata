"use client";

// Blankning-vy för short intelligence-dashboarden.

import { Box, Chip, Typography, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from "recharts";
import { BLANKING_RANGES, formatPercent, formatNumber, formatMillion, fullLabel } from "./useShortIntelligenceModel";

export default function ShortIntellegenceBlankingSection({
  isMobile,
  translate,
  blankingRange,
  setBlankingRange,
  blankingSeries,
  blankingAxisInterval,
  blankingDomain,
  blankingSummary,
  publicPositions,
  publicPositionsError,
  shortSnapshotLoading,
  blankingTooltip,
}) {
  return (
    <Box
      sx={{
        background: "rgba(15,23,42,0.55)",
        border: "1px solid rgba(148,163,184,0.18)",
        borderRadius: { xs: 0, md: "16px" },
        mx: { xs: -2, sm: -3, md: -4 },
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2, md: 3 },
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2, md: 3 },
        overflow: "visible",
      }}
      >
      <Box>
        <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.78)", letterSpacing: 1.2 }}>
          {translate("Blankningsbrief", "Short interest brief")}
        </Typography>
        <Typography sx={{ color: "rgba(226,232,240,0.74)", lineHeight: 1.6, mt: 0.4, maxWidth: 820 }}>
          {translate(
            "Det här är den offentliga blankningshistoriken. Den är fördröjd, så följ riktningen snarare än en enskild punkt.",
            "This is the public short interest history. It is delayed, so follow the direction rather than a single point."
          )}
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
        {BLANKING_RANGES.map((value) => (
          <Chip
            key={value}
            label={`${value}D`}
            size="small"
            onClick={() => setBlankingRange(value)}
            sx={{
              backgroundColor:
                blankingRange === value
                  ? "rgba(96,165,250,0.35)"
                  : "rgba(148,163,184,0.15)",
              color:
                blankingRange === value
                  ? "#f8fafc"
                  : "rgba(226,232,240,0.75)",
              cursor: "pointer",
            }}
          />
        ))}
      </Stack>

      <Box sx={{ height: isMobile ? 280 : 320 }}>
        {blankingSeries.length ? (
          <Box
            sx={{
              width: {
                xs: "calc(100% + 32px)",
                sm: "calc(100% + 48px)",
                md: "100%",
              },
              mx: { xs: -2, sm: -3, md: 0 },
              height: "100%",
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={blankingSeries}
                margin={{ top: 10, right: isMobile ? 4 : 0, left: 0, bottom: 8 }}
              >
                <defs>
                  <linearGradient id="blankingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="4 4" />
                <XAxis
                  dataKey="xLabel"
                  tick={{
                    fontSize: isMobile ? 10 : 12,
                    fill: "rgba(148,163,184,0.75)",
                  }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                  interval={blankingAxisInterval}
                  minTickGap={isMobile ? 14 : 16}
                  height={isMobile ? 34 : 30}
                />
                <YAxis
                  tick={{
                    fontSize: isMobile ? 10 : 12,
                    fill: "rgba(148,163,184,0.75)",
                  }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                  domain={blankingDomain}
                  width={isMobile ? 40 : 56}
                  tickFormatter={(value) => (isMobile ? `${value.toFixed(0)}%` : `${value.toFixed(1)}%`)}
                />
                <RechartsTooltip content={blankingTooltip} />
                <Area
                  type="monotone"
                  dataKey="percent"
                  stroke="#60a5fa"
                  strokeWidth={2.5}
                  fill="url(#blankingGradient)"
                  fillOpacity={1}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        ) : (
          <Box
            sx={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(148,163,184,0.65)",
            }}
          >
            <Typography>{translate("Ingen blankningshistorik att visa.", "No short history to display.")}</Typography>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
          gap: { xs: 2, md: 3 },
          width: "100%",
        }}
      >
        <Box>
          <Box
            sx={{
              background: "rgba(59,130,246,0.08)",
              borderRadius: "14px",
              border: "1px solid rgba(96,165,250,0.25)",
              p: 2.5,
            }}
          >
            <Typography
              sx={{
                color: "rgba(148,163,184,0.75)",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              {translate("Aktuell blankning", "Current short interest")}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {formatPercent(blankingSummary.latestPercent, 2)}
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 0.75,
              }}
            >
              <Typography sx={{ color: "rgba(148,163,184,0.7)", fontSize: "0.85rem" }}>
                {blankingSummary.totalShares != null
                  ? translate(
                      `${formatNumber(blankingSummary.totalShares)} uppskattade aktier`,
                      `${formatNumber(blankingSummary.totalShares)} estimated shares`
                    )
                  : "–"}
              </Typography>
              <Typography sx={{ color: "rgba(148,163,184,0.7)", fontSize: "0.8rem" }}>
                {blankingSummary.latestDate ? fullLabel(blankingSummary.latestDate) : "–"}
              </Typography>
            </Box>
          </Box>
        </Box>
        <Box>
          <Box
            sx={{
              background: "rgba(248,113,113,0.08)",
              borderRadius: "14px",
              border: "1px solid rgba(248,113,113,0.25)",
              p: 2.5,
            }}
          >
            <Typography
              sx={{
                color: "rgba(248,113,113,0.8)",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              {translate("Förändring senaste dag", "Change since last day")}
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color:
                  blankingSummary.deltaPP != null
                    ? blankingSummary.deltaPP >= 0
                      ? "#f87171"
                      : "#34d399"
                    : "#f8fafc",
              }}
            >
              {blankingSummary.deltaPP != null
                ? `${blankingSummary.deltaPP >= 0 ? "+" : ""}${blankingSummary.deltaPP.toFixed(2)} pp`
                : "–"}
            </Typography>
            <Typography sx={{ color: "rgba(148,163,184,0.7)", fontSize: "0.85rem" }}>
              {translate(
                `motsvarar ${blankingSummary.deltaShares != null ? formatNumber(Math.abs(blankingSummary.deltaShares)) : "–"} aktier`,
                `equals ${blankingSummary.deltaShares != null ? formatNumber(Math.abs(blankingSummary.deltaShares)) : "–"} shares`
              )}
            </Typography>
          </Box>
        </Box>
        <Box>
          <Box
            sx={{
              background: "rgba(45,212,191,0.08)",
              borderRadius: "14px",
              border: "1px solid rgba(45,212,191,0.25)",
              p: 2.5,
            }}
          >
            <Typography
              sx={{
                color: "rgba(148,163,184,0.75)",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              {translate("Beräknad exponering", "Estimated exposure")}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {blankingSummary.totalValue != null
                ? `${formatMillion(blankingSummary.totalValue / 1_000_000, 1)} MSEK`
                : "–"}
            </Typography>
            <Typography sx={{ color: "rgba(148,163,184,0.7)", fontSize: "0.85rem" }}>
              {blankingSummary.valueDelta != null
                ? translate(
                    `${blankingSummary.valueDelta >= 0 ? "+" : ""}${formatMillion(
                      blankingSummary.valueDelta / 1_000_000,
                      1
                    )} MSEK senast`,
                    `${blankingSummary.valueDelta >= 0 ? "+" : ""}${formatMillion(
                      blankingSummary.valueDelta / 1_000_000,
                      1
                    )} MSEK latest`
                  )
                : "–"}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          mt: { xs: 1, md: 0.5 },
          borderTop: "1px solid rgba(148,163,184,0.14)",
          pt: { xs: 2, md: 2.5 },
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap">
          <Box>
            <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.78)", letterSpacing: 1.2 }}>
              {translate("Aktuella positioner", "Current positions")}
            </Typography>
            <Typography sx={{ color: "rgba(226,232,240,0.72)", lineHeight: 1.5, mt: 0.35 }}>
              {translate(
                "Publika blankare över 0,5% från FI:s register.",
                "Public shorts above 0.5% from FI's register."
              )}
            </Typography>
          </Box>
          {publicPositions.length > 0 && (
            <Chip
              size="small"
              label={translate(
                `${publicPositions.length} publika positioner`,
                `${publicPositions.length} public positions`
              )}
              sx={{
                backgroundColor: "rgba(96,165,250,0.16)",
                color: "#bfdbfe",
                fontWeight: 500,
              }}
            />
          )}
        </Stack>

        <Box
          sx={{
            mt: 1.5,
            border: "1px solid rgba(148,163,184,0.14)",
            borderRadius: "14px",
            overflow: "hidden",
            background: "rgba(15,23,42,0.42)",
          }}
        >
          {publicPositionsError ? (
            <Box sx={{ p: 2.5, color: "#fca5a5" }}>
              <Typography>{publicPositionsError}</Typography>
            </Box>
          ) : shortSnapshotLoading && !publicPositions.length ? (
            <Box sx={{ p: 2.5, color: "rgba(148,163,184,0.72)" }}>
              <Typography>{translate("Hämtar publika positioner...", "Loading public positions...")}</Typography>
            </Box>
          ) : publicPositions.length ? (
            <TableContainer sx={{ maxHeight: 420 }}>
              <Table stickyHeader size="small" aria-label={translate("Aktuella positioner", "Current positions")}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ backgroundColor: "rgba(148,163,184,0.16)", fontWeight: 700, color: "#f8fafc" }}>
                      {translate("Positionsinnehavare", "Holder")}
                    </TableCell>
                    <TableCell sx={{ backgroundColor: "rgba(148,163,184,0.16)", fontWeight: 700, color: "#f8fafc" }}>
                      ISIN
                    </TableCell>
                    <TableCell align="right" sx={{ backgroundColor: "rgba(148,163,184,0.16)", fontWeight: 700, color: "#f8fafc" }}>
                      {translate("Position i procent (%)", "Position in percent (%)")}
                    </TableCell>
                    <TableCell sx={{ backgroundColor: "rgba(148,163,184,0.16)", fontWeight: 700, color: "#f8fafc" }}>
                      {translate("Positionsdatum", "Position date")}
                    </TableCell>
                    <TableCell align="right" sx={{ backgroundColor: "rgba(148,163,184,0.16)", fontWeight: 700, color: "#f8fafc" }}>
                      {translate("Föregående Position (%)", "Previous position (%)")}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {publicPositions.map((position) => (
                    <TableRow key={`${position.holder}-${position.positionsDate}-${position.isin}`}>
                      <TableCell sx={{ color: "#f8fafc", fontWeight: 600 }}>{position.holder}</TableCell>
                      <TableCell sx={{ color: "#f8fafc" }}>{position.isin}</TableCell>
                      <TableCell align="right" sx={{ color: "#f8fafc" }}>
                        {position.positionPercentRaw || "–"}
                      </TableCell>
                      <TableCell sx={{ color: "#f8fafc" }}>
                        {position.positionsDate || "–"}
                      </TableCell>
                      <TableCell align="right" sx={{ color: "#f8fafc" }}>
                        {position.previousPositionPercentRaw || "–"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ p: 2.5, color: "rgba(148,163,184,0.72)" }}>
              <Typography>{translate("Inga publika blankare över 0,5% just nu.", "No public shorts above 0.5% right now.")}</Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
