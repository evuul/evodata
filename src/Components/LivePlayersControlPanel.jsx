'use client';

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Grid,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Divider,
} from "@mui/material";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import { usePlayersLive } from "../context/PlayersLiveContext";
import { GAMES as GAME_CONFIG, COLORS as GAME_COLORS } from "@/config/games";
import { fetchOverviewShared } from "@/lib/csOverviewClient";

// ===================== LocalStorage-backed cache with TTL =====================
class PersistentCache {
  constructor(prefix = "cache_v1_") {
    this.prefix = prefix;
  }
  _key(key) {
    return `${this.prefix}${key}`;
  }
  get(key) {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(this._key(key));
      if (!raw) return null;
      const { value, exp } = JSON.parse(raw);
      if (exp && Date.now() > exp) {
        localStorage.removeItem(this._key(key));
        return null;
      }
      return value;
    } catch {
      return null;
    }
  }
  set(key, value, ttlMs) {
    if (typeof window === "undefined") return;
    try {
      const exp = ttlMs ? Date.now() + ttlMs : undefined;
      localStorage.setItem(this._key(key), JSON.stringify({ value, exp }));
    } catch { /* ignore quota errors */ }
  }
  cleanup() {
    if (typeof window === "undefined") return;
    try {
      const now = Date.now();
      // Clone keys first to avoid index shift while removing
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(this.prefix)) keys.push(k);
      }
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        try {
          const { exp } = JSON.parse(raw);
          if (exp && now > exp) localStorage.removeItem(k);
        } catch { localStorage.removeItem(k); }
      }
    } catch {}
  }
}

const overviewCache = new PersistentCache("overview_");
const OVERVIEW_TTL = 2 * 60 * 1000; // 2 min
// ============================================================================

const TREND_DAY_OPTIONS = [30, 60, 90];
const ATH_DAY_OPTIONS = [90, 180, 365];
const INITIAL_VISIBLE_LIVE = 10;
const INITIAL_VISIBLE_ATH = 10;
const TZ = "Europe/Stockholm";

const dateFormatter = new Intl.DateTimeFormat("sv-SE", {
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
const numberFormatter = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });

const formatDateTime = (value) => {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    return `${dateFormatter.format(date)} ${timeFormatter.format(date)}`;
  } catch {
    return null;
  }
};

const SLUG_TO_GAME = (() => {
  const map = new Map();
  (GAME_CONFIG || []).forEach((game) => {
    if (game?.slug) map.set(game.slug, game);
    if (game?.id) map.set(game.id, game);
  });
  return map;
})();

const LivePlayersControlPanel = () => {
  const { data: liveGames, loading: loadingLive, GAMES: contextGames, lastUpdated } = usePlayersLive();

  const [detailView, setDetailView] = useState("trend");
  const [trendDays, setTrendDays] = useState(TREND_DAY_OPTIONS[0]);
  const [athDays, setAthDays] = useState(ATH_DAY_OPTIONS[1]);

  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState("");
  const [dailyTotals, setDailyTotals] = useState([]);
  const [slugAverages, setSlugAverages] = useState([]);
  const [slugDetails, setSlugDetails] = useState([]);
  const [overviewGeneratedAt, setOverviewGeneratedAt] = useState(null);

  const [showAllLive, setShowAllLive] = useState(false);
  const [showAllAth, setShowAllAth] = useState(false);

  // -------- Overview (Trend + Ranking) med localStorage-cache --------
  const fetchOverview = useCallback(async (trendWindow, athWindow) => {
    const range = Math.max(trendWindow, athWindow);
    const cacheKey = `days_${range}`;
    const cached = overviewCache.get(cacheKey);
    if (cached) {
      setOverviewError("");
      setDailyTotals(cached.dailyTotals);
      setSlugAverages(cached.slugAverages);
      setSlugDetails(cached.slugDetails);
      setOverviewGeneratedAt(cached.generatedAt);
      return;
    }

    setOverviewLoading(true);
    setOverviewError("");
    try {
      const json = await fetchOverviewShared(range);

      const totals = Array.isArray(json?.dailyTotals)
        ? json.dailyTotals
            .map((row) => ({ date: row?.date, avgPlayers: Number(row?.avgPlayers) }))
            .filter((row) => row?.date && Number.isFinite(row?.avgPlayers))
        : [];

      const averages = Array.isArray(json?.slugAverages)
        ? json.slugAverages
            .map((item) => ({ slug: item?.slug, avgPlayers: Number(item?.avgPlayers) }))
            .filter((item) => typeof item.slug === "string" && Number.isFinite(item.avgPlayers))
        : [];

      const details = Array.isArray(json?.slugDetails)
        ? json.slugDetails
            .map((item) => {
              if (!item || typeof item.slug !== "string") return null;
              const latestValue = Number(item?.latest?.value);
              const athValue = Number(item?.ath?.value);
              return {
                slug: item.slug,
                latest:
                  Number.isFinite(latestValue) && item?.latest?.at
                    ? { value: Math.round(latestValue), at: item.latest.at }
                    : Number.isFinite(latestValue)
                    ? { value: Math.round(latestValue), at: null }
                    : null,
                ath:
                  Number.isFinite(athValue) && item?.ath?.at
                    ? { value: Math.round(athValue), at: item.ath.at }
                    : Number.isFinite(athValue)
                    ? { value: Math.round(athValue), at: null }
                    : null,
              };
            })
            .filter(Boolean)
        : [];

      const payload = {
        dailyTotals: totals,
        slugAverages: averages,
        slugDetails: details,
        generatedAt: json?.generatedAt || null,
      };
      overviewCache.set(cacheKey, payload, OVERVIEW_TTL);

      setDailyTotals(totals);
      setSlugAverages(averages);
      setSlugDetails(details);
      setOverviewGeneratedAt(payload.generatedAt);
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : String(error));
      setDailyTotals([]);
      setSlugAverages([]);
      setSlugDetails([]);
      setOverviewGeneratedAt(null);
    } finally {
      setOverviewLoading(false);
      overviewCache.cleanup();
    }
  }, []);

  useEffect(() => {
    fetchOverview(trendDays, athDays);
  }, [trendDays, athDays, fetchOverview]);

  // --------- Deriverad UI-data ----------
  const playersUpdatedText = useMemo(() => {
    if (!lastUpdated) return "Uppdatering saknas";
    const dateStr = formatDateTime(lastUpdated);
    return dateStr ? `Senast ${dateStr}` : "Uppdatering saknas";
  }, [lastUpdated]);

  const liveGamesList = useMemo(() => {
    const sourceGames = contextGames ?? GAME_CONFIG ?? [];
    const rows = sourceGames.map((g) => {
      const entry = liveGames?.[g.id] || {};
      const players = typeof entry.players === "number" ? entry.players : null;
      return {
        id: g.id,
        label: g.label,
        players,
        updated: entry.updated || null,
        color: GAME_COLORS?.[g.id] || "#38bdf8",
      };
    });
    rows.sort((a, b) => {
      const av = a.players, bv = b.players;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return bv - av;
    });
    return rows;
  }, [contextGames, liveGames]);

  const visibleLiveGames = useMemo(() => {
    if (showAllLive) return liveGamesList;
    return liveGamesList.slice(0, INITIAL_VISIBLE_LIVE);
  }, [liveGamesList, showAllLive]);

  const totalLivePlayers = useMemo(() => {
    const total = liveGamesList.reduce((sum, row) => {
      if (Number.isFinite(row.players)) return sum + row.players;
      return sum;
    }, 0);
    return total > 0 ? total : null;
  }, [liveGamesList]);

  const trendChartData = useMemo(() => {
    if (!dailyTotals.length) return [];
    const sliceCount = Math.min(dailyTotals.length, Math.max(trendDays, 1));
    return dailyTotals
      .slice(-sliceCount)
      .map((row) => ({
        date: row.date,
        players: Number.isFinite(row.avgPlayers) ? Math.round(row.avgPlayers) : null,
      }))
      .filter((row) => row.players != null);
  }, [dailyTotals, trendDays]);

  const trendUpdatedLabel = useMemo(() => formatDateTime(overviewGeneratedAt), [overviewGeneratedAt]);

  const rankingRows = useMemo(
    () =>
      slugAverages
        .map((item) => {
          const game = SLUG_TO_GAME.get(item.slug);
          return {
            slug: item.slug,
            label: game?.label || item.slug,
            avgPlayers: item.avgPlayers,
            color: GAME_COLORS?.[game?.id] || "#38bdf8",
          };
        })
        .sort((a, b) => b.avgPlayers - a.avgPlayers),
    [slugAverages]
  );

  const athRows = useMemo(
    () =>
      slugDetails
        .map((detail) => {
          const game = SLUG_TO_GAME.get(detail.slug);
          return {
            slug: detail.slug,
            label: game?.label || detail.slug,
            color: GAME_COLORS?.[game?.id] || "#f8fafc",
            ath: detail.ath || null,
            latest: detail.latest || null,
          };
        })
        .filter((item) => item.ath != null || item.latest != null)
        .sort((a, b) => (b.ath?.value ?? -Infinity) - (a.ath?.value ?? -Infinity)),
    [slugDetails]
  );

  // ====================== RENDER ======================
  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #0f172a, #111c2f)",
        borderRadius: "18px",
        border: "1px solid rgba(148,163,184,0.18)",
        boxShadow: "0 24px 50px rgba(15,23,42,0.45)",
        color: "#f8fafc",
        p: { xs: 3, md: 4 },
        width: "100%",
      }}
    >
      <Stack spacing={{ xs: 2.2, md: 3.2 }}>
        {/* Header */}
        <Stack spacing={{ xs: 1, md: 1.25 }} alignItems="center" textAlign="center">
          <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: "1.8rem", sm: "2.3rem" } }}>
            Gameshow live-data & historik
          </Typography>
          <Typography variant="body1" sx={{ color: "rgba(226,232,240,0.75)", maxWidth: 760, lineHeight: 1.6 }}>
            En förädlad vy över live-spelare, trendutveckling, ranking och toppnoteringar. Uppdateras automatiskt med lobbydata.
          </Typography>
        </Stack>

        {/* Totalt live + list */}
        <Grid container spacing={{ xs: 2, md: 3 }}>
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                background: "rgba(15,23,42,0.45)",
                borderRadius: "16px",
                border: "1px solid rgba(148,163,184,0.18)",
                p: { xs: 2, md: 2.5 },
                display: "flex",
                flexDirection: "column",
                gap: 1,
                textAlign: "center",
              }}
            >
              <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.85)", letterSpacing: 1.2, fontWeight: 600 }}>
                Totalt live
              </Typography>
              {loadingLive ? (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                  <CircularProgress size={18} sx={{ color: "#22c55e" }} />
                  <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
                    Hämtar live-data…
                  </Typography>
                </Box>
              ) : (
                <>
                  <Stack direction="row" spacing={0.9} justifyContent="center" alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#22c55e" }} />
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      {totalLivePlayers != null ? totalLivePlayers.toLocaleString("sv-SE") : "—"}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
                    {playersUpdatedText}
                  </Typography>
                </>
              )}
            </Box>
          </Grid>

          <Grid item xs={12} md={8}>
            <Box
              sx={{
                background: "rgba(15,23,42,0.45)",
                borderRadius: "16px",
                border: "1px solid rgba(148,163,184,0.18)",
                p: { xs: 2, md: 2.5 },
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
              }}
            >
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between">
                <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.85)", letterSpacing: 1.2, fontWeight: 600 }}>
                  Liveshower just nu
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
                  {loadingLive ? "Uppdaterar…" : `Totalt ${liveGamesList.length} spel`}
                </Typography>
              </Stack>
              <Grid container spacing={1.5}>
                {loadingLive && (
                  <Grid item xs={12}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                      <CircularProgress size={18} sx={{ color: "#22c55e" }} />
                      <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
                        Hämtar live-data…
                      </Typography>
                    </Box>
                  </Grid>
                )}
                {!loadingLive &&
                  visibleLiveGames.map((item, index) => (
                    <Grid key={item.id} item xs={12} sm={6}>
                      <Box
                        sx={{
                          background: `linear-gradient(135deg, ${item.color}22, rgba(15,23,42,0.65))`,
                          borderRadius: "14px",
                          border: `1px solid ${item.color}44`,
                          p: 2,
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.75,
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="overline" sx={{ color: "rgba(226,232,240,0.8)", fontWeight: 600 }}>
                            #{index + 1}
                          </Typography>
                          <Chip
                            size="small"
                            label={Number.isFinite(item.players) ? numberFormatter.format(item.players) : "—"}
                            sx={{
                              backgroundColor: "rgba(15,23,42,0.55)",
                              color: item.color,
                              border: `1px solid ${item.color}55`,
                              borderRadius: "999px",
                            }}
                          />
                        </Stack>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: "#f8fafc" }}>
                          {item.label}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.7)" }}>
                          {item.updated ? `Senast ${timeFormatter.format(new Date(item.updated))}` : "Ingen tidsstämpel"}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                {!loadingLive && liveGamesList.length > visibleLiveGames.length && (
                  <Grid item xs={12} sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
                    <Chip
                      label={showAllLive ? "Visa mindre" : "Visa fler"}
                      onClick={() => setShowAllLive((prev) => !prev)}
                      clickable
                      sx={{
                        backgroundColor: "rgba(148,163,184,0.12)",
                        color: "#cbd5f5",
                        borderRadius: "999px",
                      }}
                    />
                  </Grid>
                )}
              </Grid>
            </Box>
          </Grid>
        </Grid>

        {/* Toggle mellan sektioner */}
        <ToggleButtonGroup
          value={detailView}
          exclusive
          onChange={(_, value) => value && setDetailView(value)}
          sx={{
            backgroundColor: "rgba(148,163,184,0.12)",
            borderRadius: "999px",
            p: 0.5,
            alignSelf: "center",
          }}
        >
          <ToggleButton
            value="trend"
            sx={{ textTransform: "none", color: "rgba(226,232,240,0.75)", border: 0, borderRadius: "999px!important", px: { xs: 1.75, md: 3 }, py: 0.75, "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(56,189,248,0.28)" } }}
          >
            Trend
          </ToggleButton>
          <ToggleButton
            value="ranking"
            sx={{ textTransform: "none", color: "rgba(226,232,240,0.75)", border: 0, borderRadius: "999px!important", px: { xs: 1.75, md: 3 }, py: 0.75, "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(56,189,248,0.28)" } }}
          >
            Ranking
          </ToggleButton>
          <ToggleButton
            value="ath"
            sx={{ textTransform: "none", color: "rgba(226,232,240,0.75)", border: 0, borderRadius: "999px!important", px: { xs: 1.75, md: 3 }, py: 0.75, "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(192,132,252,0.28)" } }}
          >
            ATH
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Sektioner */}
        {detailView === "trend" && (
          <TrendSection
            overviewLoading={overviewLoading}
            overviewError={overviewError}
            trendChartData={trendChartData}
            trendDays={trendDays}
            trendUpdatedLabel={trendUpdatedLabel}
            onChangeDays={setTrendDays}
          />
        )}

        {detailView === "ranking" && (
          <RankingSection
            rankingRows={rankingRows}
            overviewLoading={overviewLoading}
          />
        )}

        {detailView === "ath" && (
          <AthSection
            athRows={athRows}
            athDays={athDays}
            onChangeDays={setAthDays}
            overviewLoading={overviewLoading}
            overviewError={overviewError}
            showAllAth={showAllAth}
            toggleShowAll={() => setShowAllAth((prev) => !prev)}
          />
        )}
      </Stack>
    </Box>
  );
};

// ================== Sektioner ==================
const TrendSection = ({ overviewLoading, overviewError, trendChartData, trendDays, trendUpdatedLabel, onChangeDays }) => (
  <Box
    sx={{
      background: "rgba(15,23,42,0.45)",
      borderRadius: "16px",
      border: "1px solid rgba(148,163,184,0.18)",
      p: { xs: 2, md: 2.5 },
      display: "flex",
      flexDirection: "column",
      gap: 1.5,
    }}
  >
    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={1}>
      <Stack spacing={0.4}>
        <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.85)", letterSpacing: 1.2, fontWeight: 600 }}>
          Trend – genomsnittliga spelare
        </Typography>
        <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
          {overviewLoading
            ? "Hämtar trenddata…"
            : trendUpdatedLabel
            ? `Senast uppdaterad ${trendUpdatedLabel}`
            : overviewError || "Ingen trenddata"}
        </Typography>
      </Stack>
      <ToggleButtonGroup
        value={trendDays}
        exclusive
        onChange={(_, value) => value && onChangeDays(value)}
        size="small"
        sx={{
          backgroundColor: "rgba(148,163,184,0.12)",
          borderRadius: "999px",
          p: 0.5,
        }}
      >
        {TREND_DAY_OPTIONS.map((option) => (
          <ToggleButton
            key={option}
            value={option}
            sx={{
              textTransform: "none",
              color: "rgba(226,232,240,0.75)",
              border: 0,
              borderRadius: "999px!important",
              px: { xs: 1.5, md: 2 },
              "&.Mui-selected": {
                color: "#f8fafc",
                backgroundColor: "rgba(56,189,248,0.28)",
              },
            }}
          >
            {option} d
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
    <Box sx={{ height: 260 }}>
      {overviewLoading ? (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 1.2 }}>
          <CircularProgress size={20} sx={{ color: "#38bdf8" }} />
          <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
            Laddar spelardata…
          </Typography>
        </Box>
      ) : trendChartData.length ? (
        <ResponsiveContainer>
          <AreaChart data={trendChartData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="liveTrendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="4 4" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "rgba(148,163,184,0.75)" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "rgba(148,163,184,0.75)" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
              width={60}
              tickFormatter={(value) => numberFormatter.format(value)}
            />
            <RechartsTooltip
              contentStyle={{
                background: "rgba(15,23,42,0.92)",
                border: "1px solid rgba(96,165,250,0.25)",
                borderRadius: 12,
                color: "#f8fafc",
              }}
              formatter={(value) => [`${numberFormatter.format(value)} spelare`, "Genomsnitt"]}
            />
            <Area
              type="monotone"
              dataKey="players"
              stroke="#38bdf8"
              strokeWidth={2.5}
              fill="url(#liveTrendGradient)"
              fillOpacity={1}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "rgba(148,163,184,0.75)",
          }}
        >
          Ingen trenddata tillgänglig.
        </Box>
      )}
    </Box>
  </Box>
);

const RankingSection = ({ rankingRows, overviewLoading }) => (
  <Box
    sx={{
      background: "rgba(15,23,42,0.45)",
      borderRadius: "16px",
      border: "1px solid rgba(148,163,184,0.18)",
      p: { xs: 2, md: 2.5 },
      display: "flex",
      flexDirection: "column",
      gap: 1.5,
    }}
  >
    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={1.5}>
      <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.85)", letterSpacing: 1.2, fontWeight: 600 }}>
        Ranking
      </Typography>
      <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
        {overviewLoading ? "Uppdaterar ranking…" : `${rankingRows.length} spel listade`}
      </Typography>
    </Stack>
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {rankingRows.map((row, index) => (
        <Stack
          key={row.slug}
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            background: "rgba(15,23,42,0.55)",
            borderRadius: "12px",
            border: `1px solid ${row.color}33`,
            padding: "12px 16px",
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: row.color }} />
            <Typography sx={{ color: "#f8fafc", fontWeight: 600 }}>
              #{index + 1} {row.label}
            </Typography>
          </Stack>
          <Typography sx={{ color: "rgba(226,232,240,0.85)", fontWeight: 600 }}>
            {numberFormatter.format(row.avgPlayers)}
          </Typography>
        </Stack>
      ))}
      {rankingRows.length === 0 && (
        <Typography sx={{ color: "rgba(148,163,184,0.7)", textAlign: "center", py: 2 }}>
          Ingen rankingdata tillgänglig.
        </Typography>
      )}
    </Box>
  </Box>
);

const AthSection = ({ athRows, athDays, onChangeDays, overviewLoading, overviewError, showAllAth, toggleShowAll }) => {
  const visibleRows = useMemo(() => (showAllAth ? athRows : athRows.slice(0, INITIAL_VISIBLE_ATH)), [athRows, showAllAth]);
  const isLoading = overviewLoading && athRows.length === 0;
  const showError = Boolean(overviewError) && athRows.length === 0;
  const isEmpty = athRows.length === 0 && !isLoading && !showError;

  return (
    <Box
      sx={{
        background: "rgba(15,23,42,0.45)",
        borderRadius: "16px",
        border: "1px solid rgba(148,163,184,0.18)",
        p: { xs: 2, md: 2.5 },
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={1}
      >
        <Stack spacing={0.4}>
          <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.85)", letterSpacing: 1.2, fontWeight: 600 }}>
            All-Time High (ATH) & Senaste
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
            {isLoading
              ? "Hämtar toppdata…"
              : showError
              ? `Fel: ${overviewError}`
              : athRows.length
              ? `Topplista baserad på de senaste ${athDays} dagarna`
              : "Ingen toppdata tillgänglig ännu."}
          </Typography>
        </Stack>
        <ToggleButtonGroup
          value={athDays}
          exclusive
          onChange={(_, value) => value && onChangeDays(value)}
          size="small"
          sx={{
            backgroundColor: "rgba(148,163,184,0.12)",
            borderRadius: "999px",
            p: 0.5,
          }}
        >
          {ATH_DAY_OPTIONS.map((option) => (
            <ToggleButton
              key={option}
              value={option}
              sx={{
                textTransform: "none",
                color: "rgba(226,232,240,0.75)",
                border: 0,
                borderRadius: "999px!important",
                px: { xs: 1.5, md: 2 },
                "&.Mui-selected": {
                  color: "#f8fafc",
                  backgroundColor: "rgba(192,132,252,0.28)",
                },
              }}
            >
              {option} d
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      {isLoading ? (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 3, gap: 1.2 }}>
          <CircularProgress size={20} sx={{ color: "#c084fc" }} />
          <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
            Hämtar toppdata…
          </Typography>
        </Box>
      ) : showError ? (
        <Typography sx={{ color: "#fecaca" }}>Fel: {overviewError}</Typography>
      ) : isEmpty ? (
        <Typography sx={{ color: "rgba(148,163,184,0.7)", textAlign: "center", py: 2 }}>
          Ingen ATH-data tillgänglig.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {visibleRows.map((row, index) => (
            <Box
              key={row.slug}
              sx={{
                background: "rgba(15,23,42,0.55)",
                borderRadius: "12px",
                border: `1px solid ${row.color}55`,
                p: 1.25,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: row.color }} />
                  <Typography sx={{ color: "#f8fafc", fontWeight: 600 }}>
                    #{index + 1} {row.label}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Stack spacing={0} alignItems="flex-end">
                    <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.75)" }}>
                      ATH
                    </Typography>
                    <Typography sx={{ color: "#f8fafc", fontWeight: 700 }}>
                      {row.ath?.value != null ? numberFormatter.format(row.ath.value) : "—"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
                      {row.ath?.at ? formatDateTime(row.ath.at) : ""}
                    </Typography>
                  </Stack>
                  <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(148,163,184,0.2)" }} />
                  <Stack spacing={0} alignItems="flex-end">
                    <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.75)" }}>
                      Senaste
                    </Typography>
                    <Typography sx={{ color: "#f8fafc", fontWeight: 700 }}>
                      {row.latest?.value != null ? numberFormatter.format(row.latest.value) : "—"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
                      {row.latest?.at ? formatDateTime(row.latest.at) : ""}
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>
            </Box>
          ))}

          {athRows.length > visibleRows.length && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
              <Chip
                label={showAllAth ? "Visa mindre" : "Visa fler"}
                onClick={toggleShowAll}
                clickable
                sx={{
                  backgroundColor: "rgba(148,163,184,0.12)",
                  color: "#cbd5f5",
                  borderRadius: "999px",
                }}
              />
            </Box>
          )}
        </Stack>
      )}
    </Box>
  );
};

export default LivePlayersControlPanel;
