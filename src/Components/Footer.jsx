"use client";

import React from "react";
import { Box, Card, Typography, Chip, Link as MLink } from "@mui/material";
import TwitterIcon from "@mui/icons-material/Twitter";
import FeedbackBox from "./FeedbackBox";

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
        width: { xs: "92%", sm: "100%" },
        maxWidth: "1200px",
        margin: "16px auto",
        color: "#fff",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Evolution Tracker</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FeedbackBox />
          <MLink
            href="https://x.com/Alexand93085679"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: '#b0b0b0',
              textDecoration: 'none',
              backgroundColor: 'transparent',
              border: '1px solid #3a3a3a',
              borderRadius: '8px',
              px: 1.25,
              py: 0.5,
              '&:hover': { backgroundColor: '#232323', color: '#ffffff', borderColor: '#444' },
            }}
          >
            <TwitterIcon fontSize="small" />
            Följ mig på X
          </MLink>
        </Box>
      </Box>

      <Typography variant="body2" sx={{ color: "#b0b0b0", mt: 1, fontStyle: 'italic' }}>
        Hobbyprojekt av en student — byggt för att öva på kodning.
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
        <Chip label="Förslagslåda" size="small" sx={{ backgroundColor: '#2a2a2a', color: '#e0e0e0', fontWeight: 600 }} />
        <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
          Har du idéer eller saknar något? Klicka på "Tyck till" här ovan.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
        <Chip label="Data: Yahoo Finance" size="small" sx={{ backgroundColor: '#2a2a2a', color: '#b0b0b0' }} />
        <Chip label="Ej finansiell rådgivning" size="small" sx={{ backgroundColor: '#402a2a', color: '#ff6f6f' }} />
      </Box>

      <Typography variant="caption" sx={{ color: "#808080", display: 'block', mt: 1, textAlign: 'center' }}>
        © {year} • <span style={{ color: '#7E57C2', fontWeight: 600 }}>Darkwing</span>
      </Typography>
    </Card>
  );
};

export default Footer;
