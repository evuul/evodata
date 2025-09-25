"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Typography, Chip, Tooltip, CircularProgress, IconButton, Collapse, Button, Divider
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

/**
 * Viktigt:
 *  - id används som primär nyckel (även för /series-id som kan vara "crazy-time:a")
 *  - apiSlug används för /players, och apiVariant="a" lägger till ?variant=a
 */
export const GAMES = [
  { id: "crazy-time",    label: "Crazy Time",    apiSlug: "crazy-time" },
  { id: "crazy-time:a",  label: "Crazy Time A",  apiSlug: "crazy-time", apiVariant: "a" },
  { id: "monopoly-big-baller",         label: "Big Baller",  apiSlug: "monopoly-big-baller" },
  { id: "funky-time",                  label: "Funky Time",  apiSlug: "funky-time" },
  { id: "lightning-storm",             label: "Lightning Storm", apiSlug: "lightning-storm" },
  { id: "crazy-balls",                 label: "Crazy Balls", apiSlug: "crazy-balls" },
  { id: "ice-fishing",                 label: "Ice Fishing", apiSlug: "ice-fishing" },
  { id: "xxxtreme-lightning-roulette", label: "XXXtreme Lightning Roulette", apiSlug: "xxxtreme-lightning-roulette" },
  { id: "monopoly-live",               label: "Monopoly Live", apiSlug: "monopoly-live" },
  { id: "red-door-roulette",           label: "Red Door Roulette", apiSlug: "red-door-roulette" },
  { id: "auto-roulette",               label: "Auto Roulette", apiSlug: "auto-roulette" },
  { id: "speed-baccarat-a",            label: "Speed Baccarat A", apiSlug: "speed-baccarat-a" },
  { id: "super-andar-bahar",           label: "Super Andar Bahar", apiSlug: "super-andar-bahar" },
  { id: "lightning-dice",              label: "Lightning Dice", apiSlug: "lightning-dice" },
  { id: "lightning-roulette",          label: "Lightning Roulette", apiSlug: "lightning-roulette" },
  { id: "bac-bo",                      label: "Bac Bo", apiSlug: "bac-bo" },
];

// Delad färgpalett – egen färg för A-varianten
export const COLORS = {
  "crazy-time": "#C21807",              // Rubinröd
  "crazy-time:a": "#26A69A",            // Teal
  "monopoly-big-baller": "#00e676",
  "funky-time": "#BA68C8",
  "lightning-storm": "#1976D2",         // Stark blå
  "crazy-balls": "#E57373",             // Ljusare röd
  "ice-fishing": "#AB47BC",
  "xxxtreme-lightning-roulette": "#FF7043",
  "monopoly-live": "#66BB6A",
  "red-door-roulette": "#EC407A",
  "auto-roulette": "#26C6DA",
  "speed-baccarat-a": "#4DB6AC",
  "super-andar-bahar": "#F06292",
  "lightning-dice": "#FFD54F",
  "lightning-roulette": "#29B6F6",
  "bac-bo": "#FF8A65",
};

const TOP_N = 3;

export default function GamePlayersLiveList() {
  const [live, setLive] = useState({});
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function fetchAll(force = false) {
    setLoading(true);
    const results = {};
    await Promise.all(
      GAMES.map(async (g) => {
        const qs = g.apiVariant
          ? `?variant=${g.apiVariant}${force ? "&force=1" : ""}`
          : (force ? "?force=1" : "");
        try {
          const res = await fetch(`/api/casinoscores/players/${g.apiSlug}${qs}`, { cache: "no-store" });
          const j = await res.json();
          results[g.id] = j.ok
            ? { players: Number(j.players), updated: j.fetchedAt }
            : { players: null, error: j.error || "error" };
        } catch (e) {
          results[g.id] = { players: null, error: e.message };
        }
      })
    );
    setLive(results);
    setLoading(false);
  }

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Sortera fallande (null sist)
  const rows = useMemo(() => {
    const list = GAMES.map((g) => ({
      ...g,
      players: live[g.id]?.players ?? null,
      updated: live[g.id]?.updated ?? null,
      color: COLORS[g.id] || "#fff",
    }));
    list.sort((a, b) => {
      const av = a.players, bv = b.players;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return bv - av;
    });
    return list;
  }, [live]);

  const total = useMemo(
    () => rows.filter(r => Number.isFinite(r.players)).reduce((s, r) => s + r.players, 0),
    [rows]
  );

  const top = rows.slice(0, TOP_N);
  const rest = rows.slice(TOP_N);
  const hiddenCount = rest.length;

  const titleText = expanded ? "Live spelare per game show" : `TOP ${TOP_N} live games just nu`;

  const Row = ({ row }) => {
    const formatted = row.players != null ? row.players.toLocaleString("sv-SE") : "—";
    const time = row.updated
      ? new Date(row.updated).toLocaleTimeString("sv-SE",{hour:"2-digit",minute:"2-digit"})
      : null;

    return (
      <Box
        sx={{
          display:"flex", justifyContent:"space-between", alignItems:"center",
          background:"#2a2a2a",
          border:"1px solid #3a3a3a",
          borderRadius:"8px",
          px:2, py:1,
          position:"relative",
          "&::before": {
            content:'""',
            position:"absolute",
            left:0, top:0, bottom:0,
            width:"4px",
            borderTopLeftRadius:"8px",
            borderBottomLeftRadius:"8px",
            backgroundColor: row.color,
            opacity: 0.9
          }
        }}
      >
        <Box sx={{ display:"flex", alignItems:"center", gap:1.25 }}>
          <span
            aria-hidden
            style={{
              display:"inline-block", width:10, height:10, borderRadius:"50%",
              backgroundColor: row.color, boxShadow: "0 0 6px rgba(255,255,255,0.25)"
            }}
          />
          <Typography sx={{ color: row.color, fontWeight:700, letterSpacing:0.2 }}>
            {row.label}
          </Typography>
        </Box>
        <Box sx={{ display:"flex", alignItems:"center", gap:1 }}>
          <Typography sx={{ color:"#fff", fontWeight:800 }}>{formatted}</Typography>
          {time && (
            <Tooltip title={`Uppdaterad ${time}`}>
              <Chip size="small" label={time} sx={{ color:"#b0b0b0", bgcolor:"#1e1e1e" }}/>
            </Tooltip>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Rubrik centrerad, refresh-knapp högerjusterad */}
      <Box
        sx={{
          position:"relative",
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
          mb: 1
        }}
      >
        <Typography variant="h6" sx={{ color:"#fff", fontWeight:700, textAlign:"center" }}>
          {titleText}
        </Typography>

        <Box sx={{ position:"absolute", right: 0, top: "50%", transform: "translateY(-50%)" }}>
          <Tooltip title="Uppdatera (bypass cache)">
            <span>
              <IconButton onClick={() => fetchAll(true)} disabled={loading} sx={{ color:"#00e676" }}>
                {loading ? <CircularProgress size={18} sx={{ color:"#00e676" }}/> : <RefreshIcon fontSize="small" /> }
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Top 3 */}
      <Box sx={{ display:"flex", flexDirection:"column", gap:1 }}>
        {top.map((row) => <Row key={row.id} row={row} />)}
      </Box>

      {/* Visa fler (visas endast när listan är kollapsad) */}
      {hiddenCount > 0 && !expanded && (
        <Box sx={{ display:"flex", justifyContent:"center", mt:1 }}>
          <Button
            variant="outlined"
            onClick={() => setExpanded(true)}
            aria-expanded={expanded}
            aria-controls="live-rest"
            endIcon={<ExpandMoreIcon />}
            sx={{
              color:"#fff",
              borderColor:"#3a3a3a",
              textTransform:"none",
              px:2,
              "&:hover": { borderColor:"#5a5a5a", background:"#2a2a2a" }
            }}
          >
            Visa fler ({hiddenCount})
          </Button>
        </Box>
      )}

      {/* Resten + Visa färre längst ner */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Divider sx={{ my:1, borderColor:"rgba(255,255,255,0.06)" }} />
        <Box id="live-rest" sx={{ display:"flex", flexDirection:"column", gap:1, mt:0 }}>
          {rest.map((row) => <Row key={row.id} row={row} />)}
          <Box sx={{ display:"flex", justifyContent:"center", mt:1 }}>
            <Button
              variant="text"
              onClick={() => setExpanded(false)}
              aria-expanded={expanded}
              aria-controls="live-rest"
              startIcon={<ExpandMoreIcon sx={{ transform:"rotate(180deg)" }} />}
              sx={{ color:"#b0b0b0", textTransform:"none" }}
            >
              Visa färre
            </Button>
          </Box>
        </Box>
      </Collapse>

      {/* Summa */}
      <Box
        sx={{
          mt:1.25, display:"flex", justifyContent:"space-between", alignItems:"center",
          background:"#242424", border:"1px solid #3a3a3a", borderRadius:"8px", px:2, py:1
        }}
      >
        <Typography sx={{ color:"#fff", fontWeight:700 }}>
          Summa ({GAMES.length} spel)
        </Typography>
        <Typography sx={{ color:"#fff", fontWeight:800 }}>
          {total.toLocaleString("sv-SE")}
        </Typography>
      </Box>
    </Box>
  );
}