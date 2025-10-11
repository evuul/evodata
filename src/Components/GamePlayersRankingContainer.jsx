"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Card, CardContent, Box, Tabs, Tab, Select, MenuItem, Typography, CircularProgress
} from "@mui/material";
import RankingTab from "./RankingTab";
import { GAMES as BASE_GAMES, COLORS } from "./GamePlayersLiveList"; // återanvänd färger & grundlista

const GAMES = BASE_GAMES || [];

const DAY_OPTIONS = [7, 14, 30, 60, 90, 180, 365];

export default function GamePlayersRankingContainer() {
  // Sub-tabs i ranking
  const [rankMode, setRankMode] = useState("total"); // "total" | "pergame"
  const [days, setDays] = useState(30);
  const [selectedGame, setSelectedGame] = useState(GAMES[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [multi, setMulti] = useState({});   // {id:{daily:[{date,avg}], error?}}
  const [errors, setErrors] = useState({}); // {id:"error"}

  // Hämta dagliga snittserier för alla ranking-spel (exkl. A-varianten)
  async function fetchAllSeries(nDays) {
    setLoading(true);
    const out = {};
    const errs = {};
    await Promise.all(
      GAMES.map(async (g) => {
        try {
          const id = encodeURIComponent(g.id);
          const res = await fetch(`/api/casinoscores/series/${id}?days=${nDays}`, { cache: "no-store" });
          const j = await res.json();
          if (j?.ok) {
            const latestVal = Number(j.latest);
            out[g.id] = {
              daily: j.daily || [],
              latest: Number.isFinite(latestVal) ? latestVal : null,
              latestTs: j.latestTs || null,
            };
          }
          else {
            out[g.id] = { daily: [], error: j?.error || `HTTP ${res.status}` };
            errs[g.id] = j?.error || `HTTP ${res.status}`;
          }
        } catch (e) {
          out[g.id] = { daily: [], error: e.message };
          errs[g.id] = e.message;
        }
      })
    );
    setMulti(out);
    setErrors(errs);
    setLoading(false);
  }

  useEffect(() => { fetchAllSeries(days); }, [days]);

  // Säkerställ att valt spel finns kvar om listan ändras
  useEffect(() => {
    if (!selectedGame && GAMES.length) setSelectedGame(GAMES[0].id);
    if (selectedGame && !GAMES.find(g => g.id === selectedGame)) {
      setSelectedGame(GAMES[0]?.id || "");
    }
  }, [selectedGame]);

  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        color: "#fff",
        width: "100%",
        m: "16px auto",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <CardContent sx={{ p: 2 }}>
        {/* Header-rad: vänster sub-tabs (Ranking), center (spel-dropdown när per game), höger (dagar-dropdown) */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: 1,
            mb: 1.5,
          }}
        >
          {/* Vänster: sub-tabs */}
          <Box sx={{ justifySelf: "start" }}>
            <Tabs
              value={rankMode === "total" ? 0 : 1}
              onChange={(_, v) => setRankMode(v === 0 ? "total" : "pergame")}
              textColor="inherit"
              TabIndicatorProps={{ style: { backgroundColor: "#fff" } }}
              sx={{
                "& .MuiTab-root": { color: "#b0b0b0", minHeight: 36, px: 1.5 },
                "& .Mui-selected": { color: "#fff" },
              }}
            >
              <Tab label="Ranking" />
              <Tab label="Per spel" />
            </Tabs>
          </Box>

          {/* Center: spel-dropdown visas bara i Per spel-läget */}
          <Box sx={{ justifySelf: "center" }}>
            {rankMode === "pergame" && (
              <Select
                size="small"
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                displayEmpty
                sx={{
                  minWidth: 220,
                  color: "#fff",
                  ".MuiOutlinedInput-notchedOutline": { borderColor: "#3a3a3a" },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#5a5a5a" },
                }}
              >
                {GAMES.map((g) => (
                  <MenuItem key={g.id} value={g.id}>
                    {g.label}
                  </MenuItem>
                ))}
              </Select>
            )}
          </Box>

          {/* Höger: dagar-dropdown (”30 dagar”-dropdownen) */}
          <Box sx={{ justifySelf: "end" }}>
            <Select
              size="small"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              sx={{
                color: "#fff",
                ".MuiOutlinedInput-notchedOutline": { borderColor: "#3a3a3a" },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#5a5a5a" },
                minWidth: 130,
              }}
            >
              {DAY_OPTIONS.map((n) => (
                <MenuItem key={n} value={n}>{n} dagar</MenuItem>
              ))}
            </Select>
          </Box>
        </Box>

        {/* Kropp: rankinginnehåll */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <RankingTab
            mode={rankMode}                 // "total" | "pergame"
            games={GAMES}
            colors={COLORS}
            multi={multi}
            selectedGame={selectedGame}
          />
        )}

        {/* Ev. felinfo för felsökning (dold om inga fel) */}
        {!!Object.keys(errors).length && (
          <Typography variant="caption" sx={{ color: "#ffbaba", mt: 1, display: "block" }}>
            Några serier kunde inte hämtas: {Object.keys(errors).length}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
