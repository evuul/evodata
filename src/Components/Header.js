import React from "react";
import { Typography, Box } from "@mui/material";

const Header = () => {
  return (
    <Box
      sx={{
        textAlign: "center",
        marginTop: "20px",
        padding: "10px",
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)", // Gradient för bakgrund
        borderRadius: "10px",
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)", // Lägger till skugga för djup
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Typography
        variant="h2"
        sx={{
          fontWeight: "bold",
          fontSize: {
            xs: "2.5rem", // För små skärmar (mobil)
            sm: "3rem",   // För medelstora skärmar (t.ex. tablet)
            md: "4rem",   // För större skärmar (desktop)
          },
          color: "#fff", // Färgen på texten
          background: "linear-gradient(90deg,rgb(224, 234, 236),rgb(38, 154, 255))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textShadow: "0 0 10px rgba(206, 222, 222, 0.6)", // Ljus skugga för texten
          marginBottom: "0px",
        }}
      >
      Evolution Tracker!
      </Typography>
      <Typography
        variant="body1"
        sx={{
          color: "#ccc", // Färg på undertitel
          fontSize: "1.2rem",
          opacity: 0.8,
          letterSpacing: "0.5px",
        }}
      >
        {/* Här håller vi koll på utvecklingen och statistik för 2025! */}
      </Typography>
    </Box>
  );
};

export default Header;