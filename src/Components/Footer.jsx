"use client";

import React from "react";
import { Box, Card, Typography, Chip, Link as MLink } from "@mui/material";
import TwitterIcon from "@mui/icons-material/Twitter";

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <Card
      component="footer"
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        padding: { xs: "12px", sm: "16px" },
        width: { xs: "92%", sm: "85%", md: "75%" },
        margin: "16px auto",
        color: "#fff",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Evolution Tracker</Typography>
        <MLink
          href="https://x.com/Alexand93085679"
          target="_blank"
          rel="noopener noreferrer"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#00e676', textDecoration: 'none', '&:hover': { color: '#00c853' } }}
        >
          <TwitterIcon fontSize="small" />
          Följ mig på X
        </MLink>
      </Box>

      <Typography variant="body2" sx={{ color: "#b0b0b0", mt: 1, fontStyle: 'italic' }}>
        Hobbyprojekt av en student — byggt för att öva på kodning.
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
        <Chip label="Data: Yahoo Finance" size="small" sx={{ backgroundColor: '#2a2a2a', color: '#b0b0b0' }} />
        <Chip label="Ej finansiell rådgivning" size="small" sx={{ backgroundColor: '#402a2a', color: '#ff6f6f' }} />
      </Box>

      <Typography variant="caption" sx={{ color: "#808080", display: 'block', mt: 1 }}>
        © {year} • Kontakt: <MLink href="mailto:alexander.ek@live.se" underline="hover" sx={{ color: '#00e676' }}>Darkwing</MLink>
      </Typography>
    </Card>
  );
};

export default Footer;
