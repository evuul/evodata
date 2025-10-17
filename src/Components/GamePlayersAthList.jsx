"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Tooltip,
  Chip,
  Divider,
  FormControl,
  Select,
  MenuItem,
} from "@mui/material";
import { GAMES as GAME_CONFIG, COLORS as GAME_COLORS } from "@/config/games";

const TZ = "Europe/Stockholm";
const DEFAULT_LOOKBACK = 180;
const LOOKBACK_OPTIONS = [90, 180, 365];

const ymdFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

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

function stockholmYMD(value) {
  try {
    return ymdFormatter.format(new Date(value));
  } catch {
    return null;
  }
}

function formatDateTime(value) {
  try {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "—";
    const dateStr = dateFormatter.format(date);
    const timeStr = timeFormatter.format(date);
    return `${dateStr} ${timeStr}`;
  } catch {
    return "—";
  }
}

function computePeaks(points) {
  if (!Array.isArray(points) || points.length === 0) {
    return { ath: null, today: null };
  }

  const today = stockholmYMD(Date.now());
  let athValue = null;
  let athTs = null;
  let todayPeak = null;

  for (const point of points) {
    const value = Number(point?.value);
    const ts = Number(point?.ts);
    if (!Number.isFinite(value) || !Number.isFinite(ts)) continue;

    if (athValue === null || value > athValue) {
      athValue = Math.round(value);
      athTs = ts;
    }

    if (today && stockholmYMD(ts) === today) {
      if (!todayPeak || value > todayPeak.value) {
        todayPeak = {
          value: Math.round(value),
          ts,
        };
      }
    }
  }

  return {
    ath: athValue != null ? { value: athValue, ts: athTs } : null,
    today: todayPeak,
  };
}

export default function GamePlayersAthList() {
  const [lookback, setLookback] = useState(DEFAULT_LOOKBACK);
  const [loading, setLoading] = useState(false);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [entries, setEntries] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrors({});

      const result = {};
      const errs = {};

      await Promise.all(
        GAME_CONFIG.map(async (game) => {
          try {
            const res = await fetch(
              `/api/casinoscores/series/${encodeURIComponent(game.id)}?days=${lookback}`,
              { cache: "no-store", signal: controller.signal }
            );
            const contentType = res.headers.get("content-type") || "";
            const isJson = contentType.includes("application/json");
            const payload = isJson ? await res.json() : await res.text();
            if (!res.ok || !isJson || payload?.ok !== true) {
              const detail = isJson
                ? payload?.error || `HTTP ${res.status}`
                : `Ov\u00e4ntat svar (${res.status})`;
              throw new Error(detail);
            }
            const points = Array.isArray(payload.points) ? payload.points : [];
            const { ath, today } = computePeaks(points);
            const latestValue = Number(payload.latest);
            result[game.id] = {
              ath,
              today,
              latest: Number.isFinite(latestValue) ? Math.round(latestValue) : null,
              latestTs: payload.latestTs || null,
            };
          } catch (error) {
            if (controller.signal.aborted) return;
            errs[game.id] = error instanceof Error ? error.message : String(error);
          }
        })
      );

      if (!cancelled) {
        setEntries(result);
        setErrors(errs);
        setLoading(false);
        setFetchedAt(new Date());
      }
    }

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [lookback]);

  const rows = useMemo(() => {
    return GAME_CONFIG.map((game) => {
      const entry = entries[game.id] || {};
      const color = GAME_COLORS?.[game.id] || "#fff";
      const athValue = entry.ath?.value ?? null;
      const athTs = entry.ath?.ts ?? null;
      const todayValue = entry.today?.value ?? null;
      const todayTs = entry.today?.ts ?? null;
      const latestValue = entry.latest ?? null;
      const latestTs = entry.latestTs ?? null;
      const ratio =
        Number.isFinite(latestValue) && Number.isFinite(athValue) && athValue > 0
          ? latestValue / athValue
          : null;
      return {
        id: game.id,
        label: game.label,
        color,
        athValue,
        athTs,
        todayValue,
        todayTs,
        latestValue,
        latestTs,
        ratio,
        error: errors[game.id] || null,
      };
    }).sort((a, b) => {
      const av = a.athValue ?? -Infinity;
      const bv = b.athValue ?? -Infinity;
      return bv - av;
    });
  }, [entries, errors]);

  const fetchLabel = useMemo(() => {
    if (!fetchedAt) return null;
    return formatDateTime(fetchedAt);
  }, [fetchedAt]);

  const handleLookbackChange = (event) => {
    const value = Number(event.target.value);
    if (Number.isFinite(value)) {
      setLookback(value);
    }
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: "flex", flexDirection: "column", gap: 2 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 0.5,
          }}
        >
          <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700, textAlign: "center" }}>
            ATH-lista per game show
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", textAlign: "center" }}>
            Visar högsta uppmätta lobby-spelare under de senaste {lookback} dagarna.
          </Typography>
          {fetchLabel && (
            <Typography
              variant="caption"
              sx={{ color: "rgba(255,255,255,0.5)", textAlign: "center" }}
            >
              Uppdaterad {fetchLabel}
            </Typography>
          )}
        </Box>
        <FormControl
          size="small"
          sx={{
            minWidth: 180,
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: "999px",
            "& .MuiOutlinedInput-notchedOutline": { border: "none" },
            "& .MuiSelect-select": {
              color: "#fff",
              textAlign: "center",
            },
            "& .MuiSvgIcon-root": { color: "#fff" },
          }}
        >
          <Select value={lookback} onChange={handleLookbackChange} displayEmpty>
            {LOOKBACK_OPTIONS.map((value) => (
              <MenuItem key={value} value={value}>
                {value} dagar
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {!loading && hasErrors && (
        <Box
          sx={{
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "12px",
            p: 2,
            color: "#fca5a5",
            fontSize: "0.85rem",
          }}
        >
          {Object.entries(errors).map(([id, message]) => {
            const game = GAME_CONFIG.find((g) => g.id === id);
            const label = game ? game.label : id;
            return (
              <Typography key={id} sx={{ display: "block" }}>
                {label}: {message}
              </Typography>
            );
          })}
        </Box>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        {rows.map((row, index) => {
          const athLabel = row.athTs ? formatDateTime(row.athTs) : "n/a";
          const todayLabel = row.todayTs ? formatDateTime(row.todayTs) : null;
          const latestLabel = row.latestTs ? formatDateTime(row.latestTs) : null;
          const ratioPercent =
            Number.isFinite(row.ratio) && row.ratio != null ? Math.round(row.ratio * 100) : null;
          const nearAth = ratioPercent != null && ratioPercent >= 95;

          return (
            <Box
              key={row.id}
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "minmax(0, 1fr)",
                  md: "200px repeat(3, minmax(0, 1fr)) 120px",
                },
                alignItems: "center",
                gap: { xs: 1.5, md: 2 },
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: "12px",
                padding: { xs: "12px 14px", md: "14px 20px" },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <span
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: row.color,
                    boxShadow: `0 0 8px ${row.color}66`,
                  }}
                />
                <Typography sx={{ color: "#fff", fontWeight: 600, display: "flex", gap: 0.75 }}>
                  <span>{index + 1}.</span> {row.label}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                <Typography sx={{ color: "#facc15", fontWeight: 700 }}>
                  {row.athValue != null ? row.athValue.toLocaleString("sv-SE") : "—"}
                </Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem" }}>
                  ATH {athLabel}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                <Typography sx={{ color: "#a5b4fc", fontWeight: 600 }}>
                  {row.todayValue != null ? row.todayValue.toLocaleString("sv-SE") : "—"}
                </Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem" }}>
                  Dagens peak {todayLabel || "–"}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                <Typography sx={{ color: "#e0e0e0", fontWeight: 600 }}>
                  {row.latestValue != null ? row.latestValue.toLocaleString("sv-SE") : "—"}
                </Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem" }}>
                  Senaste mätning {latestLabel || "–"}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                {ratioPercent != null ? (
                  <Chip
                    label={`${ratioPercent}% av ATH`}
                    size="small"
                    sx={{
                      color: nearAth ? "#22c55e" : "#e0e0e0",
                      backgroundColor: nearAth
                        ? "rgba(34,197,94,0.18)"
                        : "rgba(255,255,255,0.08)",
                      fontWeight: 600,
                    }}
                  />
                ) : (
                  <Chip
                    label="Ingen data"
                    size="small"
                    sx={{
                      color: "#9ca3af",
                      backgroundColor: "rgba(255,255,255,0.06)",
                      fontStyle: "italic",
                    }}
                  />
                )}
                {row.error && (
                  <Tooltip title={row.error}>
                    <Chip
                      label="Fel"
                      size="small"
                      sx={{
                        color: "#f87171",
                        backgroundColor: "rgba(239,68,68,0.12)",
                        fontWeight: 600,
                      }}
                    />
                  </Tooltip>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

      <Typography
        variant="caption"
        sx={{ color: "rgba(255,255,255,0.45)", textAlign: "center" }}
      >
        ATH-beräkningen utgår från högsta uppmätta sample i den valda lookback-perioden. Byt period för
        att se längre historik.
      </Typography>
    </Box>
  );
}
