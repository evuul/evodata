"use client";

import React, { useState } from "react";
import { Typography, Box, LinearProgress } from "@mui/material";
import { motion } from "framer-motion";
import { Manrope } from "next/font/google";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";

const manrope = Manrope({ subsets: ["latin"], weight: "400" });

const updates = [
  { text: "Ny design och layout", done: true },
  { text: "Interaktiva grafer och statistik", done: true },
  { text: "Återköpsprogram & utdelningshistorik", done: true }, // Utdelningar är klara, återköp på gång
  { text: "Geografisk karta över intäkter", done: true },
  { text: "Kassagraf med svängningar och utdelningar", done: true }, // Nyligen tillagd
  { text: "Login med egen dashboard", done: false },
  { text: "Finansiella insikter & aktieanalys", done: false },
  { text: "Speltrender & framtidsprognoser", done: false },
  { text: "Fullständig mobilanpassning", done: false },
];

const ComingUpdates = () => {
  const [updateList] = useState(updates);

  // Beräkna framsteg (andel av uppdateringar som är klara)
  const progress = (updateList.filter(item => item.done).length / updateList.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        marginTop="40px"
        width="100%"
        sx={{
          padding: { xs: "20px", sm: "40px" },
          background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
          borderRadius: "24px",
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 230, 118, 0.2)", // Glow-effekt
          maxWidth: { xs: "90%", sm: "80%", md: "60%" },
          margin: "40px auto",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Progress Bar */}
        <Box sx={{ width: "100%", mb: 3 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 5,
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              "& .MuiLinearProgress-bar": {
                background: "linear-gradient(90deg, #00e676, #00c853)",
                boxShadow: "0 0 10px rgba(0, 230, 118, 0.5)",
              },
            }}
          />
          <Typography
            sx={{
              mt: 1,
              fontFamily: manrope.style.fontFamily,
              fontSize: { xs: "0.9rem", sm: "1rem" },
              color: "#00e676",
              textAlign: "center",
              opacity: 0.8,
            }}
          >
            {Math.round(progress)}% av uppdateringarna är klara!
          </Typography>
        </Box>

        {/* Rubrik */}
        <motion.div
          animate={{
            scale: [1, 1.02, 1],
            textShadow: [
              "0 4px 10px rgba(0, 230, 118, 0.5)",
              "0 6px 15px rgba(0, 230, 118, 0.7)",
              "0 4px 10px rgba(0, 230, 118, 0.5)",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: "800",
              fontFamily: manrope.style.fontFamily,
              fontSize: { xs: "1.8rem", sm: "2.5rem", md: "3rem" },
              background: "linear-gradient(90deg, #00e676, #00c853, #00e676)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "0 4px 10px rgba(0, 230, 118, 0.5)",
              textAlign: "center",
              width: "100%",
              marginBottom: "30px",
            }}
          >
            Fler uppdateringar på väg! 🚀
          </Typography>
        </motion.div>

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
            gap: "15px",
          }}
        >
          {updateList.map((item, index) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
              whileHover={{
                scale: 1.03,
                boxShadow: "0 6px 20px rgba(0, 230, 118, 0.3)",
                transition: { duration: 0.2 },
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                maxWidth: "600px",
                padding: "15px 20px",
                background: item.done
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 230, 118, 0.15)",
                borderRadius: "12px",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
                border: item.done
                  ? "1px solid rgba(255, 255, 255, 0.1)"
                  : "1px solid rgba(0, 230, 118, 0.3)",
                transition: "all 0.3s ease",
                cursor: item.done ? "default" : "pointer",
              }}
            >
              {/* Ikon för status */}
              {item.done ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: 360 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <CheckCircleOutlineIcon
                    sx={{
                      color: "#00e676",
                      marginRight: "12px",
                      fontSize: "1.8rem",
                    }}
                  />
                </motion.div>
              ) : (
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <RadioButtonUncheckedIcon
                    sx={{
                      color: "#00e676",
                      marginRight: "12px",
                      fontSize: "1.8rem",
                    }}
                  />
                </motion.div>
              )}

              {/* Text */}
              <Typography
                sx={{
                  fontSize: { xs: "1.2rem", sm: "1.5rem", md: "1.6rem" },
                  fontWeight: "600",
                  fontFamily: manrope.style.fontFamily,
                  background: item.done
                    ? "linear-gradient(90deg, #b3ffda, #00e676)"
                    : "linear-gradient(90deg, #00e676, #00c853)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: "0 0 2px rgba(0, 230, 118, 0.5)",
                  textDecoration: item.done ? "line-through" : "none",
                  opacity: item.done ? 0.7 : 1,
                  textAlign: "center",
                  flex: 1,
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