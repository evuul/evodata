import React from "react";
import { Typography } from "@mui/material";

const Header = () => {
  return (
    <div style={{ textAlign: "center", marginTop: "10px" }}>
      <Typography
        variant="h2"
        sx={{
          fontWeight: "bold",
          color: "#ffffff",
          fontSize: {
            xs: "1.5rem", // För små skärmar (mobil)
            sm: "2rem",   // För medelstora skärmar (t.ex. tablet)
            md: "3rem",   // För större skärmar (desktop)
          },
          textShadow: "0 0 10px rgba(0, 0, 0, 0.5)",
          marginBottom: "30px",
        }}
      >
        Välkommen till Evolution Tracker!
      </Typography>
    </div>
  );
};

export default Header;