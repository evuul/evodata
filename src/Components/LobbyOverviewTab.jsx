"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Box, CircularProgress, Typography, Select, MenuItem, Button } from "@mui/material";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Area,
} from "recharts";

const TZ = "Europe/Stockholm";

function formatPlayers(value) {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
}

function formatSignedPlayers(value) {
  if (!Number.isFinite(value) || value === 0) return value === 0 ? "0" : "—";
  const sign = value > 0 ? "+" : "-";
  return `${sign}${formatPlayers(Math.abs(Math.round(value)))}`;
}

function formatSignedPercent(value) {
  if (!Number.isFinite(value) || value === 0) return value === 0 ? "0%" : "—";
  const sign = value > 0 ? "+" : "-";
  return `${sign}${Math.abs(value).toFixed(Math.abs(value) >= 10 ? 1 : 2)}%`;
}

function applySimulation(value) {
  if (!Number.isFinite(value)) return null;
  return Math.round(value * SIMULATION_MULTIPLIER);
}

function formatDateLabel(dateString) {
  if (!dateString) return "";
  try {
    const [y, m, d] = dateString.split("-");
    return `${d}/${m}`;
  } catch {
    return dateString;
  }
}

function formatIsoTime(iso, { withDate = false } = {}) {
  if (!iso) return "—";
  try {
    const date = new Date(iso);
    const timeFormatter = new Intl.DateTimeFormat("sv-SE", {
      timeZone: TZ,
      hour: "2-digit",
      minute: "2-digit",
    });
    const dateFormatter = new Intl.DateTimeFormat("sv-SE", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const time = timeFormatter.format(date);
    return withDate ? `${dateFormatter.format(date)} ${time}` : time;
  } catch {
    return "—";
  }
}

const CARD_GRADIENT = "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))";
const CHART_GRADIENT_ID = "lobby-chart-gradient";
const SIMULATION_MULTIPLIER = 1.27;
const SIM_COLOR = "#ffb74d";
const chartGridSx = {
  background: "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0))",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.06)",
  p: { xs: 1.5, md: 2 },
};

export default function LobbyOverviewTab() {
  const [state, setState] = useState({
    loading: true,
    error: "",
    data: null,
  });
  const [range, setRange] = useState(7);
  const [simulate, setSimulate] = useState(false);

  const load = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: "" }));
      const res = await fetch("/api/casinoscores/lobby/overview", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || json?.ok !== true) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }
      setState({ loading: false, error: "", data: json });
    } catch (error) {
      setState({ loading: false, error: error?.message || String(error), data: null });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const averages7 = useMemo(
    () => (state.data?.averages?.days7 || []).map((row) => ({
      date: row.date,
      label: formatDateLabel(row.date),
      avgPlayers: Number(row.avgPlayers) || 0,
    })),
    [state.data]
  );

  const averages30 = useMemo(
    () => (state.data?.averages?.days30 || []).map((row) => ({
      date: row.date,
      label: formatDateLabel(row.date),
      avgPlayers: Number(row.avgPlayers) || 0,
    })),
    [state.data]
  );

  const sevenDayAverage = useMemo(() => {
    if (!averages7.length) return null;
    const sum = averages7.reduce((acc, row) => acc + row.avgPlayers, 0);
    return Math.round(sum / averages7.length);
  }, [averages7]);

  const thirtyDayAverage = useMemo(() => {
    if (!averages30.length) return null;
    const sum = averages30.reduce((acc, row) => acc + row.avgPlayers, 0);
    return Math.round(sum / averages30.length);
  }, [averages30]);

  const currentSeries = useMemo(
    () => (range === 30 ? averages30 : averages7),
    [range, averages30, averages7]
  );
  const currentAverage = range === 30 ? thirtyDayAverage : sevenDayAverage;
  const currentSimulatedAverage =
    simulate && currentAverage != null ? Math.round(currentAverage * SIMULATION_MULTIPLIER) : null;
  const simulatedSeries = useMemo(
    () =>
      currentSeries.map((row) => ({
        ...row,
        simPlayers: Math.round(row.avgPlayers * SIMULATION_MULTIPLIER),
      })),
    [currentSeries]
  );
  const chartData = simulate ? simulatedSeries : currentSeries;

  const chartColor = range === 30 ? "#42a5f5" : "#00e676";
  const gradientId = `${CHART_GRADIENT_ID}-${range}`;
  const trendStats = useMemo(() => {
    if (!currentSeries?.length) return null;
    const valid = currentSeries.filter((row) => Number.isFinite(row?.avgPlayers));
    if (!valid.length) return null;
    const firstEntry = valid[0];
    const lastEntry = valid[valid.length - 1];
    const first = firstEntry.avgPlayers;
    const last = lastEntry.avgPlayers;
    if (!Number.isFinite(first) || !Number.isFinite(last)) return null;
    const diff = last - first;
    const pct = first !== 0 ? (diff / first) * 100 : null;
    return {
      first,
      last,
      diff,
      pct,
      startDate: firstEntry.date,
      endDate: lastEntry.date,
    };
  }, [currentSeries]);
  const trendColor =
    trendStats && Number.isFinite(trendStats.diff)
      ? trendStats.diff > 0
        ? "#00e676"
        : trendStats.diff < 0
        ? "#ff6f6f"
        : "rgba(255,255,255,0.7)"
      : "rgba(255,255,255,0.7)";
  const trendSimStats = useMemo(() => {
    if (!simulate || !trendStats) return null;
    const firstSim = applySimulation(trendStats.first);
    const lastSim = applySimulation(trendStats.last);
    if (!Number.isFinite(firstSim) || !Number.isFinite(lastSim)) return null;
    const diffSim = lastSim - firstSim;
    return {
      first: firstSim,
      last: lastSim,
      diff: diffSim,
      pct: trendStats.pct,
    };
  }, [simulate, trendStats]);

  useEffect(() => {
    if (state.loading || state.error) return;
    if (range === 7 && !averages7.length && averages30.length) {
      setRange(30);
    } else if (range === 30 && !averages30.length && averages7.length) {
      setRange(7);
    }
  }, [state.loading, state.error, range, averages7.length, averages30.length]);

  const ath = state.data?.ath ?? null;
  const todayPeak = state.data?.todayPeak ?? null;
  const simulatedAth = simulate && Number.isFinite(ath?.value) ? applySimulation(ath.value) : null;
  const simulatedPeak =
    simulate && Number.isFinite(todayPeak?.value) ? applySimulation(todayPeak.value) : null;

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 1.5,
          mb: 3,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Lobbyöversikt
        </Typography>
        {state.data?.generatedAt && (
          <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
            Uppdaterad {formatIsoTime(state.data.generatedAt, { withDate: true })}
          </Typography>
        )}
      </Box>

      {state.loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : state.error ? (
        <Box
          sx={{
            border: "1px solid rgba(255,111,111,0.4)",
            borderRadius: "12px",
            background: "rgba(255,111,111,0.1)",
            p: 2,
          }}
        >
          <Typography sx={{ color: "#ffbaba" }}>
            Kunde inte hämta lobby-statistiken: {state.error}
          </Typography>
        </Box>
      ) : (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
              gap: 2,
              mb: 3,
            }}
          >
            <Box
              sx={{
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.06)",
                background: CARD_GRADIENT,
                p: 2,
              }}
            >
              <Typography sx={{ fontSize: 14, color: "rgba(255,255,255,0.7)", mb: 0.5 }}>
                ATH (Lobby)
              </Typography>
              <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5 }}>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  {ath ? formatPlayers(ath.value) : "—"}
                </Typography>
                {simulate && (
                  <>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: SIM_COLOR }}>
                      SIM
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 600, color: SIM_COLOR }}>
                      {simulatedAth != null ? formatPlayers(simulatedAth) : "—"}
                    </Typography>
                  </>
                )}
              </Box>
              <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                {ath?.date ? `Datum: ${ath.date}` : "Datum okänt"}
              </Typography>
            </Box>

            <Box
              sx={{
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.06)",
                background: CARD_GRADIENT,
                p: 2,
              }}
            >
              <Typography sx={{ fontSize: 14, color: "rgba(255,255,255,0.7)", mb: 0.5 }}>
                Dagens peak
              </Typography>
              <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5 }}>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  {todayPeak ? formatPlayers(todayPeak.value) : "—"}
                </Typography>
                {simulate && (
                  <>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: SIM_COLOR }}>
                      SIM
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 600, color: SIM_COLOR }}>
                      {simulatedPeak != null ? formatPlayers(simulatedPeak) : "—"}
                    </Typography>
                  </>
                )}
              </Box>
              <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                {todayPeak?.at ? `Tid: ${formatIsoTime(todayPeak.at, { withDate: false })}` : "Ej uppmätt"}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mb: 2,
            }}
          >
            <Select
              size="small"
              value={range}
              onChange={(e) => setRange(Number(e.target.value))}
              sx={{
                minWidth: 160,
                color: "#fff",
                ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.2)" },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.35)" },
              }}
            >
              <MenuItem value={7}>7 dagar</MenuItem>
              <MenuItem value={30}>30 dagar</MenuItem>
            </Select>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mb: 2,
            }}
          >
            <Button
              size="small"
              onClick={() => setSimulate((prev) => !prev)}
              variant={simulate ? "contained" : "outlined"}
              sx={{
                minWidth: 220,
                background: simulate ? "rgba(255,183,77,0.2)" : "transparent",
                borderColor: simulate ? SIM_COLOR : "rgba(255,255,255,0.2)",
                color: simulate ? "#fff" : "rgba(255,255,255,0.85)",
                "&:hover": {
                  borderColor: SIM_COLOR,
                  background: simulate ? "rgba(255,183,77,0.3)" : "rgba(255,255,255,0.08)",
                },
              }}
            >
              {simulate ? "Simulering aktiv (+27%)" : "Aktivera simulerad lobby (+27%)"}
            </Button>
          </Box>
          {trendStats && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                gap: { xs: 1.5, sm: 3 },
                flexWrap: "wrap",
                mb: 2,
              }}
            >
              <Box
                sx={{
                  minWidth: 140,
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.05)",
                  textAlign: "center",
                  p: 1.5,
                }}
              >
                <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>
                  Start ({trendStats.startDate || "—"})
                </Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 600 }}>
                  {formatPlayers(trendStats.first)}
                </Typography>
                {simulate && trendSimStats && (
                  <Typography sx={{ fontSize: 13, color: SIM_COLOR }}>
                    Sim: {formatPlayers(trendSimStats.first)}
                  </Typography>
                )}
              </Box>
              <Box
                sx={{
                  minWidth: 140,
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.05)",
                  textAlign: "center",
                  p: 1.5,
                }}
              >
                <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>
                  Slut ({trendStats.endDate || "—"})
                </Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 600 }}>
                  {formatPlayers(trendStats.last)}
                </Typography>
                {simulate && trendSimStats && (
                  <Typography sx={{ fontSize: 13, color: SIM_COLOR }}>
                    Sim: {formatPlayers(trendSimStats.last)}
                  </Typography>
                )}
              </Box>
              <Box
                sx={{
                  minWidth: 160,
                  borderRadius: "10px",
                  border: `1px solid ${
                    trendColor === "rgba(255,255,255,0.7)" ? "rgba(255,255,255,0.15)" : trendColor
                  }`,
                  background:
                    trendColor === "rgba(255,255,255,0.7)"
                      ? "rgba(255,255,255,0.05)"
                      : trendColor === "#00e676"
                      ? "rgba(0,230,118,0.12)"
                      : "rgba(255,111,111,0.12)",
                  textAlign: "center",
                  p: 1.5,
                }}
              >
                <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>
                  Förändring
                </Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 600, color: trendColor }}>
                  {formatSignedPlayers(trendStats.diff)}
                </Typography>
                <Typography sx={{ fontSize: 13, color: trendColor }}>
                  {formatSignedPercent(trendStats.pct)}
                </Typography>
                {simulate && trendSimStats && (
                  <Box sx={{ mt: 0.75 }}>
                    <Typography sx={{ fontSize: 13, color: SIM_COLOR }}>
                      Sim: {formatSignedPlayers(trendSimStats.diff)}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: SIM_COLOR }}>
                      {formatSignedPercent(trendSimStats.pct)}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {/* Graf – kant-till-kant och full bredd */}
          <Box
            sx={{
              ...chartGridSx,
              mx: { xs: -1.5, md: -2.5 }, // matcha kortets padding på både mobil och desktop
              borderRadius: { xs: 0, md: "12px" },
              border: { xs: "none", md: "1px solid rgba(255,255,255,0.06)" },
              px: { xs: 0, md: 0 },
              py: { xs: 1.5, md: 2 },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                mb: 1.5,
                gap: 1.5,
                px: { xs: 1.5, md: 2.5 }, // luft för titeln när behållaren saknar padding
              }}
            >
              <Box sx={{ flex: 1 }} />
              <Typography sx={{ flex: 1, textAlign: "center", fontWeight: 600 }}>
                {range} dagar – snitt per dag
              </Typography>
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  color: "rgba(255,255,255,0.65)",
                  fontSize: 13,
                  textAlign: "right",
                  pr: { xs: 1.5, md: 2.5 },
                }}
              >
                <Typography
                  component="span"
                  sx={{ fontSize: "inherit", color: "inherit", whiteSpace: "nowrap", lineHeight: 1.2 }}
                >
                  Medel: {currentAverage != null ? formatPlayers(currentAverage) : "—"}
                </Typography>
                {simulate && (
                  <Typography
                    component="span"
                    sx={{
                      mt: 0.15,
                      fontSize: "inherit",
                      color: SIM_COLOR,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      lineHeight: 1.2,
                    }}
                  >
                    Sim: {currentSimulatedAverage != null ? formatPlayers(currentSimulatedAverage) : "—"}
                  </Typography>
                )}
              </Box>
            </Box>

            {chartData.length ? (
              <Box sx={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColor} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="rgba(255,255,255,0.6)"
                      tick={{ fontSize: 12 }}
                      minTickGap={12}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.6)"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => formatPlayers(value)}
                      width={80}
                    />
                    <RTooltip
                      contentStyle={{ background: "#1c1c1c", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }}
                      formatter={(value, name) =>
                        name === "Simulerad"
                          ? [formatPlayers(value), "Simulerad"]
                          : [formatPlayers(value), "Snitt"]
                      }
                      labelFormatter={(label, payload) =>
                        payload?.[0]?.payload?.date || label
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="avgPlayers"
                      stroke="none"
                      fill={`url(#${gradientId})`}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgPlayers"
                      stroke={chartColor}
                      strokeWidth={2}
                      dot={range === 30 ? false : { r: 3 }}
                      activeDot={{ r: 5 }}
                      name="Snitt"
                    />
                    {simulate && (
                      <Line
                        type="monotone"
                        dataKey="simPlayers"
                        stroke={SIM_COLOR}
                        strokeWidth={1.5}
                        dot={false}
                        strokeDasharray="4 4"
                        name="Simulerad"
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Typography sx={{ color: "rgba(255,255,255,0.6)" }}>
                Ingen historik för de senaste {range} dagarna ännu.
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              borderRadius: "12px",
              border: "1px solid rgba(255,183,77,0.35)",
              background: "rgba(255,183,77,0.12)",
              color: "rgba(255,255,255,0.85)",
              fontSize: { xs: "0.75rem", sm: "0.85rem" },
              lineHeight: 1.6,
              textAlign: "center",
              maxWidth: 640,
              mx: "auto",
              mt: 3,
              px: { xs: 1.75, md: 2.25 },
              py: { xs: 1.35, md: 1.7 },
              fontFamily: "'Roboto', sans-serif",
            }}
          >
            Simuleringen lägger på ett genomsnittligt påslag om 27&nbsp;% för att efterlikna den
            faktiska Evolution-lobbyn där flera spel saknas i vår spårning. Utfallet varierar beroende
            på tidpunkt, så värdena bör ses som en uppskattning – inte en exakt mätning.
          </Box>
        </>
      )}
    </Box>
  );
}
