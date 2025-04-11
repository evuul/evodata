// src/Components/KingsOfTheHillTeaser.jsx
'use client';
import React, { useState, useEffect, useRef } from "react"; // Importera useEffect och useRef
import { Box, Typography } from "@mui/material";
import { styled } from "@mui/system";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

// Hårdkodad mockup-data med fler spel
const mockGameShowsData = [
  {
    name: "Crazy Time",
    playerData: [
      { date: "2025-04-01", players: 16287 },
    ],
  },
  {
    name: "Monopoly Big Baller",
    playerData: [
      { date: "2025-04-01", players: 8076 },
    ],
  },
  {
    name: "Funky Time",
    playerData: [
      { date: "2025-04-01", players: 7244 },
    ],
  },
  {
    name: "Mega Wheel (prag)",
    playerData: [
      { date: "2025-04-01", players: 6931 },
    ],
  },
  {
    name: "Sweet Bonanza CandyLand (prag)",
    playerData: [
      { date: "2025-04-01", players: 4364 },
    ],
  },
  {
    name: "Crazy Time A",
    playerData: [
      { date: "2025-04-01", players: 4289 },
    ],
  },
  {
    name: "Lightning Storm",
    playerData: [
      { date: "2025-04-01", players: 3024 },
    ],
  },
  {
    name: "Adventures Beyond Wonderland (playtech)",
    playerData: [
      { date: "2025-04-01", players: 2462 },
    ],
  },
  {
    name: "Monopoly Live",
    playerData: [
      { date: "2025-04-01", players: 2350 },
    ],
  },
  {
    name: "Lightning Roulette",
    playerData: [
      { date: "2025-04-01", players: 2268 },
    ],
  },
];

// Styled-komponent för dropdown-boxen
const DropdownBox = styled(Box)(({ theme, isOpen }) => ({
  position: "relative",
  background: "linear-gradient(90deg, #1a1a1a, #2c2c2c, #1a1a1a)",
  borderRadius: isOpen ? "12px 12px 0 0" : "12px",
  padding: { xs: "10px 15px", sm: "12px 20px" },
  margin: { xs: "5px auto", sm: "10px auto" },
  width: { xs: "325px", sm: "400px" },
  maxWidth: "100%",
  boxShadow: "0 6px 20px rgba(0, 0, 0, 0.6)",
  cursor: "pointer",
  transition: "all 0.3s ease",
  backgroundSize: "200% 100%",
  animation: "gradientShift 4s ease-in-out infinite, pulse 2s ease-in-out infinite",
  border: "1px solid rgba(255, 215, 0, 0.2)",
  zIndex: 1000,
  "&:hover": {
    background: "linear-gradient(90deg, #2c2c2c, #3e3e3e, #2c2c2c)",
    boxShadow: "0 8px 25px rgba(0, 0, 0, 0.7)",
  },
  [theme.breakpoints.down("sm")]: {
    borderRadius: isOpen ? "8px 8px 0 0" : "8px",
  },
}));

// Styled-komponent för dropdown-innehållet
const DropdownContent = styled(Box)(({ theme, isOpen }) => ({
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  background: "linear-gradient(180deg, #2e2e2e, #1e1e1e)",
  borderRadius: "0 0 12px 12px",
  padding: isOpen ? { xs: "8px", sm: "10px" } : "0",
  maxHeight: isOpen ? "200px" : "0",
  opacity: isOpen ? 1 : 0,
  overflowY: "auto",
  transition: "max-height 0.4s ease, opacity 0.4s ease, padding 0.4s ease",
  boxShadow: "0 6px 20px rgba(0, 0, 0, 0.6)",
  border: "1px solid rgba(255, 215, 0, 0.2)",
  borderTop: "none",
  display: "flex",
  flexDirection: "column",
  zIndex: 1000,
  [theme.breakpoints.down("sm")]: {
    borderRadius: "0 0 8px 8px",
  },
  "&::-webkit-scrollbar": {
    width: "6px",
  },
  "&::-webkit-scrollbar-track": {
    background: "#1e1e1e",
    borderRadius: "10px",
  },
  "&::-webkit-scrollbar-thumb": {
    background: "rgba(255, 215, 0, 0.5)",
    borderRadius: "10px",
  },
  "&::-webkit-scrollbar-thumb:hover": {
    background: "rgba(255, 215, 0, 0.8)",
  },
}));

// Styled-komponent för varje listitem
const ListItem = styled(Box)(({ rank }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "4px 0",
  width: "90%",
  margin: "0 auto",
  borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
  "&:last-child": {
    borderBottom: "none",
  },
  transition: "background 0.3s ease, transform 0.3s ease",
  "&:hover": {
    background:
      rank === 1
        ? "rgba(255, 215, 0, 0.25)"
        : rank === 2
        ? "rgba(192, 192, 192, 0.25)"
        : "rgba(205, 127, 50, 0.25)",
    transform: "scale(1.02)",
  },
}));

// Styled-komponent för medaljer
const Medal = styled("span")(({ rank }) => ({
  fontSize: { xs: "1rem", sm: "1.2rem" },
  marginRight: "8px",
  textShadow:
    rank === 1
      ? "0 0 10px rgba(255, 215, 0, 0.9)"
      : rank === 2
      ? "0 0 10px rgba(192, 192, 192, 0.9)"
      : "0 0 10px rgba(205, 127, 50, 0.9)",
}));

const KingsOfTheHillTeaser = ({ gameShowsData = mockGameShowsData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null); // Skapa en ref för dropdownen

  // Funktion för att toggla dropdownen
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Funktion för att stänga dropdownen vid klick utanför
  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsOpen(false);
    }
  };

  // Sätt upp och ta bort event-lyssnare för klick utanför
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    // Rensa upp event-lyssnaren när komponenten avmonteras
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]); // Körs när isOpen ändras

  // Beräkna genomsnittligt antal spelare för varje game show
  const gameShowsWithAverages = gameShowsData.map(game => {
    const playerData = game.playerData || [];
    const totalPlayers = playerData.reduce((sum, data) => sum + (data.players || 0), 0);
    const averagePlayers = playerData.length > 0 ? Math.round(totalPlayers / playerData.length) : 0;
    return {
      name: game.name,
      averagePlayers,
    };
  });

  // Sortera och välj topp 10 baserat på genomsnittliga spelare
  const top10 = gameShowsWithAverages
    .sort((a, b) => b.averagePlayers - a.averagePlayers)
    .slice(0, 10)
    .map((game, index) => ({
      name: game.name,
      averagePlayers: game.averagePlayers,
      rank: index + 1,
    }));

  // Funktion för att lägga till (evo) om leverantör saknas
  const getDisplayName = (name) => {
    if (name.includes("(prag)") || name.includes("(playtech)")) {
      return name;
    }
    return `${name} (evo)`;
  };

  return (
    <Box sx={{ position: "relative", zIndex: 1000 }} ref={dropdownRef}> {/* Lägg till ref på Box */}
      <DropdownBox isOpen={isOpen} onClick={toggleDropdown}>
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography
              sx={{
                color: "#fff",
                fontSize: { xs: "0.9rem", sm: "1rem" },
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              LIVESPEL TOPPLISTA
            </Typography>
            <span style={{ marginLeft: "6px", fontSize: "1.2rem" }}>👑</span>
          </Box>
          <Box sx={{ position: "absolute", right: "15px" }}>
            {isOpen ? (
              <ExpandLessIcon sx={{ color: "#fff", fontSize: "1.2rem" }} />
            ) : (
              <ExpandMoreIcon sx={{ color: "#fff", fontSize: "1.2rem" }} />
            )}
          </Box>
        </Box>
      </DropdownBox>
      <DropdownContent isOpen={isOpen}>
        {top10.map((game, index) => (
          <ListItem key={game.name} rank={game.rank}>
            <Medal rank={game.rank}>
              {index === 0 && "🥇"}
              {index === 1 && "🥈"}
              {index === 2 && "🥉"}
              {index >= 3 && <span style={{ marginRight: "8px", fontSize: "0.9rem" }}>{index + 1}.</span>}
            </Medal>
            <Typography
              sx={{
                color: "#fff",
                fontSize: { xs: "0.75rem", sm: "0.85rem" },
                fontWeight: "medium",
                textAlign: "center",
              }}
            >
              {getDisplayName(game.name)} (Snitt: {game.averagePlayers.toLocaleString("sv-SE")} spelare)
            </Typography>
          </ListItem>
        ))}
      </DropdownContent>
    </Box>
  );
};

// Keyframes för gradient-animation
const gradientShiftKeyframes = `
  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
`;

// Keyframes för pulse-animation
const pulseKeyframes = `
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.02); }
    100% { transform: scale(1); }
  }
`;

// Lägg till keyframes i dokumentet
const styleSheet = document.createElement("style");
styleSheet.innerText = gradientShiftKeyframes + pulseKeyframes;
document.head.appendChild(styleSheet);

export default KingsOfTheHillTeaser;