'use client';
import React from "react";
import { Box, Typography, Card } from "@mui/material";
import { motion } from "framer-motion";

const LiveEarningsBox = ({ playerCount }) => {
  // Beräkna inkomsten i minuten
  const revenuePerPlayerPerSecond = 0.00742; // Från tidigare beräkning (baserat på intäkter)
  const revenuePerPlayerPerMinute = revenuePerPlayerPerSecond * 60; // 0.4452 SEK/minut per spelare
  const totalRevenuePerMinute = playerCount * revenuePerPlayerPerMinute;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card
        sx={{
          background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
          padding: { xs: "12px", sm: "16px" },
          margin: "16px auto",
          width: "100%",
          maxWidth: "1200px",
          textAlign: "center",
          minHeight: "200px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: "#00e676",
            marginBottom: "12px",
            fontSize: { xs: "1.2rem", sm: "1.5rem", md: "1.8rem" },
            letterSpacing: "0.5px",
          }}
        >
          Live-inkomst just nu (Beta)
        </Typography>

        {playerCount === null || playerCount === undefined ? (
          <Typography
            variant="body2"
            sx={{
              color: "#b0b0b0",
              fontSize: { xs: "0.9rem", sm: "1rem" },
              opacity: 0.9,
            }}
          >
            Kunde inte hämta spelar-data.
          </Typography>
        ) : (
          <Box>
            <Typography
              variant="h6"
              sx={{
                color: "#ffffff",
                fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" },
                marginBottom: "8px",
                fontWeight: 600,
              }}
            >
              Antal spelare just nu:{" "}
              <span style={{ color: "#00e676", fontWeight: 700 }}>
                {playerCount.toLocaleString("sv-SE")}
              </span>
            </Typography>
            <Typography
              variant="h5"
              sx={{
                color: "#ffffff",
                fontSize: { xs: "1.2rem", sm: "1.5rem", md: "2rem" },
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(0, 230, 118, 0.1)",
                display: "inline-block",
                fontWeight: 600,
              }}
            >
              Evolution genererar just nu{" "}
              <span style={{ color: "#00e676", fontWeight: 700 }}>
                {Math.round(totalRevenuePerMinute).toLocaleString("sv-SE")} SEK
              </span>{" "}
              per minut från livespel.
            </Typography>
            {/* Disclaimer */}
            <Typography
              variant="body2"
              sx={{
                color: "#b0b0b0",
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
                marginTop: "12px",
                opacity: 0.9,
                fontStyle: "italic",
              }}
            >
              *Beta-version. Uppskattning baserad på genomsnittliga intäkter, verklig inkomst kan variera.
            </Typography>
          </Box>
        )}
      </Card>
    </motion.div>
  );
};

export default LiveEarningsBox;
