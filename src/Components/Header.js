import React from "react";
import { Typography, Box } from "@mui/material";

const Header = () => {
  return (
    <Box
      sx={{
        textAlign: "center",
        marginTop: "20px",
        padding: "20px", // Ökat padding för mer utrymme
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)", // Samma gradient som GraphBox
        borderRadius: "20px", // Rundare hörn för att matcha GraphBox
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)", // Samma skugga som GraphBox
        border: "1px solid rgba(255, 255, 255, 0.1)", // Subtil kantlinje
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: { xs: "90%", sm: "80%", md: "70%" }, // Samma bredd som GraphBox
        margin: "20px auto", // Centrera och ge marginal
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
          color: "#00e676", // Matchar den gröna färgen från GraphBox
          marginBottom: "10px", // Lite mer utrymme under rubriken
        }}
      >
        Evolution Tracker!
      </Typography>
      <Typography
        variant="body1"
        sx={{
          color: "#ccc", // Samma grå färg som i GraphBox
          fontSize: "1.2rem",
          opacity: 0.8,
          letterSpacing: "1px", // Ökat för bättre läsbarhet
          marginBottom: "10px", // Mer utrymme under undertiteln
        }}
      >
        Här håller vi koll på utvecklingen och statistik för 2025!
      </Typography>
    </Box>
  );
};

export default Header;