'use client';
import React from "react";
import { Box, Typography, Card } from "@mui/material";
import { motion } from "framer-motion";

const LiveEarningsBox = ({ playerCount }) => {
  // Beräkna inkomsten i minuten
  const revenuePerPlayerPerSecond = 0.00742; // Från tidigare beräkning (baserat på intäkter, inte vinst)
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
          borderRadius: "20px",
          boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
          padding: { xs: "15px", sm: "25px" },
          margin: "20px auto",
          width: { xs: "95%", sm: "80%", md: "70%" },
          textAlign: "center",
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            color: "#00e676",
            marginBottom: "20px",
            fontSize: { xs: "1.5rem", sm: "2rem" },
          }}
        >
          Live-inkomst just nu (Beta)
        </Typography>

        {playerCount === null || playerCount === undefined ? (
          <Typography
            variant="body1"
            sx={{
              color: "#ccc",
              fontSize: { xs: "1rem", sm: "1.2rem" },
            }}
          >
            Kunde inte hämta spelar-data.
          </Typography>
        ) : (
          <Box>
            <Typography
              variant="h5"
              sx={{
                color: "#fff",
                fontSize: { xs: "1.2rem", sm: "1.5rem" },
                marginBottom: "10px",
              }}
            >
              Antal spelare just nu:{" "}
              <span style={{ color: "#00e676", fontWeight: "bold" }}>
                {playerCount.toLocaleString("sv-SE")}
              </span>
            </Typography>
            <Typography
              variant="h5"
              sx={{
                color: "#fff",
                fontSize: { xs: "1.2rem", sm: "1.5rem" },
                background: "rgba(0, 230, 118, 0.1)",
                padding: "10px 20px",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                display: "inline-block",
              }}
            >
              Evolution genererar just nu{" "}
              <span style={{ color: "#00e676", fontWeight: "bold" }}>
                {Math.round(totalRevenuePerMinute).toLocaleString("sv-SE")} SEK
              </span>{" "}
              per minut från livespel.
            </Typography>
            {/* Disclaimer */}
            <Typography
              variant="body2"
              sx={{
                color: "#ccc",
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
                marginTop: "15px",
                opacity: 0.8,
                fontStyle: "italic",
              }}
            >
              *Detta är en beta-version. Uppskattningen baseras på genomsnittliga intäkter och kan vara missvisande. Verklig inkomst kan variera.
            </Typography>
          </Box>
        )}
      </Card>
    </motion.div>
  );
};

export default LiveEarningsBox;