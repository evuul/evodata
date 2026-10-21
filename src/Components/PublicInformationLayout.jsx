"use client";

// Frames public information pages with a consistent heading and home link.

import NextLink from "next/link";
import { Box, Button, Typography } from "@mui/material";
import { useTranslate } from "@/context/LocaleContext";

export default function PublicInformationLayout({ titleSv, titleEn, children }) {
  const translate = useTranslate();
  return (
    <Box component="main" sx={{ minHeight: "70vh", color: "#f8fafc", backgroundColor: "#0b1424", px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 5 } }}>
      <Box sx={{ maxWidth: 1060, mx: "auto" }}>
        <Button component={NextLink} href="/" sx={{ color: "#82c1ff", textTransform: "none", mb: 2, minHeight: 44 }}>{translate("Till startsidan", "Back to home")}</Button>
        <Typography component="h1" sx={{ fontSize: { xs: 30, sm: 42 }, fontWeight: 800, mb: 3 }}>{translate(titleSv, titleEn)}</Typography>
        {children}
      </Box>
    </Box>
  );
}
