"use client";

// Active panel resolver for the live header dashboard area.

import React from "react";
import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material";

const BUYBACK_CASH_EUR = 2_000_000_000;

export default function LiveHeaderPanelContent({
  activePanel,
  translate,
  financialReports,
  averagePlayersData,
  dividendData,
  buybackData,
  sharesData,
  cashView,
  setCashView,
  panels,
}) {
  if (activePanel === "live") return <panels.LivePlayersControlPanel />;

  if (activePanel === "financial") {
    if (!financialReports || !dividendData) {
      return (
        <Box sx={{ color: "rgba(148,163,184,0.75)", p: 3 }}>
          {translate("Finansiella rapporter saknas för denna vy.", "Financial reports are missing for this view.")}
        </Box>
      );
    }
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <panels.FinancialOverviewPanel financialReports={financialReports} dividendData={dividendData} />
        <panels.CashPositionPanel financialReports={financialReports} />
      </Box>
    );
  }

  if (activePanel === "fairvalue") {
    const reports = financialReports?.financialReports ?? [];
    if (!reports.length) {
      return (
        <Box sx={{ color: "rgba(148,163,184,0.75)", p: 3 }}>
          {translate("Kräver kvartalsdata för att visa AI Fair Value.", "Quarterly data is required to show AI Fair Value.")}
        </Box>
      );
    }
    return <panels.LiveAiFairValuePanel reports={reports} buybackData={buybackData} sharesData={sharesData} />;
  }

  if (activePanel === "cash") {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <ToggleButtonGroup
          value={cashView}
          exclusive
          onChange={(_, value) => value && setCashView(value)}
          size="small"
          sx={{
            alignSelf: "center",
            backgroundColor: "rgba(148,163,184,0.12)",
            borderRadius: "999px",
            p: 0.5,
          }}
        >
          <ToggleButton
            value="cash"
            sx={{
              textTransform: "none",
              color: "rgba(226,232,240,0.75)",
              border: 0,
              borderRadius: "999px!important",
              px: { xs: 1.6, md: 2.2 },
              "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(56,189,248,0.28)" },
            }}
          >
            {translate("Kassa", "Cash")}
          </ToggleButton>
          <ToggleButton
            value="allocation"
            sx={{
              textTransform: "none",
              color: "rgba(226,232,240,0.75)",
              border: 0,
              borderRadius: "999px!important",
              px: { xs: 1.6, md: 2.2 },
              "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(168,85,247,0.28)" },
            }}
          >
            {translate("Kapitalallokering", "Capital allocation")}
          </ToggleButton>
        </ToggleButtonGroup>

        {cashView === "cash" ? (
          <panels.CashPositionPanel financialReports={financialReports} />
        ) : (
          <panels.CapitalAllocationPanel
            dividendData={dividendData}
            buybackData={buybackData}
            financialReports={financialReports}
            sharesData={sharesData}
            buybackCash={BUYBACK_CASH_EUR}
          />
        )}
      </Box>
    );
  }

  if (activePanel === "gameshow") {
    if (!financialReports || !averagePlayersData) {
      return (
        <Box sx={{ color: "rgba(148,163,184,0.75)", p: 3 }}>
          {translate("Kräver finansiella rapporter och spelardata.", "Requires financial reports and player data.")}
        </Box>
      );
    }
    return <panels.GameshowEarningsPanel financialReports={financialReports} averagePlayersData={averagePlayersData} />;
  }

  if (activePanel === "report") {
    if (!financialReports) {
      return (
        <Box sx={{ color: "rgba(148,163,184,0.75)", p: 3 }}>
          {translate("Finansiella rapporter saknas för denna vy.", "Financial reports are missing for this view.")}
        </Box>
      );
    }
    return <panels.ReportViewPanel financialReports={financialReports} />;
  }

  if (activePanel === "faq") return <panels.FaqPanel />;

  if (activePanel === "money") return <panels.LiveMoneyCounterPanel />;

  if (activePanel === "buybacks") {
    return (
      <panels.LiveStockBuyBackInfoPanel
        dividendData={dividendData}
        buybackCash={BUYBACK_CASH_EUR}
        financialReports={financialReports}
      />
    );
  }

  if (activePanel === "short") return <panels.ShortIntelligencePanel />;

  return <panels.ShortIntelligencePanel />;
}
