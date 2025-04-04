import React from "react";
import { Box, Typography } from "@mui/material";

const DashboardBox = ({ title, children }) => {
  return (
    <Box
      sx={{
        background: "linear-gradient(145deg, #1e293b, #334155)",
        padding: "20px",
        borderRadius: "12px",
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        color: "#ffffff",
        minHeight: "150px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {title && (
        <Typography
          variant="h6"
          sx={{
            fontWeight: "bold",
            marginBottom: "10px",
            color: "#00e5ff",
          }}
        >
          {title}
        </Typography>
      )}
      {children}
    </Box>
  );
};

export default DashboardBox;