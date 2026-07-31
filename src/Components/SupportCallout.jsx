"use client";

// Offers a contextual, non-blocking support prompt after high-value dashboard content.

import { Box, Button, Stack, Typography } from "@mui/material";
import LocalCafeRounded from "@mui/icons-material/LocalCafeRounded";
import { useTranslate } from "@/context/LocaleContext";
import { buildSupportUrl } from "@/lib/supportLinks";

export default function SupportCallout({ placement = "dashboard" }) {
  const translate = useTranslate();

  return (
    <Box
      component="aside"
      sx={{
        width: "100%",
        maxWidth: 980,
        mx: "auto",
        mt: { xs: 3, md: 4 },
        p: { xs: 1.8, sm: 2.3 },
        borderRadius: "18px",
        background:
          "linear-gradient(135deg, rgba(236,72,153,0.1), rgba(14,165,233,0.1))",
        border: "1px solid rgba(125,211,252,0.2)",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.6}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
      >
        <Stack spacing={0.45} sx={{ maxWidth: 680 }}>
          <Typography sx={{ color: "#f8fafc", fontWeight: 850 }}>
            {translate("Hjälp hålla EvoTracker igång", "Help keep EvoTracker running")}
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(203,213,225,0.78)", lineHeight: 1.6 }}>
            {translate(
              "EvoTracker är gratis och byggs på min fritid. Donationer går till livedata, databas, mejlutskick och drift.",
              "EvoTracker is free and built in my spare time. Donations help cover live data, databases, email delivery, and hosting."
            )}
          </Typography>
        </Stack>
        <Button
          component="a"
          href={buildSupportUrl(placement)}
          target="_blank"
          rel="noopener noreferrer"
          variant="contained"
          startIcon={<LocalCafeRounded />}
          sx={{
            flexShrink: 0,
            alignSelf: { xs: "stretch", sm: "center" },
            textTransform: "none",
            fontWeight: 850,
            color: "#111827",
            background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
            "&:hover": { background: "linear-gradient(135deg, #fcd34d, #f59e0b)" },
          }}
        >
          {translate("Hjälp hålla livedatan igång", "Help keep live data running")}
        </Button>
      </Stack>
    </Box>
  );
}
