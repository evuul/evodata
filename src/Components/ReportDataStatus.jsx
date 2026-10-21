"use client";

// Reuses source and quality labels for report charts and report-based models.

import { Box, Link } from "@mui/material";
import { useLocale, useTranslate } from "@/context/LocaleContext";
import { buildReportDataStatus } from "@/lib/reportDataStatus";
import DataStatusLine from "./DataStatusLine";

export default function ReportDataStatus({ data, model = false }) {
  const { locale } = useLocale();
  const translate = useTranslate();
  const status = buildReportDataStatus(data, { model });
  if (!status) return null;
  return (
    <Box sx={{ px: { xs: 1, sm: 2 }, pb: 2 }}>
      <DataStatusLine status={status} locale={locale} translate={translate} />
      <Link href="https://www.evolution.com/investors/financial-publications/reports" target="_blank" rel="noopener noreferrer" sx={{ color: "#82c1ff", fontSize: 12, display: "inline-flex", py: 1 }}>
        {translate("Källa: Evolutions rapporter", "Source: Evolution reports")}
      </Link>
    </Box>
  );
}
