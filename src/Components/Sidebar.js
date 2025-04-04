"use client"; // Lägg till för att använda hooks på klientsidan
import React, { useState } from "react";
import { Box, Typography, List, ListItem, IconButton, Drawer } from "@mui/material";
import { FiBarChart, FiHome, FiSettings, FiTrendingUp, FiMenu } from "react-icons/fi"; // Ikoner för hamburgermeny

const Sidebar = () => {
  const [open, setOpen] = useState(false); // State för att hantera öppning/stängning av sidopanelen på mobil

  // Funktion för att toggla sidopanelen
  const toggleSidebar = () => {
    setOpen(!open);
  };

  return (
    <>
      {/* Hamburgermenyknapp på mobil */}
      <Box sx={{ display: { xs: "block", md: "none" }, position: "absolute", top: "10px", left: "10px", zIndex: 1100 }}>
        <IconButton onClick={toggleSidebar} color="primary">
          <FiMenu size={30} />
        </IconButton>
      </Box>

      {/* Sidopanelen på mobil med Drawer (hamburgermeny) */}
      <Drawer
        anchor="left"
        open={open}
        onClose={toggleSidebar}
        sx={{
          "& .MuiDrawer-paper": {
            background: "linear-gradient(180deg, rgba(25, 10, 73, 0.6), #1f1f1f)",
            width: { xs: "200px", sm: "250px" }, // Anpassa bredden beroende på skärmstorlek
            height: "100vh", // Full höjd på mobil
            padding: "20px",
            boxShadow: "4px 0 15px rgba(0, 0, 0, 0.1)", 
            borderTopRightRadius: "10px", // Rundade hörn
            borderBottomRightRadius: "10px",
          },
        }}
      >
        <Typography
          variant="h5"
          sx={{
            marginBottom: "30px",
            fontWeight: "bold",
            textTransform: "uppercase", // Gör rubriken mer stilren
            letterSpacing: "1px",
            textAlign: "center",
            fontSize: "1.8rem",
          }}
        >
          Evolution Tracker
        </Typography>

        {/* Lista med knappar */}
        <List>
          <ListItem button sx={{ display: "flex", alignItems: "center", padding: "15px 10px", "&:hover": { backgroundColor: "#3b1f8b" } }}>
            <FiHome size={20} style={{ marginRight: "10px" }} />
            Dashboard
          </ListItem>
          <ListItem button sx={{ display: "flex", alignItems: "center", padding: "15px 10px", "&:hover": { backgroundColor: "#3b1f8b" } }}>
            <FiBarChart size={20} style={{ marginRight: "10px" }} />
            Grafer
          </ListItem>
          <ListItem button sx={{ display: "flex", alignItems: "center", padding: "15px 10px", "&:hover": { backgroundColor: "#3b1f8b" } }}>
            <FiTrendingUp size={20} style={{ marginRight: "10px" }} />
            Statistik
          </ListItem>
          <ListItem button sx={{ display: "flex", alignItems: "center", padding: "15px 10px", "&:hover": { backgroundColor: "#3b1f8b" } }}>
            <FiSettings size={20} style={{ marginRight: "10px" }} />
            Inställningar
          </ListItem>
        </List>
      </Drawer>

      {/* Sidopanelen syns på desktop */}
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          width: { xs: "0", sm: "180px" }, // Döljer sidopanelen på mobil
          background: "linear-gradient(180deg, rgba(25, 10, 73, 0.6), #1f1f1f)",
          color: "#fff",
          padding: "20px",
          zIndex: 1000,
          borderTopRightRadius: "10px",
          borderBottomRightRadius: "10px",
          boxShadow: "4px 0 15px rgba(0, 0, 0, 0.1)",
          display: { xs: "none", sm: "block" }, // Döljer på mobil
        }}
      >
        <Typography
          variant="h5"
          sx={{
            marginBottom: "30px",
            fontWeight: "bold",
            textTransform: "uppercase",
            letterSpacing: "1px",
            textAlign: "center",
            fontSize: "1.8rem",
          }}
        >
          Evolution Tracker
        </Typography>

        {/* Lista med knappar */}
        <List>
          <ListItem button sx={{ display: "flex", alignItems: "center", padding: "15px 10px", "&:hover": { backgroundColor: "#3b1f8b" } }}>
            <FiHome size={20} style={{ marginRight: "10px" }} />
            Dashboard
          </ListItem>
          <ListItem button sx={{ display: "flex", alignItems: "center", padding: "15px 10px", "&:hover": { backgroundColor: "#3b1f8b" } }}>
            <FiBarChart size={20} style={{ marginRight: "10px" }} />
            Grafer
          </ListItem>
          <ListItem button sx={{ display: "flex", alignItems: "center", padding: "15px 10px", "&:hover": { backgroundColor: "#3b1f8b" } }}>
            <FiTrendingUp size={20} style={{ marginRight: "10px" }} />
            Statistik
          </ListItem>
          <ListItem button sx={{ display: "flex", alignItems: "center", padding: "15px 10px", "&:hover": { backgroundColor: "#3b1f8b" } }}>
            <FiSettings size={20} style={{ marginRight: "10px" }} />
            Inställningar
          </ListItem>
        </List>
      </Box>
    </>
  );
};

export default Sidebar;