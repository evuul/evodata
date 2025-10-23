"use client";
import React, { useMemo, useState } from "react";
import { Box, Card, CardContent, Tabs, Tab, Select, MenuItem, useMediaQuery, useTheme } from "@mui/material";
import GamePlayersLiveList from "./GamePlayersLiveList";
import GamePlayersTrendChart from "./GamePlayersTrendChart";
import RankingTab from "./RankingTab"; // <- vår frameless ranking
import LobbyOverviewTab from "./LobbyOverviewTab";
import GamePlayersAthList from "./GamePlayersAthList";

export default function GamePlayersBox() {
  const [tab, setTab] = useState(0);
  const [days, setDays] = useState(30); // dela dagar mellan Trend/Ranking
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const tabs = useMemo(
    () => [
      { value: 0, label: "Live" },
      { value: 1, label: "Trend" },
      { value: 2, label: "Ranking" },
      { value: 3, label: "Lobby" },
      { value: 4, label: "ATH" },
    ],
    []
  );

  const renderContent = () => {
    switch (tab) {
      case 0:
        return <GamePlayersLiveList />;
      case 1:
        return (
          <GamePlayersTrendChart
            // frameless – bara Box med p:2 i komponenten
            days={days}
            onChangeDays={setDays}
          />
        );
      case 2:
        return (
          <RankingTab
            // frameless – bara Box med p:2 i komponenten
            days={days}
            onChangeDays={setDays}
          />
        );
      case 3:
        return <LobbyOverviewTab />;
      case 4:
        return <GamePlayersAthList />;
      default:
        return null;
    }
  };

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
        {isMobile ? (
          <Box sx={{ px: 1.5, pt: 1.5, pb: 0.5 }}>
            <Select
              fullWidth
              size="small"
              value={tab}
              onChange={(event) => setTab(Number(event.target.value))}
              sx={{
                color: "#fff",
                ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.2)" },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.35)" },
                "& .MuiSelect-icon": { color: "#fff" },
              }}
            >
              {tabs.map(({ value, label }) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </Box>
        ) : (
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            textColor="inherit"
            TabIndicatorProps={{ style: { backgroundColor: "#fff" } }}
            sx={{
              px: 1,
              "& .MuiTabs-flexContainer": { justifyContent: "center" },
              "& .MuiTab-root": {
                color: "#b0b0b0",
                textTransform: "none",
                minWidth: 120,
              },
              "& .Mui-selected": { color: "#fff" },
            }}
          >
            {tabs.map(({ value, label }) => (
              <Tab key={value} label={label} value={value} />
            ))}
          </Tabs>
        )}

        {renderContent()}
      </CardContent>
    </Card>
  );
}
