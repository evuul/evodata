"use client";

// Panel selector and content wrapper for the live header dashboard area.

import React from "react";
import { Box, FormControl, ListSubheader, MenuItem, Select, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";

export default function LiveHeaderPanelSwitcher({
  activePanel,
  isMobileMenu,
  panelGroups,
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
              onChange={(event) => handlePanelChange(event, event.target.value)}
              renderValue={(value) =>
                panelGroups.flatMap((group) => group.options).find((option) => option.value === value)?.label ?? value
              }
              sx={{
                borderRadius: "999px",
                color: "#f8fafc",
                backgroundColor: "rgba(148,163,184,0.12)",
                border: "1px solid rgba(148,163,184,0.2)",
                "& .MuiSelect-select": { py: 1.1, pl: 2.2 },
              }}
            >
              {panelGroups.flatMap((group) => [
                <ListSubheader key={`${group.id}-header`} sx={{ lineHeight: "32px", fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8 }}>
                  {group.label}
                </ListSubheader>,
                ...group.options.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                )),
              ])}
            </Select>
          </FormControl>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: 1,
              maxWidth: "100%",
            }}
          >
            {panelGroups.map((group) => (
              <Stack key={group.id} spacing={0.35} alignItems="flex-start">
                <Typography variant="caption" sx={{ pl: 1.1, color: "rgba(148,163,184,0.72)", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, fontSize: "0.64rem" }}>
                  {group.label}
                </Typography>
                <ToggleButtonGroup value={activePanel} exclusive onChange={handlePanelChange} sx={{ backgroundColor: "rgba(15,23,42,0.55)", borderRadius: "999px", p: 0.35, gap: 0.35 }}>
                  {group.options.map((option) => (
                    <ToggleButton
                      key={option.value}
                      value={option.value}
                      sx={{
                        textTransform: "none",
                        color: "rgba(226,232,240,0.78)",
                        border: 0,
                        borderRadius: "999px!important",
                        px: { sm: 1.3, lg: 1.6 },
                        py: 0.5,
                        fontSize: { sm: "0.76rem", lg: "0.82rem" },
                        whiteSpace: "nowrap",
                        backgroundColor: "rgba(148,163,184,0.08)",
                        "&:hover": { backgroundColor: "rgba(148,163,184,0.18)" },
                        "&.Mui-selected": {
                          color: "#f8fafc",
                          backgroundColor: option.value === "buybacks" ? "rgba(134,239,172,0.25)" : option.value === "short" ? "rgba(248,113,113,0.25)" : "rgba(56,189,248,0.28)",
                        },
                      }}
                    >
                      {option.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Stack>
            ))}
          </Box>
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
