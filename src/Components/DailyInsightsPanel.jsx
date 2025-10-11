"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Card, CardContent, Chip, CircularProgress, Typography } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import RemoveIcon from "@mui/icons-material/Remove";
import { usePlayersLive } from "@/context/PlayersLiveContext";
import { useStockPriceContext } from "@/context/StockPriceContext";
import { formatSek } from "@/utils/formatters";
import { totalSharesData } from "./buybacks/utils";

const LATEST_TOTAL_SHARES = totalSharesData[totalSharesData.length - 1]?.totalShares ?? null;
const LOBBY_MULTIPLIER = 1.25;

const POSITIVE_BG = "rgba(0, 230, 118, 0.12)";
const POSITIVE_BORDER = "rgba(0, 230, 118, 0.35)";
const NEGATIVE_BG = "rgba(255, 111, 111, 0.12)";
const NEGATIVE_BORDER = "rgba(255, 111, 111, 0.35)";
const NEUTRAL_BG = "rgba(176, 176, 176, 0.12)";
const NEUTRAL_BORDER = "rgba(176, 176, 176, 0.25)";

function resolveTrend(delta, { invert = false } = {}) {
  if (!Number.isFinite(delta) || delta === 0) {
    return {
      background: NEUTRAL_BG,
      borderColor: NEUTRAL_BORDER,
      trendColor: "#b0b0b0",
    };
  }
  const positive = delta > 0;
  const isGood = invert ? !positive : positive;
  return isGood
    ? { background: POSITIVE_BG, borderColor: POSITIVE_BORDER, trendColor: "#00e676" }
    : { background: NEGATIVE_BG, borderColor: NEGATIVE_BORDER, trendColor: "#ff6f6f" };
}

function formatPercent(value, fractionDigits = 2) {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(fractionDigits)}%`;
}

function formatPlayers(value) {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
}

function formatDeltaPlayers(value) {
  if (!Number.isFinite(value) || value === 0) return value === 0 ? "0" : "—";
  const abs = Math.round(Math.abs(value));
  const prefix = value > 0 ? "+" : "-";
  return `${prefix}${formatPlayers(abs)}`;
}

function formatPrice(value) {
  if (!Number.isFinite(value)) return "—";
  return `${value.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`;
}

export default function DailyInsightsPanel() {
  const {
    data: liveGames,
    lastUpdated: playersLastUpdated,
    GAMES: playerGames,
  } = usePlayersLive();
  const {
    stockPrice,
    ytdChangePercent,
    loading: stockLoading,
    error: stockError,
    lastUpdated: stockLastUpdated,
  } = useStockPriceContext();

  const [playerBaseline, setPlayerBaseline] = useState({
    yesterday: null,
    previous: null,
    loading: true,
    error: null,
  });

  const [shortState, setShortState] = useState({
    latestPercent: null,
    previousPercent: null,
    updatedAt: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      try {
        setPlayerBaseline((prev) => ({ ...prev, loading: true, error: null }));
        const res = await fetch("/api/casinoscores/summary?days=4", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = await res.json();
        const totals = Array.isArray(json?.totals) ? [...json.totals] : [];
        totals.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
        const yesterday = totals.length ? totals[totals.length - 1] : null;
        const previous = totals.length > 1 ? totals[totals.length - 2] : null;
        if (cancelled) return;
        setPlayerBaseline({
          yesterday,
          previous,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (cancelled) return;
        setPlayerBaseline({ yesterday: null, previous: null, loading: false, error: error.message || String(error) });
      }
    }

    loadSummary();
    const id = setInterval(loadSummary, 60 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadShortHistory() {
      try {
        setShortState((prev) => ({ ...prev, loading: true, error: null }));
        const res = await fetch("/api/short/history", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = await res.json();
        const items = Array.isArray(json?.items) ? [...json.items] : [];
        const sorted = items
          .map((item) => ({ date: item?.date, percent: Number(item?.percent) }))
          .filter((item) => item.date && Number.isFinite(item.percent))
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        const latest = sorted.length ? sorted[sorted.length - 1] : null;
        const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;
        if (cancelled) return;
        setShortState({
          latestPercent: latest ? latest.percent : null,
          previousPercent: prev ? prev.percent : null,
          updatedAt: json?.updatedAt || null,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (cancelled) return;
        setShortState({ latestPercent: null, previousPercent: null, updatedAt: null, loading: false, error: error.message || String(error) });
      }
    }

    loadShortHistory();
    const id = setInterval(loadShortHistory, 60 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const availableGames = playerGames || [];

  const currentPlayers = useMemo(() => {
    if (!liveGames) return null;
    return availableGames
      .reduce((sum, game) => {
        const entry = liveGames[game.id];
        const players = Number(entry?.players);
        return Number.isFinite(players) ? sum + players : sum;
      }, 0);
  }, [availableGames, liveGames]);

  const stockPriceValue = stockPrice?.price?.regularMarketPrice?.raw ?? null;
  const stockChangePercent = stockPrice?.price?.regularMarketChangePercent?.raw ?? null;

  const shortDelta =
    Number.isFinite(shortState.latestPercent) && Number.isFinite(shortState.previousPercent)
      ? +(shortState.latestPercent - shortState.previousPercent).toFixed(2)
      : null;
  const shortShares =
    Number.isFinite(shortState.latestPercent) && Number.isFinite(LATEST_TOTAL_SHARES)
      ? Math.round((shortState.latestPercent / 100) * LATEST_TOTAL_SHARES)
      : null;
  const shortDeltaShares =
    Number.isFinite(shortDelta) && Number.isFinite(LATEST_TOTAL_SHARES)
      ? Math.round((shortDelta / 100) * LATEST_TOTAL_SHARES)
      : null;
  const latestStockPrice = Number.isFinite(stockPriceValue) ? stockPriceValue : null;
  const shortValue =
    shortShares !== null && latestStockPrice !== null ? shortShares * latestStockPrice : null;
  const shortDeltaValue =
    shortDeltaShares !== null && latestStockPrice !== null ? shortDeltaShares * latestStockPrice : null;

  const baselineToday = Number(playerBaseline.yesterday?.avgPlayers);
  const baselinePrev = Number(playerBaseline.previous?.avgPlayers);

  const estimatedLobbyPlayers = Number.isFinite(baselineToday)
    ? Math.round(baselineToday * LOBBY_MULTIPLIER)
    : null;
  const estimatedLobbyPrevious = Number.isFinite(baselinePrev)
    ? Math.round(baselinePrev * LOBBY_MULTIPLIER)
    : null;

  const lobbyDelta = Number.isFinite(estimatedLobbyPlayers) && Number.isFinite(estimatedLobbyPrevious)
    ? estimatedLobbyPlayers - estimatedLobbyPrevious
    : null;

  const lobbyDeltaPercent = Number.isFinite(lobbyDelta) && Number.isFinite(estimatedLobbyPrevious) && estimatedLobbyPrevious !== 0
    ? (lobbyDelta / estimatedLobbyPrevious) * 100
    : null;

  const lobbyDescription = playerBaseline.yesterday?.date
    ? `Dagssnitt ${playerBaseline.yesterday.date} × ${LOBBY_MULTIPLIER}`
    : "";

  const estimatedLobbyDisplay = Number.isFinite(estimatedLobbyPlayers)
    ? estimatedLobbyPlayers
    : Number.isFinite(currentPlayers)
      ? currentPlayers
      : null;

  const cards = useMemo(() => {
    const list = [];

    list.push({
      id: "stockPrice",
      title: "Aktiekurs",
      valueLabel: formatPrice(stockPriceValue),
      delta: Number.isFinite(stockChangePercent) ? stockChangePercent : null,
      deltaLabel: Number.isFinite(stockChangePercent) ? formatPercent(stockChangePercent) : "—",
      secondaryLabel: Number.isFinite(ytdChangePercent) ? `YTD ${formatPercent(ytdChangePercent)}` : null,
      description: "Förändring mot föregående stängning",
      invert: false,
      loading: stockLoading,
      error: stockError,
    });

    list.push({
      id: "shortValue",
      title: "Blankat värde",
      valueLabel: shortValue != null ? formatSek(shortValue) : "—",
      delta: shortDelta,
      deltaLabel: Number.isFinite(shortDelta) ? `${shortDelta > 0 ? "+" : ""}${shortDelta.toFixed(2)}pp` : "—",
      secondaryLabel:
        shortDeltaValue != null && shortDeltaValue !== 0
          ? `${shortDeltaValue > 0 ? "+" : "-"}${formatSek(Math.abs(shortDeltaValue))}`
          : null,
      tertiaryLabel: shortShares != null ? `${shortShares.toLocaleString("sv-SE")} aktier` : null,
      description: "Total blankning mot gårdagens nivå",
      invert: true,
      loading: shortState.loading,
      error: shortState.error,
    });

    list.push({
      id: "lobby",
      title: "Estimerad lobby",
      valueLabel: formatPlayers(estimatedLobbyDisplay),
      delta: lobbyDelta,
      deltaLabel: Number.isFinite(lobbyDelta) ? formatDeltaPlayers(lobbyDelta) : "—",
      secondaryLabel: Number.isFinite(lobbyDeltaPercent) ? formatPercent(lobbyDeltaPercent, 1) : null,
      tertiaryLabel: currentPlayers != null ? `Live just nu: ${formatPlayers(currentPlayers)}` : null,
      description: lobbyDescription,
      invert: false,
      loading: playerBaseline.loading,
      error: playerBaseline.error,
    });

    list.push({
      id: "donations",
      title: "Stötta Evolution Tracker",
      valueLabel: "Hjälp oss hålla sidan igång",
      delta: null,
      deltaLabel: null,
      secondaryLabel: "Jag bygger sidan själv som student och finansierar den med egna sparpengar.",
      description: "Varje bidrag hjälper mig fortsätta utveckla och driva Evolution Tracker – tack för ditt stöd!",
      invert: false,
      loading: false,
      error: null,
      cta: {
        label: "Stötta via Buy Me a Coffee",
        href: "https://buymeacoffee.com/evuul",
        external: true,
      },
    });

    return list;
  }, [
    stockPriceValue,
    stockChangePercent,
    stockLoading,
    stockError,
    shortValue,
    shortDelta,
    shortDeltaValue,
    shortShares,
    shortState.loading,
    shortState.error,
    estimatedLobbyDisplay,
    lobbyDelta,
    lobbyDeltaPercent,
    lobbyDescription,
    currentPlayers,
    playerBaseline.loading,
    playerBaseline.error,
    ytdChangePercent,
  ]);

  const latestUpdatedAt = useMemo(() => {
    const timestamps = [];
    if (stockLastUpdated instanceof Date && !Number.isNaN(stockLastUpdated.getTime())) {
      timestamps.push(stockLastUpdated.getTime());
    }
    if (playersLastUpdated instanceof Date && !Number.isNaN(playersLastUpdated.getTime())) {
      timestamps.push(playersLastUpdated.getTime());
    }
    if (shortState.updatedAt) {
      const t = Date.parse(shortState.updatedAt);
      if (Number.isFinite(t)) timestamps.push(t);
    }
    if (!timestamps.length) return null;
    const maxTs = Math.max(...timestamps);
    try {
      return new Date(maxTs).toLocaleString("sv-SE");
    } catch {
      return new Date(maxTs).toISOString();
    }
  }, [stockLastUpdated, playersLastUpdated, shortState.updatedAt]);

  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        color: "#fff",
        width: "100%",
        maxWidth: "1200px",
        margin: "16px auto",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            gap: 1,
            mb: 2,
          }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Dagens insikter
            </Typography>
            <Typography variant="body2" sx={{ color: "#b0b0b0" }}>
              Snabb överblick över kurs, blankning och spelarbeteende
            </Typography>
          </Box>
          {latestUpdatedAt && (
            <Chip
              size="small"
              label={`Uppdaterad ${latestUpdatedAt}`}
              sx={{
                bgcolor: "#2a2a2a",
                color: "#b0b0b0",
                border: "1px solid #3a3a3a",
              }}
            />
          )}
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              lg: `repeat(${cards.length}, minmax(0, 1fr))`,
            },
            gap: { xs: 1.5, sm: 2 },
          }}
        >
          {cards.map((card) => {
            const trend = resolveTrend(card.delta, { invert: card.invert });
            const direction = Number.isFinite(card.delta)
              ? card.delta > 0
                ? "up"
                : card.delta < 0
                ? "down"
                : "flat"
              : "flat";
            const Icon = direction === "up" ? TrendingUpIcon : direction === "down" ? TrendingDownIcon : RemoveIcon;

            return (
              <Box
                key={card.id}
                sx={{
                  background: trend.background,
                  border: `1px solid ${trend.borderColor}`,
                  borderRadius: "10px",
                  padding: { xs: "16px", sm: "18px" },
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.75,
                  minHeight: 140,
                }}
              >
                <Typography variant="subtitle2" sx={{ color: "#d0d0d0", letterSpacing: 0.5 }}>
                  {card.title}
                </Typography>

                {card.loading ? (
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", flexGrow: 1 }}>
                    <CircularProgress size={18} sx={{ color: "#FFCA28" }} />
                  </Box>
                ) : card.error ? (
                  <Typography variant="body2" sx={{ color: "#ff6f6f" }}>
                    {card.error}
                  </Typography>
                ) : (
                  <>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {card.valueLabel}
                    </Typography>

                    {(card.deltaLabel || card.secondaryLabel || card.tertiaryLabel) && (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                        {card.deltaLabel && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: trend.trendColor }}>
                            <Icon fontSize="small" />
                            <Typography variant="body2" sx={{ color: trend.trendColor }}>
                              {card.deltaLabel}
                            </Typography>
                          </Box>
                        )}
                        {card.secondaryLabel && (
                          <Typography variant="caption" sx={{ color: trend.trendColor }}>
                            {card.secondaryLabel}
                          </Typography>
                        )}
                        {card.tertiaryLabel && (
                          <Typography variant="caption" sx={{ color: trend.trendColor }}>
                            {card.tertiaryLabel}
                          </Typography>
                        )}
                      </Box>
                    )}

                    {card.description && (
                      <Typography variant="caption" sx={{ color: "#b0b0b0" }}>
                        {card.description}
                      </Typography>
                    )}
                    {card.cta && card.cta.href && (
                      <Button
                        component="a"
                        href={card.cta.href}
                        target={card.cta.external ? "_blank" : undefined}
                        rel={card.cta.external ? "noopener noreferrer" : undefined}
                        variant="contained"
                        size="small"
                        sx={{ mt: 1, alignSelf: "flex-start" }}
                      >
                        {card.cta.label}
                      </Button>
                    )}
                  </>
                )}
              </Box>
            );
          })}
        </Box>

        {Number.isFinite(lobbyDelta) && playerBaseline.yesterday?.date && playerBaseline.previous?.date && (
          <Typography variant="caption" sx={{ color: "#808080", display: "block", mt: 2 }}>
            Förändring {playerBaseline.yesterday.date} mot {playerBaseline.previous.date} (×{LOBBY_MULTIPLIER}): {formatDeltaPlayers(lobbyDelta)} spelare.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
