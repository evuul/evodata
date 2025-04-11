// src/Components/KingsOfTheHillFull.jsx
'use client';
import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { styled } from "@mui/system";
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const KingsOfTheHillFull = ({ gameShowsData = [] }) => {
  const [showFullList, setShowFullList] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const today = "2025-04-10";

  const sortedGameShows = useMemo(() => {
    return gameShowsData
      .map(game => {
        const todayData = game.playerData.find(data => data.date === today);
        return {
          name: game.name,
          players: todayData ? todayData.players : 0,
        };
      })
      .sort((a, b) => b.players - a.players);
  }, [gameShowsData]);

  const top3 = [
    { name: "Crazy Time", rank: 1 },
    { name: "Monopoly Big Baller", rank: 2 },
    { name: "Funky Time", rank: 3 },
  ].map(game => ({
    ...game,
    players: sortedGameShows.find(g => g.name === game.name)?.players || 0,
  }));

  if (isMobile) return null; // Visa bara på desktop

  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "20px",
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
        padding: { xs: "10px", sm: "15px" },
        margin: { xs: "10px auto", sm: "20px auto" },
        width: { xs: "95%", sm: "80%", md: "60%" },
        minHeight: { xs: "auto", sm: "auto" },
      }}
    >
      <Typography
        variant="h4"
        sx={{
          fontWeight: "bold",
          color: "#FFD700",
          marginBottom: { xs: "10px", sm: "20px" },
          textAlign: "center",
          fontSize: { xs: "1.2rem", sm: "1.5rem", md: "2rem" },
          textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
        }}
      >
        Kings of the Hill 👑
      </Typography>

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          gap: "10px",
          marginBottom: { xs: "10px", sm: "20px" },
          flexDirection: "row",
        }}
      >
        {top3.map((game, index) => (
          <PodiumBox key={game.name} rank={game.rank}>
            {game.rank === 1 && (
              <EmojiEventsIcon
                sx={{
                  fontSize: "3rem",
                  color: "#FFD700",
                  position: "absolute",
                  top: "-30px",
                }}
              />
            )}
            <Typography
              variant="h6"
              sx={{
                color: game.rank === 1 ? "#1e1e1e" : "#fff",
                fontWeight: "bold",
                fontSize: { sm: "0.9rem", md: "1.1rem" },
              }}
            >
              {game.name}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: game.rank === 1 ? "#1e1e1e" : "#ccc",
                fontSize: { sm: "0.8rem", md: "1rem" },
              }}
            >
              {game.players.toLocaleString("sv-SE")} spelare
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: game.rank === 1 ? "#1e1e1e" : "#ccc",
                fontSize: { sm: "0.7rem", md: "0.9rem" },
                position: "absolute",
                bottom: "3px",
              }}
            >
              #{game.rank}
            </Typography>
          </PodiumBox>
        ))}
      </Box>

      <Box sx={{ textAlign: "center", marginBottom: { xs: "10px", sm: "20px" } }}>
        <Button
          onClick={() => setShowFullList(!showFullList)}
          variant="contained"
          sx={{
            backgroundColor: "#00e676",
            color: "#1e1e1e",
            fontWeight: "bold",
            borderRadius: "20px",
            padding: { sm: "8px 20px" },
            fontSize: { sm: "0.9rem" },
            "&:hover": {
              backgroundColor: "#00c853",
            },
          }}
          endIcon={
            showFullList ? (
              <ExpandLessIcon sx={{ fontSize: { sm: "1.2rem" } }} />
            ) : (
              <ExpandMoreIcon sx={{ fontSize: { sm: "1.2rem" } }} />
            )
          }
        >
          {showFullList ? "Dölj lista" : "Se topp 10"}
        </Button>
      </Box>

      {showFullList && (
        <Box sx={{ overflowX: "auto", width: "100%" }}>
          <Box
            sx={{
              backgroundColor: "#2e2e2e",
              borderRadius: "8px",
              padding: { sm: "10px" },
            }}
          >
            {sortedGameShows.map((game, index) => (
              <Box
                key={game.name}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: { sm: "10px" },
                  borderBottom: index < sortedGameShows.length - 1 ? "1px solid #444" : "none",
                }}
              >
                <Typography
                  sx={{
                    color: "#fff",
                    fontSize: { sm: "0.9rem", md: "1rem" },
                    fontWeight: index < 3 ? "bold" : "normal",
                  }}
                >
                  #{index + 1} {game.name}
                </Typography>
                <Typography
                  sx={{
                    color: "#ccc",
                    fontSize: { sm: "0.9rem", md: "1rem" },
                  }}
                >
                  {game.players.toLocaleString("sv-SE")} spelare
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <Typography
        variant="body2"
        color="#ccc"
        sx={{
          textAlign: "center",
          marginTop: { sm: "20px" },
          fontSize: { sm: "0.8rem", md: "0.9rem" },
        }}
      >
        Senast uppdaterad: {new Date(today).toLocaleDateString("sv-SE")}
      </Typography>
    </Card>
  );
};

const PodiumBox = styled(Box)(({ theme, rank }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-end",
  height: rank === 1 ? "200px" : rank === 2 ? "160px" : "120px",
  width: "100%",
  backgroundColor: rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : "#CD7F32",
  borderRadius: "8px 8px 0 0",
  padding: theme.spacing(1),
  position: "relative",
  transition: "all 0.3s ease",
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(0.5),
  },
}));

export default KingsOfTheHillFull;