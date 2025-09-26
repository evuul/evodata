"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Typography, Chip, Tooltip, CircularProgress, Collapse, Button, Divider
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { usePlayersLive, GAMES as CONTEXT_GAMES, PLAYERS_POLL_INTERVAL_MS } from "../context/PlayersLiveContext";

/**
 * Viktigt:
 *  - id används som primär nyckel (även för /series-id som kan vara "crazy-time:a")
 *  - apiSlug används för /players, och apiVariant="a" lägger till ?variant=a
 */
export const GAMES = CONTEXT_GAMES;

// DÖLJ dessa id i live-listan
const HIDE_IDS = new Set(["crazy-time:a"]);

// Delad färgpalett – (färgen för A finns kvar om du vill nyttja den i andra vyer)
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
  const [expanded, setExpanded] = useState(false);
  const {
    data: liveGames,
    loading: loadingPlayers,
    refresh: refreshPlayers,
    GAMES: playerGames,
    lastUpdated,
  } = usePlayersLive();

  const [countdownLabel, setCountdownLabel] = useState(null);

  useEffect(() => {
    if (!lastUpdated) {
      setCountdownLabel(null);
      return;
    }

    const updateCountdown = () => {
      const updatedTs = new Date(lastUpdated).getTime();
      if (!Number.isFinite(updatedTs)) {
        setCountdownLabel(null);
        return;
      }
      const remaining = PLAYERS_POLL_INTERVAL_MS - (Date.now() - updatedTs);
      if (remaining <= 0) {
        setCountdownLabel("00:00");
        return;
      }
      const totalSeconds = Math.ceil(remaining / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      setCountdownLabel(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
    };

    updateCountdown();
    const id = setInterval(updateCountdown, 1000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  // Filtrera bort dolda spel och sortera fallande (null sist)
  const rows = useMemo(() => {
    const games = (playerGames ?? GAMES).filter(g => !HIDE_IDS.has(g.id));
    const list = games.map((g) => {
      const entry = liveGames?.[g.id] || {};
      const players = typeof entry.players === "number" ? entry.players : null;
      return {
        ...g,
        players,
        updated: entry.updated ?? null,
        color: COLORS[g.id] || "#fff",
      };
    });
    list.sort((a, b) => {
      const av = a.players, bv = b.players;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return bv - av;
    });
    return list;
  }, [playerGames, liveGames]);

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
      {/* Rubrik centrerad */}
      <Box
        sx={{
          position:"relative",
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
          mb: 1
        }}
      >
        <Box sx={{ textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:0.25 }}>
          <Typography variant="h6" sx={{ color:"#fff", fontWeight:700, textAlign:"center" }}>
            {titleText}
          </Typography>
          <Typography variant="caption" sx={{ color:"#b0b0b0" }}>
            {countdownLabel === null
              ? 'Beräknar nästa uppdatering…'
              : countdownLabel === '00:00'
                ? 'Uppdaterar nu'
                : `Nästa uppdatering om ${countdownLabel}`}
          </Typography>
        </Box>
      </Box>

      {/* Laddare / fel */}
      {loadingPlayers && (
        <Box sx={{ display:"flex", justifyContent:"center", my:1 }}>
          <CircularProgress size={18} />
        </Box>
      )}

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

      {/* Summa (baserad på filtrerade rader) */}
      <Box
        sx={{
          mt:1.25, display:"flex", justifyContent:"space-between", alignItems:"center",
          background:"#242424", border:"1px solid #3a3a3a", borderRadius:"8px", px:2, py:1
        }}
      >
        <Typography sx={{ color:"#fff", fontWeight:700 }}>
          Summa ({rows.length} spel)
        </Typography>
        <Typography sx={{ color:"#fff", fontWeight:800 }}>
          {total.toLocaleString("sv-SE")}
        </Typography>
      </Box>
    </Box>
  );
}