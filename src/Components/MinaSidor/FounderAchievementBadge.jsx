"use client";

// Shows a verified Founder achievement and controls optional wall visibility.

import { Box, Stack, Switch, Typography } from "@mui/material";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";

const formatFounderDate = (value, locale) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "sv-SE", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
};

export default function FounderAchievementBadge({
  locale,
  translate,
  founderSince,
  founderPublic,
  founderVisibilitySaving,
  onToggleFounderVisibility,
}) {
  const recognizedAt = formatFounderDate(founderSince, locale);

  return (
    <Box
      aria-label={translate("Founder-utmärkelse", "Founder achievement")}
      sx={{
        display: "inline-flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "stretch", sm: "center" },
        gap: { xs: 1, sm: 1.4 },
        px: 1.15,
        py: 0.9,
        borderRadius: "13px",
        color: "#fde68a",
        border: "1px solid rgba(245,158,11,0.28)",
        backgroundColor: "rgba(245,158,11,0.065)",
        width: { xs: "100%", sm: "fit-content" },
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Box
          sx={{
            width: 34,
            height: 34,
            flexShrink: 0,
            borderRadius: "10px",
            display: "grid",
            placeItems: "center",
            backgroundColor: "rgba(245,158,11,0.11)",
          }}
        >
          <WorkspacePremiumRoundedIcon sx={{ fontSize: 20 }} />
        </Box>
        <Box>
          <Typography sx={{ color: "#fde68a", fontSize: "0.72rem", fontWeight: 850, letterSpacing: "0.09em" }}>
            {translate("FOUNDER-UTMÄRKELSE", "FOUNDER ACHIEVEMENT")}
          </Typography>
          <Typography sx={{ color: "rgba(226,232,240,0.7)", fontSize: "0.7rem", mt: 0.05 }}>
            {recognizedAt
              ? translate(`Founding supporter sedan ${recognizedAt}`, `Founding supporter since ${recognizedAt}`)
              : translate("Verifierad founding supporter", "Verified founding supporter")}
          </Typography>
        </Box>
      </Stack>

      <Stack
        direction="row"
        spacing={0.4}
        alignItems="center"
        justifyContent={{ xs: "space-between", sm: "flex-start" }}
        sx={{ pl: { sm: 1.3 }, borderLeft: { sm: "1px solid rgba(245,158,11,0.2)" } }}
      >
        <Typography sx={{ color: "rgba(203,213,225,0.72)", fontSize: "0.7rem", whiteSpace: "nowrap" }}>
          {translate("Visa på Founder-väggen", "Show on Founders wall")}
        </Typography>
        <Switch
          size="small"
          checked={Boolean(founderPublic)}
          disabled={Boolean(founderVisibilitySaving)}
          onChange={(event) => onToggleFounderVisibility?.(Boolean(event.target.checked))}
          inputProps={{ "aria-label": translate("Visa mig på Founder-väggen", "Show me on the Founders wall") }}
        />
      </Stack>
    </Box>
  );
}
