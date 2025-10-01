"use client";
import React, { useState } from "react";
import { Card, CardContent, Tabs, Tab } from "@mui/material";
import GamePlayersLiveList from "./GamePlayersLiveList";
import GamePlayersTrendChart from "./GamePlayersTrendChart";
import RankingTab from "./RankingTab"; // <- vår frameless ranking

export default function GamePlayersBox() {
  const [tab, setTab] = useState(0);
  const [days, setDays] = useState(30); // dela dagar mellan Trend/Ranking

  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        color: "#fff",
        width: "100%",
        maxWidth: "1200px",
        m: "16px auto",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <CardContent sx={{ p: 0 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          textColor="inherit"
          TabIndicatorProps={{ style: { backgroundColor: "#fff" } }}
          sx={{
            px: 1,
            "& .MuiTabs-flexContainer": { justifyContent: "center" },
            "& .MuiTab-root": { color: "#b0b0b0", textTransform: "none" },
            "& .Mui-selected": { color: "#fff" },
          }}
        >
          <Tab label="Live" />
          <Tab label="Trend" />
          <Tab label="Ranking" />
        </Tabs>

        {tab === 0 && <GamePlayersLiveList />}

        {tab === 1 && (
          <GamePlayersTrendChart
            // frameless – bara Box med p:2 i komponenten
            days={days}
            onChangeDays={setDays}
          />
        )}

        {tab === 2 && (
          <RankingTab
            // frameless – bara Box med p:2 i komponenten
            days={days}
            onChangeDays={setDays}
          />
        )}
      </CardContent>
    </Card>
  );
}
