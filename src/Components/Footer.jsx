"use client";

import React from "react";
import Image from "next/image";
import { Box, Button, Card, Typography, Chip, Link as MLink } from "@mui/material";
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
          display: 'flex',
          flexWrap: 'wrap',
          gap: { xs: 2, sm: 3 },
          mt: 2,
          p: { xs: 2, sm: 3 },
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          background: 'rgba(26,26,26,0.65)',
        }}
      >
        <Box sx={{ flex: '1 1 220px', minWidth: 220, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Chip label="Stötta projektet" size="small" sx={{ backgroundColor: '#2a2a2a', color: '#e0e0e0', fontWeight: 600, alignSelf: 'flex-start' }} />
          <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600 }}>
            En kaffe håller Evolution Tracker vid liv ☕️
          </Typography>
          <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
            Det är bara jag som bygger sidan, som ett studentprojekt finansierat med egna sparpengar. Varje bidrag gör skillnad och hjälper till att täcka data, drift och vidare utveckling.
            Nuvarande driftkostnad är ungefär 350 kr per månad.
          </Typography>
          <Button
            component="a"
            href="https://buymeacoffee.com/evuul"
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            size="small"
            sx={{ alignSelf: 'flex-start', mt: 0.5 }}
          >
            Stötta via Buy Me a Coffee
          </Button>
        </Box>
        <Box sx={{ position: 'relative', width: 140, height: 140, flex: '0 0 auto', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Image
            src="/images/buy-me-a-coffee-evuul.png"
            alt="QR-kod för Buy Me a Coffee"
            fill
            sizes="140px"
            style={{ objectFit: 'cover' }}
            priority={false}
          />
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
