// "use client";
// import React from "react";
// import { Chip, Tooltip, Box, CircularProgress, IconButton } from "@mui/material";
// import RefreshIcon from "@mui/icons-material/Refresh";
// import { useCrazyTimePlayers } from "./useCrazyTimePlayers";

// export default function CrazyTimeBadge({ showRefresh = false, pollMs }) {
//   const { players, fetchedAt, loading, error, refresh } = useCrazyTimePlayers({ pollMs });

//   const label = loading ? (
//     <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
//       <CircularProgress size={12} sx={{ color: "#FFCA28" }} />
//       <span>Crazy Time…</span>
//     </Box>
//   ) : error ? (
//     "Crazy Time: —"
//   ) : (
//     `Crazy Time: ${
//       Number.isFinite(Number(players)) ? Number(players).toLocaleString("sv-SE") : "—"
//     }`
//   );

//   const updatedShort =
//     fetchedAt
//       ? new Date(fetchedAt).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })
//       : null;

//   return (
//     <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
//       <Tooltip title={updatedShort ? `Källa: CasinoScores • Uppdaterad ${updatedShort}` : "Källa: CasinoScores"}>
//         <Chip
//           size="small"
//           clickable
//           component="a"
//           href="https://casinoscores.com/crazy-time/"
//           target="_blank"
//           rel="noopener"
//           label={label}
//           sx={{
//             backgroundColor: "#2a2a2a",
//             color: "#FFCA28",
//             border: "1px solid #3a3a3a",
//             "& .MuiChip-label": {
//               display: "flex",
//               alignItems: "center",
//               gap: 0.5,
//               whiteSpace: "nowrap",
//             },
//           }}
//         />
//       </Tooltip>

//       {showRefresh && (
//         <Tooltip title="Uppdatera Crazy Time">
//           <span>
//             <IconButton onClick={refresh} size="small" sx={{ color: "#00e676" }} disabled={loading} aria-label="Uppdatera Crazy Time">
//               <RefreshIcon fontSize="inherit" />
//             </IconButton>
//           </span>
//         </Tooltip>
//       )}
//     </Box>
//   );
// }