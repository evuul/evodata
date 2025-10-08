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
        width: { xs: "100%", sm: "100%" },
        maxWidth: { xs: "1200px", lg: "1320px" },
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

      <Box
        sx={{
          mt: 2,
          p: { xs: 1.5, sm: 2 },
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          backgroundColor: "#252525",
          border: "1px solid #333",
          borderRadius: "10px",
        }}
      >
        <Box sx={{ maxWidth: { xs: "100%", sm: "60%" } }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#fff" }}>
            Stötta Evolution Tracker
          </Typography>
          <Typography variant="body2" sx={{ color: "#c2c2c2", mt: 0.5 }}>
            Hjälp mig täcka kostnaden på cirka 400 kr/mån för att hålla sidan och databasen igång när aktiviteten ökar.
          </Typography>
          <Typography variant="body2" sx={{ color: "#9e9e9e", mt: 0.5 }}>
            Varje valfri gåva gör att jag kan fortsätta samla in data och bygga nya funktioner.
          </Typography>
          <Typography variant="body2" sx={{ color: "#9e9e9e", mt: 0.5 }}>
            Varje bidrag hjälper! ❤️ Scanna QR-koden eller följ länken.
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1.5,
            minWidth: { xs: "100%", sm: "auto" },
          }}
        >
          <MLink
            href="https://buymeacoffee.com/evuul"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#1e1e1e",
              borderRadius: "8px",
              border: "1px solid #3a3a3a",
              boxShadow: "0 6px 12px rgba(0,0,0,0.35)",
              p: 1,
            }}
          >
            <Box
              component="img"
              src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=https%3A%2F%2Fbuymeacoffee.com%2Fevuul"
              alt="QR-kod till Buy Me a Coffee för Evolution Tracker"
              sx={{
                width: 160,
                height: 160,
                borderRadius: "4px",
                backgroundColor: "#fff",
              }}
            />
          </MLink>
          <Typography variant="caption" component="span" sx={{ color: "#b0b0b0" }}>
            <MLink
              href="https://buymeacoffee.com/evuul"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: "#d7a26b", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
            >
              https://buymeacoffee.com/evuul
            </MLink>
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
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
