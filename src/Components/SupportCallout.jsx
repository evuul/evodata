"use client";

// Offers eligible signed-in users a clear, non-blocking path to Premium membership.

import NextLink from "next/link";
import { Box, Button, Stack, Typography } from "@mui/material";
import WorkspacePremiumRounded from "@mui/icons-material/WorkspacePremiumRounded";
import { useAuth } from "@/context/AuthContext";
import { useTranslate } from "@/context/LocaleContext";
import { PREMIUM_PROGRAM } from "@/config/premiumProgram";

export default function SupportCallout() {
  const { user } = useAuth();
  const translate = useTranslate();
  const hasPremiumAccess = Boolean(user?.isAdmin || user?.isFounder || user?.isSubscriber);

  if (hasPremiumAccess) return null;

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
        backgroundColor: "rgba(15,23,42,0.72)",
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
            {translate("Stötta EvoTracker och få Premium", "Support EvoTracker and get Premium")}
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(203,213,225,0.78)", lineHeight: 1.6 }}>
            {translate(
              `${PREMIUM_PROGRAM.monthlyDonationSek} kr motsvarar en månad Premium med Extended lobby, längre historik och dataexport. Donationer är alltid frivilliga och hjälper till med livedata, drift och vidareutveckling.`,
              `SEK ${PREMIUM_PROGRAM.monthlyDonationSek} equals one month of Premium with Extended lobby, extended history, and data export. Donations are always voluntary and help fund live data, operations, and continued development.`
            )}
          </Typography>
        </Stack>
        <Button
          component={NextLink}
          href="/premium"
          variant="contained"
          startIcon={<WorkspacePremiumRounded />}
          sx={{
            flexShrink: 0,
            alignSelf: { xs: "stretch", sm: "center" },
            textTransform: "none",
            fontWeight: 850,
            color: "#111827",
            backgroundColor: "#7dd3fc",
            "&:hover": { backgroundColor: "#bae6fd" },
          }}
        >
          {translate("Läs om Premium", "Learn about Premium")}
        </Button>
      </Stack>
    </Box>
  );
}
