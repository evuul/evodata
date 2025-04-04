"use client";

import React from "react";
import Sidebar from "./components/Sidebar"; // Se till att du har en Sidebar-komponent
import { Box } from "@mui/material";

const Layout = ({ children }) => {
  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      {/* Sidebar */}
      <Box sx={{ width: "250px", backgroundColor: "#222", p: 2 }}>
        <Sidebar />
      </Box>

      {/* Huvudinnehåll */}
      <Box sx={{ flexGrow: 1, p: 3, overflowY: "auto" }}>
        {children}
      </Box>
    </Box>
  );
};

export default Layout;