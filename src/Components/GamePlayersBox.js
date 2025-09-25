"use client";
import React, { useState } from "react";
import { Card, CardContent, Tabs, Tab } from "@mui/material";
import GamePlayersLiveList from "./GamePlayersLiveList";
import GamePlayersTrendChart from "./GamePlayersTrendChart";

export default function GamePlayersBox() {
  const [tab, setTab] = useState(0);

  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        color: "#fff",
        width: { xs: "95%", sm: "85%", md: "75%" },
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
            "& .MuiTabs-flexContainer": { justifyContent: "center" }, // ✅ centrera tabbar
            "& .MuiTab-root": { color: "#b0b0b0" },
            "& .Mui-selected": { color: "#fff" },
          }}
        >
          <Tab label="Live" />
          <Tab label="Trend" />
        </Tabs>

        {tab === 0 ? <GamePlayersLiveList /> : <GamePlayersTrendChart />}
      </CardContent>
    </Card>
  );
}