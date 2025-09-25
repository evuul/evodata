// "use client";
// import React from "react";
// import { Card, Box, Typography, Chip, CircularProgress, IconButton, Tooltip, Alert } from "@mui/material";
// import RefreshIcon from "@mui/icons-material/Refresh";
// import { useCrazyTimePlayers } from "./useCrazyTimePlayers";

// const TZ = "Europe/Stockholm";

// export default function CrazyTimePlayers() {
//   const { players, fetchedAt, loading, error, refresh } = useCrazyTimePlayers();

//   const formattedPlayers =
//     Number.isFinite(Number(players)) ? Number(players).toLocaleString("sv-SE") : "—";

//   const formattedTime =
//     fetchedAt
//       ? new Date(fetchedAt).toLocaleTimeString("sv-SE", {
//           hour: "2-digit",
//           minute: "2-digit",
//           timeZone: TZ,
//         })
//       : null;

//   return (
//     <Card
//       sx={{
//         background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
//         borderRadius: "12px",
//         boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
//         p: { xs: 2, sm: 2.5 },
//         color: "#fff",
//         width: { xs: "92%", sm: "85%", md: "75%" },
//         m: "16px auto",
//       }}
//     >
//       <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
//         <Typography variant="h6" sx={{ fontWeight: 700 }}>
//           Crazy Time – antal spelare just nu
//         </Typography>
//         <Tooltip title={loading ? "Hämtar..." : "Uppdatera nu"}>
//           <span>
//             <IconButton onClick={refresh} sx={{ color: "#00e676" }} aria-label="Uppdatera" disabled={loading}>
//               {loading ? <CircularProgress size={20} sx={{ color: "#00e676" }} /> : <RefreshIcon />}
//             </IconButton>
//           </span>
//         </Tooltip>
//       </Box>

//       {!!error && (
//         <Alert severity="error" sx={{ mb: 1, bgcolor: "#3a1f1f", color: "#ffbaba" }}>
//           {error}
//         </Alert>
//       )}

//       <Box aria-live="polite" aria-busy={loading ? "true" : "false"} sx={{ textAlign: "center", minHeight: 56 }}>
//         <Typography variant="h3" sx={{ fontWeight: 800, color: "#FFCA28" }}>
//           {formattedPlayers}
//         </Typography>
//       </Box>

//       <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mt: 1, flexWrap: "wrap" }}>
//         <Chip
//           size="small"
//           label="Källa: CasinoScores"
//           component="a"
//           href="https://casinoscores.com/crazy-time/"
//           target="_blank"
//           rel="noopener"
//           clickable
//           sx={{ backgroundColor: "#2a2a2a", color: "#b0b0b0" }}
//         />
//         {formattedTime && (
//           <Chip size="small" label={`Uppdaterad ${formattedTime}`} sx={{ backgroundColor: "#2a2a2a", color: "#b0b0b0" }} />
//         )}
//         {!navigator.onLine && (
//           <Chip size="small" label="Offline" sx={{ backgroundColor: "#4d2a2a", color: "#ffbaba" }} />
//         )}
//       </Box>
//     </Card>
//   );
// }