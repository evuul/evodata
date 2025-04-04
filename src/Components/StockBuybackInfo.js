'use client';
import React from "react";
import { Box, Typography, LinearProgress, Card } from "@mui/material";
import { keyframes } from "@emotion/react";

// Växelkurs (exempelvärde)
const exchangeRate = 10.83; // Exempel: 1 EUR = 10.83 SEK

// Animationer för glow-effekt
const pulseGreen = keyframes`
  0% { box-shadow: 0 0 6px rgba(0, 255, 0, 0.3); }
  50% { box-shadow: 0 0 14px rgba(0, 255, 0, 0.8); }
  100% { box-shadow: 0 0 6px rgba(0, 255, 0, 0.3); }
`;

const pulseRed = keyframes`
  0% { box-shadow: 0 0 6px rgba(255, 23, 68, 0.3); }
  50% { box-shadow: 0 0 14px rgba(255, 23, 68, 0.8); }
  100% { box-shadow: 0 0 6px rgba(255, 23, 68, 0.3); }
`;

const StockBuybackInfo = ({ isActive, buybackCash, sharesBought, averagePrice = 0 }) => {
  const buybackCashInSEK = buybackCash * exchangeRate;
  const totalBuybackValue = sharesBought * averagePrice;
  const remainingCash = buybackCashInSEK - totalBuybackValue;
  const buybackProgress = (totalBuybackValue / buybackCashInSEK) * 100;

  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "16px",
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)",
        padding: "20px",
        marginBottom: "20px",
        maxWidth: "600px",
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      <Box display="flex" flexDirection="column" alignItems="center">
        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            color: isActive ? "#00e676" : "#ff1744",
            marginBottom: "20px",
            textAlign: "center",
          }}
        >
          Status på återköp: {isActive ? "Aktivt" : "Inaktivt"}
        </Typography>

        {/* Progress Bar */}
        <Box sx={{ width: "100%", marginBottom: "20px", position: "relative" }}>
          <LinearProgress
            variant="determinate"
            value={buybackProgress}
            sx={{
              height: "15px",
              borderRadius: "10px",
              backgroundColor: "#f1f1f1",
              "& .MuiLinearProgress-bar": {
                backgroundColor: isActive ? "#00e676" : "#ff1744",
              },
            }}
          />
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "15px",
              width: `${buybackProgress}%`,
              borderRadius: "10px",
              animation: `${isActive ? pulseGreen : pulseRed} 2s infinite ease-in-out`,
              pointerEvents: "none",
            }}
          />
          <Typography variant="body2" color="#ccc" align="center" sx={{ marginTop: "5px", textAlign: "center" }}>
            {Math.floor(buybackProgress)}% av kassan har använts för återköp
          </Typography>
        </Box>

        {/* Detaljer om återköpen */}
        <Box display="flex" flexDirection="column" alignItems="center" mt={2}>
          <Typography variant="body1" color="#fff" sx={{ marginBottom: "5px", textAlign: "center" }}>
            Återköpta aktier: {sharesBought.toLocaleString()}
          </Typography>
          <Typography variant="body1" color="#fff" sx={{ marginBottom: "5px", textAlign: "center" }}>
            Snittkurs: {averagePrice ? averagePrice.toLocaleString() : "0"} SEK
          </Typography>
          <Typography variant="body1" color="#fff" sx={{ marginBottom: "5px", textAlign: "center" }}>
            Kassa för återköp (i SEK): {buybackCashInSEK.toLocaleString()} SEK
          </Typography>
          <Typography variant="body1" color="#fff" sx={{ marginBottom: "5px", textAlign: "center" }}>
            Kvar av kassan: {remainingCash.toLocaleString()} SEK
          </Typography>
        </Box>
      </Box>
    </Card>
  );
};

export default StockBuybackInfo;