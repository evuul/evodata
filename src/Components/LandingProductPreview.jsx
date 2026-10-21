"use client";

// Shows readable, fixed example metrics alongside an explicitly illustrative chart.

import NextLink from "next/link";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { colors, panelSx, primaryButtonSx } from "./landingStyles";

export default function LandingProductPreview({ model, translate }) {
  return (
    <Box component="figure" aria-labelledby="example-preview-title" sx={{ ...panelSx, m: 0, borderRadius: { xs: 3, md: 4 }, p: { xs: 1.5, sm: 2.2 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Typography id="example-preview-title" sx={{ fontWeight: 750 }}>{translate("Så kan din översikt se ut", "Your overview could look like this")}</Typography>
        <Chip label={translate("Exempeldata", "Example data")} size="small" sx={{ color: "#fde68a", backgroundColor: "rgba(245,158,11,0.12)", fontWeight: 700 }} />
      </Stack>
      <Typography component="figcaption" sx={{ color: "#cbd5e1", fontSize: 12, lineHeight: 1.6, mb: 2 }}>{model.disclosure}</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" }, gap: 1.2 }}>
        {model.metrics.map((metric, index) => (
          <Box key={metric.id} sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${colors.border}`, backgroundColor: "rgba(15,23,42,0.58)", gridColumn: { xs: index === 2 ? "1 / -1" : "auto", sm: "auto" } }}>
            <Typography sx={{ color: "#cbd5e1", fontSize: 12 }}>{metric.label}</Typography>
            <Typography sx={{ color: colors.text, fontSize: { xs: 23, sm: 26 }, fontWeight: 780, mt: 1, fontVariantNumeric: "tabular-nums" }}>{metric.value}</Typography>
            <Typography sx={{ color: colors.muted, fontSize: 12 }}>{metric.unit}</Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{ my: 2, p: 1.5, borderRadius: 2, border: `1px solid ${colors.border}`, backgroundColor: "rgba(15,23,42,0.58)" }}>
        <Typography sx={{ color: "#cbd5e1", fontSize: 12, mb: 1 }}>{translate("Illustrativ spelartrend · 7 dagar", "Illustrative player trend · 7 days")}</Typography>
        <Box component="svg" viewBox="0 0 620 176" role="img" aria-label={translate("Påhittad spelartrend som visar hur en graf presenteras", "Illustrative player trend showing how a chart is presented")} sx={{ display: "block", width: "100%" }}>
          {[30, 76, 122, 168].map((y) => <line key={y} x1="0" x2="620" y1={y} y2={y} stroke="rgba(148,163,184,0.18)" strokeDasharray="4 7" />)}
          <path d="M0 146 C38 138 52 111 89 119 S143 152 181 129 S225 89 264 99 S316 131 351 105 S402 54 448 73 S507 96 542 58 S584 35 620 21" fill="none" stroke="#82c1ff" strokeWidth="4" strokeLinecap="round" />
        </Box>
      </Box>
      <Button component={NextLink} href="/register" variant="contained" endIcon={<ArrowForwardRoundedIcon />} sx={{ ...primaryButtonSx, minHeight: 44 }}>
        {translate("Se dina vyer med ett gratis konto", "Explore your views with a free account")}
      </Button>
    </Box>
  );
}
