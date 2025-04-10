"use client";

import React, { useState } from "react";
import { Typography, Box } from "@mui/material";
import { motion } from "framer-motion";
import { Manrope } from "next/font/google";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";

const manrope = Manrope({ subsets: ["latin"], weight: "400" });

const updates = [
  { text: "Ny design och layout", done: true },
  { text: "Interaktiva grafer och statistik", done: true },
  { text: "Återköpsprogram & utdelningshistorik", done: true },
  { text: "Geografisk karta över intäkter", done: true },
  { text: "Login med egen dashboard", done: false },
  { text: "Finansiella insikter & aktieanalys", done: false },
  { text: "Speltrender & framtidsprognoser", done: false },
  { text: "Mobilanpassa", done: false },
];

const ComingUpdates = () => {
  const [updateList] = useState(updates);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        marginTop="40px"
        width="100%"
        sx={{
          padding: { xs: "20px", sm: "30px" },
          background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)", // Matchar GraphBox-temat
          borderRadius: "20px",
          boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
          maxWidth: { xs: "90%", sm: "80%", md: "60%" },
          margin: "40px auto",
        }}
      >
        {/* Rubrik */}
        <Typography
          variant="h4"
          sx={{
            fontWeight: "800",
            fontFamily: manrope.style.fontFamily,
            fontSize: { xs: "1.8rem", sm: "2.5rem", md: "3rem" },
            background: "linear-gradient(90deg, #00e676, #00c853)", // Grön gradient som matchar GraphBox
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "0 4px 10px rgba(0, 230, 118, 0.5)", // Grön skugga
            textAlign: "center",
            width: "100%",
            marginBottom: "30px",
          }}
        >
          Fler uppdateringar på väg! 🚀
        </Typography>

        {/* Lista */}
        <Box
          component="ul"
          sx={{
            listStyle: "none",
            padding: 0,
            marginTop: "20px",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px", // Konsekvent avstånd mellan listitems
          }}
        >
          {updateList.map((item, index) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileHover={{ scale: 1.03, transition: { duration: 0.15 } }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center", // Centrera innehållet i listitem
                width: "100%",
                maxWidth: "600px", // Begränsa bredden för bättre läsbarhet
                padding: "12px 20px",
                background: item.done
                  ? "rgba(255, 255, 255, 0.05)" // Ljusare bakgrund för "done"
                  : "rgba(0, 230, 118, 0.1)", // Grön bakgrund för "not done"
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                transition: "background 0.3s ease, transform 0.15s ease",
                cursor: item.done ? "default" : "pointer",
              }}
            >
              {/* Ikon för status */}
              {item.done ? (
                <CheckCircleOutlineIcon
                  sx={{
                    color: "#00e676",
                    marginRight: "10px",
                    fontSize: "1.5rem",
                  }}
                />
              ) : (
                <RadioButtonUncheckedIcon
                  sx={{
                    color: "#00e676",
                    marginRight: "10px",
                    fontSize: "1.5rem",
                  }}
                />
              )}

              {/* Text */}
              <Typography
                sx={{
                  fontSize: { xs: "1.2rem", sm: "1.5rem", md: "1.8rem" },
                  fontWeight: "700",
                  fontFamily: manrope.style.fontFamily,
                  background: "linear-gradient(90deg, #b3ffda, #00e676)", // Ljusare grön gradient
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: "0 0 1px rgba(0, 230, 118, 0.5)",
                  textDecoration: item.done ? "line-through" : "none",
                  opacity: item.done ? 0.7 : 1,
                  textAlign: "center",
                  flex: 1, // Gör att texten tar upp resterande utrymme och centreras
                }}
              >
                {item.text}
              </Typography>
            </motion.li>
          ))}
        </Box>
      </Box>
    </motion.div>
  );
};

export default ComingUpdates;