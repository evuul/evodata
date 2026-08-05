"use client";

// Renders the private Extended lobby shared by the dashboard and Mina sidor.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CasinoRounded from "@mui/icons-material/CasinoRounded";
import GroupsRounded from "@mui/icons-material/GroupsRounded";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import LockRounded from "@mui/icons-material/LockRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import StyleRounded from "@mui/icons-material/StyleRounded";
import { useAuth } from "@/context/AuthContext";
import { useLocale, useTranslate } from "@/context/LocaleContext";
import { fetchAuthJson } from "@/lib/clientApi";
import { isPrimaryAdminEmail } from "@/lib/adminAccess";

const formatNumber = (value, locale) => Number(value || 0).toLocaleString(locale === "en" ? "en-US" : "sv-SE");

const CATEGORY_COLORS = {
  gameshows: { color: "#c4b5fd", background: "rgba(139,92,246,0.14)", border: "rgba(167,139,250,0.25)" },
  roulette: { color: "#7dd3fc", background: "rgba(14,165,233,0.13)", border: "rgba(56,189,248,0.24)" },
  baccarat: { color: "#6ee7b7", background: "rgba(16,185,129,0.12)", border: "rgba(52,211,153,0.23)" },
};

const getCategoryLabel = (category, translate) => {
  if (category === "roulette") return translate("Roulette", "Roulette");
  if (category === "baccarat") return translate("Baccarat", "Baccarat");
  return translate("Gameshows", "Game shows");
};

function SummaryCard({ icon, label, value, detail, accent }) {
  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        flex: 1,
        minWidth: 0,
        p: { xs: 2, sm: 2.4 },
        border: `1px solid ${accent.border}`,
        borderRadius: "16px",
        background: `linear-gradient(145deg, ${accent.background}, rgba(15,23,42,0.72) 68%)`,
      }}
    >
      <Box sx={{ position: "absolute", width: 110, height: 110, borderRadius: "50%", bgcolor: accent.glow, filter: "blur(32px)", right: -40, top: -50 }} />
      <Stack direction="row" alignItems="center" spacing={0.8} sx={{ position: "relative" }}>
        {icon}
        <Typography sx={{ color: "rgba(203,213,225,0.76)", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {label}
        </Typography>
      </Stack>
      <Typography sx={{ position: "relative", color: "#f8fafc", mt: 0.7, fontWeight: 900, fontSize: { xs: "2.15rem", sm: "2.75rem" }, lineHeight: 1, letterSpacing: "-0.045em", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </Typography>
      <Typography sx={{ position: "relative", color: "rgba(148,163,184,0.82)", mt: 0.85, fontSize: 12.5 }}>
        {detail}
      </Typography>
    </Box>
  );
}

function LockedExtendedLobby({ translate }) {
  return (
    <Box
      sx={{
        maxWidth: 820,
        mx: "auto",
        px: { xs: 2.5, sm: 4 },
        py: { xs: 4, sm: 5 },
        textAlign: "center",
        border: "1px solid rgba(148,163,184,0.2)",
        borderRadius: "18px",
        backgroundColor: "#0f192b",
      }}
    >
      <LockRounded sx={{ color: "#facc15", fontSize: 30, mb: 1.2 }} />
      <Typography variant="h5" sx={{ color: "#f8fafc", fontWeight: 800 }}>
        {translate("Extended lobby", "Extended lobby")}
      </Typography>
      <Typography sx={{ color: "rgba(203,213,225,0.76)", maxWidth: 610, mx: "auto", mt: 1.2, lineHeight: 1.65 }}>
        {translate(
          "Extended lobby är tillgänglig för Founders, Premium och Admin – användare som hjälper till att dela på EvoTrackers data- och driftkostnader.",
          "Extended lobby is available to Founders, Premium, and Admin—members who help share EvoTracker's data and operating costs."
        )}
      </Typography>
      <Button component={Link} href="/founders" variant="outlined" sx={{ mt: 2.5, borderRadius: "999px", textTransform: "none", color: "#fde68a", borderColor: "rgba(250,204,21,0.48)" }}>
        {translate("Läs om Founder", "Learn about Founder")}
      </Button>
    </Box>
  );
}

export default function ExtendedLobbyPanel({ accessGranted = null, embedded = false }) {
  const { user, token } = useAuth();
  const { locale } = useLocale();
  const translate = useTranslate();
  const hasAccess = accessGranted == null
    ? Boolean(user?.isAdmin || user?.isFounder || user?.isSubscriber || isPrimaryAdminEmail(user?.email))
    : Boolean(accessGranted);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [state, setState] = useState({ loading: hasAccess, error: "", data: null });

  useEffect(() => {
    if (!hasAccess || !token) return undefined;
    let active = true;
    const load = (showLoading) => {
      if (showLoading) setState((current) => ({ ...current, loading: true, error: "" }));
      fetchAuthJson(token, "/api/extended-lobby")
        .then((data) => {
          if (active) setState({ loading: false, error: "", data });
        })
        .catch((error) => {
          if (active) {
            setState((current) => ({
              loading: false,
              error: error?.message || translate("Kunde inte uppdatera Extended lobby.", "Could not refresh Extended lobby."),
              data: current.data,
            }));
          }
        });
    };

    load(true);
    const intervalId = window.setInterval(() => load(false), 10 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [hasAccess, token, translate]);

  const games = useMemo(() => {
    const rows = state.data?.games;
    if (!Array.isArray(rows)) return [];
    const normalizedQuery = query.trim().toLocaleLowerCase(locale === "sv" ? "sv-SE" : "en-US");
    return rows.filter((game) => {
      const matchesCategory = category === "all" || game.category === category;
      const matchesQuery = !normalizedQuery || game.name
        .toLocaleLowerCase(locale === "sv" ? "sv-SE" : "en-US")
        .includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, locale, query, state.data]);

  const summary = state.data?.summary;
  const categoryFilters = ["all", "gameshows", "roulette", "baccarat"];

  if (!hasAccess) return <LockedExtendedLobby translate={translate} />;

  if (state.loading) {
    return <Box sx={{ minHeight: 260, display: "grid", placeItems: "center" }}><CircularProgress size={28} /></Box>;
  }

  return (
    <Box sx={{ width: "100%", backgroundColor: embedded ? "transparent" : "#0f192b", border: embedded ? 0 : "1px solid rgba(148,163,184,0.18)", borderRadius: embedded ? 0 : "18px", px: { xs: 0, sm: embedded ? 0 : 3 }, py: embedded ? 0 : { xs: 2.5, sm: 3 } }}>
      <Stack spacing={{ xs: 2.2, md: 2.6 }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={1.5}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <StyleRounded sx={{ color: "#7dd3fc" }} />
              <Typography variant="h5" sx={{ color: "#f8fafc", fontWeight: 800 }}>
                {translate("Extended lobby", "Extended lobby")}
              </Typography>
            </Stack>
            <Typography sx={{ color: "rgba(203,213,225,0.68)", mt: 0.65 }}>
              {translate("Utökad livebild med spel som inte finns i den vanliga vyn.", "Extended live view with games outside the standard view.")}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.8} alignItems="center" sx={{ px: 1.25, py: 0.7, borderRadius: "999px", bgcolor: "rgba(15,23,42,0.72)", border: "1px solid rgba(148,163,184,0.14)" }}>
            <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: state.data?.updatedAt ? "#34d399" : "#64748b", boxShadow: state.data?.updatedAt ? "0 0 0 4px rgba(52,211,153,0.1)" : "none" }} />
            <Typography variant="caption" sx={{ color: "rgba(203,213,225,0.74)", fontWeight: 650 }}>
              {state.data?.updatedAt
                ? translate("Uppdaterad ", "Updated ") + new Date(state.data.updatedAt).toLocaleTimeString(locale === "en" ? "en-GB" : "sv-SE", { hour: "2-digit", minute: "2-digit" })
                : translate("Ingen uppdatering", "No update")}
            </Typography>
          </Stack>
        </Stack>

        {summary ? (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
            <SummaryCard
              icon={<GroupsRounded sx={{ color: "#38bdf8", fontSize: 20 }} />}
              label={translate("Live players", "Live players")}
              value={formatNumber(summary.players, locale)}
              detail={translate("Aktiva spelare i hela Extended lobby", "Active players across Extended lobby")}
              accent={{ border: "rgba(56,189,248,0.24)", background: "rgba(14,165,233,0.12)", glow: "rgba(14,165,233,0.34)" }}
            />
            <SummaryCard
              icon={<CasinoRounded sx={{ color: "#a78bfa", fontSize: 20 }} />}
              label={translate("Antal spel", "Tracked games")}
              value={formatNumber(summary.games, locale)}
              detail={translate("Titlar med aktuell live-data", "Titles with current live data")}
              accent={{ border: "rgba(167,139,250,0.24)", background: "rgba(139,92,246,0.11)", glow: "rgba(139,92,246,0.32)" }}
            />
          </Stack>
        ) : null}

        <Stack spacing={1.2} sx={{ p: { xs: 1.4, sm: 1.6 }, borderRadius: "14px", border: "1px solid rgba(148,163,184,0.14)", bgcolor: "rgba(15,23,42,0.44)" }}>
          <TextField
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={translate("Sök spel", "Search games")}
            size="small"
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded sx={{ color: "rgba(148,163,184,0.72)", fontSize: 19 }} /></InputAdornment> } }}
            sx={{ width: "100%", "& .MuiOutlinedInput-root": { color: "#f8fafc", borderRadius: "11px", backgroundColor: "rgba(2,6,23,0.32)", "& fieldset": { borderColor: "rgba(148,163,184,0.2)" }, "&:hover fieldset": { borderColor: "rgba(125,211,252,0.34)" }, "&.Mui-focused fieldset": { borderColor: "rgba(56,189,248,0.62)" } } }}
          />
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.8, pb: 0.25 }}>
            {categoryFilters.map((filter) => {
              const selected = category === filter;
              const count = filter === "all" ? summary?.games : summary?.categories?.[filter]?.games;
              return (
                <Button
                  key={filter}
                  onClick={() => setCategory(filter)}
                  size="small"
                  aria-pressed={selected}
                  sx={{
                    flexShrink: 0,
                    minHeight: 34,
                    px: 1.35,
                    borderRadius: "999px",
                    textTransform: "none",
                    fontWeight: 750,
                    fontSize: 12.5,
                    color: selected ? "#f8fafc" : "rgba(203,213,225,0.72)",
                    bgcolor: selected ? "rgba(56,189,248,0.18)" : "rgba(148,163,184,0.07)",
                    border: selected ? "1px solid rgba(56,189,248,0.38)" : "1px solid rgba(148,163,184,0.12)",
                    "&:hover": { bgcolor: selected ? "rgba(56,189,248,0.24)" : "rgba(148,163,184,0.13)" },
                  }}
                >
                  {filter === "all" ? translate("Alla", "All") : getCategoryLabel(filter, translate)}
                  <Box component="span" sx={{ ml: 0.75, color: selected ? "#7dd3fc" : "rgba(148,163,184,0.76)", fontVariantNumeric: "tabular-nums" }}>
                    {formatNumber(count, locale)}
                  </Box>
                </Button>
              );
            })}
          </Stack>
        </Stack>

        {state.error ? <Typography sx={{ color: "#fca5a5" }}>{state.error}</Typography> : null}
        {!state.error && !games.length ? <Typography sx={{ color: "rgba(203,213,225,0.7)" }}>{translate("Inga spel matchar filtret.", "No games match this filter.")}</Typography> : null}

        {games.length ? (
          <Box sx={{ overflow: "hidden", border: "1px solid rgba(148,163,184,0.16)", borderRadius: "15px", bgcolor: "rgba(2,6,23,0.18)" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: { xs: 1.5, sm: 2 }, py: 1.2, borderBottom: "1px solid rgba(148,163,184,0.14)", bgcolor: "rgba(15,23,42,0.82)" }}>
              <Box>
                <Typography sx={{ color: "#f8fafc", fontSize: 13, fontWeight: 800 }}>
                  {translate("Spellista", "Game list")}
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.7)" }}>
                  {formatNumber(games.length, locale)} {translate("visade spel", "games shown")}
                </Typography>
              </Box>
              <Typography sx={{ color: "rgba(203,213,225,0.62)", fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {translate("Live players", "Live players")}
              </Typography>
            </Stack>

            {games.length > 7 ? (
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.35} sx={{ py: 0.75, color: "rgba(125,211,252,0.76)", bgcolor: "rgba(14,165,233,0.055)", borderBottom: "1px solid rgba(56,189,248,0.1)" }}>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  {translate("Scrolla för att se alla spel", "Scroll to view all games")}
                </Typography>
                <KeyboardArrowDownRounded sx={{ fontSize: 17 }} />
              </Stack>
            ) : null}

            <Box
              sx={{
                maxHeight: { xs: 470, md: 570 },
                overflowY: "auto",
                scrollbarColor: "rgba(125,211,252,0.56) rgba(15,23,42,0.5)",
                scrollbarWidth: "thin",
                "&::-webkit-scrollbar": { width: 8 },
                "&::-webkit-scrollbar-track": { background: "rgba(15,23,42,0.5)" },
                "&::-webkit-scrollbar-thumb": { background: "rgba(125,211,252,0.5)", borderRadius: 8, border: "2px solid rgba(15,23,42,0.5)" },
              }}
            >
              {games.map((game, index) => {
                const palette = CATEGORY_COLORS[game.category] ?? CATEGORY_COLORS.gameshows;
                return (
                  <Stack key={game.id} direction="row" justifyContent="space-between" alignItems="center" spacing={1.5} sx={{ px: { xs: 1.5, sm: 2 }, py: 1.45, borderBottom: index < games.length - 1 ? "1px solid rgba(148,163,184,0.11)" : 0, transition: "background-color 150ms ease", "&:hover": { bgcolor: "rgba(148,163,184,0.055)" } }}>
                    <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0 }}>
                      <Box sx={{ flexShrink: 0, width: 29, height: 29, display: "grid", placeItems: "center", borderRadius: "9px", bgcolor: "rgba(148,163,184,0.08)", color: "rgba(148,163,184,0.76)", fontSize: 11, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                        {index + 1}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ color: "#f8fafc", fontWeight: 750, fontSize: { xs: 13.5, sm: 14.5 }, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.name}</Typography>
                        <Chip
                          label={getCategoryLabel(game.category, translate)}
                          size="small"
                          sx={{ mt: 0.45, height: 20, color: palette.color, bgcolor: palette.background, border: `1px solid ${palette.border}`, "& .MuiChip-label": { px: 0.8, fontSize: 10, fontWeight: 750 } }}
                        />
                      </Box>
                    </Stack>
                    <Stack alignItems="flex-end" sx={{ flexShrink: 0 }}>
                      <Typography sx={{ color: "#7dd3fc", fontWeight: 900, fontSize: { xs: "1.12rem", sm: "1.28rem" }, lineHeight: 1.1, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums" }}>
                        {formatNumber(game.players, locale)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "rgba(52,211,153,0.78)", fontSize: 10, fontWeight: 750 }}>● Live</Typography>
                    </Stack>
                  </Stack>
                );
              })}
            </Box>
          </Box>
        ) : null}
      </Stack>
    </Box>
  );
}
