"use client";

// Renders the private Extended lobby shared by the dashboard and Mina sidor.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import LockRounded from "@mui/icons-material/LockRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import StyleRounded from "@mui/icons-material/StyleRounded";
import { useAuth } from "@/context/AuthContext";
import { useLocale, useTranslate } from "@/context/LocaleContext";
import { fetchAuthJson } from "@/lib/clientApi";
import { isPrimaryAdminEmail } from "@/lib/adminAccess";

const formatNumber = (value, locale) => Number(value || 0).toLocaleString(locale === "en" ? "en-US" : "sv-SE");

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
    if (!normalizedQuery) return rows;
    return rows.filter((game) => game.name.toLocaleLowerCase(locale === "sv" ? "sv-SE" : "en-US").includes(normalizedQuery));
  }, [locale, query, state.data]);

  const summary = state.data?.summary;

  if (!hasAccess) return <LockedExtendedLobby translate={translate} />;

  if (state.loading) {
    return <Box sx={{ minHeight: 260, display: "grid", placeItems: "center" }}><CircularProgress size={28} /></Box>;
  }

  return (
    <Box sx={{ width: "100%", backgroundColor: embedded ? "transparent" : "#0f192b", border: embedded ? 0 : "1px solid rgba(148,163,184,0.18)", borderRadius: embedded ? 0 : "18px", px: { xs: 0, sm: embedded ? 0 : 3 }, py: embedded ? 0 : { xs: 2.5, sm: 3 } }}>
      <Stack spacing={{ xs: 2, md: 2.5 }}>
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
          <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.72)" }}>
            {state.data?.updatedAt
              ? translate("Uppdaterad ", "Updated ") + new Date(state.data.updatedAt).toLocaleTimeString(locale === "en" ? "en-GB" : "sv-SE", { hour: "2-digit", minute: "2-digit" })
              : translate("Ingen uppdatering", "No update")}
          </Typography>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} justifyContent="space-between">
          <TextField
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={translate("Sök spel", "Search games")}
            size="small"
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded sx={{ color: "rgba(148,163,184,0.72)", fontSize: 19 }} /></InputAdornment> } }}
            sx={{ width: { xs: "100%", sm: 260 }, "& .MuiOutlinedInput-root": { color: "#f8fafc", borderRadius: "11px", backgroundColor: "rgba(15,23,42,0.62)", "& fieldset": { borderColor: "rgba(148,163,184,0.2)" } } }}
          />
        </Stack>

        {summary ? (
          <Typography variant="caption" sx={{ color: "rgba(203,213,225,0.72)" }}>
            {formatNumber(summary.games, locale)} {translate("spel", "games")} · {formatNumber(summary.players, locale)} {translate("spelare totalt", "total players")}
          </Typography>
        ) : null}

        {state.error ? <Typography sx={{ color: "#fca5a5" }}>{state.error}</Typography> : null}
        {!state.error && !games.length ? <Typography sx={{ color: "rgba(203,213,225,0.7)" }}>{translate("Ingen aktuell data.", "No current data.")}</Typography> : null}

        <Box sx={{ borderTop: "1px solid rgba(148,163,184,0.18)", maxHeight: { xs: 520, md: 620 }, overflowY: "auto", pr: 0.75, scrollbarColor: "rgba(125,211,252,0.38) transparent" }}>
          {games.map((game, index) => (
            <Stack key={game.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 1.65, borderBottom: index < games.length - 1 ? "1px solid rgba(148,163,184,0.14)" : 0 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: "#f8fafc", fontWeight: 750, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.name}</Typography>
                <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.72)" }}>Live</Typography>
              </Box>
              <Typography sx={{ color: "#7dd3fc", fontWeight: 850, fontSize: { xs: "1.15rem", sm: "1.3rem" }, fontVariantNumeric: "tabular-nums" }}>
                {formatNumber(game.players, locale)}
              </Typography>
            </Stack>
          ))}
        </Box>
      </Stack>
    </Box>
  );
}
