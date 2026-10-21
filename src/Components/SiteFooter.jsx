"use client";

// Keeps public help, contact and privacy links accessible across the site.

import NextLink from "next/link";
import { Box, Link, Stack, Typography } from "@mui/material";
import { useTranslate } from "@/context/LocaleContext";
import { CONTACT_EMAIL } from "@/config/site";

export default function SiteFooter() {
  const translate = useTranslate();
  const links = [
    ["/calendar", translate("Kalender", "Calendar")],
    ["/methodology", translate("Metodik & FAQ", "Methodology & FAQ")],
    ["/privacy", translate("Integritet", "Privacy")],
    ["/disclaimer", translate("Ansvarsfriskrivning", "Disclaimer")],
    [`mailto:${CONTACT_EMAIL}`, translate("Kontakt", "Contact")],
  ];

  return (
    <Box component="footer" sx={{ backgroundColor: "#0b1424", color: "#cbd5e1", borderTop: "1px solid rgba(148,163,184,0.18)", px: 2, py: 3 }}>
      <Stack spacing={1.8} alignItems="center" sx={{ maxWidth: 1200, mx: "auto" }}>
        <Typography sx={{ fontWeight: 800, letterSpacing: "0.08em" }}>EVOTRACKER</Typography>
        <Box component="nav" aria-label={translate("Information och kontakt", "Information and contact")} sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 1 }}>
          {links.map(([href, label]) => (
            <Link key={href} component={NextLink} href={href} sx={{ color: "#cbd5e1", p: 1, minHeight: 44, display: "inline-flex", alignItems: "center", fontSize: 13 }}>
              {label}
            </Link>
          ))}
        </Box>
        <Typography sx={{ fontSize: 12, textAlign: "center" }}>
          {translate("Oberoende analystjänst · Inte finansiell rådgivning", "Independent analytics service · Not financial advice")}
        </Typography>
      </Stack>
    </Box>
  );
}
