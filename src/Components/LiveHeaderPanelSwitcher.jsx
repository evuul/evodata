"use client";

// Panel selector and content wrapper for the live header dashboard area.

import React from "react";
import { Box, FormControl, MenuItem, Select, ToggleButton, ToggleButtonGroup } from "@mui/material";

export default function LiveHeaderPanelSwitcher({
  activePanel,
  isMobileMenu,
  panelOptions,
  handlePanelChange,
  panelContent,
  isLiveMoneyPanel,
  isLivePanel,
}) {
  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "center", width: "100%" }}>
        {isMobileMenu ? (
          <FormControl fullWidth size="small" sx={{ maxWidth: 260 }}>
            <Select
              value={activePanel}
              onChange={handlePanelChange}
              sx={{
                borderRadius: "999px",
                color: "#f8fafc",
                backgroundColor: "rgba(148,163,184,0.12)",
                border: "1px solid rgba(148,163,184,0.2)",
                "& .MuiSelect-select": { py: 1.1, pl: 2.2 },
              }}
            >
              {panelOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <ToggleButtonGroup
            value={activePanel}
            exclusive
            onChange={handlePanelChange}
            sx={{
              backgroundColor: "rgba(15,23,42,0.55)",
              borderRadius: "999px",
              p: 0.4,
              flexWrap: { xs: "wrap", md: "nowrap" },
              gap: 0.5,
              justifyContent: { xs: "center", md: "flex-start" },
              overflowX: { xs: "visible", md: "auto" },
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: { xs: "auto", md: "none" },
              "&::-webkit-scrollbar": { display: "none" },
              maxWidth: "100%",
            }}
          >
            {panelOptions.map((option) => (
              <ToggleButton
                key={option.value}
                value={option.value}
                sx={{
                  textTransform: "none",
                  color: "rgba(226,232,240,0.78)",
                  border: 0,
                  borderRadius: "999px!important",
                  px: { xs: 1.25, sm: 1.5, md: 2 },
                  py: 0.55,
                  fontSize: { xs: "0.78rem", sm: "0.85rem" },
                  letterSpacing: 0.2,
                  whiteSpace: "nowrap",
                  backgroundColor: "rgba(148,163,184,0.08)",
                  boxShadow: "inset 0 0 0 1px rgba(148,163,184,0.2)",
                  transition: "transform 120ms ease, background-color 120ms ease, color 120ms ease",
                  "&:hover": {
                    backgroundColor: "rgba(148,163,184,0.18)",
                    transform: "translateY(-1px)",
                  },
                  "&.Mui-selected": {
                    color: "#f8fafc",
                    backgroundColor:
                      option.value === "buybacks"
                        ? "rgba(134,239,172,0.25)"
                        : option.value === "short"
                        ? "rgba(248,113,113,0.25)"
                        : "rgba(56,189,248,0.28)",
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.2)",
                  },
                }}
              >
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        )}
      </Box>

      <Box
        sx={{
          width: "100%",
          mt: { xs: 1, sm: 1.5 },
          mx: isLiveMoneyPanel ? "auto" : isLivePanel ? "auto" : { xs: -3, sm: -5, md: -6 },
          maxWidth: isLiveMoneyPanel ? "min(1700px, 100%)" : isLivePanel ? "100%" : "none",
          display: isLiveMoneyPanel || isLivePanel ? "flex" : "block",
          justifyContent: isLiveMoneyPanel || isLivePanel ? "center" : "flex-start",
          "& > *": {
            background: "transparent!important",
            border: "none!important",
            boxShadow: "none!important",
          },
        }}
      >
        {panelContent}
      </Box>
    </>
  );
}
