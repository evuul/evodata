"use client";

import React, { useState } from "react";
import { Typography, Box } from "@mui/material";
import { motion } from "framer-motion";

const updates = [
  { text: "Interaktiva grafer och statistik", done: false },
  { text: "Finansiella insikter & aktieanalys", done: false },
  { text: "Återköpsprogram & utdelningshistorik", done: false },
  { text: "Geografisk karta över intäkter", done: false },
  { text: "Speltrender & framtidsprognoser", done: false },
];

const ComingUpdates = () => {
  const [updateList] = useState(updates);

  return (
    <Box display="flex" flexDirection="column" alignItems="center" marginTop="50px">
      {/* Rubrik */}
      <Typography
        variant="h4"
        sx={{
          fontWeight: "bold",
          fontSize: { xs: "1.8rem", sm: "2.5rem", md: "3rem" },
          background: "linear-gradient(90deg, #ff00ff, #8800ff, #00e5ff)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textShadow: "0 0 15px rgba(255, 0, 255, 0.6)", 
          textAlign: "center",
        }}
      >
        Fler uppdateringar på väg! 🚀
      </Typography>

      {/* Lista */}
      <Box component="ul" sx={{ listStyle: "none", padding: 0, marginTop: "30px" }}>
        {updateList.map((item, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }} // Snabbare fade-in
            whileHover={{ scale: 1.05, transition: { duration: 0.15 } }} // Snabbare hover-effekt
            style={{
              fontSize: "1.4rem",
              fontWeight: "bold",
              marginBottom: "12px",
              background: "linear-gradient(90deg, #b300ff, #7700ff, #0099ff)", 
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "0 0 1px rgba(180, 0, 255, 0.5)", 
              textDecoration: item.done ? "line-through" : "none",
              opacity: item.done ? 0.7 : 1, 
              cursor: item.done ? "default" : "pointer",
              transition: "opacity 0.2s ease-in-out",
            }}
          >
            {item.text}
          </motion.li>
        ))}
      </Box>
    </Box>
  );
};

export default ComingUpdates;