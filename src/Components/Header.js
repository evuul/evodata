import React from "react";
import { Typography } from "@mui/material";

const Header = () => {
  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <Typography 
        variant="h2" 
        sx={{ 
          fontWeight: "bold", 
          color: "#ffffff", 
          fontSize: "3rem", 
          textShadow: "0 0 10px rgba(0, 0, 0, 0.5)",
          marginBottom: "30px"
        }}
      >
        Välkommen till Evolution Gaming!
      </Typography>
    </div>
  );
};

export default Header;