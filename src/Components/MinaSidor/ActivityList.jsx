"use client";

import { Box, Paper, Stack, Typography } from "@mui/material";
import { formatDate } from "./utils";
import { activityRow, equalHeightCard, softCardBase, text } from "./styles";

export default function ActivityList({ translate, activity }) {
  return (
    <Paper sx={{ p: 2.5, ...softCardBase, ...equalHeightCard }}>
      <Typography sx={{ color: text.subtle }}>{translate("Senaste aktiviteter", "Recent activity")}</Typography>
      <Stack spacing={1} sx={{ mt: 1.5 }}>
        {(activity.length ? activity : [{ type: "empty" }]).slice(0, 3).map((item, idx) => {
          if (item.type === "empty") {
            return (
              <Typography key="empty" sx={{ color: text.muted }}>
                {translate("Ingen aktivitet ännu.", "No activity yet.")}
              </Typography>
            );
          }
          const label =
            item.type === "buy"
              ? translate(`Köp ${item.shares} aktier`, `Buy ${item.shares} shares`)
              : item.type === "sell"
                ? translate(`Sälj ${item.shares} aktier`, `Sell ${item.shares} shares`)
                : translate("Nollställ innehav", "Reset holdings");
          return (
            <Box
              key={`${item.type}-${idx}`}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                ...activityRow,
              }}
            >
              <Typography sx={{ color: "#e2e8f0", fontWeight: 600 }}>{label}</Typography>
              <Typography sx={{ color: text.muted }}>{formatDate(item.timestamp)}</Typography>
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
}
